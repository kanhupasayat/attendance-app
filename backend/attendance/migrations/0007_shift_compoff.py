# Generated manually for Shift and CompOff models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import datetime


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('attendance', '0006_alter_officelocation_latitude_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Shift',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('start_time', models.TimeField(default=datetime.time(10, 0))),
                ('end_time', models.TimeField(default=datetime.time(19, 0))),
                ('break_start', models.TimeField(default=datetime.time(14, 0))),
                ('break_end', models.TimeField(default=datetime.time(15, 0))),
                ('break_duration_hours', models.DecimalField(decimal_places=1, default=1.0, max_digits=3)),
                ('grace_period_minutes', models.IntegerField(default=10, help_text='Late arrival grace period in minutes')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'shifts',
                'ordering': ['start_time'],
            },
        ),
        migrations.CreateModel(
            name='CompOff',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('earned_date', models.DateField(help_text='Date when comp off was earned (worked on off day)')),
                ('earned_hours', models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ('credit_days', models.DecimalField(decimal_places=1, default=1.0, help_text='Comp off days credited', max_digits=3)),
                ('reason', models.CharField(blank=True, max_length=200)),
                ('status', models.CharField(choices=[('earned', 'Earned'), ('used', 'Used'), ('expired', 'Expired'), ('cancelled', 'Cancelled')], default='earned', max_length=20)),
                ('used_date', models.DateField(blank=True, help_text='Date when comp off was used', null=True)),
                ('expires_on', models.DateField(blank=True, help_text='Comp off expires after this date', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('attendance', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='comp_off_earned', to='attendance.attendance')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comp_offs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'comp_offs',
                'ordering': ['-earned_date'],
            },
        ),
    ]
