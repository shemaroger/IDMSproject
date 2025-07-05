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
        elif user.role.name == 'Doctor':
            # Doctors see appointments assigned to them
            queryset = queryset.filter(healthcare_provider=user)
        elif user.role.name == 'Nurse':
            # FIXED: Nurses see appointments at their clinics (not assigned to them)
            nurse_clinics = user.clinics.all()
            queryset = queryset.filter(clinic__in=nurse_clinics)
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
        try:
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
            
            # Update appointment status
            appointment.status = 'A'
            appointment.save()
            
            # Send notification
            try:
                self._send_status_change_notification(appointment, 'P')
            except Exception as e:
                print(f"Failed to send approval notification: {e}")
            
            return Response({
                'message': 'Appointment approved successfully',
                'appointment': AppointmentSerializer(appointment, context={'request': request}).data
            })
            
        except Exception as e:
            print(f"Error in approve action: {e}")
            return Response(
                {'error': f'Failed to approve appointment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        """Cancel an appointment"""
        try:
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
            
            # Send notification
            try:
                self._send_status_change_notification(appointment, old_status)
            except Exception as e:
                print(f"Failed to send cancellation notification: {e}")
            
            return Response({
                'message': 'Appointment cancelled successfully',
                'appointment': AppointmentSerializer(appointment, context={'request': request}).data
            })
            
        except Exception as e:
            print(f"Error in cancel action: {e}")
            return Response(
                {'error': f'Failed to cancel appointment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def complete(self, request, pk=None):
        """Mark appointment as completed (doctors only)"""
        try:
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
            
            # Send notification
            try:
                self._send_status_change_notification(appointment, 'A')
            except Exception as e:
                print(f"Failed to send completion notification: {e}")
            
            return Response({
                'message': 'Appointment completed successfully',
                'appointment': AppointmentSerializer(appointment, context={'request': request}).data
            })
            
        except Exception as e:
            print(f"Error in complete action: {e}")
            return Response(
                {'error': f'Failed to complete appointment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
        try:
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
                try:
                    self._send_status_change_notification(appointment, 'P')
                except Exception as e:
                    print(f"Failed to send bulk approval notification for appointment {appointment.id}: {e}")
                
                approved_count += 1
            
            return Response({
                'success': True,
                'message': f'Successfully approved {approved_count} appointments',
                'approved_count': approved_count
            })
            
        except Exception as e:
            print(f"Error in bulk_approve action: {e}")
            return Response(
                {'error': f'Failed to bulk approve appointments: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class DiseaseViewSet(viewsets.ModelViewSet):
    queryset = Disease.objects.all()
    serializer_class = DiseaseSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['post'])
    def initialize(self, request):
        """Initialize with sample diseases"""
        try:
            malaria = Disease.create_malaria_disease()
            pneumonia = Disease.create_pneumonia_disease()
            
            return Response({
                "status": "Sample diseases created",
                "diseases": [
                    {"name": malaria.name, "created": True},
                    {"name": pneumonia.name, "created": True}
                ]
            })
        except Exception as e:
            return Response(
                {"error": f"Failed to initialize diseases: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SymptomCheckerSessionViewSet(viewsets.ModelViewSet):
    serializer_class = SymptomCheckerSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return SymptomCheckerSession.objects.all().order_by('-created_at')
        return SymptomCheckerSession.objects.filter(
            user=self.request.user
        ).order_by('-created_at')

    def perform_create(self, serializer):
        """Create session with user and auto-analyze symptoms"""
        try:
            print(f"Creating session for user: {self.request.user}")
            
            # Ensure diseases exist
            if not Disease.objects.exists():
                try:
                    Disease.create_malaria_disease()
                    Disease.create_pneumonia_disease()
                except Exception as e:
                    print(f"Warning: Could not create diseases: {e}")
            
            # Save with current user
            session = serializer.save(user=self.request.user)
            print(f"Session created: {session.id}")
            
            # Try to analyze symptoms
            try:
                if hasattr(session, 'analyze_symptoms'):
                    session.analyze_symptoms()
                    print("Symptoms analyzed")
            except Exception as e:
                print(f"Warning: Could not analyze symptoms: {e}")
                
        except Exception as e:
            print(f"Error in perform_create: {e}")
            raise

    # ✅ ADD THIS ACTION - This is what's missing!
    @action(detail=True, methods=['post'], url_path='create-diagnosis')
    def create_diagnosis(self, request, pk=None):
        """Convert session to patient diagnosis"""
        try:
            session = self.get_object()
            print(f"Creating diagnosis for session {session.id}")
            
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check if session belongs to user or user is staff
            if session.user != request.user and not request.user.is_staff:
                return Response(
                    {"error": "Permission denied"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Try to create diagnosis from session
            diagnosis = None
            
            if hasattr(session, 'create_patient_diagnosis'):
                # Use model method if it exists
                diagnosis = session.create_patient_diagnosis(request.user)
            else:
                # Fallback: create diagnosis manually
                from .models import PatientDiagnosis
                
                print("Creating diagnosis manually...")
                
                # Get primary disease from analyses
                primary_disease = None
                primary_analysis = None
                
                try:
                    if hasattr(session, 'disease_analyses'):
                        primary_analysis = session.disease_analyses.order_by('-calculated_score').first()
                        if primary_analysis:
                            primary_disease = primary_analysis.disease
                            print(f"Found primary disease: {primary_disease.name}")
                except Exception as e:
                    print(f"Error getting disease analyses: {e}")
                
                # If no primary disease found, try to get any disease
                if not primary_disease:
                    try:
                        from .models import Disease
                        primary_disease = Disease.objects.first()
                        print(f"Using fallback disease: {primary_disease.name if primary_disease else 'None'}")
                    except Exception as e:
                        print(f"Error getting fallback disease: {e}")
                
                if not primary_disease:
                    return Response(
                        {"error": "No disease identified from symptoms. Please ensure diseases are properly configured."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create diagnosis
                diagnosis_data = {
                    'patient': request.user,
                    'disease': primary_disease,
                    'symptoms': {
                        'selected': session.selected_symptoms or [],
                        'custom': session.custom_symptoms or []
                    },
                    'session': session,
                    'status': 'self_reported'
                }
                
                # Add vital signs if available
                if hasattr(session, 'temperature') and session.temperature:
                    diagnosis_data['temperature'] = session.temperature
                if hasattr(session, 'heart_rate') and session.heart_rate:
                    diagnosis_data['heart_rate'] = session.heart_rate
                
                # Add analysis data if available
                if primary_analysis:
                    diagnosis_data['severity'] = getattr(primary_analysis, 'severity_assessment', 'mild')
                    diagnosis_data['confidence_score'] = getattr(primary_analysis, 'calculated_score', 0)
                
                print(f"Creating diagnosis with data: {diagnosis_data}")
                
                try:
                    diagnosis = PatientDiagnosis.objects.create(**diagnosis_data)
                    print(f"Diagnosis created successfully: {diagnosis.id}")
                except Exception as create_error:
                    print(f"Error creating diagnosis: {create_error}")
                    # Try with minimal data
                    minimal_data = {
                        'patient': request.user,
                        'disease': primary_disease,
                        'status': 'self_reported'
                    }
                    diagnosis = PatientDiagnosis.objects.create(**minimal_data)
                    print(f"Minimal diagnosis created: {diagnosis.id}")
            
            if diagnosis:
                return Response(
                    {
                        "id": diagnosis.id,
                        "message": "Diagnosis created successfully",
                        "diagnosis": {
                            "disease": diagnosis.disease.name if diagnosis.disease else None,
                            "status": diagnosis.status,
                            "created_at": diagnosis.created_at.isoformat() if hasattr(diagnosis, 'created_at') else None
                        }
                    },
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {"error": "Could not create diagnosis. Please try again."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            print(f"Error creating diagnosis: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Failed to create diagnosis: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def add_custom_symptom(self, request, pk=None):
        """Add custom symptom to session"""
        try:
            session = self.get_object()
            symptom = request.data.get('symptom', '').strip()
            
            if not symptom:
                return Response(
                    {"error": "Symptom is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if hasattr(session, 'add_custom_symptom'):
                session.add_custom_symptom(symptom)
            else:
                # Fallback: manually add to custom_symptoms
                if not session.custom_symptoms:
                    session.custom_symptoms = []
                session.custom_symptoms.append(symptom)
                session.save()
            
            # Try to re-analyze with new symptom
            try:
                if hasattr(session, 'analyze_symptoms'):
                    session.analyze_symptoms()
            except Exception as analysis_error:
                print(f"Warning: Could not re-analyze symptoms: {analysis_error}")
            
            return Response(
                self.get_serializer(session).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Error adding custom symptom: {e}")
            return Response(
                {"error": f"Failed to add symptom: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def reanalyze(self, request, pk=None):
        """Re-analyze session symptoms"""
        try:
            session = self.get_object()
            
            if hasattr(session, 'analyze_symptoms'):
                session.analyze_symptoms()
            else:
                print("Warning: analyze_symptoms method not available")
            
            return Response(
                self.get_serializer(session).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Error reanalyzing symptoms: {e}")
            return Response(
                {"error": f"Failed to reanalyze: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class DiseaseAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DiseaseAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        session_id = self.request.query_params.get('session_id')
        if session_id:
            return DiseaseAnalysis.objects.filter(
                session_id=session_id
            ).order_by('-calculated_score')
        return DiseaseAnalysis.objects.none()


class PatientDiagnosisViewSet(viewsets.ModelViewSet):
    serializer_class = PatientDiagnosisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff and user.groups.filter(name='Doctors').exists():
            return PatientDiagnosis.objects.filter(
                Q(treating_doctor=user) | Q(treating_doctor__isnull=True)
            ).order_by('-created_at')
        elif user.is_staff:
            return PatientDiagnosis.objects.all().order_by('-created_at')
        return PatientDiagnosis.objects.filter(
            patient=user
        ).order_by('-created_at')

    def perform_create(self, serializer):
        """Create diagnosis with patient as current user"""
        serializer.save(patient=self.request.user)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Doctor confirms diagnosis"""
        try:
            diagnosis = self.get_object()
            serializer = DiagnosisConfirmationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            diagnosis.confirm_diagnosis(
                doctor=request.user,
                notes=serializer.validated_data.get('notes', ''),
                test_results=serializer.validated_data.get('test_results', None)
            )
            
            return Response(
                self.get_serializer(diagnosis).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to confirm diagnosis: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Doctor rejects diagnosis"""
        try:
            diagnosis = self.get_object()
            notes = request.data.get('notes', '')
            
            diagnosis.reject_diagnosis(
                doctor=request.user,
                notes=notes
            )
            
            return Response(
                self.get_serializer(diagnosis).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to reject diagnosis: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def assign_doctor(self, request, pk=None):
        """Assign doctor to diagnosis"""
        try:
            diagnosis = self.get_object()
            serializer = DoctorAssignmentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            diagnosis.treating_doctor = serializer.validated_data['doctor_id']
            diagnosis.save()
            
            return Response(
                self.get_serializer(diagnosis).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to assign doctor: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def treatment_plan(self, request, pk=None):
        """Get treatment plan for diagnosis"""
        try:
            diagnosis = self.get_object()
            treatment_plan = diagnosis.get_treatment_plan()
            
            if treatment_plan:
                return Response(
                    TreatmentPlanSerializer(treatment_plan).data,
                    status=status.HTTP_200_OK
                )
            
            return Response(
                {"detail": "No treatment plan exists"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to get treatment plan: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MedicalTestViewSet(viewsets.ModelViewSet):
    queryset = MedicalTest.objects.all()
    serializer_class = MedicalTestSerializer
    permission_classes = [permissions.IsAuthenticated]


class PatientTestResultViewSet(viewsets.ModelViewSet):
    serializer_class = PatientTestResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        diagnosis_id = self.request.query_params.get('diagnosis_id')
        if diagnosis_id:
            return PatientTestResult.objects.filter(
                diagnosis_id=diagnosis_id
            ).order_by('-performed_at')
        return PatientTestResult.objects.none()

    def perform_create(self, serializer):
        serializer.save(performed_by=self.request.user)


class TreatmentPlanViewSet(viewsets.ModelViewSet):
    serializer_class = TreatmentPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        diagnosis_id = self.request.query_params.get('diagnosis_id')
        if diagnosis_id:
            return TreatmentPlan.objects.filter(diagnosis_id=diagnosis_id)
        
        # If no diagnosis_id, show plans for current user
        user = self.request.user
        if user.is_staff and user.groups.filter(name='Doctors').exists():
            return TreatmentPlan.objects.filter(supervising_doctor=user)
        elif user.is_staff:
            return TreatmentPlan.objects.all()
        else:
            return TreatmentPlan.objects.filter(diagnosis__patient=user)

    def perform_create(self, serializer):
        diagnosis = serializer.validated_data['diagnosis']
        if diagnosis.treating_doctor:
            serializer.save(
                created_by=self.request.user,
                supervising_doctor=diagnosis.treating_doctor
            )
        else:
            serializer.save(
                created_by=self.request.user,
                supervising_doctor=self.request.user
            )

    @action(detail=True, methods=['post'])
    def add_medication(self, request, pk=None):
        """Add medication to treatment plan"""
        try:
            treatment_plan = self.get_object()
            serializer = MedicationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            treatment_plan.add_medication(
                name=serializer.validated_data['name'],
                dosage=serializer.validated_data['dosage'],
                frequency=serializer.validated_data['frequency']
            )
            
            return Response(
                self.get_serializer(treatment_plan).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to add medication: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark treatment plan as completed"""
        try:
            treatment_plan = self.get_object()
            treatment_plan.mark_completed()
            
            return Response(
                self.get_serializer(treatment_plan).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to complete treatment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(groups__name='Doctors')


class DoctorCasesViewSet(viewsets.GenericViewSet):
    serializer_class = PatientDiagnosisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.groups.filter(name='Doctors').exists():
            return PatientDiagnosis.objects.filter(
                treating_doctor=self.request.user
            ).order_by('-created_at')
        return PatientDiagnosis.objects.none()

    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active_cases(self, request):
        """Get doctor's active cases"""
        queryset = self.get_queryset().filter(
            status='doctor_confirmed'
        ).exclude(
            treatment_plan__duration='Completed'
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending_cases(self, request):
        """Get cases pending doctor review"""
        queryset = PatientDiagnosis.objects.filter(
            status='self_reported'
        ).order_by('-created_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
        
# class PreventionTipViewSet(viewsets.ModelViewSet):
#     """
#     ViewSet for prevention tips
#     """
#     queryset = PreventionTip.objects.all()
#     serializer_class = PreventionTipSerializer
#     permission_classes = [AllowAny]  # Tips are public information
    
#     def get_queryset(self):
#         """Filter tips by disease or category"""
#         queryset = super().get_queryset()
        
#         disease_id = self.request.query_params.get('disease_id')
#         category = self.request.query_params.get('category')
#         disease_type = self.request.query_params.get('disease_type')
        
#         if disease_id:
#             queryset = queryset.filter(disease_id=disease_id)
        
#         if category:
#             queryset = queryset.filter(category=category)
        
#         if disease_type:
#             queryset = queryset.filter(disease__disease_type=disease_type)
        
#         return queryset.order_by('priority', 'category')
    
#     @action(detail=False, methods=['get'])
#     def by_disease(self, request):
#         """Get tips grouped by disease"""
#         disease_name = request.query_params.get('disease')
#         if not disease_name:
#             return Response(
#                 {'error': 'Disease parameter required'}, 
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         try:
#             disease = Disease.objects.get(name__icontains=disease_name)
#             tips = self.get_queryset().filter(disease=disease)
            
#             # Group by category
#             grouped_tips = {}
#             for tip in tips:
#                 if tip.category not in grouped_tips:
#                     grouped_tips[tip.category] = []
#                 grouped_tips[tip.category].append(PreventionTipSerializer(tip).data)
            
#             return Response({
#                 'disease': disease.name,
#                 'tips_by_category': grouped_tips,
#                 'total_tips': tips.count()
#             })
        
#         except Disease.DoesNotExist:
#             return Response(
#                 {'error': f'Disease "{disease_name}" not found'}, 
#                 status=status.HTTP_404_NOT_FOUND
#             )

# class EmergencyAmbulanceRequestViewSet(viewsets.ModelViewSet):
#     """
#     Enhanced ViewSet for emergency ambulance requests with symptom integration
#     """
#     queryset = EmergencyAmbulanceRequest.objects.all()
#     serializer_class = EmergencyAmbulanceRequestSerializer
#     permission_classes = [IsAuthenticated]
    
#     def get_queryset(self):
#         """Filter by user's patient profile if not staff"""
#         queryset = super().get_queryset()
        
#         if not self.request.user.is_staff:
#             try:
#                 patient = Patient.objects.get(user=self.request.user)
#                 queryset = queryset.filter(patient=patient)
#             except Patient.DoesNotExist:
#                 return EmergencyAmbulanceRequest.objects.none()
        
#         return queryset.order_by('-request_time')
    
#     @action(detail=False, methods=['get'])
#     def by_disease(self, request):
#         """Get emergency requests filtered by suspected disease"""
#         disease = request.query_params.get('disease')
#         if not disease:
#             return Response(
#                 {'error': 'Disease parameter required'}, 
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         requests = self.get_queryset().filter(suspected_disease__icontains=disease)
#         serializer = self.get_serializer(requests, many=True)
        
#         return Response({
#             'disease': disease,
#             'total_requests': requests.count(),
#             'requests': serializer.data
#         })
    
#     @action(detail=False, methods=['get'])
#     def critical_cases(self, request):
#         """Get emergency requests from critical symptom sessions"""
#         # Find sessions with critical severity
#         critical_sessions = SymptomCheckerSession.objects.filter(
#             severity_level='critical',
#             created_at__gte=timezone.now() - timezone.timedelta(days=1)
#         )
        
#         # Get associated emergency requests
#         critical_requests = self.get_queryset().filter(
#             patient__user__in=[s.user for s in critical_sessions if s.user]
#         )
        
#         serializer = self.get_serializer(critical_requests, many=True)
        
#         return Response({
#             'total_critical_sessions': critical_sessions.count(),
#             'critical_requests': serializer.data
#         })

class EmergencyAmbulanceRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing emergency ambulance requests
    """
    serializer_class = EmergencyAmbulanceRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter queryset based on user permissions
        """
        queryset = EmergencyAmbulanceRequest.objects.select_related(
            'patient__user', 'clinic', 'approved_by', 'dispatched_by', 'completed_by'
        )
        
        # Get current user
        user = self.request.user
        
        # Debug logging
        print(f"User: {user.email}, Role: {user.role.name}")
        print(f"Total emergency requests in DB: {EmergencyAmbulanceRequest.objects.count()}")
        
        # Filter based on user role
        if user.role.name == 'Patient':
            # Patients can only see their own requests
            print(f"Patient filter: patient__user={user}")
            queryset = queryset.filter(patient__user=user)
            
        elif user.role.name in ['Doctor', 'Nurse']:
            # Medical staff can see requests from their assigned clinics OR requests with no clinic
            user_clinics = user.clinics.all()
            print(f"Medical staff assigned clinics: {list(user_clinics)}")
            
            # Apply the clinic filter
            clinic_filter = Q(clinic__in=user_clinics) | Q(clinic__isnull=True)
            queryset = queryset.filter(clinic_filter)
            print(f"After clinic filtering: {queryset.count()} requests")
            
        elif user.role.name == 'Admin':
            # Admins can see all requests (no additional filtering)
            print("Admin user - showing all requests")
            pass
        else:
            # Unknown role - show no requests for security
            print(f"Unknown role: {user.role.name} - blocking access")
            queryset = queryset.none()
        
        final_count = queryset.count()
        print(f"Final queryset count: {final_count}")
        
        return queryset.order_by('-request_time')
    
    def perform_create(self, serializer):
        """
        Set the patient automatically if user is a patient
        """
        user = self.request.user
        print(f"Creating request for user: {user.email}, Role: {user.role.name}")
        
        if user.role.name == 'Patient':
            # Get the patient object for this user
            try:
                patient = user.patient
                print(f"Found patient: {patient.id}")
                serializer.save(patient=patient)
            except AttributeError:
                print(f"Error: User {user.email} doesn't have a patient profile")
                # Try to find patient by user relationship
                from .models import Patient
                try:
                    patient = Patient.objects.get(user=user)
                    print(f"Found patient via query: {patient.id}")
                    serializer.save(patient=patient)
                except Patient.DoesNotExist:
                    print(f"Error: No patient found for user {user.email}")
                    raise ValidationError("Patient profile not found for this user")
        else:
            # Non-patient users (doctors, nurses, admins) creating on behalf of someone
            serializer.save()
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve an emergency request
        """
        emergency_request = self.get_object()
        
        # Check permissions
        if request.user.role.name not in ['Admin', 'Doctor', 'Nurse']:
            return Response(
                {'error': 'You do not have permission to approve emergency requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update approval status
        emergency_request.approval_status = 'approved'
        emergency_request.approved_by = request.user
        emergency_request.approved_at = timezone.now()
        emergency_request.approval_comments = request.data.get('comments', '')
        emergency_request.priority_override = request.data.get('priority', '')
        emergency_request.urgency_level = request.data.get('urgency_level', '')
        emergency_request.save()
        
        print(f"Request {pk} approved by {request.user.email}")
        
        serializer = self.get_serializer(emergency_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject an emergency request
        """
        emergency_request = self.get_object()
        
        # Check permissions
        if request.user.role.name not in ['Admin', 'Doctor', 'Nurse']:
            return Response(
                {'error': 'You do not have permission to reject emergency requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate rejection reason
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {'error': 'Rejection reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update approval status
        emergency_request.approval_status = 'rejected'
        emergency_request.approved_by = request.user
        emergency_request.approved_at = timezone.now()
        emergency_request.approval_comments = request.data.get('comments', '')
        emergency_request.rejection_reason = reason
        emergency_request.save()
        
        print(f"Request {pk} rejected by {request.user.email}: {reason}")
        
        serializer = self.get_serializer(emergency_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def dispatch(self, request, pk=None):
        """
        Dispatch ambulance to emergency request
        """
        emergency_request = self.get_object()
        
        # Check if request is approved
        if emergency_request.approval_status != 'approved':
            return Response(
                {'error': 'Emergency request must be approved before dispatch'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate ambulance ID
        ambulance_id = request.data.get('ambulance_id', '').strip()
        if not ambulance_id:
            return Response(
                {'error': 'Ambulance ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update dispatch information
        emergency_request.status = 'D'
        emergency_request.assigned_ambulance = ambulance_id
        emergency_request.hospital_destination = request.data.get('hospital_destination', '')
        emergency_request.dispatched_by = request.user
        emergency_request.dispatched_at = timezone.now()
        emergency_request.save()
        
        print(f"Request {pk} dispatched by {request.user.email} - Ambulance: {ambulance_id}")
        
        serializer = self.get_serializer(emergency_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Update emergency request status
        """
        emergency_request = self.get_object()
        new_status = request.data.get('status')
        
        # Validate status
        valid_statuses = dict(EmergencyAmbulanceRequest.STATUS_CHOICES)
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Valid options: {list(valid_statuses.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status and timestamps
        old_status = emergency_request.status
        emergency_request.status = new_status
        now = timezone.now()
        
        # Set appropriate timestamp based on new status
        if new_status == 'A' and not emergency_request.arrived_at:
            emergency_request.arrived_at = now
        elif new_status == 'T' and not emergency_request.in_transit_at:
            emergency_request.in_transit_at = now
        elif new_status == 'C' and not emergency_request.completed_at:
            emergency_request.completed_at = now
            emergency_request.completed_by = request.user
        
        emergency_request.save()
        
        print(f"Request {pk} status updated from {old_status} to {new_status} by {request.user.email}")
        
        serializer = self.get_serializer(emergency_request)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get emergency request statistics
        """
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'pending': queryset.filter(approval_status='pending').count(),
            'approved': queryset.filter(approval_status='approved').count(),
            'rejected': queryset.filter(approval_status='rejected').count(),
            'by_status': {
                status_code: queryset.filter(status=status_code).count()
                for status_code, _ in EmergencyAmbulanceRequest.STATUS_CHOICES
            },
            'by_clinic': list(
                queryset.values('clinic__name')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),
            'critical_pending': queryset.filter(
                approval_status='pending',
                priority_override='critical'
            ).count(),
        }
        
        print(f"Statistics generated for {request.user.email}: {stats}")
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def debug_info(self, request):
        """
        Debug endpoint to check data and permissions
        """
        user = request.user
        
        # Get basic counts
        total_requests = EmergencyAmbulanceRequest.objects.count()
        user_clinics = list(user.clinics.all().values('id', 'name')) if hasattr(user, 'clinics') else []
        
        # Get sample requests
        sample_requests = list(
            EmergencyAmbulanceRequest.objects.values(
                'id', 'patient_id', 'clinic_id', 'approval_status', 'status'
            )[:5]
        )
        
        debug_data = {
            'user_info': {
                'id': user.id,
                'email': user.email,
                'role': user.role.name,
                'assigned_clinics': user_clinics
            },
            'database_info': {
                'total_requests': total_requests,
                'sample_requests': sample_requests
            },
            'queryset_info': {
                'filtered_count': self.get_queryset().count(),
                'filter_logic': f"Role: {user.role.name} - Applied appropriate filters"
            }
        }
        
        return Response(debug_data)
    
    def list(self, request, *args, **kwargs):
        """
        Override list to add debug logging
        """
        print(f"\n=== Emergency Request List Called ===")
        print(f"User: {request.user.email}")
        print(f"Role: {request.user.role.name}")
        
        # Call parent list method
        response = super().list(request, *args, **kwargs)
        
        print(f"Returning {len(response.data.get('results', []))} requests")
        print("=====================================\n")
        
        return response

# ======================== ALERT SYSTEM VIEWS ========================
# class ScreeningAlertViewSet(viewsets.ModelViewSet):
#     queryset = ScreeningAlert.objects.all()
#     serializer_class = ScreeningAlertSerializer
#     permission_classes = [IsAdmin | IsHealthcareWorker]
#     filterset_fields = ['disease', 'severity', 'is_resolved']

# class HealthcareWorkerAlertViewSet(viewsets.ModelViewSet):
#     queryset = HealthcareWorkerAlert.objects.all()
#     serializer_class = HealthcareWorkerAlertSerializer
#     permission_classes = [IsHealthcareWorker]

#     def get_queryset(self):
#         return self.queryset.filter(recipient=self.request.user)

#     @action(detail=True, methods=['post'])
#     def acknowledge(self, request, pk=None):
#         alert = self.get_object()
#         alert.is_read = True
#         alert.save()
#         return Response({'status': 'alert acknowledged'})
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