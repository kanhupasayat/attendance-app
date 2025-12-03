"""
Management command to process month-end leave calculations.
Run this at the end of each month (or first day of new month) to:
1. Auto-deduct absent days from available sick leave
2. Mark remaining absents as LOP (Loss of Pay)
3. Convert unused sick leave to comp off

Usage:
    python manage.py process_month_end
    python manage.py process_month_end --month 11 --year 2024  # For specific month
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from leaves.models import LeaveType, LeaveBalance
from attendance.models import CompOff, Attendance
from datetime import date, timedelta
from decimal import Decimal


class Command(BaseCommand):
    help = 'Process month-end: deduct absents from leave, mark LOP, convert unused sick leave to comp off'

    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=int,
            help='The month to process (1-12, defaults to previous month)'
        )
        parser.add_argument(
            '--year',
            type=int,
            help='The year to process (defaults to current year)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )

    def handle(self, *args, **options):
        today = timezone.now().date()

        # Default to previous month
        if options.get('month'):
            process_month = options['month']
            process_year = options.get('year') or today.year
        else:
            # Previous month
            if today.month == 1:
                process_month = 12
                process_year = today.year - 1
            else:
                process_month = today.month - 1
                process_year = today.year

        dry_run = options.get('dry_run', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        self.stdout.write(f'Processing month-end for {process_month}/{process_year}')

        # Get sick leave type
        sick_leave = LeaveType.objects.filter(code='SL', is_active=True).first()
        if not sick_leave:
            self.stdout.write(self.style.ERROR('Sick Leave (SL) type not found!'))
            return

        employees = User.objects.filter(role='employee', is_active=True)

        total_absents = 0
        total_leave_deducted = 0
        total_lop = 0
        comp_off_created = 0

        for employee in employees:
            self.stdout.write(f'\n{"="*50}')
            self.stdout.write(f'Processing: {employee.name}')

            # Step 1: Count absent days for this month
            absent_days = Attendance.objects.filter(
                user=employee,
                date__year=process_year,
                date__month=process_month,
                status='absent'
            ).count()

            self.stdout.write(f'  Absent days: {absent_days}')

            # Step 2: Get or create sick leave balance for the month
            sl_balance, created = LeaveBalance.objects.get_or_create(
                user=employee,
                leave_type=sick_leave,
                year=process_year,
                month=process_month,
                defaults={
                    'total_leaves': Decimal('1'),
                    'used_leaves': Decimal('0'),
                    'lop_days': Decimal('0')
                }
            )

            available_sl = float(sl_balance.total_leaves) - float(sl_balance.used_leaves)
            self.stdout.write(f'  Available Sick Leave: {available_sl}')

            # Step 3: Process absent days - deduct from leave, mark LOP
            if absent_days > 0:
                total_absents += absent_days

                # Deduct from sick leave first
                leave_to_deduct = min(absent_days, available_sl)
                lop_days = absent_days - leave_to_deduct

                if leave_to_deduct > 0:
                    self.stdout.write(f'  -> Deducting {leave_to_deduct} day(s) from Sick Leave')
                    total_leave_deducted += leave_to_deduct

                    if not dry_run:
                        sl_balance.used_leaves = Decimal(str(float(sl_balance.used_leaves) + leave_to_deduct))
                        sl_balance.save()

                if lop_days > 0:
                    self.stdout.write(self.style.WARNING(f'  -> Marking {lop_days} day(s) as LOP'))
                    total_lop += lop_days

                    if not dry_run:
                        sl_balance.lop_days = Decimal(str(float(sl_balance.lop_days) + lop_days))
                        sl_balance.save()

                        # Update attendance notes for LOP days
                        absent_records = Attendance.objects.filter(
                            user=employee,
                            date__year=process_year,
                            date__month=process_month,
                            status='absent'
                        ).order_by('date')

                        for i, record in enumerate(absent_records):
                            if i >= leave_to_deduct:
                                if 'LOP' not in record.notes:
                                    record.notes = f"LOP - No leave balance. {record.notes}".strip()
                                    record.save()

                # After deducting absents, check remaining sick leave for comp off
                remaining_sl = available_sl - leave_to_deduct
                if remaining_sl > 0:
                    self.stdout.write(f'  Remaining Sick Leave: {remaining_sl} -> Converting to Comp Off')

                    if not dry_run:
                        if process_month == 12:
                            last_day = date(process_year, 12, 31)
                        else:
                            last_day = date(process_year, process_month + 1, 1) - timedelta(days=1)

                        existing = CompOff.objects.filter(
                            user=employee,
                            earned_date=last_day,
                            reason__contains='Unused Sick Leave'
                        ).first()

                        if not existing:
                            CompOff.objects.create(
                                user=employee,
                                earned_date=last_day,
                                earned_hours=remaining_sl * 8,
                                credit_days=remaining_sl,
                                reason=f'Unused Sick Leave for {process_month}/{process_year}',
                                status='earned'
                            )
                            comp_off_created += 1
                            self.stdout.write(self.style.SUCCESS(f'    Created Comp Off: {remaining_sl} day(s)'))
            else:
                # No absents - convert full sick leave to comp off
                if available_sl > 0:
                    self.stdout.write(f'  No absents. Sick Leave: {available_sl} -> Converting to Comp Off')

                    if not dry_run:
                        if process_month == 12:
                            last_day = date(process_year, 12, 31)
                        else:
                            last_day = date(process_year, process_month + 1, 1) - timedelta(days=1)

                        existing = CompOff.objects.filter(
                            user=employee,
                            earned_date=last_day,
                            reason__contains='Unused Sick Leave'
                        ).first()

                        if not existing:
                            CompOff.objects.create(
                                user=employee,
                                earned_date=last_day,
                                earned_hours=available_sl * 8,
                                credit_days=available_sl,
                                reason=f'Unused Sick Leave for {process_month}/{process_year}',
                                status='earned'
                            )
                            comp_off_created += 1
                            self.stdout.write(self.style.SUCCESS(f'    Created Comp Off: {available_sl} day(s)'))
                        else:
                            self.stdout.write(f'    Comp Off already exists')

        # Summary
        self.stdout.write(f'\n{"="*50}')
        self.stdout.write(self.style.SUCCESS('SUMMARY'))
        self.stdout.write(f'  Total absent days: {total_absents}')
        self.stdout.write(f'  Leave deducted: {total_leave_deducted} day(s)')
        self.stdout.write(self.style.WARNING(f'  LOP marked: {total_lop} day(s)'))
        self.stdout.write(f'  Comp offs created: {comp_off_created}')

        if dry_run:
            self.stdout.write(self.style.WARNING(
                '\nThis was a dry run. Run without --dry-run to apply changes.'
            ))
