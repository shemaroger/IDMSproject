from django.urls import path, include
from django.conf import settings
from rest_framework.routers import DefaultRouter
from django.conf.urls.static import static
from .views import *

router = DefaultRouter()

# Core user management
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'profiles', UserProfileViewSet)
router.register(r'patients', PatientViewSet)

# Clinic management
router.register(r'clinics', ClinicViewSet)

# Healthcare services
router.register(r'appointments', AppointmentViewSet)

# Medical data
router.register(r'diseases', DiseaseViewSet, basename='disease')
router.register(r'symptom-sessions', SymptomCheckerSessionViewSet, basename='symptom-session')
router.register(r'disease-analyses', DiseaseAnalysisViewSet, basename='disease-analysis')
router.register(r'patient-diagnoses', PatientDiagnosisViewSet, basename='patient-diagnosis')
router.register(r'medical-tests', MedicalTestViewSet, basename='medical-test')
router.register(r'test-results', PatientTestResultViewSet, basename='test-result')
router.register(r'treatment-plans', TreatmentPlanViewSet, basename='treatment-plan')
router.register(r'prevention-tips', PreventionTipViewSet, basename='prevention-tip')

# Emergency services
router.register(r'emergency-requests', EmergencyAmbulanceRequestViewSet, basename='emergency-request')
router.register(r'emergency-ambulance-requests', EmergencyAmbulanceRequestViewSet, basename='emergency-ambulance-request')

# Alerts and notifications
# router.register(r'alerts', HealthcareWorkerAlertViewSet, basename='alert')
# router.register(r'notifications', NotificationViewSet, basename='notification')

# Doctor specific endpoints
router.register(r'doctors', DoctorViewSet, basename='doctor')
router.register(r'doctor-cases', DoctorCasesViewSet, basename='doctor-case')

# Authentication endpoints
urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', AuthViewSet.as_view({'post': 'login'}), name='auth-login'),
    path('auth/register/', AuthViewSet.as_view({'post': 'register'}), name='auth-register'),
    path('auth/logout/', AuthViewSet.as_view({'post': 'logout'}), name='auth-logout'),
    path('auth/refresh/', AuthViewSet.as_view({'post': 'refresh'}), name='auth-refresh'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

