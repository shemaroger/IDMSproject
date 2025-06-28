from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework import filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework.authtoken.models import Token  
from django.conf import settings
from django.db.models import Q
from django.contrib.auth import authenticate, login, logout
from django_filters.rest_framework import DjangoFilterBackend
from .models import *
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
    permission_classes = [permissions.AllowAny]  # Allow unauthenticated access
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        """Login user and return user data with auth token"""
        print(f"Login endpoint hit! Data: {request.data}")
        
        # Validate input data
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Authenticate user
        user = authenticate(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password']
        )
        
        if not user:
            print(f"Authentication failed for email: {serializer.validated_data['email']}")
            return Response(
                {'error': 'Invalid email or password'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        if not user.is_active:
            print(f"Inactive user attempted login: {user.email}")
            return Response(
                {'error': 'Account is disabled. Please contact support.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get or create authentication token
        token, created = Token.objects.get_or_create(user=user)
        print(f"Token for user {user.email}: {'created' if created else 'retrieved'}")
        
        # Log the user in (creates session)
        login(request, user)
        
        # Return success response
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        """Register new patient user"""
        print(f"Register endpoint hit! Data keys: {list(request.data.keys())}")
        
        # Validate input data
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Create user with all related data
            user = serializer.save()
            print(f"User registered successfully: {user.email}")
            
            # Create authentication token for new user
            token, created = Token.objects.get_or_create(user=user)
            print(f"Token created for new user: {user.email}")
            
            # Send welcome email (optional - won't fail registration if email fails)
            try:
                self._send_email(
                    recipient=user.email,
                    subject="Welcome to HealthLink",
                    template_name="welcome.html",
                    context={'user': user}
                )
                print(f"Welcome email sent to: {user.email}")
            except Exception as email_error:
                print(f"Welcome email failed (non-critical): {email_error}")
                # Don't fail registration if email fails
            
            return Response(
                {
                    'message': 'Registration successful',
                    'user': UserSerializer(user).data,
                    'token': token.key
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            print(f"Registration error: {str(e)}")
            # Return detailed error for debugging
            return Response(
                {'error': f'Registration failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """Logout user by deleting their authentication token"""
        print(f"Logout endpoint hit for user: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
        
        try:
            if request.user.is_authenticated:
                # Delete the user's token to invalidate it
                Token.objects.filter(user=request.user).delete()
                
                # Logout from session
                logout(request)
                
                return Response({
                    'message': 'Successfully logged out'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'User not authenticated'
                }, status=status.HTTP_401_UNAUTHORIZED)
                
        except Exception as e:
            print(f"Logout error: {str(e)}")
            return Response({
                'error': f'Logout failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user's profile information"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            user_data = UserSerializer(request.user).data
            
            # Add profile data if exists
            try:
                profile_data = UserProfileSerializer(request.user.profile).data
                user_data['profile'] = profile_data
            except:
                user_data['profile'] = None
            
            # Add patient data if user is a patient
            if request.user.role and request.user.role.name == 'Patient':
                try:
                    patient_data = PatientSerializer(request.user.patient).data
                    user_data['patient'] = patient_data
                except:
                    user_data['patient'] = None
            
            return Response({
                'user': user_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Profile fetch error: {str(e)}")
            return Response({
                'error': f'Failed to fetch profile: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def forgot_password(self, request):
        """Send password reset email"""
        email = request.data.get('email')
        
        if not email:
            return Response({
                'error': 'Email is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            user = User.objects.get(email=email)
            
            # Generate password reset token (you'll need to implement this)
            # For now, just send a simple email
            self._send_email(
                recipient=email,
                subject="Password Reset Request",
                template_name="password_reset.html",
                context={'user': user}
            )
            
            return Response({
                'message': 'Password reset email sent'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            return Response({
                'message': 'If the email exists, a password reset link has been sent'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Password reset error: {str(e)}")
            return Response({
                'error': 'Password reset failed'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user's password"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not old_password or not new_password:
            return Response({
                'error': 'Both old and new passwords are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not request.user.check_password(old_password):
            return Response({
                'error': 'Current password is incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 8:
            return Response({
                'error': 'New password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            request.user.set_password(new_password)
            request.user.save()
            
            # Regenerate token for security
            Token.objects.filter(user=request.user).delete()
            new_token = Token.objects.create(user=request.user)
            
            return Response({
                'message': 'Password changed successfully',
                'token': new_token.key
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Password change error: {str(e)}")
            return Response({
                'error': 'Password change failed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
# ======================== CORE MODEL VIEWSETS ========================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related(
        'role'
    ).prefetch_related(
        'profile',
        'patient',
        'clinics'  # This will prefetch the related clinics
    ).all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['role__name', 'is_active', 'clinics__id']
    
    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create user with clinic assignments"""
        print(f"UserViewSet.create called with data: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            print(f"User created successfully: {user.email}")
            print(f"User clinics after creation: {list(user.clinics.all())}")
            
            # Return full user data after creation
            response_serializer = UserSerializer(user)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            print(f"User creation error: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update user with clinic assignments"""
        print(f"UserViewSet.update called with data: {request.data}")
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            print(f"User updated successfully: {user.email}")
            print(f"User clinics after update: {list(user.clinics.all())}")
            
            # Return full user data after update
            response_serializer = UserSerializer(user)
            return Response(response_serializer.data)
        except Exception as e:
            print(f"User update error: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'], url_path='debug-clinics')
    def debug_clinics(self, request, pk=None):
        """Debug endpoint to check user's clinic assignments"""
        user = self.get_object()
        
        clinic_data = []
        for clinic in user.clinics.all():
            clinic_data.append({
                'id': clinic.id,
                'name': clinic.name,
                'address': clinic.address
            })
        
        # Also check from the clinic side
        clinic_assignments = []
        all_clinics = Clinic.objects.all()
        for clinic in all_clinics:
            if user in clinic.staff.all():
                clinic_assignments.append({
                    'id': clinic.id,
                    'name': clinic.name,
                    'user_in_staff': True
                })
        
        return Response({
            'user_id': user.id,
            'user_email': user.email,
            'user_role': user.role.name if user.role else None,
            'clinic_count_via_user': user.clinics.count(),
            'clinics_via_user': clinic_data,
            'clinic_count_via_clinic': len(clinic_assignments),
            'clinics_via_clinic': clinic_assignments
        })

    @action(detail=True, methods=['post'], url_path='assign-clinics')
    def assign_clinics(self, request, pk=None):
        """Assign clinics to a user"""
        user = self.get_object()
        if user.role.name not in ['Doctor', 'Nurse']:
            return Response(
                {"detail": "Only medical staff can be assigned to clinics"},
                status=status.HTTP_400_BAD_REQUEST
            )
                
        clinic_ids = request.data.get('clinic_ids', [])
        if not clinic_ids:
            return Response(
                {"clinic_ids": "This field is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        clinics = Clinic.objects.filter(id__in=clinic_ids)
        if clinics.count() != len(clinic_ids):
            return Response(
                {"clinic_ids": "One or more clinics don't exist"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clear existing assignments
        current_clinics = Clinic.objects.filter(staff=user)
        for clinic in current_clinics:
            clinic.staff.remove(user)
            
        # Add new assignments
        for clinic in clinics:
            clinic.staff.add(user)
            
        return Response(
            {"detail": "Clinics updated successfully"},
            status=status.HTTP_200_OK
        )
class ClinicViewSet(viewsets.ModelViewSet):
    """ViewSet for managing clinics"""
    queryset = Clinic.objects.all()
    serializer_class = ClinicSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_public']
    search_fields = ['name', 'address']
    
    def get_permissions(self):
        """Allow read access to authenticated users, write access to admins"""
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=True, methods=['get'])
    def staff(self, request, pk=None):
        """Get all staff members assigned to this clinic"""
        clinic = self.get_object()
        staff_members = clinic.staff.all()
        from .serializers import UserSerializer
        serializer = UserSerializer(staff_members, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign_staff(self, request, pk=None):
        """Assign staff members to this clinic"""
        clinic = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response(
                {"error": "user_ids is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(
            id__in=user_ids,
            role__name__in=['Doctor', 'Nurse']
        )
        
        if users.count() != len(user_ids):
            return Response(
                {"error": "Some users are not medical staff or don't exist"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        clinic.staff.add(*users)
        return Response({"message": f"Successfully assigned {users.count()} staff members"})
    
    @action(detail=True, methods=['post'])
    def remove_staff(self, request, pk=None):
        """Remove staff members from this clinic"""
        clinic = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response(
                {"error": "user_ids is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = clinic.staff.filter(id__in=user_ids)
        clinic.staff.remove(*users)
        
        return Response({"message": f"Successfully removed {users.count()} staff members"})
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