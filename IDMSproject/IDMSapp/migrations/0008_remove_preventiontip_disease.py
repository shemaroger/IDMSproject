# Generated by Django 5.2.3 on 2025-07-06 01:58

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('IDMSapp', '0007_preventiontip_image_preventiontip_updated_at_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='preventiontip',
            name='disease',
        ),
    ]
