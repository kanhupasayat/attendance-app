# Generated manually for face_verified field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0008_attendance_attendance_user_id_d716c4_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendance',
            name='face_verified',
            field=models.BooleanField(default=False, help_text='True if face was verified during punch in'),
        ),
    ]
