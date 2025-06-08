# app/api/profiles.py

from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from app.utils.decorators import token_required
from app.config.firebase import db
from app.utils.image_analyzer import ImageAnalyzer
from PIL import Image
import io
import base64
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Initialize image analyzer for NSFW checking
image_analyzer = ImageAnalyzer(nsfw_detection_threshold=0.5, load_nsfw_model=True)

profiles_bp = Blueprint('profiles', __name__)

def check_base64_image_nsfw(base64_data):
    """
    Check a base64 encoded image for NSFW content
    
    Args:
        base64_data: Base64 encoded image data (data URL format)
        
    Returns:
        Dict with NSFW detection results
    """
    try:
        # Extract base64 data from data URL if present
        if base64_data.startswith('data:image/'):
            # Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            base64_data = base64_data.split(',', 1)[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_data)
        
        # Load image from bytes
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Perform NSFW detection
        result = image_analyzer.detect_inappropriate_content(image)
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking base64 image for NSFW: {str(e)}")
        return {
            "is_inappropriate": False,
            "nsfw_probability": 0.0,
            "confidence": 0.5,
            "model_used": "error",
            "error": str(e)
        }

@profiles_bp.route('/', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get current user's profile."""
    try:
        uid = current_user['uid']
        
        # Get user profile from Firestore
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({"error": "Profile not found"}), 404
        
        user_data = user_doc.to_dict()
        
        # Remove sensitive information
        if 'password' in user_data:
            del user_data['password']
        
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@profiles_bp.route('/', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Update current user's profile."""
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Fields that can be updated
        allowed_fields = [
            'display_name', 'bio', 'age', 'gender', 'interests', 
            'location', 'preferences', 'photos', 'profile_completed',
            'height', 'education', 'job_title', 'drinking', 'smoking', 'looking_for'
        ]
        
        # Log received data for debugging (sanitize by removing the actual photo data)
        debug_data = {k: (v if k != 'photos' else f"{len(v)} photos") for k, v in data.items()}
        print(f"Received profile update data: {debug_data}")
        
        # Check if photos array is too large
        if 'photos' in data and isinstance(data['photos'], list):
            print(f"Number of photos: {len(data['photos'])}")
            
            # Validate each photo URL (must be a string)
            for i, photo in enumerate(data['photos']):
                if not isinstance(photo, str):
                    return jsonify({"error": f"Photo at index {i} is not a valid string URL"}), 400
            
            # Check photos for NSFW content if image analyzer is available
            if image_analyzer.nsfw_model_available:
                inappropriate_photos = []
                
                for i, photo in enumerate(data['photos']):
                    # Only check base64 data URLs (skip regular URLs)
                    if photo.startswith('data:image/'):
                        nsfw_result = check_base64_image_nsfw(photo)
                        
                        # Log the result
                        logger.info(f"NSFW check for photo {i+1}: {nsfw_result['nsfw_probability']:.3f} probability, model: {nsfw_result['model_used']}")
                        
                        # If photo is inappropriate, add to list
                        if nsfw_result['is_inappropriate']:
                            inappropriate_photos.append({
                                'index': i,
                                'nsfw_probability': nsfw_result['nsfw_probability'],
                                'confidence': nsfw_result['confidence']
                            })
                
                # If any photos are inappropriate, reject the update
                if inappropriate_photos:
                    return jsonify({
                        "error": "One or more photos contain inappropriate content",
                        "inappropriate_photos": inappropriate_photos,
                        "message": "Please remove or replace the flagged photos before updating your profile"
                    }), 400
                    
                logger.info(f"All {len(data['photos'])} photos passed NSFW check")
            else:
                logger.warning("NSFW model not available - skipping photo content check")
        
        # Filter out any fields that are not allowed
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        # Add timestamp
        update_data['updated_at'] = firestore.SERVER_TIMESTAMP
        
        # Update the document
        db.collection('users').document(uid).update(update_data)
        
        return jsonify({
            "message": "Profile updated successfully",
            "updated_fields": list(update_data.keys())
        }), 200
        
    except Exception as e:
        print(f"Profile update error: {str(e)}")
        return jsonify({"error": str(e)}), 400

@profiles_bp.route('/discover', methods=['GET'])
@token_required
def discover_profiles(current_user):
    """Get potential matches based on preferences."""
    try:
        # implement more sophisticated matching logic
        # This is simplified
        uid = current_user['uid']
        
        # Get current user's preferences
        user_doc = db.collection('users').document(uid).get()
        if not user_doc.exists:
            return jsonify({"error": "User profile not found"}), 404
        
        user_data = user_doc.to_dict()
        preferences = user_data.get('preferences', {})
        
        # Get users that match preferences
        # This is a very basic implementation
        query = db.collection('users')
        
        # Don't show the current user
        query = query.where('uid', '!=', uid)
        
        # For testing purposes, we'll make the filters more lenient
        # Uncomment the following lines for production use
        
        # Only show profiles that have been completed
        # query = query.where('profile_completed', '==', True)
        
        # Filter by gender preference only if it's not "all"
        if 'gender' in preferences and preferences['gender'] != 'all' and preferences['gender'] != '':
            query = query.where('gender', '==', preferences['gender'])
            
        # Get results
        results = query.limit(20).get()
        
        # Convert to list and remove sensitive information
        profiles = []
        for doc in results:
            profile = doc.to_dict()
            
            # Remove sensitive info
            if 'password' in profile:
                del profile['password']
            if 'email' in profile:
                del profile['email']
            
            # Ensure all required fields exist
            if 'display_name' not in profile or not profile['display_name']:
                profile['display_name'] = 'Anonymous User'
            
            if 'age' not in profile:
                profile['age'] = 25
                
            # Keep the actual photos - just make sure photos array exists
            if 'photos' not in profile or not profile['photos']:
                # Provide test image URLs for testing purposes
                profile['photos'] = [
                    "https://randomuser.me/api/portraits/men/" + str(hash(profile.get('uid', '')) % 99) + ".jpg"
                ]
                print(f"Adding test photo for profile {profile.get('uid')}: {profile['photos'][0]}")
                
            if 'bio' not in profile:
                profile['bio'] = "This user hasn't added a bio yet."
                
            profiles.append(profile)
        
        print(f"Returning {len(profiles)} profiles")
        return jsonify(profiles), 200
        
    except Exception as e:
        print(f"Error in discover_profiles: {str(e)}")
        return jsonify({"error": str(e)}), 400

@profiles_bp.route('/<uid>', methods=['GET'])
@token_required
def get_user_profile(current_user, uid):
    """Get another user's profile by UID."""
    try:
        # Check if profile exists
        profile_doc = db.collection('users').document(uid).get()
        
        if not profile_doc.exists:
            return jsonify({"error": "Profile not found"}), 404
        
        profile_data = profile_doc.to_dict()
        
        # Remove sensitive information
        if 'password' in profile_data:
            del profile_data['password']
        if 'email' in profile_data:
            del profile_data['email']
        
        return jsonify(profile_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@profiles_bp.route('/photo', methods=['PUT'])
@token_required
def update_profile_photo(current_user):
    """Update a single photo in the user's profile."""
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        if 'photos' not in data or not isinstance(data['photos'], list) or len(data['photos']) != 1:
            return jsonify({"error": "Invalid photo data format. Expecting array with one photo."}), 400
        
        # Get the photo
        photo = data['photos'][0]
        
        # Check if it's a string
        if not isinstance(photo, str):
            return jsonify({"error": "Photo must be a string (data URL or URL)"}), 400
        
        # Log photo length for debugging
        print(f"Received single photo update. Photo length: {len(photo)}")
        
        # Get the current profile
        user_doc = db.collection('users').document(uid).get()
        if not user_doc.exists:
            return jsonify({"error": "User profile not found"}), 404
        
        user_data = user_doc.to_dict()
        
        # Initialize photos array if it doesn't exist
        if 'photos' not in user_data:
            user_data['photos'] = []
        
        # Determine how to handle the photo
        update_type = data.get('photo_update_type', 'add')
        photo_index = data.get('photo_index', None)
        
        if update_type == 'add' or update_type == 'add_single':
            # Add the photo to the array
            user_data['photos'].append(photo)
        elif update_type == 'replace' and photo_index is not None:
            # Replace at specific index
            if photo_index < len(user_data['photos']):
                user_data['photos'][photo_index] = photo
            else:
                return jsonify({"error": f"Photo index {photo_index} out of bounds"}), 400
        else:
            return jsonify({"error": "Invalid photo update type"}), 400
        
        # Update the document with just the photos field
        db.collection('users').document(uid).update({
            'photos': user_data['photos'],
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({
            "message": "Photo updated successfully",
            "photo_count": len(user_data['photos'])
        }), 200
        
    except Exception as e:
        print(f"Profile photo update error: {str(e)}")
        return jsonify({"error": str(e)}), 400