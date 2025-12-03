# Generated manually for requested_face_descriptor field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_user_face_descriptor'),
    ]

    operations = [
        migrations.AddField(
            model_name='profileupdaterequest',
            name='requested_face_descriptor',
            field=models.TextField(blank=True, help_text='Face descriptor to be saved on approval', null=True),
        ),
    ]
