
# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf.urls.static import static
from .views import *

router = DefaultRouter()

# Core user management
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'profiles', UserProfileViewSet)
router.register(r'patients', PatientViewSet)

# Clinic management - NEW
router.register(r'clinics', ClinicViewSet)

# Healthcare services
router.register(r'appointments', AppointmentViewSet)
router.register(r'emergencies', EmergencyAmbulanceRequestViewSet)

# Medical data
# router.register(r'symptoms', SymptomViewSet)
router.register(r'diseases', DiseaseViewSet, basename='disease')
router.register(r'symptom-sessions', SymptomCheckerSessionViewSet, basename='symptom-session')
router.register(r'disease-analyses', DiseaseAnalysisViewSet, basename='disease-analysis')
router.register(r'prevention-tips', PreventionTipViewSet, basename='prevention-tip')
router.register(r'emergency-requests', EmergencyAmbulanceRequestViewSet, basename='emergency-request')
router.register(r'symptom-utils', SymptomCheckerUtilityViewSet, basename='symptom-utils')
router.register(r'provider-symptoms', HealthcareProviderSymptomViewSet, basename='provider-symptoms')

# Alerts and notifications
router.register(r'alerts', ScreeningAlertViewSet)
router.register(r'notifications', HealthcareWorkerAlertViewSet)

# Prevention and tips
# router.register(r'prevention-tips', PreventiveTipViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', AuthViewSet.as_view({'post': 'login'}), name='auth-login'),
    path('auth/register/', AuthViewSet.as_view({'post': 'register'}), name='auth-register'),
]  + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


