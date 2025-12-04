# Generated manually for ActivityLog model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_profileupdaterequest_requested_face_descriptor'),
    ]

    operations = [
        migrations.CreateModel(
            name='ActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_type', models.CharField(choices=[
                    ('punch_in', 'Punch In'),
                    ('punch_out', 'Punch Out'),
                    ('attendance_edit', 'Attendance Edit'),
                    ('punch_out_cleared', 'Punch Out Cleared'),
                    ('leave_applied', 'Leave Applied'),
                    ('leave_approved', 'Leave Approved'),
                    ('leave_rejected', 'Leave Rejected'),
                    ('leave_cancelled', 'Leave Cancelled'),
                    ('regularization_applied', 'Regularization Applied'),
                    ('regularization_approved', 'Regularization Approved'),
                    ('regularization_rejected', 'Regularization Rejected'),
                    ('wfh_applied', 'WFH Applied'),
                    ('wfh_approved', 'WFH Approved'),
                    ('wfh_rejected', 'WFH Rejected'),
                    ('employee_added', 'Employee Added'),
                    ('employee_updated', 'Employee Updated'),
                    ('employee_deactivated', 'Employee Deactivated'),
                    ('profile_update_requested', 'Profile Update Requested'),
                    ('profile_update_approved', 'Profile Update Approved'),
                    ('profile_update_rejected', 'Profile Update Rejected'),
                    ('shift_created', 'Shift Created'),
                    ('shift_updated', 'Shift Updated'),
                    ('shift_deleted', 'Shift Deleted'),
                    ('holiday_added', 'Holiday Added'),
                    ('holiday_updated', 'Holiday Updated'),
                    ('holiday_deleted', 'Holiday Deleted'),
                    ('comp_off_earned', 'Comp Off Earned'),
                    ('comp_off_used', 'Comp Off Used'),
                    ('leave_type_created', 'Leave Type Created'),
                    ('leave_type_updated', 'Leave Type Updated'),
                    ('system', 'System'),
                ], max_length=30)),
                ('category', models.CharField(choices=[
                    ('attendance', 'Attendance'),
                    ('leave', 'Leave'),
                    ('regularization', 'Regularization'),
                    ('wfh', 'WFH'),
                    ('employee', 'Employee'),
                    ('profile', 'Profile'),
                    ('shift', 'Shift'),
                    ('holiday', 'Holiday'),
                    ('comp_off', 'Comp Off'),
                    ('leave_type', 'Leave Type'),
                    ('system', 'System'),
                ], max_length=20)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('related_model', models.CharField(blank=True, help_text='Model name of related object', max_length=50)),
                ('related_id', models.IntegerField(blank=True, help_text='ID of related object', null=True)),
                ('extra_data', models.JSONField(blank=True, help_text='Additional context data', null=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, help_text='User who performed this action', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='activities_performed', to=settings.AUTH_USER_MODEL)),
                ('target_user', models.ForeignKey(blank=True, help_text='User affected by this action', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='activities_affected', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'activity_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['actor', 'created_at'], name='activity_lo_actor_i_a1b2c3_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['target_user', 'created_at'], name='activity_lo_target__d4e5f6_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['category', 'created_at'], name='activity_lo_categor_g7h8i9_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['activity_type', 'created_at'], name='activity_lo_activit_j0k1l2_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['-created_at'], name='activity_lo_created_m3n4o5_idx'),
        ),
    ]
