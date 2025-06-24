from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.db.models import Q
from django.contrib.auth import authenticate, login
from .models import (
    Role, User, UserProfile, Patient, Appointment, EmergencyAmbulanceRequest,
    Symptom, Disease, SymptomCheckerSession, ScreeningAlert,
    HealthcareWorkerAlert, PreventiveTip, MedicalRecord, CronJobLog
)
from .serializers import *

# ======================== PERMISSION CLASSES ========================
class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role.name == 'Admin' if request.user.role else False

class IsHealthcareWorker(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role.name in ['Doctor', 'Nurse'] if request.user.role else False

class IsPatient(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role.name == 'Patient' if request.user.role else False

class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_superuser or obj.user == request.user

class IsPatientOrProvider(BasePermission):
    def has_permission(self, request, view):
        return request.user.role.name in ['Patient', 'Doctor', 'Nurse']

# ======================== UTILITY CLASSES ========================
class NotificationMixin:
    """Handles all email notifications"""
    
    def _send_email(self, recipient, subject, template_name, context):
        try:
            html_message = render_to_string(f'emails/{template_name}', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False
            )
            return True
        except Exception as e:
            print(f"Email sending failed: {str(e)}")
            return False

class NotificationService:
    """Centralized notification service"""
    
    @staticmethod
    def send_appointment_reminders():
        upcoming = Appointment.objects.filter(
            appointment_date__range=(
                timezone.now(),
                timezone.now() + timedelta(hours=24)
            ),
            status='A',
            reminder_sent=False
        ).select_related('patient__user', 'healthcare_provider')
        
        for appointment in upcoming:
            NotificationService._send_appointment_reminder(appointment)
            appointment.reminder_sent = True
            appointment.save()

    @staticmethod
    def _send_appointment_reminder(appointment):
        context = {
            'patient': appointment.patient.user.get_full_name(),
            'provider': appointment.healthcare_provider.get_full_name(),
            'date': appointment.appointment_date,
            'time_remaining': appointment.appointment_date - timezone.now()
        }
        
        send_mail(
            subject=f"Reminder: Upcoming Appointment",
            message=render_to_string('emails/appointment_reminder.txt', context),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[appointment.patient.user.email],
            html_message=render_to_string('emails/appointment_reminder.html', context)
        )

# ======================== AUTHENTICATION VIEWS ========================
class AuthViewSet(viewsets.ViewSet, NotificationMixin):
    """Handles user authentication"""
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = authenticate(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password']
        )
        
        if not user:
            return Response(
                {'error': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        login(request, user)
        return Response({
            'user': UserSerializer(user).data,
            'token': user.auth_token.key
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()
        self._send_email(
            recipient=user.email,
            subject="Welcome to HealthLink",
            template_name="welcome.html",
            context={'user': user}
        )
        
        return Response(
            {'user': UserSerializer(user).data},
            status=status.HTTP_201_CREATED
        )

# ======================== CORE MODEL VIEWSETS ========================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['role__name', 'is_active']

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdmin]

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return self.queryset if self.request.user.is_superuser else self.queryset.filter(user=self.request.user)

class PatientViewSet(viewsets.ModelViewSet, NotificationMixin):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAdmin | IsHealthcareWorker | IsPatient]
    filterset_fields = ['insurance_provider']

    def get_queryset(self):
        if self.request.user.role.name == 'Patient':
            return self.queryset.filter(user=self.request.user)
        return self.queryset

class AppointmentViewSet(viewsets.ModelViewSet, NotificationMixin):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'healthcare_provider', 'patient']

    def get_queryset(self):
        if self.request.user.role.name == 'Patient':
            return self.queryset.filter(patient__user=self.request.user)
        elif self.request.user.role.name in ['Doctor', 'Nurse']:
            return self.queryset.filter(healthcare_provider=self.request.user)
        return self.queryset

    def perform_create(self, serializer):
        appointment = serializer.save()
        self._send_email(
            recipient=appointment.patient.user.email,
            subject=f"Appointment Confirmation - {appointment.appointment_date.strftime('%b %d, %Y')}",
            template_name="appointment_created.html",
            context={
                'patient': appointment.patient.user.get_full_name(),
                'date': appointment.appointment_date,
                'provider': appointment.healthcare_provider.get_full_name(),
                'reason': appointment.reason
            }
        )

class EmergencyAmbulanceRequestViewSet(viewsets.ModelViewSet, NotificationMixin):
    queryset = EmergencyAmbulanceRequest.objects.all()
    serializer_class = EmergencyAmbulanceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'suspected_disease']

    def get_queryset(self):
        if self.request.user.role.name == 'Patient':
            return self.queryset.filter(patient__user=self.request.user)
        return self.queryset

    def perform_create(self, serializer):
        emergency = serializer.save()
        self._send_email(
            recipient='emergency-team@yourdomain.com',
            subject=f"EMERGENCY: {emergency.patient.user.get_full_name()}",
            template_name="emergency_alert.html",
            context={
                'patient': emergency.patient.user.get_full_name(),
                'location': emergency.location,
                'condition': emergency.condition_description,
                'suspected_disease': emergency.suspected_disease
            }
        )

# ======================== DISEASE MANAGEMENT VIEWS ========================
class SymptomViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Symptom.objects.all()
    serializer_class = SymptomSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['related_diseases']

class DiseaseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Disease.objects.all()
    serializer_class = DiseaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_contagious']

class SymptomCheckerSessionViewSet(viewsets.ModelViewSet, NotificationMixin):
    queryset = SymptomCheckerSession.objects.all()
    serializer_class = SymptomCheckerSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def check_symptoms(self, request):
        serializer = SymptomCheckRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        symptoms = Symptom.objects.filter(id__in=serializer.validated_data['symptoms'])
        diseases = Disease.objects.filter(name__in=['Malaria', 'Pneumonia'])
        
        session = SymptomCheckerSession.objects.create(
            user=self.request.user,
            location=serializer.validated_data.get('location', '')
        )
        session.symptoms_selected.set(symptoms)
        session.possible_diseases.set(diseases)
        session.risk_score = min(sum(s.severity_score for s in symptoms) * 10, 100)
        session.recommendation = self._get_recommendation(session.risk_score)
        session.save()
        
        if session.risk_score > 70:
            self._send_email(
                recipient=self.request.user.email,
                subject="Urgent: High Risk Symptoms Detected",
                template_name="high_risk_alert.html",
                context={
                    'user': self.request.user.get_full_name(),
                    'risk_score': session.risk_score,
                    'recommendation': session.recommendation
                }
            )
        
        return Response(SymptomCheckerSessionSerializer(session).data)

    def _get_recommendation(self, score):
        if score > 80: return "Seek emergency care immediately"
        if score > 50: return "Schedule doctor appointment within 24 hours"
        return "Self-monitor and consult if symptoms worsen"

# ======================== ALERT SYSTEM VIEWS ========================
class ScreeningAlertViewSet(viewsets.ModelViewSet):
    queryset = ScreeningAlert.objects.all()
    serializer_class = ScreeningAlertSerializer
    permission_classes = [IsAdmin | IsHealthcareWorker]
    filterset_fields = ['disease', 'severity', 'is_resolved']

class HealthcareWorkerAlertViewSet(viewsets.ModelViewSet):
    queryset = HealthcareWorkerAlert.objects.all()
    serializer_class = HealthcareWorkerAlertSerializer
    permission_classes = [IsHealthcareWorker]

    def get_queryset(self):
        return self.queryset.filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        alert.is_read = True
        alert.save()
        return Response({'status': 'alert acknowledged'})

# ======================== PREVENTION VIEWS ========================
class PreventiveTipViewSet(viewsets.ModelViewSet):
    queryset = PreventiveTip.objects.filter(is_active=True)
    serializer_class = PreventiveTipSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['tip_type', 'disease_target', 'priority']

    @action(detail=False, methods=['get'])
    def for_disease(self, request):
        disease = request.query_params.get('disease')
        if not disease:
            return Response(
                {'error': 'disease parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tips = self.queryset.filter(
            Q(disease_target=disease.upper()) | 
            Q(disease_target='BOTH') |
            Q(related_symptoms__related_diseases__contains=[disease.lower()])
        ).distinct()
        
        return Response(self.get_serializer(tips, many=True).data)

# ======================== MEDICAL HISTORY VIEWS ========================
class PatientMedicalHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Consolidated medical history endpoint"""
    serializer_class = MedicalHistorySerializer  # Use the new serializer
    permission_classes = [IsPatientOrProvider]

    def get_queryset(self):
        patient_id = self.kwargs.get('patient_id')
        return MedicalRecord.objects.filter(
            patient__id=patient_id
        ).select_related(
            'appointment', 
            'emergency_request',
            'patient'
        ).prefetch_related(
            'related_diseases',
            'prescriptions'
        )

    @action(detail=False, methods=['get'])
    def timeline(self, request, patient_id=None):
        """Custom timeline view combining multiple record types"""
        from django.db.models import Subquery, OuterRef
        from django.db import models
        
        # Get all medical records
        records = MedicalRecord.objects.filter(
            patient__id=patient_id
        ).annotate(
            event_type=models.Value('record', output_field=models.CharField())
        )
        
        # Get all appointments
        appointments = Appointment.objects.filter(
            patient__id=patient_id
        ).annotate(
            event_type=models.Value('appointment', output_field=models.CharField())
        )
        
        # Get all emergencies
        emergencies = EmergencyAmbulanceRequest.objects.filter(
            patient__id=patient_id
        ).annotate(
            event_type=models.Value('emergency', output_field=models.CharField())
        )
        
        # Combine and order by date
        timeline_events = sorted(
            list(records) + list(appointments) + list(emergencies),
            key=lambda x: x.date if hasattr(x, 'date') else x.request_time if hasattr(x, 'request_time') else x.appointment_date,
            reverse=True
        )
        
        serializer = MedicalTimelineSerializer(timeline_events, many=True)
        return Response(serializer.data)

# ======================== SYSTEM MANAGEMENT VIEWS ========================
class OutbreakDetectionViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin | IsHealthcareWorker]

    @action(detail=False, methods=['get'])
    def cluster_analysis(self, request):
        threshold = request.query_params.get('threshold', 5)
        clusters = self._detect_case_clusters(threshold)
        return Response(clusters)

    def _detect_case_clusters(self, threshold):
        recent_cases = SymptomCheckerSession.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7),
            risk_score__gte=70
        ).values('location', 'gps_coordinates')
        
        clusters = []
        if recent_cases.count() >= threshold:
            clusters.append({
                'location': 'High Risk Area',
                'case_count': recent_cases.count(),
                'diseases': list(set(Disease.objects.filter(
                    name__in=['Malaria', 'Pneumonia']
                ).values_list('name', flat=True)))
            })
        return clusters

class ScheduledTasksViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    @action(detail=False, methods=['post'])
    def run_daily_tasks(self, request):
        try:
            NotificationService.send_appointment_reminders()
            
            alerts = OutbreakDetectionViewSet()._detect_case_clusters(threshold=3)
            if alerts:
                ScreeningAlert.objects.create(
                    disease=Disease.objects.get(name='Malaria'),
                    location=alerts[0]['location'],
                    severity='H',
                    cases_reported=alerts[0]['case_count']
                )
            
            archived = MedicalRecord.objects.filter(
                date__lt=timezone.now() - timedelta(days=365)
            ).update(is_archived=True)
            
            return Response({
                'reminders_sent': Appointment.objects.filter(reminder_sent=True).count(),
                'alerts_generated': len(alerts),
                'records_archived': archived
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class HealthCheckViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'])
    def status(self, request):
        checks = {
            'database': self._check_database(),
            'email': self._check_email(),
            'storage': self._check_storage(),
            'last_cron': CronJobLog.objects.last().timestamp if CronJobLog.objects.exists() else None
        }
        status_code = 200 if all(checks.values()) else 503
        return Response(checks, status=status_code)

    def _check_database(self):
        try:
            User.objects.count()
            return True
        except:
            return False

    def _check_email(self):
        try:
            send_mail(
                subject='Test',
                message='Test',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.ADMIN_EMAIL],
                fail_silently=False
            )
            return True
        except:
            return False

    def _check_storage(self):
        try:
            from django.core.files.storage import default_storage
            test_file = default_storage.open('test.txt', 'w')
            test_file.write('test')
            test_file.close()
            default_storage.delete('test.txt')
            return True
        except:
            return False