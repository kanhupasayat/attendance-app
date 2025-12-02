# Generated manually for User.shift field

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_profileupdaterequest_requested_bank_holder_name_and_more'),
        ('attendance', '0007_shift_compoff'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='shift',
            field=models.ForeignKey(
                blank=True,
                help_text="Employee's assigned shift",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='employees',
                to='attendance.shift'
            ),
        ),
    ]
