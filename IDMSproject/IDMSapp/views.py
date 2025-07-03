from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework import filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission, AllowAny, IsAuthenticated
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework.authtoken.models import Token  
from django.conf import settings
from django.db.models import Q
from django.db.models import Count
from collections import Counter
from django.contrib.auth import authenticate, login, logout
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
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
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # Support file uploads
    
    def get_queryset(self):
        return self.queryset if self.request.user.is_superuser else self.queryset.filter(user=self.request.user)
    
    def get_serializer_context(self):
        """
        Add request to serializer context for URL building
        """
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """
        Automatically set the user when creating a profile
        """
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """
        Handle profile updates with proper user assignment
        """
        # Ensure user can only update their own profile (unless superuser)
        if not self.request.user.is_superuser and serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only update your own profile.")
        
        serializer.save()
    
    @action(detail=False, methods=['get'], url_path='me')
    def get_my_profile(self, request):
        """
        Get the current user's profile
        URL: /profiles/me/
        """
        try:
            profile = UserProfile.objects.get(user=request.user)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return Response(
                {"detail": "Profile not found. Please create a profile first."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post', 'put', 'patch'], url_path='me')
    def update_my_profile(self, request):
        """
        Create or update the current user's profile
        URL: /profiles/me/
        """
        try:
            profile = UserProfile.objects.get(user=request.user)
            # Update existing profile
            serializer = self.get_serializer(profile, data=request.data, partial=True)
        except UserProfile.DoesNotExist:
            # Create new profile
            serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='me/upload-picture')
    def upload_profile_picture(self, request):
        """
        Upload only the profile picture
        URL: /profiles/me/upload-picture/
        """
        try:
            profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response(
                {"detail": "Profile not found. Please create a profile first."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if 'profile_picture' not in request.FILES:
            return Response(
                {"detail": "No image file provided."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update only the profile picture
        serializer = self.get_serializer(
            profile, 
            data={'profile_picture': request.FILES['profile_picture']}, 
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Profile picture uploaded successfully.",
                "profile_picture_url": serializer.instance.profile_picture_url
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['delete'], url_path='me/remove-picture')
    def remove_profile_picture(self, request):
        """
        Remove the current user's profile picture
        URL: /profiles/me/remove-picture/
        """
        try:
            profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response(
                {"detail": "Profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if profile.profile_picture:
            # Delete the file
            profile.profile_picture.delete(save=False)
            profile.profile_picture = None
            profile.save()
            
            return Response({
                "message": "Profile picture removed successfully.",
                "profile_picture_url": profile.profile_picture_url  # Will return default image URL
            }, status=status.HTTP_200_OK)
        
        return Response(
            {"detail": "No profile picture to remove."},
            status=status.HTTP_400_BAD_REQUEST
        )

class PatientViewSet(viewsets.ModelViewSet, NotificationMixin):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAdmin | IsHealthcareWorker | IsPatient]
    filterset_fields = ['insurance_provider']

    def get_queryset(self):
        if self.request.user.role.name == 'Patient':
            return self.queryset.filter(user=self.request.user)
        return self.queryset

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Appointment, Clinic, User, DoctorSchedule
from .serializers import AppointmentCreateSerializer, AppointmentUpdateSerializer, AppointmentSerializer

class AppointmentViewSet(viewsets.ModelViewSet, NotificationMixin):
    queryset = Appointment.objects.select_related(
        'patient', 'healthcare_provider__role', 'clinic'
    ).prefetch_related('patient__profile', 'healthcare_provider__profile')
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'healthcare_provider', 'patient', 'clinic']
    ordering = ['-appointment_date']

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return AppointmentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AppointmentUpdateSerializer
        return AppointmentSerializer

    def get_queryset(self):
        """Filter appointments based on user role"""
        user = self.request.user
        queryset = self.queryset
        
        if user.role.name == 'Patient':
            # Patients see only their own appointments
            queryset = queryset.filter(patient=user)
        elif user.role.name in ['Doctor', 'Nurse']:
            # Healthcare providers see appointments assigned to them
            queryset = queryset.filter(healthcare_provider=user)
        # Admins see all appointments (no additional filtering)
        
        return queryset

    # ======================== CLINIC-FIRST FLOW ACTIONS ========================
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def available_clinics(self, request):
        """Get all available clinics for appointment booking"""
        from django.db.models import Count, Q
        
        clinics = Clinic.objects.filter(is_public=True).annotate(
            doctors_count=Count('staff', filter=Q(staff__role__name='Doctor')),
            nurses_count=Count('staff', filter=Q(staff__role__name='Nurse'))
        ).order_by('name')
        
        from .serializers import ClinicSerializer
        serializer = ClinicSerializer(clinics, many=True)
        return Response({
            'count': clinics.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def clinic_doctors(self, request):
        """Get doctors available at a specific clinic"""
        clinic_id = request.query_params.get('clinic_id')
        
        if not clinic_id:
            return Response(
                {'error': 'clinic_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response(
                {'error': 'Clinic not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get doctors working at this clinic
        doctors = clinic.staff.filter(
            role__name='Doctor'
        ).select_related('role', 'profile').order_by('first_name', 'last_name')
        
        from .serializers import DoctorSerializer
        serializer = DoctorSerializer(doctors, many=True)
        
        return Response({
            'clinic': ClinicSerializer(clinic).data,
            'doctors': serializer.data,
            'count': doctors.count()
        })


    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def doctor_availability(self, request):
        """Get doctor's availability for appointment booking"""
        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        date = request.query_params.get('date')  # Format: YYYY-MM-DD
        
        if not all([doctor_id, clinic_id]):
            return Response(
                {'error': 'doctor_id and clinic_id parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            doctor = User.objects.get(id=doctor_id, role__name='Doctor')
            clinic = Clinic.objects.get(id=clinic_id)
        except (User.DoesNotExist, Clinic.DoesNotExist):
            return Response(
                {'error': 'Doctor or clinic not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate doctor works at clinic
        if not doctor.clinics.filter(id=clinic_id).exists():
            return Response(
                {'error': 'Doctor does not work at this clinic'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse date or use today
        if date:
            try:
                check_date = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            check_date = timezone.now().date()
        
        # Get available time slots
        time_slots = self._get_available_slots(doctor, clinic, check_date)
        
        return Response({
            'date': check_date.isoformat(),
            'doctor': DoctorSerializer(doctor).data,
            'clinic': ClinicSerializer(clinic).data,
            'available': len([slot for slot in time_slots if slot['available']]) > 0,
            'time_slots': time_slots
        })

    def _get_available_slots(self, doctor, clinic, date):
        """Generate available time slots for a doctor"""
        day_of_week = date.weekday()
        
        # Get doctor's schedule for this day
        schedules = DoctorSchedule.objects.filter(
            doctor=doctor,
            clinic=clinic,
            day_of_week=day_of_week,
            is_active=True
        )
        
        if not schedules.exists():
            return []
        
        slots = []
        for schedule in schedules:
            # Generate hourly slots
            current_time = schedule.start_time
            while current_time < schedule.end_time:
                slot_datetime = timezone.make_aware(
                    datetime.combine(date, current_time)
                )
                
                # Skip past slots
                if slot_datetime <= timezone.now():
                    current_time = (datetime.combine(date, current_time) + timedelta(hours=1)).time()
                    continue
                
                # Check if slot is available
                is_booked = Appointment.objects.filter(
                    healthcare_provider=doctor,
                    clinic=clinic,
                    appointment_date=slot_datetime,
                    status__in=['P', 'A']
                ).exists()
                
                slots.append({
                    'time': current_time.strftime('%H:%M'),
                    'datetime': slot_datetime.isoformat(),
                    'available': not is_booked
                })
                
                # Move to next hour
                current_time = (datetime.combine(date, current_time) + timedelta(hours=1)).time()
        
        return slots

    # ======================== APPOINTMENT ACTIONS ========================
    def perform_create(self, serializer):
        """Create appointment and send notifications"""
        appointment = serializer.save()
        
        # Send confirmation email to patient
        try:
            self._send_email(
                recipient=appointment.patient.email,
                subject=f"Appointment Confirmation - {appointment.appointment_date.strftime('%b %d, %Y')}",
                template_name="appointment_created.html",
                context={
                    'patient_name': appointment.patient.get_full_name(),
                    'appointment_date': appointment.appointment_date,
                    'provider_name': appointment.healthcare_provider.get_full_name(),
                    'clinic_name': appointment.clinic.name,
                    'reason': appointment.reason,
                    'appointment_id': appointment.id
                }
            )
        except Exception as e:
            print(f"Failed to send appointment confirmation email: {e}")
        
        # Notify nurses at the clinic for approval
        try:
            clinic_nurses = appointment.clinic.staff.filter(role__name='Nurse')
            for nurse in clinic_nurses:
                self._send_email(
                    recipient=nurse.email,
                    subject=f"New Appointment Request - {appointment.appointment_date.strftime('%b %d, %Y')}",
                    template_name="appointment_nurse_notification.html",
                    context={
                        'nurse_name': nurse.get_full_name(),
                        'patient_name': appointment.patient.get_full_name(),
                        'doctor_name': appointment.healthcare_provider.get_full_name(),
                        'appointment_date': appointment.appointment_date,
                        'clinic_name': appointment.clinic.name,
                        'reason': appointment.reason,
                        'appointment_id': appointment.id
                    }
                )
        except Exception as e:
            print(f"Failed to send nurse notification email: {e}")

    def perform_update(self, serializer):
        """Update appointment and send notifications"""
        old_status = self.get_object().status
        appointment = serializer.save()
        
        # Send notification if status changed
        if old_status != appointment.status:
            self._send_status_change_notification(appointment, old_status)

    def _send_status_change_notification(self, appointment, old_status):
        """Send notification when appointment status changes"""
        status_messages = {
            'A': 'approved',
            'C': 'cancelled',
            'D': 'completed',
            'R': 'rescheduled',
            'N': 'marked as no-show'
        }
        
        if appointment.status in status_messages:
            try:
                self._send_email(
                    recipient=appointment.patient.email,
                    subject=f"Appointment {status_messages[appointment.status].title()}",
                    template_name="appointment_status_change.html",
                    context={
                        'patient_name': appointment.patient.get_full_name(),
                        'appointment_date': appointment.appointment_date,
                        'provider_name': appointment.healthcare_provider.get_full_name(),
                        'clinic_name': appointment.clinic.name,
                        'old_status': old_status,
                        'new_status': appointment.status,
                        'status_message': status_messages[appointment.status],
                        'appointment_id': appointment.id,
                        'notes': appointment.notes
                    }
                )
            except Exception as e:
                print(f"Failed to send status change notification: {e}")

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def approve(self, request, pk=None):
        """Approve an appointment (NURSES ONLY)"""
        appointment = self.get_object()
        
        # Check permissions - ONLY NURSES can approve
        if request.user.role.name != 'Nurse':
            return Response(
                {'error': 'Only nurses can approve appointments'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if nurse works at the same clinic
        if not request.user.clinics.filter(id=appointment.clinic.id).exists():
            return Response(
                {'error': 'You can only approve appointments at your clinic'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if appointment.status != 'P':
            return Response(
                {'error': 'Only pending appointments can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        appointment.status = 'A'
        appointment.save()
        
        self._send_status_change_notification(appointment, 'P')
        
        return Response({
            'message': 'Appointment approved successfully',
            'appointment': AppointmentSerializer(appointment, context={'request': request}).data
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        """Cancel an appointment"""
        appointment = self.get_object()
        
        # Check permissions
        can_cancel = False
        user_role = request.user.role.name
        
        if user_role == 'Patient':
            can_cancel = (appointment.patient == request.user and 
                         appointment.can_be_cancelled())
        elif user_role == 'Nurse':
            can_cancel = request.user.clinics.filter(id=appointment.clinic.id).exists()
        elif user_role == 'Doctor':
            can_cancel = appointment.healthcare_provider == request.user
        elif user_role == 'Admin':
            can_cancel = True
        
        if not can_cancel:
            return Response(
                {'error': 'You do not have permission to cancel this appointment'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if appointment.status in ['C', 'D']:
            return Response(
                {'error': 'Cannot cancel completed or already cancelled appointments'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = appointment.status
        appointment.status = 'C'
        appointment.save()
        
        self._send_status_change_notification(appointment, old_status)
        
        return Response({
            'message': 'Appointment cancelled successfully',
            'appointment': AppointmentSerializer(appointment, context={'request': request}).data
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def complete(self, request, pk=None):
        """Mark appointment as completed (doctors only)"""
        appointment = self.get_object()
        
        # Check permissions - only assigned doctor can complete
        if request.user.role.name != 'Doctor':
            return Response(
                {'error': 'Only doctors can complete appointments'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if appointment.healthcare_provider != request.user:
            return Response(
                {'error': 'You can only complete your own appointments'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if appointment.status != 'A':
            return Response(
                {'error': 'Only approved appointments can be completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Optional fields from the provider
        notes = request.data.get('notes', '')
        diagnosis = request.data.get('diagnosis', '')
        
        if notes:
            appointment.notes = notes
        if diagnosis:
            appointment.diagnosis = diagnosis
        
        appointment.status = 'D'
        appointment.save()
        
        self._send_status_change_notification(appointment, 'A')
        
        return Response({
            'message': 'Appointment completed successfully',
            'appointment': AppointmentSerializer(appointment, context={'request': request}).data
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def pending_for_approval(self, request):
        """Get appointments pending for approval (nurses only)"""
        if request.user.role.name != 'Nurse':
            return Response(
                {'error': 'Only nurses can view pending appointments'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get pending appointments at nurse's clinics
        nurse_clinics = request.user.clinics.all()
        pending_appointments = Appointment.objects.filter(
            clinic__in=nurse_clinics,
            status='P'
        ).select_related('patient', 'healthcare_provider', 'clinic').order_by('appointment_date')
        
        serializer = AppointmentSerializer(pending_appointments, many=True, context={'request': request})
        return Response({
            'count': pending_appointments.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_upcoming(self, request):
        """Get current user's upcoming appointments"""
        if request.user.role.name == 'Patient':
            appointments = Appointment.objects.filter(
                patient=request.user,
                appointment_date__gte=timezone.now(),
                status__in=['P', 'A']
            ).select_related('healthcare_provider', 'clinic').order_by('appointment_date')[:5]
        elif request.user.role.name == 'Doctor':
            appointments = Appointment.objects.filter(
                healthcare_provider=request.user,
                appointment_date__gte=timezone.now(),
                status__in=['P', 'A']
            ).select_related('patient', 'clinic').order_by('appointment_date')[:10]
        elif request.user.role.name == 'Nurse':
            # Nurses see pending appointments at their clinics
            nurse_clinics = request.user.clinics.all()
            appointments = Appointment.objects.filter(
                clinic__in=nurse_clinics,
                appointment_date__gte=timezone.now(),
                status='P'
            ).select_related('patient', 'healthcare_provider', 'clinic').order_by('appointment_date')[:10]
        else:
            # Admin sees system-wide upcoming appointments
            appointments = Appointment.objects.filter(
                appointment_date__gte=timezone.now(),
                status__in=['P', 'A']
            ).select_related('patient', 'healthcare_provider', 'clinic').order_by('appointment_date')[:20]
        
        serializer = AppointmentSerializer(appointments, many=True, context={'request': request})
        return Response({
            'count': len(appointments),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request):
        """Get appointment statistics for current user"""
        user = request.user
        
        if user.role.name == 'Patient':
            queryset = Appointment.objects.filter(patient=user)
        elif user.role.name == 'Doctor':
            queryset = Appointment.objects.filter(healthcare_provider=user)
        elif user.role.name == 'Nurse':
            nurse_clinics = user.clinics.all()
            queryset = Appointment.objects.filter(clinic__in=nurse_clinics)
        else:
            queryset = Appointment.objects.all()
        
        stats = {
            'total': queryset.count(),
            'pending': queryset.filter(status='P').count(),
            'approved': queryset.filter(status='A').count(),
            'completed': queryset.filter(status='D').count(),
            'cancelled': queryset.filter(status='C').count()
        }
        
        # Add upcoming count
        stats['upcoming'] = queryset.filter(
            appointment_date__gte=timezone.now(),
            status__in=['P', 'A']
        ).count()
        
        return Response(stats)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def calendar_view(self, request):
        """Get appointments in calendar format"""
        # Get date range from query params
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date:
            start_date = timezone.now().date()
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        
        if not end_date:
            end_date = start_date + timedelta(days=30)
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Filter appointments by user role and date range
        queryset = self.get_queryset().filter(
            appointment_date__date__gte=start_date,
            appointment_date__date__lte=end_date
        ).select_related('patient', 'healthcare_provider', 'clinic')
        
        # Group by date
        calendar_data = {}
        for appointment in queryset:
            date_str = appointment.appointment_date.date().isoformat()
            if date_str not in calendar_data:
                calendar_data[date_str] = []
            
            calendar_data[date_str].append({
                'id': appointment.id,
                'time': appointment.appointment_date.time().strftime('%H:%M'),
                'patient_name': appointment.patient.get_full_name(),
                'provider_name': appointment.healthcare_provider.get_full_name(),
                'clinic_name': appointment.clinic.name,
                'reason': appointment.reason,
                'status': appointment.status,
                'status_display': appointment.get_status_display()
            })
        
        return Response({
            'start_date': start_date,
            'end_date': end_date,
            'appointments': calendar_data
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def bulk_approve(self, request):
        """Bulk approve appointments (nurses only)"""
        if request.user.role.name != 'Nurse':
            return Response(
                {'error': 'Only nurses can bulk approve appointments'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment_ids = request.data.get('appointment_ids', [])
        if not appointment_ids:
            return Response(
                {'error': 'No appointment IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get nurse's clinics
        nurse_clinics = request.user.clinics.all()
        
        # Filter appointments that the nurse can approve
        appointments = Appointment.objects.filter(
            id__in=appointment_ids,
            clinic__in=nurse_clinics,
            status='P'
        )
        
        approved_count = 0
        for appointment in appointments:
            appointment.status = 'A'
            appointment.save()
            
            # Send notification
            self._send_status_change_notification(appointment, 'P')
            approved_count += 1
        
        return Response({
            'message': f'Successfully approved {approved_count} appointments',
            'approved_count': approved_count
        })
class DiseaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing diseases with symptom analysis capabilities
    """
    queryset = Disease.objects.all()
    serializer_class = DiseaseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return DiseaseCreateSerializer
        return DiseaseSerializer
    
    def get_permissions(self):
        """Allow anonymous access for list and retrieve (for symptom checking)"""
        if self.action in ['list', 'retrieve', 'get_symptoms', 'analyze_symptom']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['get'])
    def symptoms(self, request, pk=None):
        """Get all symptoms for a specific disease"""
        disease = self.get_object()
        return Response({
            'disease': disease.name,
            'symptoms': disease.common_symptoms,
            'symptom_weights': disease.symptom_weights,
            'total_symptoms': len(disease.common_symptoms)
        })
    
    @action(detail=True, methods=['post'])
    def analyze_symptom(self, request, pk=None):
        """Analyze given symptoms against this specific disease"""
        disease = self.get_object()
        symptoms = request.data.get('symptoms', [])
        
        if not symptoms:
            return Response(
                {'error': 'No symptoms provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        score = disease.get_symptom_score(symptoms)
        severity = disease.get_severity_level(score)
        recommendation = disease.get_recommendation(score)
        
        return Response({
            'disease': disease.name,
            'symptoms_analyzed': symptoms,
            'score': score,
            'severity_level': severity,
            'recommendation': recommendation,
            'thresholds': {
                'mild': disease.mild_threshold,
                'moderate': disease.moderate_threshold,
                'severe': disease.severe_threshold,
                'emergency': disease.emergency_threshold
            }
        })
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Bulk create diseases with templates"""
        serializer = BulkDiseaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        created_diseases = []
        
        if serializer.validated_data['create_defaults']:
            # Create malaria if it doesn't exist
            if not Disease.objects.filter(disease_type='malaria').exists():
                malaria = Disease.create_malaria_disease()
                created_diseases.append(malaria)
            
            # Create pneumonia if it doesn't exist
            if not Disease.objects.filter(disease_type='pneumonia').exists():
                pneumonia = Disease.create_pneumonia_disease()
                created_diseases.append(pneumonia)
        
        # Create additional diseases
        for disease_data in serializer.validated_data['additional_diseases']:
            disease_serializer = DiseaseCreateSerializer(data=disease_data)
            disease_serializer.is_valid(raise_exception=True)
            disease = disease_serializer.save()
            created_diseases.append(disease)
        
        return Response({
            'created': len(created_diseases),
            'diseases': DiseaseSerializer(created_diseases, many=True).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def available_symptoms(self, request):
        """Get all available symptoms across all diseases"""
        all_symptoms = set()
        for disease in self.get_queryset():
            all_symptoms.update(disease.common_symptoms)
        
        return Response({
            'total_unique_symptoms': len(all_symptoms),
            'symptoms': sorted(list(all_symptoms))
        })

class SymptomCheckerSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for symptom checker sessions with analysis capabilities
    """
    serializer_class = SymptomCheckerSessionSerializer
    permission_classes = [AllowAny]  # Allow anonymous symptom checking
    
    def get_queryset(self):
        """Filter sessions by user if authenticated"""
        if self.request.user.is_authenticated:
            return SymptomCheckerSession.objects.filter(user=self.request.user)
        else:
            # For anonymous users, only return sessions from last 24 hours
            yesterday = timezone.now() - timezone.timedelta(days=1)
            return SymptomCheckerSession.objects.filter(
                user__isnull=True,
                created_at__gte=yesterday
            )
    
    def perform_create(self, serializer):
        """Auto-assign user if authenticated and generate session_id"""
        save_kwargs = {}
        if self.request.user.is_authenticated:
            save_kwargs['user'] = self.request.user
        save_kwargs['session_id'] = str(uuid.uuid4())
        serializer.save(**save_kwargs)
    
    @action(detail=False, methods=['post'])
    def analyze_symptoms(self, request):
        """Analyze symptoms and create session with results"""
        serializer = SymptomAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create session
        session_data = {
            'selected_symptoms': serializer.validated_data['selected_symptoms'],
            'custom_symptoms': serializer.validated_data.get('custom_symptoms', []),
            'location': serializer.validated_data.get('location', ''),
            'age_range': serializer.validated_data.get('age_range', ''),
            'gender': serializer.validated_data.get('gender', ''),
            'session_id': str(uuid.uuid4())
        }
        
        if request.user.is_authenticated:
            session_data['user'] = request.user
        
        session = SymptomCheckerSession.objects.create(**session_data)
        
        # Analyze symptoms
        session.analyze_symptoms()
        
        # Calculate disease analysis probabilities
        analyses = DiseaseAnalysis.objects.filter(session=session)
        for analysis in analyses:
            analysis.calculate_probability()
        
        # Prepare response
        prevention_tips = []
        if session.primary_suspected_disease:
            prevention_tips = session.primary_suspected_disease.prevention_tips.filter(
                category__in=['prevention', 'emergency_signs']
            )[:3]
        
        response_data = {
            'session_id': session.session_id,
            'overall_risk_score': session.overall_risk_score,
            'severity_level': session.severity_level,
            'recommendation': session.recommendation,
            'primary_suspected_disease': session.primary_suspected_disease.name if session.primary_suspected_disease else 'Unknown',
            'disease_analyses': DiseaseAnalysisSerializer(analyses, many=True).data,
            'needs_followup': session.needs_followup,
            'followup_date': session.followup_date,
            'emergency_recommended': session.severity_level == 'critical',
            'nearest_clinic_recommended': session.severity_level in ['severe', 'critical'],
            'prevention_tips': PreventionTipSerializer(prevention_tips, many=True).data
        }
        
        response_serializer = SymptomAnalysisResponseSerializer(data=response_data)
        response_serializer.is_valid()
        
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def add_symptom(self, request, pk=None):
        """Add a custom symptom to existing session"""
        session = self.get_object()
        symptom = request.data.get('symptom', '').strip()
        
        if not symptom:
            return Response(
                {'error': 'Symptom cannot be empty'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.add_custom_symptom(symptom)
        session.analyze_symptoms()  # Re-analyze with new symptom
        
        return Response({
            'message': f'Symptom "{symptom}" added successfully',
            'updated_score': session.overall_risk_score,
            'updated_severity': session.severity_level,
            'all_symptoms': session.get_all_symptoms()
        })
    
    @action(detail=True, methods=['post'])
    def reanalyze(self, request, pk=None):
        """Re-run analysis for a session"""
        session = self.get_object()
        session.analyze_symptoms()
        
        return Response({
            'message': 'Analysis updated successfully',
            'results': SymptomCheckerSessionSerializer(session).data
        })
    
    @action(detail=True, methods=['post'])
    def request_emergency(self, request, pk=None):
        """Create emergency ambulance request from symptom session"""
        session = self.get_object()
        
        if not session.user:
            return Response(
                {'error': 'User must be logged in to request emergency services'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user has patient profile
        try:
            patient = Patient.objects.get(user=session.user)
        except Patient.DoesNotExist:
            return Response(
                {'error': 'Patient profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create emergency request
        emergency_data = {
            'patient': patient,
            'location': request.data.get('location', session.location),
            'gps_coordinates': request.data.get('gps_coordinates', ''),
            'condition_description': f"Symptom analysis shows {session.severity_level} condition. "
                                   f"Primary suspected disease: {session.primary_suspected_disease.name if session.primary_suspected_disease else 'Unknown'}. "
                                   f"Symptoms: {', '.join(session.get_all_symptoms())}",
            'suspected_disease': session.primary_suspected_disease.name if session.primary_suspected_disease else ''
        }
        
        emergency_request = EmergencyAmbulanceRequest.objects.create(**emergency_data)
        
        return Response({
            'message': 'Emergency request created successfully',
            'emergency_request_id': emergency_request.id,
            'request': EmergencyAmbulanceRequestSerializer(emergency_request).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get symptom checker statistics"""
        # Base queryset
        sessions = SymptomCheckerSession.objects.all()
        
        # Filter by date range if provided
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timezone.timedelta(days=days)
        sessions = sessions.filter(created_at__gte=start_date)
        
        # Calculate statistics
        total_sessions = sessions.count()
        
        # Severity distribution
        severity_counts = sessions.values('severity_level').annotate(count=Count('id'))
        sessions_by_severity = {item['severity_level']: item['count'] for item in severity_counts}
        
        # Most common symptoms
        all_symptoms = []
        for session in sessions:
            all_symptoms.extend(session.get_all_symptoms())
        most_common_symptoms = dict(Counter(all_symptoms).most_common(10))
        
        # Disease distribution
        disease_counts = sessions.filter(primary_suspected_disease__isnull=False).values(
            'primary_suspected_disease__name'
        ).annotate(count=Count('id'))
        disease_distribution = {item['primary_suspected_disease__name']: item['count'] for item in disease_counts}
        
        # Emergency cases today
        today = timezone.now().date()
        emergency_cases_today = sessions.filter(
            severity_level='critical',
            created_at__date=today
        ).count()
        
        # Follow-up needed
        followup_needed = sessions.filter(needs_followup=True).count()
        
        stats_data = {
            'total_sessions': total_sessions,
            'sessions_by_severity': sessions_by_severity,
            'most_common_symptoms': most_common_symptoms,
            'disease_distribution': disease_distribution,
            'emergency_cases_today': emergency_cases_today,
            'followup_needed': followup_needed
        }
        
        serializer = SymptomCheckerStatsSerializer(data=stats_data)
        serializer.is_valid()
        
        return Response(serializer.data)

class DiseaseAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for disease analysis results
    """
    queryset = DiseaseAnalysis.objects.all()
    serializer_class = DiseaseAnalysisSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Filter by session if provided"""
        queryset = super().get_queryset()
        session_id = self.request.query_params.get('session_id')
        if session_id:
            queryset = queryset.filter(session__session_id=session_id)
        return queryset.order_by('-calculated_score')

class PreventionTipViewSet(viewsets.ModelViewSet):
    """
    ViewSet for prevention tips
    """
    queryset = PreventionTip.objects.all()
    serializer_class = PreventionTipSerializer
    permission_classes = [AllowAny]  # Tips are public information
    
    def get_queryset(self):
        """Filter tips by disease or category"""
        queryset = super().get_queryset()
        
        disease_id = self.request.query_params.get('disease_id')
        category = self.request.query_params.get('category')
        disease_type = self.request.query_params.get('disease_type')
        
        if disease_id:
            queryset = queryset.filter(disease_id=disease_id)
        
        if category:
            queryset = queryset.filter(category=category)
        
        if disease_type:
            queryset = queryset.filter(disease__disease_type=disease_type)
        
        return queryset.order_by('priority', 'category')
    
    @action(detail=False, methods=['get'])
    def by_disease(self, request):
        """Get tips grouped by disease"""
        disease_name = request.query_params.get('disease')
        if not disease_name:
            return Response(
                {'error': 'Disease parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            disease = Disease.objects.get(name__icontains=disease_name)
            tips = self.get_queryset().filter(disease=disease)
            
            # Group by category
            grouped_tips = {}
            for tip in tips:
                if tip.category not in grouped_tips:
                    grouped_tips[tip.category] = []
                grouped_tips[tip.category].append(PreventionTipSerializer(tip).data)
            
            return Response({
                'disease': disease.name,
                'tips_by_category': grouped_tips,
                'total_tips': tips.count()
            })
        
        except Disease.DoesNotExist:
            return Response(
                {'error': f'Disease "{disease_name}" not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class EmergencyAmbulanceRequestViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for emergency ambulance requests with symptom integration
    """
    queryset = EmergencyAmbulanceRequest.objects.all()
    serializer_class = EmergencyAmbulanceRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by user's patient profile if not staff"""
        queryset = super().get_queryset()
        
        if not self.request.user.is_staff:
            try:
                patient = Patient.objects.get(user=self.request.user)
                queryset = queryset.filter(patient=patient)
            except Patient.DoesNotExist:
                return EmergencyAmbulanceRequest.objects.none()
        
        return queryset.order_by('-request_time')
    
    @action(detail=False, methods=['get'])
    def by_disease(self, request):
        """Get emergency requests filtered by suspected disease"""
        disease = request.query_params.get('disease')
        if not disease:
            return Response(
                {'error': 'Disease parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        requests = self.get_queryset().filter(suspected_disease__icontains=disease)
        serializer = self.get_serializer(requests, many=True)
        
        return Response({
            'disease': disease,
            'total_requests': requests.count(),
            'requests': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def critical_cases(self, request):
        """Get emergency requests from critical symptom sessions"""
        # Find sessions with critical severity
        critical_sessions = SymptomCheckerSession.objects.filter(
            severity_level='critical',
            created_at__gte=timezone.now() - timezone.timedelta(days=1)
        )
        
        # Get associated emergency requests
        critical_requests = self.get_queryset().filter(
            patient__user__in=[s.user for s in critical_sessions if s.user]
        )
        
        serializer = self.get_serializer(critical_requests, many=True)
        
        return Response({
            'total_critical_sessions': critical_sessions.count(),
            'critical_requests': serializer.data
        })

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
class PreventionTipViewSet(viewsets.ModelViewSet):
    """
    ViewSet for prevention tips
    """
    queryset = PreventionTip.objects.all()
    serializer_class = PreventionTipSerializer
    permission_classes = [AllowAny]  # Tips are public information
    
    def get_queryset(self):
        """Filter tips by disease or category"""
        queryset = super().get_queryset()
        
        disease_id = self.request.query_params.get('disease_id')
        category = self.request.query_params.get('category')
        disease_type = self.request.query_params.get('disease_type')
        
        if disease_id:
            queryset = queryset.filter(disease_id=disease_id)
        
        if category:
            queryset = queryset.filter(category=category)
        
        if disease_type:
            queryset = queryset.filter(disease__disease_type=disease_type)
        
        return queryset.order_by('priority', 'category')
    
    @action(detail=False, methods=['get'])
    def by_disease(self, request):
        """Get tips grouped by disease"""
        disease_name = request.query_params.get('disease')
        if not disease_name:
            return Response(
                {'error': 'Disease parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            disease = Disease.objects.get(name__icontains=disease_name)
            tips = self.get_queryset().filter(disease=disease)
            
            # Group by category
            grouped_tips = {}
            for tip in tips:
                if tip.category not in grouped_tips:
                    grouped_tips[tip.category] = []
                grouped_tips[tip.category].append(PreventionTipSerializer(tip).data)
            
            return Response({
                'disease': disease.name,
                'tips_by_category': grouped_tips,
                'total_tips': tips.count()
            })
        
        except Disease.DoesNotExist:
            return Response(
                {'error': f'Disease "{disease_name}" not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class EmergencyAmbulanceRequestViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for emergency ambulance requests with symptom integration
    """
    queryset = EmergencyAmbulanceRequest.objects.all()
    serializer_class = EmergencyAmbulanceRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by user's patient profile if not staff"""
        queryset = super().get_queryset()
        
        if not self.request.user.is_staff:
            try:
                patient = Patient.objects.get(user=self.request.user)
                queryset = queryset.filter(patient=patient)
            except Patient.DoesNotExist:
                return EmergencyAmbulanceRequest.objects.none()
        
        return queryset.order_by('-request_time')
    
    @action(detail=False, methods=['get'])
    def by_disease(self, request):
        """Get emergency requests filtered by suspected disease"""
        disease = request.query_params.get('disease')
        if not disease:
            return Response(
                {'error': 'Disease parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        requests = self.get_queryset().filter(suspected_disease__icontains=disease)
        serializer = self.get_serializer(requests, many=True)
        
        return Response({
            'disease': disease,
            'total_requests': requests.count(),
            'requests': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def critical_cases(self, request):
        """Get emergency requests from critical symptom sessions"""
        # Find sessions with critical severity
        critical_sessions = SymptomCheckerSession.objects.filter(
            severity_level='critical',
            created_at__gte=timezone.now() - timezone.timedelta(days=1)
        )
        
        # Get associated emergency requests
        critical_requests = self.get_queryset().filter(
            patient__user__in=[s.user for s in critical_sessions if s.user]
        )
        
        serializer = self.get_serializer(critical_requests, many=True)
        
        return Response({
            'total_critical_sessions': critical_sessions.count(),
            'emergency_requests_created': critical_requests.count(),
            'requests': serializer.data
        })
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update emergency request status"""
        emergency_request = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(EmergencyAmbulanceRequest.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        emergency_request.status = new_status
        
        # Update additional fields based on status
        if new_status == 'D':  # Dispatched
            emergency_request.assigned_ambulance = request.data.get('assigned_ambulance', '')
        elif new_status == 'C':  # Completed
            emergency_request.hospital_destination = request.data.get('hospital_destination', '')
        
        emergency_request.save()
        
        return Response({
            'message': f'Status updated to {emergency_request.get_status_display()}',
            'request': self.get_serializer(emergency_request).data
        })

# Additional utility views for symptom checker integration

class SymptomCheckerUtilityViewSet(viewsets.ViewSet):
    """
    Utility endpoints for symptom checker functionality
    """
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def quick_check(self, request):
        """Quick symptom check without creating a session"""
        symptoms = request.data.get('symptoms', [])
        if not symptoms:
            return Response(
                {'error': 'No symptoms provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Analyze against all diseases
        results = []
        for disease in Disease.objects.all():
            score = disease.get_symptom_score(symptoms)
            if score > 0:  # Only include diseases with matching symptoms
                results.append({
                    'disease': disease.name,
                    'disease_type': disease.disease_type,
                    'score': score,
                    'severity': disease.get_severity_level(score),
                    'recommendation': disease.get_recommendation(score)
                })
        
        # Sort by score descending
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return Response({
            'symptoms_analyzed': symptoms,
            'total_diseases_checked': Disease.objects.count(),
            'matching_diseases': len(results),
            'results': results[:5],  # Top 5 matches
            'highest_severity': results[0]['severity'] if results else 'mild'
        })
    
    @action(detail=False, methods=['get'])
    def symptom_library(self, request):
        """Get organized library of all symptoms"""
        diseases = Disease.objects.all()
        symptom_library = {}
        
        for disease in diseases:
            for symptom in disease.common_symptoms:
                if symptom not in symptom_library:
                    symptom_library[symptom] = {
                        'name': symptom,
                        'diseases': [],
                        'max_weight': 0,
                        'category': 'general'
                    }
                
                weight = disease.symptom_weights.get(symptom, 1)
                symptom_library[symptom]['diseases'].append({
                    'disease': disease.name,
                    'type': disease.disease_type,
                    'weight': weight
                })
                symptom_library[symptom]['max_weight'] = max(
                    symptom_library[symptom]['max_weight'], 
                    weight
                )
        
        # Categorize symptoms by severity
        for symptom_data in symptom_library.values():
            max_weight = symptom_data['max_weight']
            if max_weight >= 15:
                symptom_data['category'] = 'critical'
            elif max_weight >= 10:
                symptom_data['category'] = 'severe'
            elif max_weight >= 5:
                symptom_data['category'] = 'moderate'
            else:
                symptom_data['category'] = 'mild'
        
        # Group by category
        categorized = {
            'critical': [],
            'severe': [],
            'moderate': [],
            'mild': []
        }
        
        for symptom_data in symptom_library.values():
            categorized[symptom_data['category']].append(symptom_data)
        
        return Response({
            'total_symptoms': len(symptom_library),
            'symptoms_by_category': categorized,
            'all_symptoms': sorted(list(symptom_library.keys()))
        })
    
    @action(detail=False, methods=['get'])
    def disease_comparison(self, request):
        """Compare symptoms between diseases"""
        disease_ids = request.query_params.getlist('disease_ids')
        if len(disease_ids) < 2:
            return Response(
                {'error': 'At least 2 disease IDs required for comparison'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        diseases = Disease.objects.filter(id__in=disease_ids)
        if diseases.count() != len(disease_ids):
            return Response(
                {'error': 'One or more disease IDs not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        comparison = {}
        all_symptoms = set()
        
        # Collect all symptoms
        for disease in diseases:
            all_symptoms.update(disease.common_symptoms)
            comparison[disease.name] = {
                'symptoms': disease.common_symptoms,
                'weights': disease.symptom_weights,
                'thresholds': {
                    'mild': disease.mild_threshold,
                    'moderate': disease.moderate_threshold,
                    'severe': disease.severe_threshold,
                    'emergency': disease.emergency_threshold
                }
            }
        
        # Find common and unique symptoms
        disease_symptom_sets = {d.name: set(d.common_symptoms) for d in diseases}
        common_symptoms = set.intersection(*disease_symptom_sets.values())
        
        unique_symptoms = {}
        for disease_name, symptom_set in disease_symptom_sets.items():
            unique_symptoms[disease_name] = symptom_set - common_symptoms
        
        return Response({
            'diseases_compared': [d.name for d in diseases],
            'total_unique_symptoms': len(all_symptoms),
            'common_symptoms': list(common_symptoms),
            'unique_symptoms': unique_symptoms,
            'detailed_comparison': comparison
        })
    
    @action(detail=False, methods=['get'])
    def risk_assessment_guide(self, request):
        """Get risk assessment guidelines"""
        return Response({
            'severity_levels': {
                'mild': {
                    'description': 'Symptoms are manageable and can be monitored at home',
                    'action': 'Rest, hydration, over-the-counter remedies',
                    'when_to_escalate': 'If symptoms worsen or persist beyond 48 hours'
                },
                'moderate': {
                    'description': 'Symptoms require medical attention but not urgent',
                    'action': 'Schedule appointment with healthcare provider within 24-48 hours',
                    'when_to_escalate': 'If symptoms worsen significantly'
                },
                'severe': {
                    'description': 'Symptoms indicate serious condition requiring prompt care',
                    'action': 'Seek medical attention today, contact doctor or visit clinic',
                    'when_to_escalate': 'If any critical symptoms develop'
                },
                'critical': {
                    'description': 'Life-threatening symptoms requiring immediate attention',
                    'action': 'Call emergency services or go to nearest hospital immediately',
                    'when_to_escalate': 'This is already the highest level - act immediately'
                }
            },
            'red_flag_symptoms': [
                'difficulty_breathing',
                'chest_pain',
                'confusion',
                'seizures',
                'blue_lips_or_fingernails',
                'severe_chest_pain',
                'loss_of_consciousness'
            ],
            'when_to_call_emergency': [
                'Severe difficulty breathing',
                'Chest pain or pressure',
                'Severe confusion or altered mental state',
                'Seizures',
                'Signs of severe dehydration',
                'High fever with confusion',
                'Any symptom that feels life-threatening'
            ]
        })

# ViewSet for managing symptom checker sessions for healthcare providers
class HealthcareProviderSymptomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for healthcare providers to manage and review symptom checker sessions
    """
    queryset = SymptomCheckerSession.objects.all()
    serializer_class = SymptomCheckerSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Only healthcare workers and admins can access"""
        if hasattr(self.request.user, 'role') and self.request.user.role:
            if self.request.user.role.name in ['Doctor', 'Nurse', 'Admin']:
                return [IsAuthenticated()]
        return [IsAuthenticated()]  # Will be denied by get_queryset if not authorized
    
    def get_queryset(self):
        """Filter sessions based on user role and clinic assignments"""
        user = self.request.user
        
        # Admins see all
        if user.is_staff or (hasattr(user, 'role') and user.role and user.role.name == 'Admin'):
            return SymptomCheckerSession.objects.all()
        
        # Healthcare workers see sessions from their clinics or unassigned
        if hasattr(user, 'role') and user.role and user.role.name in ['Doctor', 'Nurse']:
            # Get user's clinics
            user_clinics = getattr(user, 'clinics', None)
            if user_clinics and user_clinics.exists():
                clinic_locations = [clinic.name for clinic in user_clinics.all()]
                return SymptomCheckerSession.objects.filter(
                    Q(location__in=clinic_locations) | Q(location='') | Q(user__isnull=True)
                )
        
        # No access for other roles
        return SymptomCheckerSession.objects.none()
    
    @action(detail=False, methods=['get'])
    def urgent_cases(self, request):
        """Get urgent cases requiring attention"""
        urgent_sessions = self.get_queryset().filter(
            severity_level__in=['severe', 'critical'],
            needs_followup=True
        ).order_by('-overall_risk_score', '-created_at')
        
        serializer = self.get_serializer(urgent_sessions, many=True)
        
        return Response({
            'total_urgent_cases': urgent_sessions.count(),
            'critical_cases': urgent_sessions.filter(severity_level='critical').count(),
            'severe_cases': urgent_sessions.filter(severity_level='severe').count(),
            'cases': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def add_clinical_notes(self, request, pk=None):
        """Add clinical notes to a symptom session"""
        session = self.get_object()
        notes = request.data.get('notes', '')
        
        if not notes:
            return Response(
                {'error': 'Notes cannot be empty'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store notes in session (you might want to create a separate ClinicalNotes model)
        if not hasattr(session, 'clinical_notes'):
            session.clinical_notes = []
        
        clinical_note = {
            'provider': request.user.get_full_name(),
            'provider_id': request.user.id,
            'notes': notes,
            'timestamp': timezone.now().isoformat()
        }
        
        # For this example, we'll store in a JSON field (add to your model if needed)
        # session.clinical_notes.append(clinical_note)
        # session.save()
        
        return Response({
            'message': 'Clinical notes added successfully',
            'note_added': clinical_note
        })
    
    @action(detail=True, methods=['post'])
    def mark_reviewed(self, request, pk=None):
        """Mark session as reviewed by healthcare provider"""
        session = self.get_object()
        
        # You might want to add a 'reviewed_by' field to your model
        # session.reviewed_by = request.user
        # session.reviewed_at = timezone.now()
        # session.needs_followup = False
        # session.save()
        
        return Response({
            'message': 'Session marked as reviewed',
            'reviewed_by': request.user.get_full_name(),
            'reviewed_at': timezone.now()
        })
# # ======================== PREVENTION VIEWS ========================
# class PreventiveTipViewSet(viewsets.ModelViewSet):
#     queryset = PreventiveTip.objects.filter(is_active=True)
#     serializer_class = PreventiveTipSerializer
#     permission_classes = [permissions.IsAuthenticatedOrReadOnly]
#     filterset_fields = ['tip_type', 'disease_target', 'priority']

#     @action(detail=False, methods=['get'])
#     def for_disease(self, request):
#         disease = request.query_params.get('disease')
#         if not disease:
#             return Response(
#                 {'error': 'disease parameter is required'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         tips = self.queryset.filter(
#             Q(disease_target=disease.upper()) | 
#             Q(disease_target='BOTH') |
#             Q(related_symptoms__related_diseases__contains=[disease.lower()])
#         ).distinct()
        
#         return Response(self.get_serializer(tips, many=True).data)

# # ======================== MEDICAL HISTORY VIEWS ========================
# class PatientMedicalHistoryViewSet(viewsets.ReadOnlyModelViewSet):
#     """Consolidated medical history endpoint"""
#     serializer_class = MedicalHistorySerializer  # Use the new serializer
#     permission_classes = [IsPatientOrProvider]

#     def get_queryset(self):
#         patient_id = self.kwargs.get('patient_id')
#         return MedicalRecord.objects.filter(
#             patient__id=patient_id
#         ).select_related(
#             'appointment', 
#             'emergency_request',
#             'patient'
#         ).prefetch_related(
#             'related_diseases',
#             'prescriptions'
#         )

#     @action(detail=False, methods=['get'])
#     def timeline(self, request, patient_id=None):
#         """Custom timeline view combining multiple record types"""
#         from django.db.models import Subquery, OuterRef
#         from django.db import models
        
#         # Get all medical records
#         records = MedicalRecord.objects.filter(
#             patient__id=patient_id
#         ).annotate(
#             event_type=models.Value('record', output_field=models.CharField())
#         )
        
#         # Get all appointments
#         appointments = Appointment.objects.filter(
#             patient__id=patient_id
#         ).annotate(
#             event_type=models.Value('appointment', output_field=models.CharField())
#         )
        
#         # Get all emergencies
#         emergencies = EmergencyAmbulanceRequest.objects.filter(
#             patient__id=patient_id
#         ).annotate(
#             event_type=models.Value('emergency', output_field=models.CharField())
#         )
        
#         # Combine and order by date
#         timeline_events = sorted(
#             list(records) + list(appointments) + list(emergencies),
#             key=lambda x: x.date if hasattr(x, 'date') else x.request_time if hasattr(x, 'request_time') else x.appointment_date,
#             reverse=True
#         )
        
#         serializer = MedicalTimelineSerializer(timeline_events, many=True)
#         return Response(serializer.data)

# # ======================== SYSTEM MANAGEMENT VIEWS ========================
# class OutbreakDetectionViewSet(viewsets.ViewSet):
#     permission_classes = [IsAdmin | IsHealthcareWorker]

#     @action(detail=False, methods=['get'])
#     def cluster_analysis(self, request):
#         threshold = request.query_params.get('threshold', 5)
#         clusters = self._detect_case_clusters(threshold)
#         return Response(clusters)

#     def _detect_case_clusters(self, threshold):
#         recent_cases = SymptomCheckerSession.objects.filter(
#             created_at__gte=timezone.now() - timedelta(days=7),
#             risk_score__gte=70
#         ).values('location', 'gps_coordinates')
        
#         clusters = []
#         if recent_cases.count() >= threshold:
#             clusters.append({
#                 'location': 'High Risk Area',
#                 'case_count': recent_cases.count(),
#                 'diseases': list(set(Disease.objects.filter(
#                     name__in=['Malaria', 'Pneumonia']
#                 ).values_list('name', flat=True)))
#             })
#         return clusters

# class ScheduledTasksViewSet(viewsets.ViewSet):
#     permission_classes = [IsAdmin]

#     @action(detail=False, methods=['post'])
#     def run_daily_tasks(self, request):
#         try:
#             NotificationService.send_appointment_reminders()
            
#             alerts = OutbreakDetectionViewSet()._detect_case_clusters(threshold=3)
#             if alerts:
#                 ScreeningAlert.objects.create(
#                     disease=Disease.objects.get(name='Malaria'),
#                     location=alerts[0]['location'],
#                     severity='H',
#                     cases_reported=alerts[0]['case_count']
#                 )
            
#             archived = MedicalRecord.objects.filter(
#                 date__lt=timezone.now() - timedelta(days=365)
#             ).update(is_archived=True)
            
#             return Response({
#                 'reminders_sent': Appointment.objects.filter(reminder_sent=True).count(),
#                 'alerts_generated': len(alerts),
#                 'records_archived': archived
#             })
#         except Exception as e:
#             return Response({'error': str(e)}, status=500)

# class HealthCheckViewSet(viewsets.ViewSet):
#     permission_classes = [permissions.AllowAny]

#     @action(detail=False, methods=['get'])
#     def status(self, request):
#         checks = {
#             'database': self._check_database(),
#             'email': self._check_email(),
#             'storage': self._check_storage(),
#             'last_cron': CronJobLog.objects.last().timestamp if CronJobLog.objects.exists() else None
#         }
#         status_code = 200 if all(checks.values()) else 503
#         return Response(checks, status=status_code)

#     def _check_database(self):
#         try:
#             User.objects.count()
#             return True
#         except:
#             return False

#     def _check_email(self):
#         try:
#             send_mail(
#                 subject='Test',
#                 message='Test',
#                 from_email=settings.DEFAULT_FROM_EMAIL,
#                 recipient_list=[settings.ADMIN_EMAIL],
#                 fail_silently=False
#             )
#             return True
#         except:
#             return False

#     def _check_storage(self):
#         try:
#             from django.core.files.storage import default_storage
#             test_file = default_storage.open('test.txt', 'w')
#             test_file.write('test')
#             test_file.close()
#             default_storage.delete('test.txt')
#             return True
#         except:
#             return False