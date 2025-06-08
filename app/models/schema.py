# app/models/schema.py
"""
This file serves as documentation for the Firestore database schema.
It doesn't affect the actual database structure but provides a reference.
"""

# Users Collection
# Collection: 'users'
USER_SCHEMA = {
    # Document ID: Firebase Auth UID
    'uid': 'string',                    # Firebase Auth UID
    'email': 'string',                  # User's email address
    'display_name': 'string',           # User's display name
    'profile_completed': 'boolean',     # Whether profile setup is complete
    'bio': 'string',                    # Text description about the user
    'age': 'number',                    # User's age
    'gender': 'string',                 # User's gender (e.g., 'male', 'female', 'non-binary')
    'interests': ['string'],            # Array of interest tags
    'location': {                       # Geo information
        'latitude': 'number',           # Latitude coordinate
        'longitude': 'number',          # Longitude coordinate
        'city': 'string',               # City name
        'country': 'string'             # Country name
    },
    'preferences': {                    # Dating preferences
        'age_min': 'number',            # Minimum age preference
        'age_max': 'number',            # Maximum age preference
        'gender': 'string',             # Preferred gender(s)
        'distance_max': 'number'        # Maximum distance in kilometers
    },
    'photos': ['string'],               # Array of photo URLs
    'created_at': 'timestamp',          # When profile was created
    'updated_at': 'timestamp'           # When profile was last updated
}

# Likes Collection
# Collection: 'likes'
LIKE_SCHEMA = {
    # Document ID: Auto-generated
    'liker_uid': 'string',              # UID of user who liked
    'target_uid': 'string',             # UID of user who was liked
    'created_at': 'timestamp'           # When like was created
}

# Dislikes Collection
# Collection: 'dislikes'
DISLIKE_SCHEMA = {
    # Document ID: Auto-generated
    'disliker_uid': 'string',           # UID of user who disliked
    'target_uid': 'string',             # UID of user who was disliked
    'created_at': 'timestamp'           # When dislike was created
}

# Matches Collection
# Collection: 'matches'
MATCH_SCHEMA = {
    # Document ID: Auto-generated
    'user1_uid': 'string',              # UID of first user
    'user2_uid': 'string',              # UID of second user
    'created_at': 'timestamp',          # When match was created
    'active': 'boolean',                # Whether match is active
    'last_message_at': 'timestamp',     # When last message was sent (for sorting)
    'unmatch_initiated_by': 'string',   # UID of user who initiated unmatch (if applicable)
    'unmatched_at': 'timestamp'         # When match was deactivated (if applicable)
}

# Messages Collection
# Collection: 'messages'
MESSAGE_SCHEMA = {
    # Document ID: Auto-generated
    'match_id': 'string',               # ID of the match this message belongs to
    'sender_uid': 'string',             # UID of user who sent the message
    'content': 'string',                # Text content of the message
    'created_at': 'timestamp',          # When message was sent
    'read': 'boolean',                  # Whether message has been read
    'read_at': 'timestamp',             # When message was read (if applicable)
    'image_url': 'string'               # Optional URL if message contains an image
}

# Subscription Collection (for premium features)
# Collection: 'subscriptions'
SUBSCRIPTION_SCHEMA = {
    # Document ID: User UID
    'uid': 'string',                    # User UID (same as document ID)
    'plan': 'string',                   # Subscription plan (e.g., 'basic', 'premium', 'gold')
    'status': 'string',                 # Subscription status (e.g., 'active', 'canceled', 'expired')
    'start_date': 'timestamp',          # When subscription started
    'end_date': 'timestamp',            # When subscription ends
    'payment_method': 'string',         # Payment method information
    'auto_renew': 'boolean'             # Whether subscription auto-renews
}

# Reports Collection (for user reporting)
# Collection: 'reports'
REPORT_SCHEMA = {
    # Document ID: Auto-generated
    'reporter_uid': 'string',           # UID of user who reported
    'reported_uid': 'string',           # UID of user who was reported
    'reason': 'string',                 # Reason for report
    'details': 'string',                # Additional details
    'created_at': 'timestamp',          # When report was created
    'status': 'string',                 # Status of report (e.g., 'pending', 'reviewed', 'resolved')
    'reviewed_at': 'timestamp',         # When report was reviewed
    'action_taken': 'string'            # Action taken (if any)
}

# Note: This file doesn't create or modify the actual database.
# It serves as documentation for the expected schema. 