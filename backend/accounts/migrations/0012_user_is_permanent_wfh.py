# Generated manually for is_permanent_wfh field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_activitylog'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_permanent_wfh',
            field=models.BooleanField(default=False, help_text='If True, employee can punch in from anywhere (Work From Home)'),
        ),
    ]
