from django.db import migrations


def add_sick_leave_type(apps, schema_editor):
    LeaveType = apps.get_model('leaves', 'LeaveType')

    # Create Sick Leave type (1 day per month = 12 days annual)
    LeaveType.objects.get_or_create(
        code='SL',
        defaults={
            'name': 'Sick Leave',
            'annual_quota': 12,  # 1 per month
            'is_carry_forward': False,
            'max_carry_forward': 0,
            'description': 'Sick leave - 1 day per month',
            'is_active': True,
        }
    )


def remove_sick_leave_type(apps, schema_editor):
    LeaveType = apps.get_model('leaves', 'LeaveType')
    LeaveType.objects.filter(code='SL').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('leaves', '0002_leaverequest_lop_days_leaverequest_paid_days'),
    ]

    operations = [
        migrations.RunPython(add_sick_leave_type, remove_sick_leave_type),
    ]
