# app/utils/decorators.py

from functools import wraps
from flask import request, jsonify
from firebase_admin import auth, exceptions
import json
import base64

def token_required(f):
    """Decorator to check for valid Firebase token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check if 'Authorization' header is present
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            # Format should be "Bearer {token}"
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            uid = None
            
            # Try to verify as ID token first
            try:
                decoded_token = auth.verify_id_token(token)
                uid = decoded_token['uid']
            except Exception as e:
                # If verification fails, try to extract uid from custom token
                # Custom token format: header.payload.signature
                try:
                    # Split token into parts
                    token_parts = token.split('.')
                    if len(token_parts) >= 2:
                        # Get the payload part (second part)
                        payload = token_parts[1]
                        
                        # Add padding if needed
                        payload += '=' * ((4 - len(payload) % 4) % 4)
                        
                        # Decode from base64
                        decoded_bytes = base64.b64decode(payload)
                        decoded_str = decoded_bytes.decode('utf-8')
                        
                        # Parse JSON
                        payload_data = json.loads(decoded_str)
                        
                        # Extract uid
                        if 'uid' in payload_data:
                            uid = payload_data['uid']
                except Exception as jwt_error:
                    print(f"Error extracting from token: {jwt_error}")
            
            if not uid:
                return jsonify({'message': 'Could not extract user ID from token'}), 401
            
            # Get user data from Firestore
            from app.config.firebase import db
            user_doc = db.collection('users').document(uid).get()
            
            if not user_doc.exists:
                return jsonify({'message': 'User not found!'}), 404
            
            current_user = user_doc.to_dict()
            
        except Exception as e:
            return jsonify({'message': f'Token is invalid! {str(e)}'}), 401
            
        # Pass the current user data to the wrapped function
        return f(current_user=current_user, *args, **kwargs)
        
    return decorated

