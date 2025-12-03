# Generated manually for face_descriptor field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_alter_notification_notification_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='face_descriptor',
            field=models.TextField(blank=True, help_text='128-dimensional face descriptor for face recognition (JSON array)', null=True),
        ),
    ]
