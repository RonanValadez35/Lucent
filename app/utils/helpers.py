# app/utils/helpers.py

def format_timestamp(timestamp):
    """Format a Firestore timestamp to ISO format."""
    if timestamp:
        return timestamp.isoformat()
    return None

def calculate_age(birth_date):
    """Calculate age from birth date."""
    from datetime import datetime
    today = datetime.now()
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    return age