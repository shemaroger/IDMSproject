from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
import os

class Role(models.Model):
    """
    Defines different roles in the system (Admin, Doctor, Nurse, Patient, etc.)
    """
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=list, blank=True)  # Stores permission codes
    can_self_register = models.BooleanField(default=False)  # ✅ New field to support logic

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model supporting email as username and multiple roles
    """
    email = models.EmailField(max_length=255, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    
    # Role relationship
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    
    # Timestamps
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(auto_now=True)
    
    objects = CustomUserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
    
    def has_perm(self, perm, obj=None):
        return self.is_superuser
    
    def has_module_perms(self, app_label):
        return self.is_superuser
def user_profile_image_path(instance, filename):
    """
    Custom upload path function for user profile images
    """
    # Get file extension
    ext = filename.split('.')[-1]
    # Create filename: user_id_profile.extension
    filename = f'user_{instance.user.id}_profile.{ext}'
    # Return the upload path
    return os.path.join('profile_images', str(instance.user.id), filename)

class UserProfile(models.Model):
    """
    Extended profile information for users
    """
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('U', 'Prefer not to say'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    
    # Updated profile picture field
    profile_picture = models.ImageField(
        upload_to=user_profile_image_path,
        null=True, 
        blank=True,
        help_text="Upload a profile picture (JPG, PNG, GIF supported)"
    )
    
    # For healthcare professionals
    license_number = models.CharField(max_length=100, blank=True)
    specialization = models.CharField(max_length=100, blank=True)
    
    # For patients
    blood_group = models.CharField(max_length=5, blank=True)
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} Profile"
    
    @property
    def profile_picture_url(self):
        """
        Return the URL of the profile picture or a default image
        """
        if self.profile_picture and hasattr(self.profile_picture, 'url'):
            return self.profile_picture.url
        return '/static/images/default-profile.png'  # Path to your default image
class Clinic(models.Model):
    """
    Healthcare facility where doctors/nurses work and patients visit
    """
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    
    # Staff members (doctors/nurses) assigned to this clinic
    staff = models.ManyToManyField(
        User,
        limit_choices_to={'role__name__in': ['Doctor', 'Nurse']},
        related_name='clinics'
    )
    
    # Location data
    gps_coordinates = models.CharField(max_length=50, blank=True)  # "lat,long" format
    
    # Operational details
    is_public = models.BooleanField(default=True)
    services = models.JSONField(
        default=list,
        help_text="List of medical services offered"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def get_staff_count(self):
        return self.staff.count()

    def get_doctors(self):
        return self.staff.filter(role__name='Doctor')

    def get_nurses(self):
        return self.staff.filter(role__name='Nurse')    
    
class Patient(models.Model):
    """
    Additional patient-specific information
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    insurance_provider = models.CharField(max_length=100, blank=True)
    insurance_number = models.CharField(max_length=50, blank=True)
    
    def __str__(self):
        return f"Patient: {self.user.get_full_name()}"        
            
class DoctorSchedule(models.Model):
    """
    Defines doctor availability schedules at specific clinics
    """
    doctor = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='schedules',
        limit_choices_to={'role__name__in': ['Doctor', 'Nurse']}
    )
    clinic = models.ForeignKey('Clinic', on_delete=models.CASCADE, related_name='doctor_schedules')
    
    DAYS_OF_WEEK = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    # Appointment settings
    appointment_duration = models.PositiveIntegerField(default=30, help_text="Duration in minutes")
    max_patients_per_slot = models.PositiveIntegerField(default=1)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Special dates
    effective_from = models.DateField(null=True, blank=True)
    effective_until = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time")
    
    def __str__(self):
        return f"Dr. {self.doctor.get_full_name()} - {self.get_day_of_week_display()} at {self.clinic.name}"
    
    class Meta:
        unique_together = ['doctor', 'clinic', 'day_of_week', 'start_time']
        ordering = ['doctor', 'day_of_week', 'start_time']

class Appointment(models.Model):
    """
    Enhanced appointment model with clinic support
    """
    STATUS_CHOICES = [
        ('P', 'Pending'),
        ('A', 'Approved'),
        ('C', 'Cancelled'),
        ('D', 'Completed'),
        ('N', 'No Show'),
        ('R', 'Rescheduled'),
    ]
    
    PRIORITY_CHOICES = [
        ('L', 'Low'),
        ('M', 'Medium'),
        ('H', 'High'),
        ('U', 'Urgent'),
    ]
    
    # Core appointment information
    patient = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='patient_appointments',
        limit_choices_to={'role__name': 'Patient'}
    )
    healthcare_provider = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='provider_appointments',
        limit_choices_to={'role__name__in': ['Doctor', 'Nurse']}
    )
    clinic = models.ForeignKey('Clinic', on_delete=models.CASCADE, related_name='appointments')
    
    # Appointment details
    appointment_date = models.DateTimeField()
    duration = models.PositiveIntegerField(default=30, help_text="Duration in minutes")
    reason = models.TextField()
    notes = models.TextField(blank=True, help_text="Provider notes")
    
    # Status and priority
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='P')
    priority = models.CharField(max_length=1, choices=PRIORITY_CHOICES, default='M')
    
    # Additional information
    symptoms = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    follow_up_required = models.BooleanField(default=False)
    follow_up_date = models.DateField(null=True, blank=True)
    
    # Billing and insurance
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    insurance_claim_number = models.CharField(max_length=50, blank=True)
    
    # Reminders and notifications
    reminder_sent = models.BooleanField(default=False)
    confirmation_sent = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='created_appointments'
    )
    
    def clean(self):
        """Validate appointment constraints"""
        if self.appointment_date <= timezone.now():
            raise ValidationError("Appointment must be scheduled for a future date and time")
        
        # Check for conflicts
        conflicts = Appointment.objects.filter(
            healthcare_provider=self.healthcare_provider,
            appointment_date=self.appointment_date,
            status__in=['P', 'A']
        ).exclude(pk=self.pk)
        
        if conflicts.exists():
            raise ValidationError("Provider already has an appointment at this time")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.patient.get_full_name()} with Dr. {self.healthcare_provider.get_full_name()} on {self.appointment_date}"
    
    @property
    def is_upcoming(self):
        return self.appointment_date > timezone.now() and self.status not in ['C', 'D']
    
    @property
    def is_past_due(self):
        return self.appointment_date < timezone.now() and self.status in ['P', 'A']
    
    @property
    def end_time(self):
        return self.appointment_date + timezone.timedelta(minutes=self.duration)
    
    def can_be_cancelled(self):
        """Check if appointment can be cancelled (e.g., not too close to appointment time)"""
        hours_until_appointment = (self.appointment_date - timezone.now()).total_seconds() / 3600
        return hours_until_appointment >= 24 and self.status in ['P', 'A']
    
    def can_be_rescheduled(self):
        """Check if appointment can be rescheduled"""
        return self.status in ['P', 'A'] and not self.is_past_due
    
    def get_status_display_color(self):
        """Return CSS color class for status"""
        colors = {
            'P': 'yellow',  # Pending
            'A': 'green',   # Approved
            'C': 'red',     # Cancelled
            'D': 'blue',    # Completed
            'N': 'gray',    # No Show
            'R': 'orange',  # Rescheduled
        }
        return colors.get(self.status, 'gray')
    
    def get_priority_display_color(self):
        """Return CSS color class for priority"""
        colors = {
            'L': 'green',   # Low
            'M': 'yellow',  # Medium
            'H': 'orange',  # High
            'U': 'red',     # Urgent
        }
        return colors.get(self.priority, 'gray')
    
    class Meta:
        ordering = ['-appointment_date']
        indexes = [
            models.Index(fields=['appointment_date']),
            models.Index(fields=['status']),
            models.Index(fields=['healthcare_provider', 'appointment_date']),
            models.Index(fields=['patient', 'appointment_date']),
            models.Index(fields=['clinic', 'appointment_date']),
        ]
class EmergencyAmbulanceRequest(models.Model):
    """
    Manages emergency ambulance requests with clinic association
    """
    STATUS_CHOICES = [
        ('P', 'Pending'),
        ('D', 'Dispatched'),
        ('A', 'Arrived'),
        ('T', 'In Transit'),
        ('C', 'Completed'),
    ]
    
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    # Basic request information
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE)
    clinic = models.ForeignKey('Clinic', on_delete=models.SET_NULL, null=True, blank=True)
    request_time = models.DateTimeField(auto_now_add=True)
    
    # Location information
    location = models.CharField(max_length=255)
    gps_coordinates = models.CharField(max_length=50, blank=True)  # "lat,long" format
    
    # Medical information
    condition_description = models.TextField()
    suspected_disease = models.CharField(max_length=100, blank=True)
    
    # Status tracking
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='P')
    approval_status = models.CharField(max_length=10, choices=APPROVAL_STATUS_CHOICES, default='pending')
    
    # Ambulance and hospital information
    assigned_ambulance = models.CharField(max_length=100, blank=True)
    hospital_destination = models.CharField(max_length=255, blank=True)
    
    # Approval tracking
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_emergency_requests')
    approved_at = models.DateTimeField(null=True, blank=True)
    approval_comments = models.TextField(blank=True)
    rejection_reason = models.CharField(max_length=255, blank=True)
    
    # Dispatch tracking
    dispatched_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispatched_emergency_requests')
    dispatched_at = models.DateTimeField(null=True, blank=True)
    
    # Timeline tracking
    arrived_at = models.DateTimeField(null=True, blank=True)
    in_transit_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_emergency_requests')
    
    # Priority and urgency overrides
    priority_override = models.CharField(
        max_length=10, 
        choices=[('critical', 'Critical'), ('urgent', 'Urgent'), ('normal', 'Normal')],
        blank=True
    )
    urgency_level = models.CharField(
        max_length=15,
        choices=[
            ('immediate', 'Immediate'),
            ('urgent', 'Urgent'),
            ('standard', 'Standard'),
            ('non_urgent', 'Non-Urgent')
        ],
        blank=True
    )
    
    # Additional notes
    additional_notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-request_time']
        
    def __str__(self):
        return f"Emergency request #{self.id} from {self.patient.user.get_full_name()} at {self.request_time}"
    
    @property
    def patient_name(self):
        """Get patient's full name"""
        return self.patient.user.get_full_name() or self.patient.user.username
    
    @property
    def clinic_name(self):
        """Get clinic name"""
        return self.clinic.name if self.clinic else None
    
    @property
    def approved_by_name(self):
        """Get approver's name"""
        return self.approved_by.get_full_name() if self.approved_by else None
    
    @property
    def dispatched_by_name(self):
        """Get dispatcher's name"""
        return self.dispatched_by.get_full_name() if self.dispatched_by else None
    
    @property
    def completed_by_name(self):
        """Get completer's name"""
        return self.completed_by.get_full_name() if self.completed_by else None

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Q

class Disease(models.Model):
    DISEASE_TYPES = [
        ('malaria', 'Malaria'),
        ('pneumonia', 'Pneumonia'),
        ('other', 'Other'),
    ]
    
    SEVERITY_LEVELS = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'), 
        ('severe', 'Severe'),
        ('critical', 'Critical'),
    ]
    
    # Basic disease info
    name = models.CharField(max_length=100, unique=True)
    disease_type = models.CharField(max_length=20, choices=DISEASE_TYPES)
    icd_code = models.CharField(max_length=10, blank=True)
    description = models.TextField(blank=True)
    is_contagious = models.BooleanField(default=False)
    
    # Symptoms and scoring
    common_symptoms = models.JSONField(default=list)
    symptom_weights = models.JSONField(default=dict)
    mild_threshold = models.IntegerField(default=20)
    moderate_threshold = models.IntegerField(default=40)
    severe_threshold = models.IntegerField(default=70)
    emergency_threshold = models.IntegerField(default=80)
    
    # Treatment information
    common_treatments = models.JSONField(default=list)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.disease_type})"
    
    def get_symptom_score(self, selected_symptoms):
        """
        Calculate total score based on selected symptoms
        """
        total_score = 0
        for symptom in selected_symptoms:
            weight = self.symptom_weights.get(symptom.lower(), 1)
            total_score += weight
        return total_score
    
    def get_severity_level(self, score):
        """
        Determine severity level based on score
        """
        if score >= self.emergency_threshold:
            return 'critical'
        elif score >= self.severe_threshold:
            return 'severe'
        elif score >= self.moderate_threshold:
            return 'moderate'
        else:
            return 'mild'
    
    def get_recommendation(self, score):
        """
        Get recommendation based on score and severity
        """
        severity = self.get_severity_level(score)
        
        recommendations = {
            'mild': 'Monitor symptoms and rest. Consider home remedies.',
            'moderate': 'Schedule appointment within 24-48 hours.',
            'severe': 'Seek medical attention promptly.',
            'critical': 'Seek immediate emergency care.'
        }
        
        return recommendations.get(severity, 'Consult healthcare provider.')
    
    @classmethod
    def create_malaria_disease(cls):
        malaria_symptoms = [
            'fever', 'chills', 'headache', 'nausea', 'vomiting', 
            'muscle_aches', 'fatigue', 'sweating', 'abdominal_pain',
            'diarrhea', 'confusion', 'seizures', 'difficulty_breathing'
        ]
        
        malaria_weights = {
            'fever': 10, 'chills': 8, 'headache': 5, 'nausea': 4,
            'vomiting': 6, 'muscle_aches': 3, 'fatigue': 4,
            'sweating': 5, 'abdominal_pain': 6, 'diarrhea': 5,
            'confusion': 15, 'seizures': 20, 'difficulty_breathing': 18
        }
        
        return cls.objects.create(
            name='Malaria',
            disease_type='malaria',
            icd_code='1F40',
            description='Parasitic disease transmitted by mosquitoes',
            is_contagious=False,
            common_symptoms=malaria_symptoms,
            symptom_weights=malaria_weights,
            mild_threshold=15,
            moderate_threshold=35,
            severe_threshold=60,
            emergency_threshold=80,
            common_treatments=[
                'Antimalarial medications',
                'Pain relievers',
                'IV fluids for severe cases'
            ]
        )
    
    @classmethod
    def create_pneumonia_disease(cls):
        pneumonia_symptoms = [
            'cough', 'fever', 'shortness_of_breath', 'chest_pain',
            'fatigue', 'nausea', 'vomiting', 'diarrhea', 'confusion',
            'rapid_breathing', 'sweating', 'shaking_chills',
            'blue_lips_or_fingernails', 'severe_chest_pain'
        ]
        
        pneumonia_weights = {
            'cough': 8, 'fever': 10, 'shortness_of_breath': 15,
            'chest_pain': 12, 'fatigue': 4, 'nausea': 3,
            'vomiting': 5, 'diarrhea': 4, 'confusion': 18,
            'rapid_breathing': 16, 'sweating': 5, 'shaking_chills': 8,
            'blue_lips_or_fingernails': 25, 'severe_chest_pain': 20
        }
        
        return cls.objects.create(
            name='Pneumonia',
            disease_type='pneumonia',
            icd_code='J18.9',
            description='Lung infection inflaming air sacs',
            is_contagious=True,
            common_symptoms=pneumonia_symptoms,
            symptom_weights=pneumonia_weights,
            mild_threshold=20,
            moderate_threshold=40,
            severe_threshold=65,
            emergency_threshold=85,
            common_treatments=[
                'Antibiotics for bacterial',
                'Antivirals for viral',
                'Oxygen therapy for severe'
            ]
        )

class SymptomCheckerSession(models.Model):
    """
    Tracks symptom checking sessions and analysis results
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='symptom_sessions'
    )
    session_id = models.CharField(max_length=100, unique=True)
    
    # Symptoms data
    selected_symptoms = models.JSONField(default=list)
    custom_symptoms = models.JSONField(default=list)
    
    # Analysis results
    analyzed_diseases = models.ManyToManyField(
        Disease,
        through='DiseaseAnalysis',
        related_name='analysis_sessions'
    )
    primary_suspected_disease = models.ForeignKey(
        Disease,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='primary_suspected_in'
    )
    
    # Assessment
    overall_risk_score = models.IntegerField(default=0)
    severity_level = models.CharField(
        max_length=20,
        choices=Disease.SEVERITY_LEVELS,
        blank=True
    )
    recommendation = models.TextField(blank=True)
    
    # Patient context
    location = models.CharField(max_length=100, blank=True)
    age_range = models.CharField(max_length=20, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    temperature = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    heart_rate = models.IntegerField(null=True, blank=True)
    
    # Follow-up
    needs_followup = models.BooleanField(default=False)
    followup_date = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Symptom check #{self.id} by {self.user or 'Anonymous'}"

    def analyze_symptoms(self):
        """Analyze symptoms against all diseases"""
        all_symptoms = self.get_all_symptoms()
        if not all_symptoms:
            return
        
        max_score = 0
        primary_disease = None
        
        for disease in Disease.objects.all():
            score = disease.get_symptom_score(all_symptoms)
            
            DiseaseAnalysis.objects.update_or_create(
                session=self,
                disease=disease,
                defaults={
                    'calculated_score': score,
                    'probability_percentage': self._calculate_probability(score, disease),
                    'severity_assessment': disease.get_severity_level(score)
                }
            )
            
            if score > max_score:
                max_score = score
                primary_disease = disease
        
        self.overall_risk_score = max_score
        self.primary_suspected_disease = primary_disease
        
        if primary_disease:
            self.severity_level = primary_disease.get_severity_level(max_score)
            self.recommendation = primary_disease.get_recommendation(max_score)
            self._set_followup()
        
        self.save()

    def _calculate_probability(self, score, disease):
        """Calculate probability percentage based on score"""
        if score >= disease.emergency_threshold:
            return 90.0
        elif score >= disease.severe_threshold:
            return 75.0
        elif score >= disease.moderate_threshold:
            return 60.0
        elif score >= disease.mild_threshold:
            return 40.0
        return 20.0

    def _set_followup(self):
        """Set follow-up date based on severity"""
        if self.severity_level in ['severe', 'critical']:
            self.needs_followup = True
            if self.severity_level == 'critical':
                self.followup_date = timezone.now() + timezone.timedelta(hours=2)
            else:
                self.followup_date = timezone.now() + timezone.timedelta(days=1)

    def get_all_symptoms(self):
        """Combine predefined and custom symptoms"""
        return self.selected_symptoms + self.custom_symptoms

    def add_custom_symptom(self, symptom):
        """Add a custom symptom to the session"""
        if symptom not in self.custom_symptoms:
            self.custom_symptoms.append(symptom)
            self.save()

    def create_patient_diagnosis(self, patient):
        """Convert session to a diagnosis record"""
        if not self.primary_suspected_disease:
            return None
            
        return PatientDiagnosis.objects.create(
            patient=patient,
            disease=self.primary_suspected_disease,
            symptoms={
                'selected': self.selected_symptoms,
                'custom': self.custom_symptoms
            },
            severity=self.severity_level,
            status='self_reported',
            session=self,
            temperature=self.temperature,
            heart_rate=self.heart_rate
        )

    def validate_symptoms(self):
        """Check for contradictory symptoms"""
        warnings = []
        symptoms = {s.lower() for s in self.get_all_symptoms()}
        
        if 'fever' in symptoms and 'low_body_temperature' in symptoms:
            warnings.append("Contradictory fever and low temperature symptoms")
            
        if ('cough' in symptoms and 'shortness_of_breath' in symptoms and 
            'chest_pain' not in symptoms):
            warnings.append("Consider adding chest pain assessment")
            
        return warnings

class DiseaseAnalysis(models.Model):
    """
    Analysis results for a disease in a symptom session
    """
    session = models.ForeignKey(
        SymptomCheckerSession,
        on_delete=models.CASCADE,
        related_name='disease_analyses'
    )
    disease = models.ForeignKey(
        Disease,
        on_delete=models.CASCADE,
        related_name='session_analyses'
    )
    calculated_score = models.IntegerField(default=0)
    probability_percentage = models.FloatField(default=0.0)
    severity_assessment = models.CharField(max_length=20, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['session', 'disease']
        ordering = ['-calculated_score']
    
    def __str__(self):
        return f"{self.disease.name} analysis ({self.calculated_score} pts)"

class PatientDiagnosis(models.Model):
    """
    Diagnosis record connecting patients to doctors
    """
    DIAGNOSIS_STATUS = [
        ('self_reported', 'Self-Reported'),
        ('doctor_confirmed', 'Doctor Confirmed'),
        ('doctor_rejected', 'Doctor Rejected'),
        ('modified', 'Modified Diagnosis'),
    ]
    
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_diagnoses'
    )
    disease = models.ForeignKey(
        Disease,
        on_delete=models.PROTECT,
        related_name='patient_cases'
    )
    treating_doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='treated_cases'
    )
    status = models.CharField(
        max_length=20,
        choices=DIAGNOSIS_STATUS,
        default='self_reported'
    )
    symptoms = models.JSONField()
    doctor_notes = models.TextField(blank=True)
    test_results = models.JSONField(blank=True, null=True)
    severity = models.CharField(
        max_length=20,
        choices=Disease.SEVERITY_LEVELS,
        blank=True
    )
    session = models.ForeignKey(
        SymptomCheckerSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resulting_diagnoses'
    )
    
    # Vital signs
    temperature = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    heart_rate = models.IntegerField(null=True, blank=True)
    blood_pressure = models.CharField(max_length=20, blank=True)
    oxygen_saturation = models.IntegerField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_diagnoses'
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = 'Patient Diagnoses'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.patient}'s {self.disease} diagnosis ({self.status})"

    def confirm_diagnosis(self, doctor, notes="", test_results=None):
        """Doctor confirms this diagnosis"""
        self.status = 'doctor_confirmed'
        self.treating_doctor = doctor
        self.doctor_notes = notes
        self.test_results = test_results or {}
        self.confirmed_by = doctor
        self.confirmed_at = timezone.now()
        self.save()
        self._ensure_treatment_plan(doctor)

    def reject_diagnosis(self, doctor, notes=""):
        """Doctor rejects this diagnosis"""
        self.status = 'doctor_rejected'
        self.doctor_notes = notes
        self.confirmed_by = doctor
        self.confirmed_at = timezone.now()
        self.save()

    def _ensure_treatment_plan(self, doctor):
        """Create treatment plan if none exists"""
        if not hasattr(self, 'treatment_plan'):
            TreatmentPlan.objects.create(
                diagnosis=self,
                supervising_doctor=doctor,
                created_by=doctor,
                medications=[],
                procedures=[],
                duration='7 days',
                follow_up_required=self.severity in ['moderate', 'severe', 'critical'],
                follow_up_interval=7 if self.severity in ['moderate', 'severe'] else 3
            )

    def get_treatment_plan(self):
        """Get or create associated treatment plan"""
        if hasattr(self, 'treatment_plan'):
            return self.treatment_plan
        return None

class MedicalTest(models.Model):
    """
    Standard medical tests that can be ordered
    """
    TEST_TYPES = [
        ('blood', 'Blood Test'),
        ('imaging', 'Imaging'),
        ('physical', 'Physical Exam'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    test_type = models.CharField(max_length=20, choices=TEST_TYPES)
    typical_values = models.JSONField()
    disease_specific = models.ManyToManyField(
        Disease,
        blank=True,
        related_name='related_tests'
    )
    
    def __str__(self):
        return self.name

class PatientTestResult(models.Model):
    """
    Results of medical tests performed on patients
    """
    diagnosis = models.ForeignKey(
        PatientDiagnosis,
        on_delete=models.CASCADE,
        related_name='test_result_records'
    )
    test = models.ForeignKey(
        MedicalTest,
        on_delete=models.PROTECT,
        related_name='patient_results'
    )
    result = models.JSONField()
    notes = models.TextField(blank=True)
    performed_at = models.DateTimeField(default=timezone.now)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='ordered_tests'
    )
    
    class Meta:
        ordering = ['-performed_at']
    
    def __str__(self):
        return f"{self.test} result for {self.diagnosis.patient}"

class TreatmentPlan(models.Model):
    """
    Treatment plan for a confirmed diagnosis
    """
    diagnosis = models.OneToOneField(
        PatientDiagnosis,
        on_delete=models.CASCADE,
        related_name='treatment_plan'
    )
    supervising_doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='supervised_treatments'
    )
    medications = models.JSONField(default=list)
    procedures = models.JSONField(default=list)
    duration = models.CharField(max_length=100)
    follow_up_required = models.BooleanField(default=False)
    follow_up_interval = models.IntegerField()
    instructions = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_treatments'
    )
    
    def __str__(self):
        return f"Treatment for {self.diagnosis}"

    def add_medication(self, name, dosage, frequency):
        """Add medication to the plan"""
        self.medications.append({
            'name': name,
            'dosage': dosage,
            'frequency': frequency,
            'added_at': timezone.now().isoformat()
        })
        self.save()

    def add_procedure(self, name, description, scheduled_date):
        """Add procedure to the plan"""
        self.procedures.append({
            'name': name,
            'description': description,
            'scheduled_date': scheduled_date.isoformat(),
            'added_at': timezone.now().isoformat()
        })
        self.save()

    def mark_completed(self):
        """Mark treatment as completed"""
        self.duration = "Completed"
        self.save()

# 🆕 NEW: Prevention tips linked to diseases
class PreventionTip(models.Model):
    """
    Prevention and care tips for diseases
    """
    TIP_CATEGORIES = [
        ('prevention', 'Prevention'),
        ('self_care', 'Self Care'),
        ('when_to_seek_help', 'When to Seek Help'),
        ('emergency_signs', 'Emergency Signs'),
    ]
    
    disease = models.ForeignKey(Disease, on_delete=models.CASCADE, related_name='prevention_tips')
    category = models.CharField(max_length=20, choices=TIP_CATEGORIES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.IntegerField(default=1, help_text="1=highest priority, 10=lowest")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['priority', 'category']
    
    def __str__(self):
        return f"{self.disease.name}: {self.title}"

class ScreeningAlert(models.Model):
    """
    Triggered when abnormal disease patterns are detected
    """
    SEVERITY_CHOICES = [
        ('L', 'Low'),
        ('M', 'Medium'),
        ('H', 'High'),
        ('C', 'Critical'),
    ]

    disease = models.ForeignKey(Disease, on_delete=models.CASCADE)
    location = models.CharField(max_length=100)  # District/village name
    gps_coordinates = models.CharField(max_length=50, blank=True)  # "lat,long"
    radius_km = models.IntegerField(default=5)  # Affected area radius
    severity = models.CharField(max_length=1, choices=SEVERITY_CHOICES)
    cases_reported = models.IntegerField()
    threshold_exceeded = models.IntegerField()  # Baseline cases exceeded by X%
    triggered_by = models.ForeignKey(SymptomCheckerSession, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.disease.name} alert in {self.location} ({self.get_severity_display()})"

class HealthcareWorkerAlert(models.Model):
    """
    Alerts for healthcare workers
    """
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='alerts_received'
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Alert for {self.recipient}"

class MedicalRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    date = models.DateTimeField()
    diagnosis = models.TextField()
    treatment_summary = models.TextField()
    appointment = models.ForeignKey(
        Appointment, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL
    )
    emergency_request = models.ForeignKey(
        EmergencyAmbulanceRequest,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    related_diseases = models.ManyToManyField(Disease)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']    
class CronJobLog(models.Model):
    """
    Tracks execution of scheduled background jobs for system monitoring
    """
    
    JOB_STATUS_CHOICES = [
        ('S', 'Started'),
        ('C', 'Completed'),
        ('F', 'Failed'),
        ('T', 'Timeout'),
    ]
    
    JOB_TYPE_CHOICES = [
        ('DISEASE_ALERT', 'Disease Surveillance Alert'),
        ('SYMPTOM_ANALYSIS', 'Symptom Pattern Analysis'),
        ('EMERGENCY_CLEANUP', 'Emergency Request Cleanup'),
        ('APPOINTMENT_REMINDER', 'Appointment Reminders'),
        ('PREVENTION_CAMPAIGN', 'Prevention Campaign Updates'),
        ('DATA_BACKUP', 'Database Backup'),
        ('HEALTH_CHECK', 'System Health Check'),
        ('USER_CLEANUP', 'Inactive User Cleanup'),
        ('NOTIFICATION_QUEUE', 'Notification Queue Processing'),
        ('ANALYTICS_REPORT', 'Analytics Report Generation'),
    ]
    
    # Core job identification
    job_name = models.CharField(
        max_length=100,
        help_text="Name of the scheduled job"
    )
    job_type = models.CharField(
        max_length=20,
        choices=JOB_TYPE_CHOICES,
        help_text="Category of the scheduled job"
    )
    
    # Execution tracking
    timestamp = models.DateTimeField(
        default=timezone.now,
        help_text="When the job started executing"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the job finished (success or failure)"
    )
    
    # Status and results
    status = models.CharField(
        max_length=1,
        choices=JOB_STATUS_CHOICES,
        default='S',
        help_text="Current status of the job"
    )
    
    # Performance metrics
    duration_seconds = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="How long the job took to complete"
    )
    
    records_processed = models.PositiveIntegerField(
        default=0,
        help_text="Number of records/items processed"
    )
    
    # Error handling
    error_message = models.TextField(
        blank=True,
        help_text="Error details if job failed"
    )
    
    # Additional context
    parameters = models.JSONField(
        default=dict,
        blank=True,
        help_text="Job parameters and configuration"
    )
    
    result_summary = models.JSONField(
        default=dict,
        blank=True,
        help_text="Summary of job execution results"
    )
    
    # System context
    server_hostname = models.CharField(
        max_length=100,
        blank=True,
        help_text="Server that executed the job"
    )
    
    memory_usage_mb = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Peak memory usage during execution"
    )
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['job_type', '-timestamp']),
            models.Index(fields=['status', '-timestamp']),
            models.Index(fields=['-timestamp']),
        ]
        
    def __str__(self):
        return f"{self.job_name} - {self.get_status_display()} at {self.timestamp}"
    
    @classmethod
    def last(cls):
        """
        Get the most recent cron job log entry
        Used by health check system
        """
        return cls.objects.first()
    
    @classmethod
    def get_recent_failures(cls, hours=24):
        """
        Get failed jobs in the last N hours
        """
        cutoff = timezone.now() - timezone.timedelta(hours=hours)
        return cls.objects.filter(
            timestamp__gte=cutoff,
            status='F'
        )
    
    @classmethod
    def get_job_stats(cls, job_type, days=7):
        """
        Get performance statistics for a specific job type
        """
        cutoff = timezone.now() - timezone.timedelta(days=days)
        jobs = cls.objects.filter(
            job_type=job_type,
            timestamp__gte=cutoff,
            status='C'  # Only completed jobs
        ).exclude(duration_seconds__isnull=True)
        
        if not jobs.exists():
            return None
            
        durations = [job.duration_seconds for job in jobs]
        return {
            'count': len(durations),
            'avg_duration': sum(durations) / len(durations),
            'min_duration': min(durations),
            'max_duration': max(durations),
            'success_rate': jobs.count() / cls.objects.filter(
                job_type=job_type,
                timestamp__gte=cutoff
            ).count() * 100
        }
    
    def mark_completed(self, records_processed=0, result_summary=None):
        """
        Mark job as successfully completed
        """
        from django.utils import timezone
        
        self.completed_at = timezone.now()
        self.status = 'C'
        self.records_processed = records_processed
        
        if self.timestamp and self.completed_at:
            self.duration_seconds = (self.completed_at - self.timestamp).total_seconds()
        
        if result_summary:
            self.result_summary = result_summary
            
        self.save()
    
    def mark_failed(self, error_message):
        """
        Mark job as failed with error details
        """
        from django.utils import timezone
        
        self.completed_at = timezone.now()
        self.status = 'F'
        self.error_message = error_message
        
        if self.timestamp and self.completed_at:
            self.duration_seconds = (self.completed_at - self.timestamp).total_seconds()
            
        self.save()
    
    def is_running_too_long(self, max_minutes=30):
        """
        Check if job has been running longer than expected
        """
        if self.status != 'S':
            return False
            
        from django.utils import timezone
        runtime = timezone.now() - self.timestamp
        return runtime.total_seconds() > (max_minutes * 60)
    
    @property
    def is_healthy(self):
        """
        Determine if this job execution was healthy
        """        