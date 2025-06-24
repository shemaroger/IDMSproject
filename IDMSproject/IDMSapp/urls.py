# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'profiles', UserProfileViewSet)
router.register(r'patients', PatientViewSet)
router.register(r'appointments', AppointmentViewSet)
router.register(r'emergencies', EmergencyAmbulanceRequestViewSet)
router.register(r'symptoms', SymptomViewSet)
router.register(r'diseases', DiseaseViewSet)
router.register(r'symptom-checks', SymptomCheckerSessionViewSet)
router.register(r'alerts', ScreeningAlertViewSet)
router.register(r'notifications', HealthcareWorkerAlertViewSet)
router.register(r'prevention-tips', PreventiveTipViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', AuthViewSet.as_view({'post': 'login'}), name='auth-login'),
    path('auth/register/', AuthViewSet.as_view({'post': 'register'}), name='auth-register'),
]