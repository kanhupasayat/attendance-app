# Generated manually for LeaveRequest.comp_off_days field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('leaves', '0004_add_month_to_balance'),
    ]

    operations = [
        migrations.AddField(
            model_name='leaverequest',
            name='comp_off_days',
            field=models.DecimalField(
                decimal_places=1,
                default=0,
                help_text='Days covered by comp off',
                max_digits=4
            ),
        ),
    ]
