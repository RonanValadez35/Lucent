"""
Tests for match endpoints.
"""
import pytest
import json
from unittest.mock import patch, MagicMock

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
@patch('app.api.matches.db')
@patch('app.api.matches.firestore')
def test_like_profile(firestore_mock, matches_db_mock, decorator_db_mock, auth_mock, client, firebase_mock, auth_token):
    """Test liking a profile."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    firestore_mock.SERVER_TIMESTAMP = firebase_mock['firestore'].SERVER_TIMESTAMP
    
    # Mock target user document
    target_user_doc = MagicMock()
    target_user_doc.exists = True
    
    # Configure db mocks for authentication
    decorator_db_mock.collection().document().get.return_value.exists = True
    decorator_db_mock.collection().document().get.return_value.to_dict.return_value = {
        'uid': 'test_user_123'
    }
    
    # Configure match db mocks
    matches_db_mock.collection().document().get.return_value = target_user_doc
    
    # No mutual likes yet (empty query result)
    matches_db_mock.collection().where().where().limit().get.return_value = []
    
    # Mock the add operation (for like)
    add_mock = MagicMock()
    matches_db_mock.collection().add.return_value = (add_mock, MagicMock())
    
    # Send request
    response = client.post(
        '/api/matches/like/target_user_456',
        headers={'Authorization': auth_token}
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert 'message' in response_data
    assert 'is_match' in response_data
    assert response_data['is_match'] is False
    
    # Verify Firestore calls
    matches_db_mock.collection().document().get.assert_called_once()
    matches_db_mock.collection().add.assert_called_once()

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
@patch('app.api.matches.db')
@patch('app.api.matches.firestore')
def test_like_profile_creates_match(firestore_mock, matches_db_mock, decorator_db_mock, auth_mock, client, firebase_mock, auth_token):
    """Test liking a profile that creates a match."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    firestore_mock.SERVER_TIMESTAMP = firebase_mock['firestore'].SERVER_TIMESTAMP
    
    # Mock target user document
    target_user_doc = MagicMock()
    target_user_doc.exists = True
    
    # Configure db mocks for authentication
    decorator_db_mock.collection().document().get.return_value.exists = True
    decorator_db_mock.collection().document().get.return_value.to_dict.return_value = {
        'uid': 'test_user_123'
    }
    
    # Configure match db mocks
    matches_db_mock.collection().document().get.return_value = target_user_doc
    
    # Create a mutual like (non-empty query result)
    mutual_like_mock = MagicMock()
    matches_db_mock.collection().where().where().limit().get.return_value = [mutual_like_mock]
    
    # Mock the add operations
    like_add_mock = MagicMock()
    match_add_mock = MagicMock()
    match_id_mock = MagicMock()
    match_id_mock.id = 'match_123'
    
    matches_db_mock.collection().add.side_effect = [
        (like_add_mock, MagicMock()),  # First add (like)
        (MagicMock(), match_id_mock)   # Second add (match)
    ]
    
    # Send request
    response = client.post(
        '/api/matches/like/target_user_456',
        headers={'Authorization': auth_token}
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert 'message' in response_data
    assert 'is_match' in response_data
    assert response_data['is_match'] is True
    assert 'match_id' in response_data
    assert response_data['match_id'] == 'match_123'
    
    # Verify Firestore calls
    matches_db_mock.collection().document().get.assert_called_once()
    assert matches_db_mock.collection().add.call_count == 2

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
@patch('app.api.matches.db')
@patch('app.api.matches.firestore')
def test_dislike_profile(firestore_mock, matches_db_mock, decorator_db_mock, auth_mock, client, firebase_mock, auth_token):
    """Test disliking a profile."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    firestore_mock.SERVER_TIMESTAMP = firebase_mock['firestore'].SERVER_TIMESTAMP
    
    # Configure db mocks for authentication
    decorator_db_mock.collection().document().get.return_value.exists = True
    decorator_db_mock.collection().document().get.return_value.to_dict.return_value = {
        'uid': 'test_user_123'
    }
    
    # Mock the add operation
    add_mock = MagicMock()
    matches_db_mock.collection().add.return_value = (add_mock, MagicMock())
    
    # Send request
    response = client.post(
        '/api/matches/dislike/target_user_456',
        headers={'Authorization': auth_token}
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert 'message' in response_data
    
    # Verify Firestore calls
    matches_db_mock.collection().add.assert_called_once()

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
@patch('app.api.matches.db')
def test_get_matches(matches_db_mock, decorator_db_mock, auth_mock, client, firebase_mock, auth_token, match_data):
    """Test getting user's matches."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    
    # Configure db mocks for authentication
    decorator_db_mock.collection().document().get.return_value.exists = True
    decorator_db_mock.collection().document().get.return_value.to_dict.return_value = {
        'uid': 'test_user_123'
    }
    
    # Mock matches as user1
    match_doc1 = MagicMock()
    match_doc1.id = 'match_123'
    match_doc1.to_dict.return_value = match_data
    
    # Mock matches as user2
    match_doc2 = MagicMock()
    match_doc2.id = 'match_456'
    match_doc2.to_dict.return_value = {
        'user1_uid': 'test_user_456',
        'user2_uid': 'test_user_123',
        'created_at': match_data['created_at'],
        'active': True
    }
    
    # Mock the other user's profile
    other_user_doc = MagicMock()
    other_user_doc.exists = True
    other_user_doc.to_dict.return_value = {
        'uid': 'test_user_456',
        'display_name': 'Other User',
        'photos': ['photo1.jpg']
    }
    
    # Configure match db mocks
    matches_db_mock.collection().where().where().get.side_effect = [
        [match_doc1],  # First call (matches as user1)
        [match_doc2]   # Second call (matches as user2)
    ]
    
    matches_db_mock.collection().document().get.return_value = other_user_doc
    
    # Send request
    response = client.get(
        '/api/matches/matches',
        headers={'Authorization': auth_token}
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert isinstance(response_data, list)
    assert len(response_data) == 2
    
    # Check match data
    assert 'id' in response_data[0]
    assert 'match_profile' in response_data[0]
    assert 'id' in response_data[1]
    assert 'match_profile' in response_data[1]

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
@patch('app.api.matches.db')
@patch('app.api.matches.firestore')
def test_unmatch(firestore_mock, matches_db_mock, decorator_db_mock, auth_mock, client, firebase_mock, auth_token, match_data):
    """Test unmatching from a user."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    firestore_mock.SERVER_TIMESTAMP = firebase_mock['firestore'].SERVER_TIMESTAMP
    
    # Configure db mocks for authentication
    decorator_db_mock.collection().document().get.return_value.exists = True
    decorator_db_mock.collection().document().get.return_value.to_dict.return_value = {
        'uid': 'test_user_123'
    }
    
    # Mock match document
    match_doc = MagicMock()
    match_doc.exists = True
    match_doc.to_dict.return_value = match_data
    
    # Configure match db mocks
    matches_db_mock.collection().document().get.return_value = match_doc
    
    # Send request
    response = client.post(
        '/api/matches/unmatch/match_123',
        headers={'Authorization': auth_token}
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert 'message' in response_data
    
    # Verify Firestore update
    matches_db_mock.collection().document().update.assert_called_once_with({
        'active': False,
        'unmatch_initiated_by': 'test_user_123',
        'unmatched_at': firestore_mock.SERVER_TIMESTAMP
    }) 