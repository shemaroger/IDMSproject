from django.core.management.base import BaseCommand
from IDMSapp.models import Disease


class Command(BaseCommand):
    help = 'Initialize the database with sample diseases for the symptom checker'

    def handle(self, *args, **options):
        try:
            # Create Malaria disease
            malaria = Disease.create_malaria_disease()
            if malaria:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully created/updated Malaria disease')
                )
            
            # Create Pneumonia disease
            pneumonia = Disease.create_pneumonia_disease()
            if pneumonia:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully created/updated Pneumonia disease')
                )
            
            self.stdout.write(
                self.style.SUCCESS('Disease initialization completed successfully!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error initializing diseases: {str(e)}')
            )