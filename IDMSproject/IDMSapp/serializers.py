from rest_framework import serializers
from .models import *

# ======================== AUTHENTICATION SERIALIZERS ========================
class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)  # 🔴 ADD THIS LINE - shows full role object
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined']
        extra_kwargs = {
            'password': {'write_only': True},
            'is_active': {'read_only': True}
        }

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    # Add these optional fields for patient registration
    phone_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    blood_group = serializers.CharField(required=False, allow_blank=True)
    allergies = serializers.CharField(required=False, allow_blank=True)
    chronic_conditions = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True)
    insurance_provider = serializers.CharField(required=False, allow_blank=True)
    insurance_number = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'password',
            'phone_number', 'address', 'date_of_birth', 'gender',
            'blood_group', 'allergies', 'chronic_conditions',
            'emergency_contact_name', 'emergency_contact_phone',
            'insurance_provider', 'insurance_number'
        ]
        
    def create(self, validated_data):
        # Get or create Patient role
        patient_role, created = Role.objects.get_or_create(
            name='Patient',
            defaults={
                'description': 'Patient user role',
                'can_self_register': True,
                'permissions': []
            }
        )
        
        # Extract profile and patient data
        profile_data = {
            'phone_number': validated_data.pop('phone_number', ''),
            'address': validated_data.pop('address', ''),
            'date_of_birth': validated_data.pop('date_of_birth', None),
            'gender': validated_data.pop('gender', ''),
            'blood_group': validated_data.pop('blood_group', ''),
            'allergies': validated_data.pop('allergies', ''),
            'chronic_conditions': validated_data.pop('chronic_conditions', ''),
        }
        
        patient_data = {
            'emergency_contact_name': validated_data.pop('emergency_contact_name', ''),
            'emergency_contact_phone': validated_data.pop('emergency_contact_phone', ''),
            'insurance_provider': validated_data.pop('insurance_provider', ''),
            'insurance_number': validated_data.pop('insurance_number', ''),
        }
        
        # Create user with Patient role
        user = User.objects.create_user(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password'],
            role=patient_role  # Automatically assign Patient role
        )
        
        # Create profile if any profile data exists
        if any(profile_data.values()):
            UserProfile.objects.create(user=user, **profile_data)
        
        # Create patient record if any patient data exists
        if any(patient_data.values()):
            Patient.objects.create(user=user, **patient_data)
        
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, style={'input_type': 'password'})

# ======================== PROFILE SERIALIZERS ========================
class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

# ======================== CLINIC SERIALIZERS ========================
class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Patient
        fields = '__all__'
        read_only_fields = ['created_at']

class AppointmentSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    healthcare_provider = UserSerializer(read_only=True)
    
    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class EmergencyAmbulanceRequestSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    
    class Meta:
        model = EmergencyAmbulanceRequest
        fields = '__all__'
        read_only_fields = ['request_time']

# ======================== DISEASE MANAGEMENT SERIALIZERS ========================
class SymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Symptom
        fields = '__all__'

class DiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disease
        fields = '__all__'

class SymptomCheckerSessionSerializer(serializers.ModelSerializer):
    symptoms_selected = SymptomSerializer(many=True, read_only=True)
    possible_diseases = DiseaseSerializer(many=True, read_only=True)
    
    class Meta:
        model = SymptomCheckerSession
        fields = '__all__'
        read_only_fields = ['created_at', 'risk_score', 'recommendation']

# ======================== ALERT SYSTEM SERIALIZERS ========================
class ScreeningAlertSerializer(serializers.ModelSerializer):
    disease = DiseaseSerializer(read_only=True)
    
    class Meta:
        model = ScreeningAlert
        fields = '__all__'
        read_only_fields = ['created_at']

class HealthcareWorkerAlertSerializer(serializers.ModelSerializer):
    alert = ScreeningAlertSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)
    
    class Meta:
        model = HealthcareWorkerAlert
        fields = '__all__'
        read_only_fields = ['sent_at', 'read_at']

# ======================== PREVENTION SERIALIZERS ========================
class PreventiveTipSerializer(serializers.ModelSerializer):
    related_symptoms = SymptomSerializer(many=True, read_only=True)
    
    class Meta:
        model = PreventiveTip
        fields = '__all__'
        read_only_fields = ['created_at', 'last_updated']

# ======================== MEDICAL RECORD SERIALIZERS ========================
class MedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = '__all__'
        read_only_fields = ['date', 'is_archived']

# ======================== REQUEST SERIALIZERS ========================
class SymptomCheckRequestSerializer(serializers.Serializer):
    symptoms = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        help_text="List of symptom IDs",
        min_length=1
    )
    location = serializers.CharField(required=False, allow_blank=True)
    
    def validate_symptoms(self, value):
        if not Symptom.objects.filter(id__in=value).exists():
            raise serializers.ValidationError("One or more symptom IDs are invalid")
        return value

class AppointmentRequestSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField(min_value=1)
    provider_id = serializers.IntegerField(min_value=1)
    date_time = serializers.DateTimeField()
    reason = serializers.CharField(max_length=500)
    
    def validate(self, data):
        if not Patient.objects.filter(id=data['patient_id']).exists():
            raise serializers.ValidationError({"patient_id": "Patient not found"})
        if not User.objects.filter(id=data['provider_id'], role__name__in=['Doctor', 'Nurse']).exists():
            raise serializers.ValidationError({"provider_id": "Invalid healthcare provider"})
        return data

class EmergencyRequestSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField(min_value=1)
    location = serializers.CharField(max_length=255)
    condition = serializers.CharField(max_length=500)
    symptoms = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False
    )
    
    def validate_patient_id(self, value):
        if not Patient.objects.filter(id=value).exists():
            raise serializers.ValidationError("Patient not found")
        return value

# ======================== RESPONSE SERIALIZERS ========================
class RiskAssessmentResponseSerializer(serializers.Serializer):
    risk_score = serializers.IntegerField(min_value=0, max_value=100)
    recommendation = serializers.CharField()
    possible_diseases = DiseaseSerializer(many=True)
    suggested_actions = serializers.ListField(child=serializers.CharField())

class OutbreakAlertResponseSerializer(serializers.Serializer):
    location = serializers.CharField()
    case_count = serializers.IntegerField()
    severity = serializers.CharField()
    recommended_interventions = serializers.ListField(child=serializers.CharField())


# ======================== MEDICAL HISTORY SERIALIZER ========================
class MedicalHistorySerializer(serializers.ModelSerializer):
    """Serializes complete medical history for a patient"""
    patient = PatientSerializer(read_only=True)
    appointment = AppointmentSerializer(read_only=True)
    emergency_request = EmergencyAmbulanceRequestSerializer(read_only=True)
    related_diseases = DiseaseSerializer(many=True, read_only=True)
    
    class Meta:
        model = MedicalRecord
        fields = [
            'id',
            'patient',
            'date',
            'diagnosis',
            'treatment_summary',
            'appointment',
            'emergency_request',
            'related_diseases',
            'is_archived',
            'created_at'
        ]
        read_only_fields = ['created_at', 'is_archived']

    def to_representation(self, instance):
        """Custom representation to include additional data"""
        representation = super().to_representation(instance)
        
        # Add related prescriptions if they exist
        if hasattr(instance, 'prescriptions'):
            representation['prescriptions'] = instance.prescriptions.values(
                'id', 'name', 'dosage', 'frequency'
            )
        
        # Add symptom checker session if linked
        if hasattr(instance, 'symptom_check_session'):
            representation['symptoms'] = instance.symptom_check_session.symptoms_selected.values(
                'id', 'name', 'severity_score'
            )
        
        return representation

# ======================== MEDICAL TIMELINE SERIALIZER ========================
class MedicalTimelineSerializer(serializers.Serializer):
    """Serializes medical events in timeline format"""
    date = serializers.DateTimeField()
    event_type = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField()
    related_object = serializers.DictField()
    
    def to_representation(self, instance):
        """Creates unified timeline from different medical records"""
        if isinstance(instance, MedicalRecord):
            return {
                'date': instance.date,
                'event_type': 'medical_record',
                'title': f"Medical Record - {instance.date.strftime('%Y-%m-%d')}",
                'description': instance.diagnosis[:100] + '...' if instance.diagnosis else '',
                'related_object': MedicalHistorySerializer(instance).data
            }
        elif isinstance(instance, Appointment):
            return {
                'date': instance.appointment_date,
                'event_type': 'appointment',
                'title': f"Appointment with Dr. {instance.healthcare_provider.last_name}",
                'description': instance.reason[:100] + '...' if instance.reason else '',
                'related_object': AppointmentSerializer(instance).data
            }
        elif isinstance(instance, EmergencyAmbulanceRequest):
            return {
                'date': instance.request_time,
                'event_type': 'emergency',
                'title': "Emergency Request",
                'description': instance.condition_description[:100] + '...',
                'related_object': EmergencyAmbulanceRequestSerializer(instance).data
            }
        return super().to_representation(instance)    