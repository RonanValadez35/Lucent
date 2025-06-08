"""
Tests for profile endpoints.
"""
import pytest
import json
from unittest.mock import patch, MagicMock

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
@patch('app.api.profiles.db')
def test_get_profile(profiles_db_mock, decorator_db_mock, auth_mock, client, firebase_mock, auth_token, user_data):
    """Test getting user profile."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    
    # Mock document retrieval
    doc_mock = MagicMock()
    doc_mock.exists = True
    doc_mock.to_dict.return_value = user_data
    
    # Configure db mocks
    decorator_db_mock.collection().document().get.return_value.exists = True
    decorator_db_mock.collection().document().get.return_value.to_dict.return_value = user_data
    profiles_db_mock.collection().document().get.return_value = doc_mock
    
    # Send request
    response = client.get(
        '/api/profiles/',
        headers={'Authorization': auth_token}
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert response_data == user_data

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
@patch('app.api.profiles.db')
def test_get_profile_not_found(profiles_db_mock, decorator_db_mock, auth_mock, client, firebase_mock, auth_token):
    """Test getting non-existent profile."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    
    # Mock document retrieval - profile doesn't exist
    doc_mock = MagicMock()
    doc_mock.exists = False
    
    # Configure db mocks
    decorator_db_mock.collection().document().get.return_value.exists = True
    decorator_db_mock.collection().document().get.return_value.to_dict.return_value = {
        'uid': 'test_user_123'
    }
    profiles_db_mock.collection().document().get.return_value = doc_mock
    
    # Send request
    response = client.get(
        '/api/profiles/',
        headers={'Authorization': auth_token}
    )
    
    # Check response
    assert response.status_code == 404
    response_data = json.loads(response.data)
    assert 'error' in response_data

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
@patch('app.api.profiles.db')
@patch('app.api.profiles.firestore')
def test_update_profile(firestore_mock, profiles_db_mock, decorator_db_mock, auth_mock, client, firebase_mock, auth_token, user_data):
    """Test updating user profile."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    firestore_mock.SERVER_TIMESTAMP = firebase_mock['firestore'].SERVER_TIMESTAMP
    
    # Configure db mocks
    decorator_db_mock.collection().document().get.return_value.exists = True
    decorator_db_mock.collection().document().get.return_value.to_dict.return_value = {
        'uid': 'test_user_123'
    }
    
    # Test data
    update_data = {
        'bio': 'Updated bio',
        'interests': ['coding', 'hiking', 'travel']
    }
    
    # Send request
    response = client.put(
        '/api/profiles/',
        headers={'Authorization': auth_token},
        data=json.dumps(update_data),
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert 'message' in response_data
    assert 'updated_fields' in response_data
    assert 'bio' in response_data['updated_fields']
    assert 'interests' in response_data['updated_fields']
    
    # Verify Firestore update
    profiles_db_mock.collection().document().update.assert_called_once()

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
@patch('app.api.profiles.db')
def test_discover_profiles(profiles_db_mock, decorator_db_mock, auth_mock, client, firebase_mock, auth_token, user_data):
    """Test discovering potential matches."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    
    # Mock user document
    user_doc_mock = MagicMock()
    user_doc_mock.exists = True
    user_doc_mock.to_dict.return_value = user_data
    
    # Mock discover query results
    result_mock1 = MagicMock()
    result_mock1.to_dict.return_value = {
        'uid': 'other_user_1',
        'display_name': 'Other User 1',
        'gender': 'female',
        'age': 27,
        'bio': 'I love travel and coffee'
    }
    
    result_mock2 = MagicMock()
    result_mock2.to_dict.return_value = {
        'uid': 'other_user_2',
        'display_name': 'Other User 2',
        'gender': 'female',
        'age': 29,
        'bio': 'Hiking and photography'
    }
    
    # Configure db mocks
    decorator_db_mock.collection().document().get.return_value.exists = True
    decorator_db_mock.collection().document().get.return_value.to_dict.return_value = {
        'uid': 'test_user_123'
    }
    
    profiles_db_mock.collection().document().get.return_value = user_doc_mock
    
    # Configure the query chain
    query_mock = MagicMock()
    query_mock.where.return_value = query_mock
    query_mock.limit.return_value = query_mock
    query_mock.get.return_value = [result_mock1, result_mock2]
    
    profiles_db_mock.collection().where.return_value = query_mock
    
    # Send request
    response = client.get(
        '/api/profiles/discover',
        headers={'Authorization': auth_token}
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert isinstance(response_data, list)
    assert len(response_data) == 2
    
    # Check profiles have expected data
    assert response_data[0]['uid'] == 'other_user_1'
    assert response_data[1]['uid'] == 'other_user_2'
    
    # Check that sensitive data is removed
    assert 'password' not in response_data[0]
    assert 'email' not in response_data[0]

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
@patch('app.api.profiles.db')
def test_get_user_profile(profiles_db_mock, decorator_db_mock, auth_mock, client, firebase_mock, auth_token):
    """Test getting another user's profile."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    
    # Mock profile document
    profile_doc_mock = MagicMock()
    profile_doc_mock.exists = True
    profile_doc_mock.to_dict.return_value = {
        'uid': 'other_user_123',
        'display_name': 'Other User',
        'age': 29,
        'gender': 'female',
        'bio': 'Test bio',
        'interests': ['hiking', 'reading'],
        'photos': ['photo1.jpg']
    }
    
    # Configure db mocks
    decorator_db_mock.collection().document().get.return_value.exists = True
    decorator_db_mock.collection().document().get.return_value.to_dict.return_value = {
        'uid': 'test_user_123'
    }
    
    profiles_db_mock.collection().document().get.return_value = profile_doc_mock
    
    # Send request
    response = client.get(
        '/api/profiles/other_user_123',
        headers={'Authorization': auth_token}
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert response_data['uid'] == 'other_user_123'
    assert 'display_name' in response_data
    assert 'bio' in response_data
    
    # Check that sensitive data is removed
    assert 'password' not in response_data
    assert 'email' not in response_data 