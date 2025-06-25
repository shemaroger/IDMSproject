from django.core.management.base import BaseCommand
from .models import Role

class Command(BaseCommand):
    help = 'Create default roles for the application'

    def handle(self, *args, **options):
        # Roles as expected in frontend ProtectedRoute
        roles_to_create = [
            {
                'name': 'Admin',
                'description': 'System administrator with full access',
                'can_self_register': False
            },
            {
                'name': 'Doctor',
                'description': 'Medical practitioner role',
                'can_self_register': False
            },
            {
                'name': 'Nurse',
                'description': 'Registered nurse role',
                'can_self_register': False
            },
            {
                'name': 'Patient',
                'description': 'Patient user role',
                'can_self_register': True
            }
        ]

        for role_data in roles_to_create:
            role, created = Role.objects.get_or_create(
                name=role_data['name'],
                defaults={
                    'description': role_data['description'],
                    'can_self_register': role_data['can_self_register']
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✅ Created role: {role.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'ℹ️ Role already exists: {role.name}'))

        self.stdout.write(self.style.SUCCESS('\n🎉 Successfully set up all roles!'))

        # Display role hierarchy for frontend mapping
        self.stdout.write(self.style.SUCCESS('\n--- Role Access Map (Frontend) ---'))
        self.stdout.write('1. Admin - Full system access')
        self.stdout.write('2. Doctor - Can access ProviderRoute, HealthcareWorkerRoute')
        self.stdout.write('3. Nurse - Can access ProviderRoute, HealthcareWorkerRoute')
        self.stdout.write('4. Patient - Can access PatientRoute')

        # Self-registration overview
        self.stdout.write(self.style.SUCCESS('\n--- Self-Registration ---'))
        for role in Role.objects.order_by('name'):
            status = '✅ Enabled' if role.can_self_register else '🚫 Disabled'
            self.stdout.write(f'{role.name}: {status}')
        self.stdout.write(self.style.SUCCESS('\n🎉 Role setup complete!'))