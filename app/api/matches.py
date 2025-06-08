# app/api/matches.py

from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from app.utils.decorators import token_required
from app.config.firebase import db

matches_bp = Blueprint('matches', __name__)

@matches_bp.route('/like/<target_uid>', methods=['POST'])
@token_required
def like_profile(current_user, target_uid):
    """Like another user's profile."""
    try:
        liker_uid = current_user['uid']
        
        # Don't allow users to like their own profile
        if liker_uid == target_uid:
            return jsonify({"error": "You cannot like your own profile"}), 400
        
        # Check if target user exists
        target_user = db.collection('users').document(target_uid).get()
        if not target_user.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Create a like document
        like_data = {
            'liker_uid': liker_uid,
            'target_uid': target_uid,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        # Add to likes collection
        db.collection('likes').add(like_data)
        
        # Check if this creates a match (if the other user has liked this user)
        mutual_like = db.collection('likes').where(
            'liker_uid', '==', target_uid
        ).where(
            'target_uid', '==', liker_uid
        ).limit(1).get()
        
        is_match = len(mutual_like) > 0
        
        if is_match:
            # Create a match document
            match_data = {
                'user1_uid': liker_uid,
                'user2_uid': target_uid,
                'created_at': firestore.SERVER_TIMESTAMP,
                'last_message_at': None,
                'active': True
            }
            
            match_ref = db.collection('matches').add(match_data)
            match_id = match_ref[1].id
            
            return jsonify({
                "message": "It's a match!",
                "is_match": True,
                "match_id": match_id
            }), 200
        else:
            return jsonify({
                "message": "Like recorded",
                "is_match": False
            }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@matches_bp.route('/dislike/<target_uid>', methods=['POST'])
@token_required
def dislike_profile(current_user, target_uid):
    """Dislike another user's profile."""
    try:
        disliker_uid = current_user['uid']
        
        # Create a dislike document to keep track
        dislike_data = {
            'disliker_uid': disliker_uid,
            'target_uid': target_uid,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        # Add to dislikes collection
        db.collection('dislikes').add(dislike_data)
        
        return jsonify({
            "message": "Dislike recorded"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@matches_bp.route('/matches', methods=['GET'])
@token_required
def get_matches(current_user):
    """Get all matches for the current user."""
    try:
        uid = current_user['uid']
        
        # Get matches where user is user1 or user2
        matches_as_user1 = db.collection('matches').where('user1_uid', '==', uid).where('active', '==', True).get()
        matches_as_user2 = db.collection('matches').where('user2_uid', '==', uid).where('active', '==', True).get()
        
        results = []
        processed_match_ids = set()  # Track processed match IDs to prevent duplicates
        
        # Process matches where current user is user1
        for match in matches_as_user1:
            match_id = match.id
            
            # Skip if we've already processed this match
            if match_id in processed_match_ids:
                continue
                
            processed_match_ids.add(match_id)
            match_data = match.to_dict()
            
            # Get the other user's profile
            other_uid = match_data['user2_uid']
            other_user = db.collection('users').document(other_uid).get()
            
            if other_user.exists:
                other_user_data = other_user.to_dict()
                match_obj = {
                    'match_id': match_id,
                    'user_uid': other_uid,
                    'display_name': other_user_data.get('display_name', ''),
                    'bio': other_user_data.get('bio', ''),
                    'photos': other_user_data.get('photos', []),
                    'created_at': match_data.get('created_at')
                }
                results.append(match_obj)
        
        # Process matches where current user is user2
        for match in matches_as_user2:
            match_id = match.id
            
            # Skip if we've already processed this match
            if match_id in processed_match_ids:
                continue
                
            processed_match_ids.add(match_id)
            match_data = match.to_dict()
            
            # Get the other user's profile
            other_uid = match_data['user1_uid']
            other_user = db.collection('users').document(other_uid).get()
            
            if other_user.exists:
                other_user_data = other_user.to_dict()
                match_obj = {
                    'match_id': match_id,
                    'user_uid': other_uid,
                    'display_name': other_user_data.get('display_name', ''),
                    'bio': other_user_data.get('bio', ''),
                    'photos': other_user_data.get('photos', []),
                    'created_at': match_data.get('created_at')
                }
                results.append(match_obj)
        
        # Sort by creation time (newest first)
        results.sort(key=lambda x: x.get('created_at', 0), reverse=True)
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@matches_bp.route('/unmatch/<match_id>', methods=['POST'])
@token_required
def unmatch(current_user, match_id):
    """Unmatch with another user."""
    try:
        uid = current_user['uid']
        
        # Get the match
        match_doc = db.collection('matches').document(match_id).get()
        
        if not match_doc.exists:
            return jsonify({"error": "Match not found"}), 404
        
        match_data = match_doc.to_dict()
        
        # Ensure the current user is part of this match
        if uid != match_data['user1_uid'] and uid != match_data['user2_uid']:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Set match as inactive
        db.collection('matches').document(match_id).update({
            'active': False,
            'unmatch_initiated_by': uid,
            'unmatched_at': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({
            "message": "Unmatched successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@matches_bp.route('/clear-likes', methods=['POST'])
@token_required
def clear_all_likes(current_user):
    """Clear likes and dislikes from the current user while preserving others' likes for matching."""
    try:
        uid = current_user['uid']
        
        # Delete all likes FROM this user
        likes_from_user = db.collection('likes').where('liker_uid', '==', uid).stream()
        for like in likes_from_user:
            like.reference.delete()
            
        # DO NOT delete likes TO this user - this preserves matching potential
        # likes_to_user = db.collection('likes').where('target_uid', '==', uid).stream()
        # for like in likes_to_user:
        #     like.reference.delete()
            
        # Delete all dislikes FROM this user
        dislikes_from_user = db.collection('dislikes').where('disliker_uid', '==', uid).stream()
        for dislike in dislikes_from_user:
            dislike.reference.delete()
            
        # DO NOT delete dislikes TO this user
        # dislikes_to_user = db.collection('dislikes').where('target_uid', '==', uid).stream()
        # for dislike in dislikes_to_user:
        #     dislike.reference.delete()
        
        return jsonify({
            "message": "All likes and dislikes from you have been cleared successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400