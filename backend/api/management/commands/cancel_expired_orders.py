"""Management command: cancel unpaid orders that exceeded payment timeout.

Run periodically via cron (every 1-2 minutes) instead of relying on GET
endpoint side-effects for auto-cancellation.

Usage:
    python manage.py cancel_expired_orders
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Order


class Command(BaseCommand):
    help = 'Cancel orders stuck in awaiting_payment that exceeded 10 min timeout'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(minutes=10)
        expired = Order.objects.filter(
            status=Order.Status.AWAITING_PAYMENT,
            created_at__lt=cutoff,
        )
        count = expired.count()
        if count:
            expired.update(status=Order.Status.CANCELLED)
            self.stdout.write(
                self.style.SUCCESS(f'Cancelled {count} expired unpaid orders')
            )
        else:
            self.stdout.write(self.style.NOTICE('No expired orders found'))
