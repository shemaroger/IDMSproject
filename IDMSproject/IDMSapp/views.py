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
from rest_framework.authtoken.models import Token  
from django.conf import settings
from django.db.models import Q
from django.contrib.auth import authenticate, login, logout
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
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        print(f"Attempting login for email: {email}")
        
        # DEBUG: Check if user exists and verify details
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user_obj = User.objects.get(email=email)
            print(f"✓ User found: {user_obj.email}")
            print(f"  - Active: {user_obj.is_active}")
            print(f"  - Staff: {user_obj.is_staff}")
            print(f"  - Superuser: {user_obj.is_superuser}")
            print(f"  - Has usable password: {user_obj.has_usable_password()}")
            print(f"  - Password check result: {user_obj.check_password(password)}")
            
            # Check if password is correct manually first
            if not user_obj.check_password(password):
                print(f"❌ Password verification failed for {email}")
                return Response(
                    {'error': 'Invalid email or password'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
        except User.DoesNotExist:
            print(f"❌ No user found with email: {email}")
            return Response(
                {'error': 'Invalid email or password'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Now try Django's authenticate function
        print(f"Attempting Django authenticate() for: {email}")
        user = authenticate(
            request=request,
            email=email,
            password=password
        )
        
        if not user:
            print(f"❌ Django authenticate() failed for email: {email}")
            print("This might be an authentication backend issue")
            
            # Try alternative authentication approach
            print("Trying manual authentication...")
            if user_obj and user_obj.check_password(password) and user_obj.is_active:
                user = user_obj
                print("✓ Manual authentication successful")
            else:
                return Response(
                    {'error': 'Authentication failed'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        else:
            print(f"✓ Django authenticate() successful for: {email}")
            
        if not user.is_active:
            print(f"❌ User account is inactive: {user.email}")
            return Response(
                {'error': 'Account is disabled. Please contact support.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get or create authentication token
        token, created = Token.objects.get_or_create(user=user)
        print(f"✓ Token for user {user.email}: {'created' if created else 'retrieved'}")
        
        # Log the user in (creates session)
        from django.contrib.auth import login as auth_login
        auth_login(request, user)
        
        # Return success response with comprehensive user data
        user_data = UserSerializer(user).data
        
        # Add role information
        if user.role:
            user_data['role'] = {
                'name': user.role.name,
                'id': user.role.id
            }
        else:
            user_data['role'] = None
            
        # Add staff status
        user_data['is_staff'] = user.is_staff
        user_data['is_superuser'] = user.is_superuser
        
        return Response({
            'message': 'Login successful',
            'user': user_data,
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
            
            # Ensure user has a default role if none assigned
            if not user.role:
                try:
                    from IDMSproject.IDMSapp.models import Role  # Replace 'your_app' with your actual app name
                    default_role = Role.objects.get(name='Patient')
                    user.role = default_role
                    user.save()
                    print(f"Assigned default Patient role to: {user.email}")
                except Role.DoesNotExist:
                    print(f"Warning: Patient role not found in database")
            
            # Create authentication token for new user
            token, created = Token.objects.get_or_create(user=user)
            print(f"Token created for new user: {user.email}")
            
            # Send welcome email (optional - won't fail registration if email fails)
            try:
                self._send_welcome_email(user)
                print(f"Welcome email sent to: {user.email}")
            except Exception as email_error:
                print(f"Welcome email failed (non-critical): {email_error}")
                # Don't fail registration if email fails
            
            # Prepare user data response
            user_data = UserSerializer(user).data
            
            # Add role information
            if user.role:
                user_data['role'] = {
                    'name': user.role.name,
                    'id': user.role.id
                }
            else:
                user_data['role'] = None
                print(f"Warning: User {user.email} has no role assigned")
                
            # Add staff status
            user_data['is_staff'] = user.is_staff
            user_data['is_superuser'] = user.is_superuser
            
            return Response(
                {
                    'message': 'Registration successful',
                    'user': user_data,
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
                from django.contrib.auth import logout as auth_logout
                auth_logout(request)
                
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
            except AttributeError:
                user_data['profile'] = None
                print(f"No profile found for user: {request.user.email}")
            
            # Add role-specific data based on user type
            if request.user.role:
                user_data['role'] = {
                    'name': request.user.role.name,
                    'id': request.user.role.id
                }
                
                # Add patient data if user is a patient
                if request.user.role.name == 'Patient':
                    try:
                        patient_data = PatientSerializer(request.user.patient).data
                        user_data['patient'] = patient_data
                    except AttributeError:
                        user_data['patient'] = None
                        print(f"No patient data found for user: {request.user.email}")
                
                # Add staff/doctor data if user is healthcare professional
                elif request.user.role.name in ['Doctor', 'Nurse', 'Admin']:
                    user_data['is_healthcare_professional'] = True
                    # You can add specific staff/doctor serializer data here if you have it
                    # user_data['doctor'] = DoctorSerializer(request.user.doctor).data
            else:
                user_data['role'] = None
            
            # Add staff status
            user_data['is_staff'] = request.user.is_staff
            user_data['is_superuser'] = request.user.is_superuser
            
            return Response({
                'user': user_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Profile fetch error: {str(e)}")
            return Response({
                'error': f'Failed to fetch profile: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

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
            
            # Send password reset email
            self._send_password_reset_email(user)
            
            print(f"Password reset email sent to: {email}")
            
            return Response({
                'message': 'Password reset email sent'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            print(f"Password reset attempted for non-existent email: {email}")
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
        
        # Enhanced password validation
        if len(new_password) < 8:
            return Response({
                'error': 'New password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Optional: Add more password strength checks
        if old_password == new_password:
            return Response({
                'error': 'New password must be different from current password'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            request.user.set_password(new_password)
            request.user.save()
            
            print(f"Password changed successfully for user: {request.user.email}")
            
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

    @action(detail=False, methods=['post'])
    def refresh_token(self, request):
        """Refresh authentication token"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            # Delete old token and create new one
            Token.objects.filter(user=request.user).delete()
            new_token = Token.objects.create(user=request.user)
            
            print(f"Token refreshed for user: {request.user.email}")
            
            return Response({
                'message': 'Token refreshed successfully',
                'token': new_token.key
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Token refresh error: {str(e)}")
            return Response({
                'error': 'Token refresh failed'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def update_profile(self, request):
        """Update user profile information"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            # Update basic user fields
            user_data = {}
            if 'first_name' in request.data:
                user_data['first_name'] = request.data['first_name']
            if 'last_name' in request.data:
                user_data['last_name'] = request.data['last_name']
            
            if user_data:
                for field, value in user_data.items():
                    setattr(request.user, field, value)
                request.user.save()
            
            # Update profile if data provided
            profile_data = request.data.get('profile', {})
            if profile_data:
                profile, created = UserProfile.objects.get_or_create(user=request.user)
                for field, value in profile_data.items():
                    if hasattr(profile, field):
                        setattr(profile, field, value)
                profile.save()
            
            print(f"Profile updated for user: {request.user.email}")
            
            # Return updated user data
            updated_user_data = UserSerializer(request.user).data
            
            # Add profile data
            try:
                updated_user_data['profile'] = UserProfileSerializer(request.user.profile).data
            except AttributeError:
                updated_user_data['profile'] = None
            
            # Add role information
            if request.user.role:
                updated_user_data['role'] = {
                    'name': request.user.role.name,
                    'id': request.user.role.id
                }
            else:
                updated_user_data['role'] = None
                
            # Add staff status
            updated_user_data['is_staff'] = request.user.is_staff
            updated_user_data['is_superuser'] = request.user.is_superuser
            
            return Response({
                'message': 'Profile updated successfully',
                'user': updated_user_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Profile update error: {str(e)}")
            return Response({
                'error': f'Profile update failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def permissions(self, request):
        """Get user permissions and capabilities based on role"""
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            permissions = {
                'can_view_patients': False,
                'can_edit_patients': False,
                'can_view_appointments': False,
                'can_create_appointments': False,
                'can_view_medical_records': False,
                'can_edit_medical_records': False,
                'can_manage_staff': False,
                'can_access_admin': False,
            }
            
            # Set permissions based on user role and staff status
            if request.user.is_superuser:
                # Superusers have all permissions
                permissions.update({key: True for key in permissions.keys()})
            elif request.user.is_staff:
                # Staff members have elevated permissions
                permissions.update({
                    'can_view_patients': True,
                    'can_view_appointments': True,
                    'can_create_appointments': True,
                    'can_view_medical_records': True,
                    'can_access_admin': True,
                })
                
                # Role-specific permissions
                if request.user.role:
                    if request.user.role.name == 'Doctor':
                        permissions.update({
                            'can_edit_patients': True,
                            'can_edit_medical_records': True,
                        })
                    elif request.user.role.name == 'Admin':
                        permissions.update({
                            'can_edit_patients': True,
                            'can_edit_medical_records': True,
                            'can_manage_staff': True,
                        })
                        
            elif request.user.role and request.user.role.name == 'Patient':
                # Patients can only view their own data
                permissions.update({
                    'can_view_appointments': True,  # Own appointments only
                    'can_view_medical_records': True,  # Own records only
                })
            
            return Response({
                'permissions': permissions,
                'role': request.user.role.name if request.user.role else None,
                'is_staff': request.user.is_staff,
                'is_superuser': request.user.is_superuser
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Permissions fetch error: {str(e)}")
            return Response({
                'error': f'Failed to fetch permissions: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _send_welcome_email(self, user):
        """Send welcome email to new user using plain text"""
        from django.core.mail import send_mail
        from django.conf import settings
        
        try:
            subject = 'Welcome to HealthLink Rwanda! 🏥'
            
            message = f"""
Hello {user.first_name}! 👋

Welcome to HealthLink Rwanda! We're thrilled to have you join our healthcare community.

Your Account Details:
📧 Email: {user.email}
👤 Name: {user.first_name} {user.last_name}
🏷️ Role: {user.role.name if user.role else 'Patient'}
📅 Account Created: {user.date_joined.strftime('%B %d, %Y')}

What you can do with HealthLink:
✅ Book appointments with healthcare providers
✅ Access your medical records securely
✅ Consult with doctors through telemedicine
✅ Track your health metrics and progress
✅ Access emergency services quickly

Getting Started:
1. Log in to your account at {getattr(settings, 'FRONTEND_URL', 'https://healthlink.rw')}/login
2. Complete your profile information
3. Book your first appointment or explore our services

Need Help?
📧 Email: support@healthlink.rw
📞 Phone: +250 788 123 456
🕐 Available: Monday - Friday, 8:00 AM - 6:00 PM

Thank you for choosing HealthLink Rwanda. Together, we're building a healthier future for all Rwandans!

Best regards,
The HealthLink Rwanda Team

---
HealthLink Rwanda - Improving Healthcare Access • Empowering Communities • Saving Lives

This email was sent to {user.email}. If you didn't create this account, please contact our support team immediately.
"""
            
            # Send email
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
        except Exception as e:
            print(f"Error sending welcome email: {str(e)}")
            raise e

    def _send_password_reset_email(self, user):
        """Send password reset email using plain text"""
        from django.core.mail import send_mail
        from django.conf import settings
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        
        try:
            # Generate password reset token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Create reset URL
            reset_url = f"{getattr(settings, 'FRONTEND_URL', 'https://healthlink.rw')}/reset-password/{uid}/{token}/"
            
            subject = '🔒 Password Reset Request - HealthLink Rwanda'
            
            message = f"""
Hello {user.first_name},

We received a request to reset the password for your HealthLink Rwanda account ({user.email}).

🔗 Reset Your Password:
{reset_url}

⚠️ SECURITY NOTICE:
• If you didn't request this password reset, please ignore this email
• This link will expire in 24 hours
• The link can only be used once
• Make sure you're on the official HealthLink Rwanda website

🔒 Password Security Tips:
• Use at least 8 characters
• Include uppercase and lowercase letters
• Add numbers and special characters
• Don't reuse passwords from other accounts
• Consider using a password manager

Need Help?
📧 Email: support@healthlink.rw
📞 Phone: +250 788 123 456
🕐 Available: Monday - Friday, 8:00 AM - 6:00 PM

For your security, never share your login credentials with anyone.

Best regards,
The HealthLink Rwanda Team

---
HealthLink Rwanda - Secure Healthcare • Trusted Platform • Your Privacy Matters

This email was sent to {user.email} in response to a password reset request.
"""
            
            # Send email
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
        except Exception as e:
            print(f"Error sending password reset email: {str(e)}")
            raise e
# ======================== CORE MODEL VIEWSETS ========================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdmin]
    filterset_fields = ['role__name', 'is_active']

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        else:
            return UserSerializer  # For list, retrieve actions
            
    def get_queryset(self):
        """Get users with related data"""
        return User.objects.select_related('role').prefetch_related('profile', 'patient')
    
    def create(self, request, *args, **kwargs):
        """Create user with proper logging"""
        print(f"Creating user with data: {request.data}")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Return the created user with full details
        response_serializer = UserSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update user with proper logging"""
        print(f"Updating user {kwargs.get('pk')} with data: {request.data}")
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Return the updated user with full details
        response_serializer = UserSerializer(user)
        return Response(response_serializer.data)

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