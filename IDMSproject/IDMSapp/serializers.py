from rest_framework import serializers
from .models import *
from django.db import transaction

# ======================== AUTHENTICATION SERIALIZERS ========================
class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
class ClinicSerializer(serializers.ModelSerializer):
    """Serializer for Clinic model"""
    staff_count = serializers.ReadOnlyField(source='get_staff_count')
    doctors_count = serializers.SerializerMethodField()
    nurses_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Clinic
        fields = [
            'id', 'name', 'address', 'phone_number', 'email',
            'gps_coordinates', 'is_public', 'services',
            'staff_count', 'doctors_count', 'nurses_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_doctors_count(self, obj):
        return obj.get_doctors().count()
    
    def get_nurses_count(self, obj):
        return obj.get_nurses().count()        


class UserSerializer(serializers.ModelSerializer):
    """Enhanced User serializer with clinic information"""
    role = RoleSerializer(read_only=True)
    clinics = ClinicSerializer(many=True, read_only=True)  # Show assigned clinics
    clinic_names = serializers.SerializerMethodField()  # Quick clinic names list
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 'is_active', 
            'is_staff', 'date_joined', 'last_login', 'clinics', 'clinic_names'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'is_active': {'read_only': True}
        }
    
    def get_clinic_names(self, obj):
        """Return list of clinic names for quick display"""
        return [clinic.name for clinic in obj.clinics.all()]
class UserCreateSerializer(serializers.ModelSerializer):
    """Enhanced serializer for creating users with clinic assignment"""
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), required=True)
    clinic_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'password', 'role', 
            'is_active', 'is_staff', 'clinic_ids'
        ]
        
    def validate(self, data):
        """Validate clinic assignments for medical staff"""
        role = data.get('role')
        clinic_ids = data.get('clinic_ids', [])
        
        # Validate clinic assignment for medical staff
        if role and role.name in ['Doctor', 'Nurse']:
            if not clinic_ids:
                raise serializers.ValidationError({
                    'clinic_ids': f'{role.name} must be assigned to at least one clinic'
                })
            
            # Validate that all clinic IDs exist
            existing_clinics = Clinic.objects.filter(id__in=clinic_ids).count()
            if existing_clinics != len(clinic_ids):
                raise serializers.ValidationError({
                    'clinic_ids': 'One or more specified clinics do not exist'
                })
        
        # Ensure non-medical staff don't have clinic assignments
        elif clinic_ids:
            raise serializers.ValidationError({
                'clinic_ids': 'Only medical staff (Doctors/Nurses) can be assigned to clinics'
            })
        
        return data
        
    @transaction.atomic
    def create(self, validated_data):
        clinic_ids = validated_data.pop('clinic_ids', [])
        
        # Extract password and create user
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        # Assign clinics if medical staff
        if clinic_ids and user.role.name in ['Doctor', 'Nurse']:
            clinics = Clinic.objects.filter(id__in=clinic_ids)
            user.clinics.set(clinics)
        
        return user
class UserUpdateSerializer(serializers.ModelSerializer):
    """Enhanced serializer for updating users with clinic assignment"""
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    clinic_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'password', 'role', 
            'is_active', 'is_staff', 'clinic_ids'
        ]
        
    def validate(self, data):
        """Validate clinic assignments for medical staff during update"""
        role = data.get('role') or self.instance.role
        clinic_ids = data.get('clinic_ids')
        
        # Only validate clinic_ids if it's being updated
        if clinic_ids is not None:
            if role and role.name in ['Doctor', 'Nurse']:
                if not clinic_ids:
                    raise serializers.ValidationError({
                        'clinic_ids': f'{role.name} must be assigned to at least one clinic'
                    })
                
                # Validate that all clinic IDs exist
                existing_clinics = Clinic.objects.filter(id__in=clinic_ids).count()
                if existing_clinics != len(clinic_ids):
                    raise serializers.ValidationError({
                        'clinic_ids': 'One or more specified clinics do not exist'
                    })
            
            # Ensure non-medical staff don't have clinic assignments
            elif clinic_ids:
                raise serializers.ValidationError({
                    'clinic_ids': 'Only medical staff (Doctors/Nurses) can be assigned to clinics'
                })
        
        return data
        
    @transaction.atomic
    def update(self, instance, validated_data):
        clinic_ids = validated_data.pop('clinic_ids', None)
        
        # Handle password separately
        password = validated_data.pop('password', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Set password if provided
        if password:
            instance.set_password(password)
            
        instance.save()
        
        # Update clinic assignments if provided
        if clinic_ids is not None:
            if instance.role.name in ['Doctor', 'Nurse'] and clinic_ids:
                clinics = Clinic.objects.filter(id__in=clinic_ids)
                instance.clinics.set(clinics)
            else:
                # Clear clinic assignments for non-medical staff
                instance.clinics.clear()
        
        return instance

class UserRegisterSerializer(serializers.ModelSerializer):
    """Enhanced registration serializer with clinic assignment"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        min_length=8
    )
    clinic_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list
    )
    
    # Patient-specific fields
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
    
    # Staff-specific fields
    license_number = serializers.CharField(required=False, allow_blank=True)
    specialization = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'password', 'role',
            'clinic_ids', 'phone_number', 'address', 'date_of_birth', 'gender',
            'blood_group', 'allergies', 'chronic_conditions',
            'emergency_contact_name', 'emergency_contact_phone',
            'insurance_provider', 'insurance_number',
            'license_number', 'specialization'
        ]
        extra_kwargs = {
            'role': {'required': True}
        }

    def validate(self, data):
        """Enhanced validation with clinic assignment"""
        role = data.get('role')
        clinic_ids = data.get('clinic_ids', [])
        
        # Validate role exists
        if not isinstance(role, Role):
            try:
                data['role'] = Role.objects.get(name=role)
            except Role.DoesNotExist:
                raise serializers.ValidationError(
                    {"role": "Invalid role specified"}
                )
        
        # Validate clinics for medical staff
        if data['role'].name in ['Doctor', 'Nurse']:
            if not clinic_ids:
                raise serializers.ValidationError(
                    {"clinic_ids": f"{data['role'].name} must be assigned to at least one clinic"}
                )
            
            existing_clinics = Clinic.objects.filter(id__in=clinic_ids).count()
            if existing_clinics != len(clinic_ids):
                raise serializers.ValidationError(
                    {"clinic_ids": "One or more specified clinics don't exist"}
                )
        
        # Ensure non-medical staff don't have clinic assignments
        elif clinic_ids:
            raise serializers.ValidationError(
                {"clinic_ids": "Only medical staff can be assigned to clinics"}
            )
        
        # Validate patient fields aren't set for staff
        if data['role'].name not in ['Patient']:
            patient_fields = ['blood_group', 'allergies', 'chronic_conditions',
                            'emergency_contact_name', 'emergency_contact_phone',
                            'insurance_provider', 'insurance_number']
            for field in patient_fields:
                if data.get(field):
                    raise serializers.ValidationError(
                        {field: f"This field is only valid for patients"}
                    )
        
        return data

    @transaction.atomic
    def create(self, validated_data):
        clinic_ids = validated_data.pop('clinic_ids', [])
        role = validated_data.pop('role')
        
        # Split data for different models
        profile_data = {
            'phone_number': validated_data.pop('phone_number', ''),
            'address': validated_data.pop('address', ''),
            'date_of_birth': validated_data.pop('date_of_birth', None),
            'gender': validated_data.pop('gender', ''),
            'license_number': validated_data.pop('license_number', ''),
            'specialization': validated_data.pop('specialization', ''),
        }
        
        patient_data = {
            'emergency_contact_name': validated_data.pop('emergency_contact_name', ''),
            'emergency_contact_phone': validated_data.pop('emergency_contact_phone', ''),
            'insurance_provider': validated_data.pop('insurance_provider', ''),
            'insurance_number': validated_data.pop('insurance_number', ''),
            'blood_group': validated_data.pop('blood_group', ''),
            'allergies': validated_data.pop('allergies', ''),
            'chronic_conditions': validated_data.pop('chronic_conditions', ''),
        }

        # Create user
        user = User.objects.create_user(
            **validated_data,
            role=role
        )

        # Create profile (for all users)
        UserProfile.objects.create(user=user, **profile_data)

        # Create patient record if role is Patient
        if role.name == 'Patient':
            Patient.objects.create(user=user, **patient_data)

        # Assign to clinics if medical staff
        if role.name in ['Doctor', 'Nurse'] and clinic_ids:
            clinics = Clinic.objects.filter(id__in=clinic_ids)
            user.clinics.set(clinics)

        return user
class StaffRegisterSerializer(UserRegisterSerializer):
    clinic_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=True,
        help_text="List of clinic IDs the staff member will work at"
    )
    
    class Meta(UserRegisterSerializer.Meta):
        fields = UserRegisterSerializer.Meta.fields + ['license_number', 'specialization']
        
    def validate(self, data):
        if data.get('role') and data['role'].name not in ['Doctor', 'Nurse']:
            raise serializers.ValidationError(
                "This endpoint is only for doctor/nurse registration"
            )
        return super().validate(data)    

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