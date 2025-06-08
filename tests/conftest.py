"""
Common pytest fixtures for testing the dating app API.
"""
import pytest
import firebase_admin
import json
import sys
import os
from unittest.mock import patch, MagicMock
from datetime import datetime

# Add the parent directory to path so that app can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app

@pytest.fixture
def app():
    """Create and configure a Flask app for testing."""
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
    })
    return app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def firebase_mock():
    """Mock Firebase functionality for testing."""
    # Create mock for Firebase Auth
    auth_mock = MagicMock()
    auth_mock.create_user.return_value = MagicMock(uid='test_user_123')
    auth_mock.create_custom_token.return_value = b'mocked_token_123'
    auth_mock.verify_id_token.return_value = {
        'uid': 'test_user_123',
        'email': 'test@example.com'
    }
    
    # Create mock for Firestore
    firestore_mock = MagicMock()
    
    # Create a mock firestore.SERVER_TIMESTAMP
    firestore_mock.SERVER_TIMESTAMP = datetime.now()
    
    # Create document reference mocks
    doc_ref_mock = MagicMock()
    doc_ref_mock.get.return_value = MagicMock(
        exists=True,
        to_dict=lambda: {
            'uid': 'test_user_123',
            'email': 'test@example.com',
            'display_name': 'Test User',
            'profile_completed': True
        }
    )
    
    # Create collection reference mocks
    collection_ref_mock = MagicMock()
    collection_ref_mock.document.return_value = doc_ref_mock
    
    # Create Firestore client mock
    db_mock = MagicMock()
    db_mock.collection.return_value = collection_ref_mock
    
    # Configure the where method to return a query that behaves correctly
    query_mock = MagicMock()
    query_mock.where.return_value = query_mock
    query_mock.limit.return_value = query_mock
    query_mock.order_by.return_value = query_mock
    query_mock.get.return_value = []
    
    # Set the collection method to return the query mock
    db_mock.collection.return_value.where = MagicMock(return_value=query_mock)
    
    return {
        'auth': auth_mock,
        'firestore': firestore_mock,
        'db': db_mock
    }

@pytest.fixture
def auth_token():
    """A mock authentication token."""
    return 'Bearer mocked_token_123'

@pytest.fixture
def user_data():
    """Sample user data for testing."""
    return {
        'uid': 'test_user_123',
        'email': 'test@example.com',
        'display_name': 'Test User',
        'profile_completed': True,
        'bio': 'Test bio',
        'age': 28,
        'gender': 'male',
        'interests': ['hiking', 'reading', 'travel'],
        'location': {
            'latitude': 37.7749,
            'longitude': -122.4194,
            'city': 'San Francisco',
            'country': 'USA'
        },
        'preferences': {
            'age_min': 25,
            'age_max': 35,
            'gender': 'female',
            'distance_max': 50
        }
    }

@pytest.fixture
def match_data():
    """Sample match data for testing."""
    return {
        'id': 'match_123',
        'user1_uid': 'test_user_123',
        'user2_uid': 'test_user_456',
        'created_at': datetime.now(),
        'active': True,
        'last_message_at': None
    }

@pytest.fixture
def message_data():
    """Sample message data for testing."""
    return {
        'id': 'message_123',
        'match_id': 'match_123',
        'sender_uid': 'test_user_123',
        'content': 'Hello, this is a test message',
        'created_at': datetime.now(),
        'read': False,
        'read_at': None
    } 