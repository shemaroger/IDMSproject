from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

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
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    
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
        return f"Profile of {self.user.email}"
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
            
class Appointment(models.Model):
    """
    Patient appointment management
    """
    STATUS_CHOICES = [
        ('P', 'Pending'),
        ('A', 'Approved'),
        ('C', 'Cancelled'),
        ('D', 'Completed'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    healthcare_provider = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role__name__in': ['Doctor', 'Nurse']})
    appointment_date = models.DateTimeField()
    reason = models.TextField()
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='P')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Appointment for {self.patient.user.get_full_name()} on {self.appointment_date}"    
    
class EmergencyAmbulanceRequest(models.Model):
    """
    Manages emergency ambulance requests
    """
    STATUS_CHOICES = [
        ('P', 'Pending'),
        ('D', 'Dispatched'),
        ('A', 'Arrived'),
        ('T', 'In Transit'),
        ('C', 'Completed'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    request_time = models.DateTimeField(auto_now_add=True)
    location = models.CharField(max_length=255)
    gps_coordinates = models.CharField(max_length=50, blank=True)  # "lat,long" format
    condition_description = models.TextField()
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='P')
    assigned_ambulance = models.CharField(max_length=100, blank=True)
    hospital_destination = models.CharField(max_length=255, blank=True)
    
    # Link to disease surveillance if relevant
    suspected_disease = models.CharField(max_length=100, blank=True)  # "Malaria", "Pneumonia", etc.
    
    def __str__(self):
        return f"Emergency request from {self.patient.user.get_full_name()} at {self.request_time}"   
    
class Symptom(models.Model):
    """
    Stores symptoms for malaria and respiratory infections
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    related_diseases = models.JSONField(default=list)  # ["malaria", "pneumonia"]
    severity_score = models.IntegerField(default=1)  # 1-10 scale

    def __str__(self):
        return self.name    
    
class Disease(models.Model):
    """
    Stores disease information (malaria, pneumopathies, etc.)
    """
    name = models.CharField(max_length=100, unique=True)
    icd_code = models.CharField(max_length=10, blank=True)  # ICD-11 code
    description = models.TextField(blank=True)
    emergency_threshold = models.IntegerField(default=5)  # When to recommend emergency care
    is_contagious = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.icd_code})"

class SymptomCheckerSession(models.Model):
    """
    Tracks a user's symptom assessment session
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_id = models.CharField(max_length=100, unique=True)
    symptoms_selected = models.ManyToManyField(Symptom)
    possible_diseases = models.ManyToManyField(Disease)
    risk_score = models.IntegerField(default=0)
    recommendation = models.CharField(max_length=200)  # "Seek ER", "Schedule appointment", etc.
    location = models.CharField(max_length=100, blank=True)  # For geospatial tracking
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Symptom check by {self.user or 'Anonymous'} at {self.created_at}"

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
    Delivers alerts to staff members
    """
    alert = models.ForeignKey(ScreeningAlert, on_delete=models.CASCADE)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role__name__in': ['Doctor', 'Nurse', 'HealthOfficer']})
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"Alert #{self.id} to {self.recipient.email}"

class PreventiveTip(models.Model):
    """
    Consolidated model for all preventive measures (malaria & respiratory infections)
    """
    TIP_TYPE_CHOICES = [
        ('MOSQUITO_NET', 'Mosquito Net Usage'),
        ('VACCINATION', 'Vaccination Campaign'),
        ('HYGIENE', 'Hygiene Practice'),
        ('ENVIRONMENT', 'Environmental Control'),
        ('EDUCATION', 'Health Education'),
    ]
    
    DISEASE_TARGET_CHOICES = [
        ('MALARIA', 'Malaria'),
        ('PNEUMONIA', 'Pneumonia'),
        ('BOTH', 'Both'),
        ('GENERAL', 'General Health'),
    ]
    
    PRIORITY_LEVELS = [
        (1, 'Low'),
        (2, 'Medium'),
        (3, 'High'),
        (4, 'Critical'),
    ]
    
    # Core fields
    title = models.CharField(max_length=200)
    description = models.TextField()
    tip_type = models.CharField(max_length=20, choices=TIP_TYPE_CHOICES)
    disease_target = models.CharField(max_length=10, choices=DISEASE_TARGET_CHOICES, default='BOTH')
    
    # Multimedia
    image = models.ImageField(upload_to='prevention_tips/', blank=True, null=True)
    video_url = models.URLField(blank=True)
    
    # Metadata
    priority = models.IntegerField(choices=PRIORITY_LEVELS, default=2)
    effectiveness = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Estimated effectiveness percentage (1-100)",
        default=80
    )
    
    # Campaign-specific fields (nullable for non-campaign tips)
    campaign_start_date = models.DateField(null=True, blank=True)
    campaign_end_date = models.DateField(null=True, blank=True)
    campaign_locations = models.JSONField(
        null=True, 
        blank=True,
        help_text="JSON array of target locations"
    )
    
    # System fields
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    # Relationships
    related_symptoms = models.ManyToManyField(
        'Symptom', 
        blank=True,
        help_text="Symptoms this tip helps prevent"
    )
    
    def __str__(self):
        return f"{self.get_tip_type_display()}: {self.title}"
    
    class Meta:
        indexes = [
            models.Index(fields=['tip_type']),
            models.Index(fields=['disease_target']),
            models.Index(fields=['priority']),
        ]
        ordering = ['-priority', '-created_at']
    
    def is_campaign(self):
        """Check if this is a time-bound campaign"""
        return self.tip_type == 'VACCINATION' and self.campaign_start_date
    
    def get_target_diseases(self):
        """Returns list of target disease names"""
        if self.disease_target == 'BOTH':
            return ['Malaria', 'Pneumonia']
        return [self.get_disease_target_display()]                
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