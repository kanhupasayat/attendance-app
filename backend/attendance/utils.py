import math
from django.conf import settings
from .models import OfficeLocation


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points
    on the Earth's surface given their latitude and longitude.
    Returns distance in meters.
    """
    R = 6371000  # Earth's radius in meters

    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    delta_phi = math.radians(float(lat2) - float(lat1))
    delta_lambda = math.radians(float(lon2) - float(lon1))

    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def validate_location(latitude, longitude):
    """
    Validate if the given coordinates are within any office location radius.
    Returns (is_valid, office_name or error_message)
    """
    if latitude is None or longitude is None:
        # If no GPS provided, check settings for default
        return True, "GPS not provided - skipped"

    # First check database for office locations
    office_locations = OfficeLocation.objects.filter(is_active=True)

    if office_locations.exists():
        for office in office_locations:
            distance = haversine_distance(
                latitude, longitude,
                office.latitude, office.longitude
            )
            if distance <= office.radius_meters:
                return True, office.name
    else:
        # Fallback to settings-based validation
        office_lat = getattr(settings, 'OFFICE_LATITUDE', None)
        office_lon = getattr(settings, 'OFFICE_LONGITUDE', None)
        office_radius = getattr(settings, 'OFFICE_RADIUS_METERS', 50)

        if office_lat and office_lon:
            distance = haversine_distance(
                latitude, longitude,
                office_lat, office_lon
            )
            if distance <= office_radius:
                return True, "Default Office"

    return False, "You are not within office premises"


def validate_ip(ip_address):
    """
    Validate if the IP address is in the allowed list.
    Returns (is_valid, message)
    """
    if not ip_address:
        return True, "IP not provided - skipped"

    # Check database office locations for allowed IPs
    office_locations = OfficeLocation.objects.filter(is_active=True)

    for office in office_locations:
        allowed_ips = office.get_allowed_ips()
        if ip_address in allowed_ips:
            return True, office.name

    # Fallback to settings
    allowed_ips = getattr(settings, 'ALLOWED_OFFICE_IPS', [])
    if ip_address in allowed_ips:
        return True, "Default Office"

    # For development, allow localhost
    if settings.DEBUG and ip_address in ['127.0.0.1', '::1', 'localhost']:
        return True, "Development Mode"

    return False, "Your IP is not authorized"


def get_client_ip(request):
    """Extract client IP from request headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
