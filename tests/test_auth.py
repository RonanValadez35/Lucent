"""
Tests for authentication endpoints.
"""
import pytest
import json
from unittest.mock import patch

@patch('app.api.auth.auth')
@patch('app.api.auth.db')
def test_register_success(db_mock, auth_mock, client, firebase_mock):
    """Test successful user registration."""
    # Configure mocks
    auth_mock.create_user.return_value = firebase_mock['auth'].create_user.return_value
    
    # Test data
    data = {
        'email': 'newuser@example.com',
        'password': 'password123',
        'display_name': 'New User'
    }
    
    # Send request
    response = client.post(
        '/api/auth/register',
        data=json.dumps(data),
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 201
    response_data = json.loads(response.data)
    assert 'message' in response_data
    assert 'uid' in response_data
    assert response_data['uid'] == 'test_user_123'
    
    # Verify Firebase calls
    auth_mock.create_user.assert_called_once_with(
        email='newuser@example.com',
        password='password123',
        display_name='New User'
    )

@patch('app.api.auth.auth')
def test_register_missing_data(auth_mock, client):
    """Test registration with missing data."""
    # Test data with missing password
    data = {
        'email': 'newuser@example.com',
        'display_name': 'New User'
    }
    
    # Send request
    response = client.post(
        '/api/auth/register',
        data=json.dumps(data),
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 400
    response_data = json.loads(response.data)
    assert 'error' in response_data
    
    # Verify no Firebase calls
    auth_mock.create_user.assert_not_called()

@patch('app.api.auth.auth')
def test_verify_token_success(auth_mock, client, firebase_mock):
    """Test successful token verification."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    
    # Test data
    data = {
        'token': 'valid_token_123'
    }
    
    # Send request
    response = client.post(
        '/api/auth/verify-token',
        data=json.dumps(data),
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert 'uid' in response_data
    assert 'email' in response_data
    assert 'verified' in response_data
    assert response_data['verified'] is True
    
    # Verify Firebase calls
    auth_mock.verify_id_token.assert_called_once_with('valid_token_123')

@patch('app.api.auth.auth')
def test_verify_token_missing_token(auth_mock, client):
    """Test token verification with missing token."""
    # Test data with missing token
    data = {}
    
    # Send request
    response = client.post(
        '/api/auth/verify-token',
        data=json.dumps(data),
        content_type='application/json'
    )
    
    # Check response
    assert response.status_code == 400
    response_data = json.loads(response.data)
    assert 'error' in response_data
    
    # Verify no Firebase calls
    auth_mock.verify_id_token.assert_not_called()

@patch('app.utils.decorators.auth')
@patch('app.config.firebase.db')
def test_get_current_user(db_mock, auth_mock, client, firebase_mock, auth_token):
    """Test getting current user info."""
    # Configure mocks
    auth_mock.verify_id_token.return_value = firebase_mock['auth'].verify_id_token.return_value
    
    # Mock database response
    db_mock.collection().document().get.return_value.exists = True
    db_mock.collection().document().get.return_value.to_dict.return_value = {
        'uid': 'test_user_123',
        'email': 'test@example.com',
        'display_name': 'Test User'
    }
    
    # Send request
    response = client.get(
        '/api/auth/me',
        headers={'Authorization': auth_token}
    )
    
    # Check response
    assert response.status_code == 200
    response_data = json.loads(response.data)
    assert 'uid' in response_data
    assert 'email' in response_data
    assert 'display_name' in response_data
    assert response_data['uid'] == 'test_user_123'

@patch('app.utils.decorators.auth')
def test_get_current_user_no_token(auth_mock, client):
    """Test getting current user without token."""
    # Send request without Authorization header
    response = client.get('/api/auth/me')
    
    # Check response
    assert response.status_code == 401
    response_data = json.loads(response.data)
    assert 'message' in response_data 