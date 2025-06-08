# app/config/testing.py

"""Testing configuration for the dating app backend."""

import os

# Flask configuration
DEBUG = True
TESTING = True
SECRET_KEY = 'test_secret_key'

# Firebase configuration - use test project or mock
FIREBASE_CREDENTIALS_PATH = os.getenv('FIREBASE_CREDENTIALS_PATH', 'mock-credentials.json') 