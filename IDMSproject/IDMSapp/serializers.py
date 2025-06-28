from rest_framework import serializers
from .models import *
from django.db import transaction
import uuid

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
        default=list,
        allow_empty=True
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
        
        print(f"UserCreateSerializer.validate: role={role.name if role else None}, clinic_ids={clinic_ids}")
        
        # Validate clinic assignment for medical staff
        if role and role.name in ['Doctor', 'Nurse']:
            if not clinic_ids:
                raise serializers.ValidationError({
                    'clinic_ids': f'{role.name} must be assigned to at least one clinic'
                })
            
            # Validate that all clinic IDs exist
            existing_clinics = Clinic.objects.filter(id__in=clinic_ids)
            if existing_clinics.count() != len(clinic_ids):
                invalid_ids = set(clinic_ids) - set(existing_clinics.values_list('id', flat=True))
                raise serializers.ValidationError({
                    'clinic_ids': f'Clinics with IDs {list(invalid_ids)} do not exist'
                })
        
        return data
        
    @transaction.atomic
    def create(self, validated_data):
        """Create user with clinic assignments"""
        clinic_ids = validated_data.pop('clinic_ids', [])
        
        print(f"UserCreateSerializer.create: clinic_ids={clinic_ids}")
        
        # Extract password and create user
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        print(f"User created: {user.email}, role: {user.role.name}")
        
        # Assign clinics if medical staff and clinic_ids provided
        if clinic_ids and user.role.name in ['Doctor', 'Nurse']:
            # The key difference: We add the user to clinics via the Clinic model
            # since that's where the ManyToMany field is defined
            clinics = Clinic.objects.filter(id__in=clinic_ids)
            for clinic in clinics:
                clinic.staff.add(user)
            
            print(f"Assigned user {user.email} to {clinics.count()} clinics")
            
            # Verify the assignment
            assigned_clinics = user.clinics.all()
            print(f"Verification: User {user.email} is now assigned to {assigned_clinics.count()} clinics: {list(assigned_clinics)}")
        else:
            print(f"No clinic assignment for user {user.email} (role: {user.role.name})")
        
        return user
class UserUpdateSerializer(serializers.ModelSerializer):
    """Enhanced serializer for updating users with clinic assignment"""
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    clinic_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
        allow_null=True
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
        
        print(f"UserUpdateSerializer.validate: role={role.name if role else None}, clinic_ids={clinic_ids}")
        
        # Only validate clinic_ids if it's being updated
        if clinic_ids is not None:
            if role and role.name in ['Doctor', 'Nurse']:
                if not clinic_ids:
                    raise serializers.ValidationError({
                        'clinic_ids': f'{role.name} must be assigned to at least one clinic'
                    })
                
                # Validate that all clinic IDs exist
                existing_clinics = Clinic.objects.filter(id__in=clinic_ids)
                if existing_clinics.count() != len(clinic_ids):
                    invalid_ids = set(clinic_ids) - set(existing_clinics.values_list('id', flat=True))
                    raise serializers.ValidationError({
                        'clinic_ids': f'Clinics with IDs {list(invalid_ids)} do not exist'
                    })
        
        return data
        
    @transaction.atomic
    def update(self, instance, validated_data):
        """Update user with clinic assignments"""
        clinic_ids = validated_data.pop('clinic_ids', None)
        
        print(f"UserUpdateSerializer.update: clinic_ids={clinic_ids}")
        
        # Handle password separately
        password = validated_data.pop('password', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Set password if provided
        if password:
            instance.set_password(password)
            
        instance.save()
        
        print(f"User updated: {instance.email}, role: {instance.role.name}")
        
        # Update clinic assignments if provided
        if clinic_ids is not None:
            # First, remove the user from all current clinics
            current_clinics = Clinic.objects.filter(staff=instance)
            for clinic in current_clinics:
                clinic.staff.remove(instance)
            print(f"Removed user {instance.email} from {current_clinics.count()} previous clinics")
            
            # Then add to new clinics if role is medical staff
            if instance.role.name in ['Doctor', 'Nurse'] and clinic_ids:
                new_clinics = Clinic.objects.filter(id__in=clinic_ids)
                for clinic in new_clinics:
                    clinic.staff.add(instance)
                print(f"Added user {instance.email} to {new_clinics.count()} new clinics")
                
                # Verify the assignment
                assigned_clinics = instance.clinics.all()
                print(f"Verification: User {instance.email} is now assigned to {assigned_clinics.count()} clinics: {list(assigned_clinics)}")
        
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
            'role': {'required': False}  # Make role optional
        }

    def validate(self, data):
        """Enhanced validation with clinic assignment"""
        role = data.get('role')
        
        print(f"UserRegisterSerializer.validate: received role = {role}, type = {type(role)}")
        
        # Auto-assign Patient role if no role is provided
        if not role:
            try:
                patient_role = Role.objects.get(name='Patient')
                data['role'] = patient_role
                print(f"Auto-assigned Patient role to registration")
            except Role.DoesNotExist:
                raise serializers.ValidationError(
                    {"role": "Patient role not found. Please contact administrator."}
                )
        elif isinstance(role, str):
            # If role is passed as string, convert to Role object
            try:
                role_obj = Role.objects.get(name=role)
                data['role'] = role_obj
                print(f"Converted role string '{role}' to Role object: {role_obj}")
            except Role.DoesNotExist:
                raise serializers.ValidationError(
                    {"role": f"Role '{role}' not found"}
                )
        elif isinstance(role, int):
            # If role is passed as ID, get the Role object
            try:
                role_obj = Role.objects.get(id=role)
                data['role'] = role_obj
                print(f"Converted role ID '{role}' to Role object: {role_obj}")
            except Role.DoesNotExist:
                raise serializers.ValidationError(
                    {"role": f"Role with ID '{role}' not found"}
                )
        
        clinic_ids = data.get('clinic_ids', [])
        
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
        
        # Validate patient fields aren't set for non-patient staff
        if data['role'].name not in ['Patient']:
            patient_fields = ['blood_group', 'allergies', 'chronic_conditions',
                            'emergency_contact_name', 'emergency_contact_phone',
                            'insurance_provider', 'insurance_number']
            for field in patient_fields:
                if data.get(field):
                    # For Admin role, we'll allow patient fields but warn
                    if data['role'].name == 'Admin':
                        print(f"Warning: Admin user has patient field {field} set")
                    else:
                        raise serializers.ValidationError(
                            {field: f"This field is only valid for patients"}
                        )
        
        return data

    @transaction.atomic
    def create(self, validated_data):
        clinic_ids = validated_data.pop('clinic_ids', [])
        role = validated_data.pop('role')
        
        print(f"Creating user with role: {role.name}")
        
        # Split data for different models
        profile_data = {
            'phone_number': validated_data.pop('phone_number', ''),
            'address': validated_data.pop('address', ''),
            'date_of_birth': validated_data.pop('date_of_birth', None),
            'gender': validated_data.pop('gender', ''),
            'license_number': validated_data.pop('license_number', ''),
            'specialization': validated_data.pop('specialization', ''),
        }
        
        # Patient-specific data - only include fields that exist in Patient model
        patient_data = {}
        patient_fields = [
            'emergency_contact_name', 'emergency_contact_phone', 
            'insurance_provider', 'insurance_number'
        ]
        
        # Medical fields that might be in UserProfile instead of Patient
        medical_fields = ['blood_group', 'allergies', 'chronic_conditions']
        
        for field in patient_fields:
            patient_data[field] = validated_data.pop(field, '')
            
        # Handle medical fields - check if they belong in Patient or UserProfile
        for field in medical_fields:
            value = validated_data.pop(field, '')
            # Try to add to patient_data first, but be prepared to move to profile_data
            patient_data[field] = value

        # Create user
        user = User.objects.create_user(
            **validated_data,
            role=role
        )
        
        print(f"User created successfully: {user.email}, role: {user.role.name}")

        # Create profile (for all users)
        UserProfile.objects.create(user=user, **profile_data)
        print(f"Profile created for user: {user.email}")

        # Create patient record if role is Patient
        if role.name == 'Patient':
            try:
                # Only pass fields that exist in the Patient model
                safe_patient_data = {k: v for k, v in patient_data.items() 
                                   if k in ['emergency_contact_name', 'emergency_contact_phone', 
                                          'insurance_provider', 'insurance_number']}
                Patient.objects.create(user=user, **safe_patient_data)
                print(f"Patient record created for user: {user.email}")
                
                # Add medical fields to profile if they don't belong in Patient model
                medical_data = {k: v for k, v in patient_data.items() 
                              if k in ['blood_group', 'allergies', 'chronic_conditions'] and v}
                if medical_data:
                    # Update the profile with medical data
                    profile = user.profile
                    for field, value in medical_data.items():
                        if hasattr(profile, field):
                            setattr(profile, field, value)
                    profile.save()
                    print(f"Medical data added to profile for user: {user.email}")
                    
            except Exception as e:
                print(f"Error creating patient record: {e}")
                # If Patient creation fails, just log it - don't fail the whole registration
                
        elif role.name == 'Admin' and any(patient_data.values()):
            # For Admin users, try to create patient record with available fields
            try:
                safe_patient_data = {k: v for k, v in patient_data.items() 
                                   if k in ['emergency_contact_name', 'emergency_contact_phone', 
                                          'insurance_provider', 'insurance_number'] and v}
                if safe_patient_data:
                    Patient.objects.create(user=user, **safe_patient_data)
                    print(f"Patient record created for Admin user: {user.email}")
                    
                # Add medical fields to profile
                medical_data = {k: v for k, v in patient_data.items() 
                              if k in ['blood_group', 'allergies', 'chronic_conditions'] and v}
                if medical_data:
                    profile = user.profile
                    for field, value in medical_data.items():
                        if hasattr(profile, field):
                            setattr(profile, field, value)
                    profile.save()
                    print(f"Medical data added to profile for Admin user: {user.email}")
                    
            except Exception as e:
                print(f"Error creating patient record for admin: {e}")
                # Non-critical error for admin users

        # Assign to clinics if medical staff
        if role.name in ['Doctor', 'Nurse'] and clinic_ids:
            clinics = Clinic.objects.filter(id__in=clinic_ids)
            for clinic in clinics:
                clinic.staff.add(user)
            print(f"Assigned user {user.email} to {clinics.count()} clinics")

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

class AppointmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating appointments"""
    
    class Meta:
        model = Appointment
        fields = ['healthcare_provider', 'appointment_date', 'reason']
    
    def validate_appointment_date(self, value):
        """Validate appointment date is in the future"""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Appointment date must be in the future")
        return value
    
    def validate_healthcare_provider(self, value):
        """Validate healthcare provider is a doctor or nurse"""
        if not value.role or value.role.name not in ['Doctor', 'Nurse']:
            raise serializers.ValidationError("Selected user is not a healthcare provider")
        return value
    
    def create(self, validated_data):
        """Create appointment with patient from request user"""
        request = self.context.get('request')
        patient = request.user.patient
        return Appointment.objects.create(
            patient=patient,
            **validated_data
        )

class AppointmentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating appointments"""
    
    class Meta:
        model = Appointment
        fields = ['healthcare_provider', 'appointment_date', 'reason', 'status', 'notes']
        read_only_fields = ['notes']  # Only healthcare providers can add notes
    
    def validate_appointment_date(self, value):
        """Validate appointment date is in the future for pending appointments"""
        from django.utils import timezone
        instance = getattr(self, 'instance', None)
        if instance and instance.status == 'P' and value <= timezone.now():
            raise serializers.ValidationError("Appointment date must be in the future")
        return value
    
    def validate_status(self, value):
        """Validate status transitions"""
        instance = getattr(self, 'instance', None)
        request = self.context.get('request')
        
        if not instance:
            return value
        
        # Patients can only cancel their own pending appointments
        if request.user.role.name == 'Patient':
            if instance.status != 'P':
                raise serializers.ValidationError("Can only modify pending appointments")
            if value not in ['P', 'C']:
                raise serializers.ValidationError("Patients can only cancel appointments")
        
        return value

class AppointmentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for appointment display"""
    patient = PatientSerializer(read_only=True)
    healthcare_provider = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = '__all__'
    
    def get_can_edit(self, obj):
        """Check if current user can edit this appointment"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Patients can edit their own pending appointments
        if request.user.role.name == 'Patient':
            return obj.patient.user == request.user and obj.status == 'P'
        
        # Healthcare providers can edit appointments assigned to them
        if request.user.role.name in ['Doctor', 'Nurse']:
            return obj.healthcare_provider == request.user
        
        # Admins can edit any appointment
        return request.user.role.name == 'Admin'
    
    def get_can_cancel(self, obj):
        """Check if current user can cancel this appointment"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Can only cancel pending or approved appointments
        if obj.status not in ['P', 'A']:
            return False
        
        # Patients can cancel their own appointments
        if request.user.role.name == 'Patient':
            return obj.patient.user == request.user
        
        # Healthcare providers and admins can cancel any appointment
        return request.user.role.name in ['Doctor', 'Nurse', 'Admin']

class DiseaseSerializer(serializers.ModelSerializer):
    """
    Serializer for Disease model with symptom management
    """
    prevention_tips = serializers.SerializerMethodField()
    total_symptoms = serializers.SerializerMethodField()
    
    class Meta:
        model = Disease
        fields = [
            'id', 'name', 'disease_type', 'icd_code', 'description', 
            'is_contagious', 'common_symptoms', 'symptom_weights',
            'mild_threshold', 'moderate_threshold', 'severe_threshold',
            'emergency_threshold', 'prevention_tips', 'total_symptoms',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_prevention_tips(self, obj):
        """Get prevention tips for this disease"""
        tips = obj.prevention_tips.all()[:5]  # Limit to 5 most important tips
        return PreventionTipSerializer(tips, many=True).data
    
    def get_total_symptoms(self, obj):
        """Get total number of symptoms for this disease"""
        return len(obj.common_symptoms) if obj.common_symptoms else 0
    
    def validate_common_symptoms(self, value):
        """Validate that common_symptoms is a list"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Common symptoms must be a list")
        return value
    
    def validate_symptom_weights(self, value):
        """Validate that symptom_weights is a dictionary"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Symptom weights must be a dictionary")
        return value
    
    def validate(self, data):
        """Validate threshold values are in correct order"""
        mild = data.get('mild_threshold', 0)
        moderate = data.get('moderate_threshold', 0)
        severe = data.get('severe_threshold', 0)
        emergency = data.get('emergency_threshold', 0)
        
        if not (mild <= moderate <= severe <= emergency):
            raise serializers.ValidationError(
                "Thresholds must be in ascending order: mild <= moderate <= severe <= emergency"
            )
        
        return data

class DiseaseCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating diseases with helper methods
    """
    use_malaria_template = serializers.BooleanField(write_only=True, required=False, default=False)
    use_pneumonia_template = serializers.BooleanField(write_only=True, required=False, default=False)
    
    class Meta:
        model = Disease
        fields = [
            'name', 'disease_type', 'icd_code', 'description', 'is_contagious',
            'use_malaria_template', 'use_pneumonia_template'
        ]
    
    def create(self, validated_data):
        use_malaria = validated_data.pop('use_malaria_template', False)
        use_pneumonia = validated_data.pop('use_pneumonia_template', False)
        
        if use_malaria:
            return Disease.create_malaria_disease()
        elif use_pneumonia:
            return Disease.create_pneumonia_disease()
        else:
            return super().create(validated_data)

class DiseaseAnalysisSerializer(serializers.ModelSerializer):
    """
    Serializer for DiseaseAnalysis results
    """
    disease_name = serializers.CharField(source='disease.name', read_only=True)
    disease_type = serializers.CharField(source='disease.disease_type', read_only=True)
    
    class Meta:
        model = DiseaseAnalysis
        fields = [
            'id', 'disease', 'disease_name', 'disease_type', 
            'calculated_score', 'probability_percentage', 
            'severity_assessment', 'created_at'
        ]
        read_only_fields = ['created_at']

class PreventionTipSerializer(serializers.ModelSerializer):
    """
    Serializer for PreventionTip model
    """
    disease_name = serializers.CharField(source='disease.name', read_only=True)
    
    class Meta:
        model = PreventionTip
        fields = [
            'id', 'disease', 'disease_name', 'category', 'title', 
            'description', 'priority', 'created_at'
        ]
        read_only_fields = ['created_at']

class SymptomCheckerSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for SymptomCheckerSession with analysis capabilities
    """
    analyzed_diseases = DiseaseAnalysisSerializer(
        source='diseaseanalysis_set', 
        many=True, 
        read_only=True
    )
    primary_disease_name = serializers.CharField(
        source='primary_suspected_disease.name', 
        read_only=True
    )
    user_name = serializers.CharField(
        source='user.get_full_name', 
        read_only=True
    )
    all_symptoms = serializers.SerializerMethodField()
    analysis_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = SymptomCheckerSession
        fields = [
            'id', 'session_id', 'user', 'user_name', 'selected_symptoms', 
            'custom_symptoms', 'all_symptoms', 'analyzed_diseases',
            'primary_suspected_disease', 'primary_disease_name',
            'overall_risk_score', 'severity_level', 'recommendation',
            'location', 'age_range', 'gender', 'needs_followup',
            'followup_date', 'analysis_summary', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'session_id', 'analyzed_diseases', 'primary_suspected_disease',
            'overall_risk_score', 'severity_level', 'recommendation',
            'needs_followup', 'followup_date', 'created_at', 'updated_at'
        ]
    
    def get_all_symptoms(self, obj):
        """Get combined list of all symptoms"""
        return obj.get_all_symptoms()
    
    def get_analysis_summary(self, obj):
        """Get summary of analysis results"""
        return {
            'total_symptoms': len(obj.get_all_symptoms()),
            'risk_level': obj.severity_level,
            'primary_disease': obj.primary_suspected_disease.name if obj.primary_suspected_disease else None,
            'needs_immediate_care': obj.severity_level in ['severe', 'critical'],
            'analysis_completed': bool(obj.overall_risk_score > 0)
        }
    
    def validate_selected_symptoms(self, value):
        """Validate selected symptoms"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Selected symptoms must be a list")
        return value
    
    def validate_custom_symptoms(self, value):
        """Validate custom symptoms"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Custom symptoms must be a list")
        return value
    
    def create(self, validated_data):
        """Create session with auto-generated session_id"""
        if 'session_id' not in validated_data:
            validated_data['session_id'] = str(uuid.uuid4())
        return super().create(validated_data)

class SymptomAnalysisRequestSerializer(serializers.Serializer):
    """
    Serializer for symptom analysis requests
    """
    selected_symptoms = serializers.ListField(
        child=serializers.CharField(max_length=100),
        help_text="List of selected symptoms"
    )
    custom_symptoms = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        default=list,
        help_text="List of custom symptoms not in predefined list"
    )
    location = serializers.CharField(max_length=100, required=False, allow_blank=True)
    age_range = serializers.CharField(max_length=20, required=False, allow_blank=True)
    gender = serializers.CharField(max_length=1, required=False, allow_blank=True)
    
    def validate_selected_symptoms(self, value):
        """Validate that at least one symptom is selected"""
        if not value:
            raise serializers.ValidationError("At least one symptom must be selected")
        return value

class SymptomAnalysisResponseSerializer(serializers.Serializer):
    """
    Serializer for symptom analysis responses
    """
    session_id = serializers.CharField()
    overall_risk_score = serializers.IntegerField()
    severity_level = serializers.CharField()
    recommendation = serializers.CharField()
    primary_suspected_disease = serializers.CharField()
    disease_analyses = DiseaseAnalysisSerializer(many=True)
    needs_followup = serializers.BooleanField()
    followup_date = serializers.DateTimeField(allow_null=True)
    
    # Additional helpful info
    emergency_recommended = serializers.BooleanField()
    nearest_clinic_recommended = serializers.BooleanField()
    prevention_tips = PreventionTipSerializer(many=True)

class EmergencyAmbulanceRequestSerializer(serializers.ModelSerializer):
    """
    Enhanced serializer for EmergencyAmbulanceRequest with disease linking
    """
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True)
    suspected_disease_info = serializers.SerializerMethodField()
    
    class Meta:
        model = EmergencyAmbulanceRequest
        fields = [
            'id', 'patient', 'patient_name', 'request_time', 'location',
            'gps_coordinates', 'condition_description', 'status',
            'assigned_ambulance', 'hospital_destination', 'suspected_disease',
            'suspected_disease_info'
        ]
        read_only_fields = ['request_time']
    
    def get_suspected_disease_info(self, obj):
        """Get disease information if suspected_disease matches a Disease record"""
        if obj.suspected_disease:
            try:
                disease = Disease.objects.get(name__icontains=obj.suspected_disease)
                return {
                    'name': disease.name,
                    'type': disease.disease_type,
                    'is_contagious': disease.is_contagious,
                    'emergency_threshold': disease.emergency_threshold
                }
            except Disease.DoesNotExist:
                pass
        return None

# Bulk operation serializers
class BulkDiseaseCreateSerializer(serializers.Serializer):
    """
    Serializer for bulk disease creation
    """
    create_defaults = serializers.BooleanField(default=True, help_text="Create default malaria and pneumonia diseases")
    additional_diseases = serializers.ListField(
        child=DiseaseCreateSerializer(),
        required=False,
        default=list,
        help_text="Additional diseases to create"
    )

class SymptomCheckerStatsSerializer(serializers.Serializer):
    """
    Serializer for symptom checker statistics
    """
    total_sessions = serializers.IntegerField()
    sessions_by_severity = serializers.DictField()
    most_common_symptoms = serializers.ListField()
    disease_distribution = serializers.DictField()
    emergency_cases_today = serializers.IntegerField()
    followup_needed = serializers.IntegerField()

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


class MedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = '__all__'
        read_only_fields = ['date', 'is_archived']



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
class AppointmentSerializer(serializers.ModelSerializer):
    """Basic serializer for Appointment model (for use in MedicalHistorySerializer)"""
    class Meta:
        model = Appointment
        fields = '__all__'

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