# app/api/auth.py

from flask import Blueprint, request, jsonify
from firebase_admin import auth, firestore, exceptions
from app.utils.decorators import token_required
from app.config.firebase import db
import json
import requests
import os

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user with email and password."""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({"error": "Email and password are required"}), 400
        
        email = data.get('email')
        password = data.get('password')
        display_name = data.get('display_name', '')
        
        # Create user in Firebase Authentication
        user = auth.create_user(
            email=email,
            password=password,
            display_name=display_name
        )
        
        # Create initial user profile document in Firestore
        user_data = {
            'uid': user.uid,
            'email': email,
            'display_name': display_name,
            'profile_completed': False,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        # Add user to Firestore collection
        db.collection('users').document(user.uid).set(user_data)
        
        return jsonify({
            "message": "User registered successfully",
            "uid": user.uid
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login endpoint that verifies credentials and generates a custom token."""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({"error": "Email and password are required"}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        # Get Firebase web API key from environment variable
        firebase_api_key = os.getenv('FIREBASE_WEB_API_KEY')
        
        if not firebase_api_key:
            return jsonify({"error": "Firebase configuration missing"}), 500
        
        # Use Firebase Auth REST API to verify password
        auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebase_api_key}"
        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }
        
        response = requests.post(auth_url, json=payload)
        
        if response.status_code != 200:
            auth_error = response.json().get('error', {})
            error_message = auth_error.get('message', 'Invalid email or password')
            return jsonify({"error": error_message}), 401
        
        # If we get here, the password was verified successfully
        auth_response = response.json()
        uid = auth_response.get('localId')
        
        # Generate a custom token for the user
        custom_token = auth.create_custom_token(uid)
        
        # Return the token in the response
        return jsonify({
            "message": "Login successful",
            "uid": uid,
            "token": custom_token.decode(),
            "email": email
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify a Firebase ID token."""
    try:
        data = request.get_json()
        if not data or not data.get('token'):
            return jsonify({"error": "Token is required"}), 400
        
        # Verify the Firebase token
        token = data.get('token')
        decoded_token = auth.verify_id_token(token)
        
        # Token is valid, return user info
        return jsonify({
            "uid": decoded_token['uid'],
            "email": decoded_token.get('email', ''),
            "verified": True
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Invalid token", "details": str(e)}), 401

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Get current user info - requires valid token."""
    try:
        # current_user is provided by the @token_required decorator
        return jsonify({
            "uid": current_user['uid'],
            "email": current_user.get('email', ''),
            "display_name": current_user.get('display_name', '')
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@auth_bp.route('/get-test-token/<uid>', methods=['GET'])
def get_test_token(uid):
    """Temporary endpoint for testing - generates a Firebase token for a user."""
    try:
        custom_token = auth.create_custom_token(uid)
        return jsonify({"token": custom_token.decode()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400