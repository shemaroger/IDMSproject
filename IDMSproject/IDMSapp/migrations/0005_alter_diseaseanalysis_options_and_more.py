# Generated by Django 5.2.3 on 2025-07-05 01:52

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('IDMSapp', '0004_alter_emergencyambulancerequest_options_and_more'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='diseaseanalysis',
            options={'ordering': ['-calculated_score']},
        ),
        migrations.AlterModelOptions(
            name='healthcareworkeralert',
            options={},
        ),
        migrations.RenameField(
            model_name='healthcareworkeralert',
            old_name='sent_at',
            new_name='created_at',
        ),
        migrations.RemoveField(
            model_name='healthcareworkeralert',
            name='alert',
        ),
        migrations.RemoveField(
            model_name='healthcareworkeralert',
            name='read_at',
        ),
        migrations.AddField(
            model_name='disease',
            name='common_treatments',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='symptomcheckersession',
            name='heart_rate',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='symptomcheckersession',
            name='temperature',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name='disease',
            name='common_symptoms',
            field=models.JSONField(default=list),
        ),
        migrations.AlterField(
            model_name='disease',
            name='emergency_threshold',
            field=models.IntegerField(default=80),
        ),
        migrations.AlterField(
            model_name='disease',
            name='mild_threshold',
            field=models.IntegerField(default=20),
        ),
        migrations.AlterField(
            model_name='disease',
            name='moderate_threshold',
            field=models.IntegerField(default=40),
        ),
        migrations.AlterField(
            model_name='disease',
            name='severe_threshold',
            field=models.IntegerField(default=70),
        ),
        migrations.AlterField(
            model_name='disease',
            name='symptom_weights',
            field=models.JSONField(default=dict),
        ),
        migrations.AlterField(
            model_name='diseaseanalysis',
            name='disease',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='session_analyses', to='IDMSapp.disease'),
        ),
        migrations.AlterField(
            model_name='diseaseanalysis',
            name='session',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='disease_analyses', to='IDMSapp.symptomcheckersession'),
        ),
        migrations.AlterField(
            model_name='healthcareworkeralert',
            name='recipient',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='alerts_received', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='symptomcheckersession',
            name='analyzed_diseases',
            field=models.ManyToManyField(related_name='analysis_sessions', through='IDMSapp.DiseaseAnalysis', to='IDMSapp.disease'),
        ),
        migrations.AlterField(
            model_name='symptomcheckersession',
            name='custom_symptoms',
            field=models.JSONField(default=list),
        ),
        migrations.AlterField(
            model_name='symptomcheckersession',
            name='gender',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name='symptomcheckersession',
            name='primary_suspected_disease',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='primary_suspected_in', to='IDMSapp.disease'),
        ),
        migrations.AlterField(
            model_name='symptomcheckersession',
            name='selected_symptoms',
            field=models.JSONField(default=list),
        ),
        migrations.AlterField(
            model_name='symptomcheckersession',
            name='severity_level',
            field=models.CharField(blank=True, choices=[('mild', 'Mild'), ('moderate', 'Moderate'), ('severe', 'Severe'), ('critical', 'Critical')], max_length=20),
        ),
        migrations.AlterField(
            model_name='symptomcheckersession',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='symptom_sessions', to=settings.AUTH_USER_MODEL),
        ),
        migrations.CreateModel(
            name='MedicalTest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('test_type', models.CharField(choices=[('blood', 'Blood Test'), ('imaging', 'Imaging'), ('physical', 'Physical Exam'), ('other', 'Other')], max_length=20)),
                ('typical_values', models.JSONField()),
                ('disease_specific', models.ManyToManyField(blank=True, related_name='related_tests', to='IDMSapp.disease')),
            ],
        ),
        migrations.CreateModel(
            name='PatientDiagnosis',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('self_reported', 'Self-Reported'), ('doctor_confirmed', 'Doctor Confirmed'), ('doctor_rejected', 'Doctor Rejected'), ('modified', 'Modified Diagnosis')], default='self_reported', max_length=20)),
                ('symptoms', models.JSONField()),
                ('doctor_notes', models.TextField(blank=True)),
                ('test_results', models.JSONField(blank=True, null=True)),
                ('severity', models.CharField(blank=True, choices=[('mild', 'Mild'), ('moderate', 'Moderate'), ('severe', 'Severe'), ('critical', 'Critical')], max_length=20)),
                ('temperature', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('heart_rate', models.IntegerField(blank=True, null=True)),
                ('blood_pressure', models.CharField(blank=True, max_length=20)),
                ('oxygen_saturation', models.IntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('confirmed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='confirmed_diagnoses', to=settings.AUTH_USER_MODEL)),
                ('disease', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='patient_cases', to='IDMSapp.disease')),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='patient_diagnoses', to=settings.AUTH_USER_MODEL)),
                ('session', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='resulting_diagnoses', to='IDMSapp.symptomcheckersession')),
                ('treating_doctor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='treated_cases', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Patient Diagnoses',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PatientTestResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('result', models.JSONField()),
                ('notes', models.TextField(blank=True)),
                ('performed_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('diagnosis', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='test_result_records', to='IDMSapp.patientdiagnosis')),
                ('performed_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='ordered_tests', to=settings.AUTH_USER_MODEL)),
                ('test', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='patient_results', to='IDMSapp.medicaltest')),
            ],
            options={
                'ordering': ['-performed_at'],
            },
        ),
        migrations.CreateModel(
            name='TreatmentPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('medications', models.JSONField(default=list)),
                ('procedures', models.JSONField(default=list)),
                ('duration', models.CharField(max_length=100)),
                ('follow_up_required', models.BooleanField(default=False)),
                ('follow_up_interval', models.IntegerField()),
                ('instructions', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='created_treatments', to=settings.AUTH_USER_MODEL)),
                ('diagnosis', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='treatment_plan', to='IDMSapp.patientdiagnosis')),
                ('supervising_doctor', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='supervised_treatments', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
