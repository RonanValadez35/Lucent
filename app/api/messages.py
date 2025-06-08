# app/api/messages.py

from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from app.utils.decorators import token_required
from app.config.firebase import db

messages_bp = Blueprint('messages', __name__)

@messages_bp.route('/<match_id>', methods=['GET'])
@token_required
def get_messages(current_user, match_id):
    """Get messages for a specific match."""
    try:
        uid = current_user['uid']
        
        # Verify match exists and user is part of it
        match_doc = db.collection('matches').document(match_id).get()
        if not match_doc.exists:
            return jsonify({"error": "Match not found"}), 404
        
        match_data = match_doc.to_dict()
        if uid != match_data['user1_uid'] and uid != match_data['user2_uid']:
            return jsonify({"error": "Unauthorized to view these messages"}), 403
        
        if not match_data.get('active', True):
            return jsonify({"error": "This match is no longer active"}), 400
        
        # Get messages for this match without ordering (to avoid index requirement)
        messages_query = db.collection('messages').where(
            'match_id', '==', match_id
        ).get()
        
        messages = []
        unread_message_ids = []  # Track unread messages that need to be marked as read
        
        for msg_doc in messages_query:
            msg_data = msg_doc.to_dict()
            msg_data['id'] = msg_doc.id
            
            # Check if this is an unread message from the other user
            if (msg_data.get('sender_uid') != uid and 
                msg_data.get('read') is False):
                unread_message_ids.append(msg_doc.id)
            
            # Convert timestamps to ISO format for JSON serialization
            if 'created_at' in msg_data and msg_data['created_at']:
                msg_data['created_at'] = msg_data['created_at'].isoformat()
            if 'read_at' in msg_data and msg_data['read_at']:
                msg_data['read_at'] = msg_data['read_at'].isoformat()
                
            messages.append(msg_data)
        
        # Sort messages by created_at timestamp in memory (ascending order)
        messages.sort(key=lambda x: x.get('created_at', ''))
        
        # Mark unread messages as read if the current user is the recipient
        # Using direct ID access instead of complex query
        if unread_message_ids:
            batch = db.batch()
            for msg_id in unread_message_ids:
                msg_ref = db.collection('messages').document(msg_id)
                batch.update(msg_ref, {
                    'read': True,
                    'read_at': firestore.SERVER_TIMESTAMP
                })
            
            # Execute batch update - no need to check for writes
            batch.commit()
        
        return jsonify(messages), 200
        
    except Exception as e:
        print(f"Error in get_messages: {str(e)}")
        return jsonify({"error": str(e)}), 400

@messages_bp.route('/<match_id>', methods=['POST'])
@token_required
def send_message(current_user, match_id):
    """Send a message in a match."""
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        if not data or not data.get('content'):
            return jsonify({"error": "Message content is required"}), 400
        
        # Verify match exists and user is part of it
        match_doc = db.collection('matches').document(match_id).get()
        if not match_doc.exists:
            return jsonify({"error": "Match not found"}), 404
        
        match_data = match_doc.to_dict()
        if uid != match_data['user1_uid'] and uid != match_data['user2_uid']:
            return jsonify({"error": "Unauthorized to send messages in this match"}), 403
        
        if not match_data.get('active', True):
            return jsonify({"error": "This match is no longer active"}), 400
        
        # Create message document
        message_data = {
            'match_id': match_id,
            'sender_uid': uid,
            'content': data.get('content'),
            'created_at': firestore.SERVER_TIMESTAMP,
            'read': False,
            'read_at': None,
            'image_url': data.get('image_url')  # Optional image URL
        }
        
        # Add message to Firestore
        message_ref = db.collection('messages').add(message_data)
        
        # Update the last_message_at field in the match document
        db.collection('matches').document(match_id).update({
            'last_message_at': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({
            "message": "Message sent successfully",
            "message_id": message_ref[1].id
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@messages_bp.route('/<match_id>/unread', methods=['GET'])
@token_required
def get_unread_count(current_user, match_id):
    """Get count of unread messages in a match."""
    try:
        uid = current_user['uid']
        
        # Verify match exists and user is part of it
        match_doc = db.collection('matches').document(match_id).get()
        if not match_doc.exists:
            return jsonify({"error": "Match not found"}), 404
        
        match_data = match_doc.to_dict()
        if uid != match_data['user1_uid'] and uid != match_data['user2_uid']:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Count unread messages where user is not the sender
        unread_query = db.collection('messages').where(
            'match_id', '==', match_id
        ).where(
            'sender_uid', '!=', uid
        ).where(
            'read', '==', False
        ).get()
        
        unread_count = len(unread_query)
        
        return jsonify({
            "unread_count": unread_count
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@messages_bp.route('/conversations', methods=['GET'])
@token_required
def get_conversations(current_user):
    """Get all active conversation matches for the current user with the most recent messages."""
    try:
        uid = current_user['uid']
        
        # Get matches where user is user1 or user2
        matches_as_user1 = db.collection('matches').where('user1_uid', '==', uid).where('active', '==', True).get()
        matches_as_user2 = db.collection('matches').where('user2_uid', '==', uid).where('active', '==', True).get()
        
        conversations = []
        processed_match_ids = set()  # Track processed match IDs to prevent duplicates
        
        # Process all matches in a single loop
        for match_query, is_user1 in [(matches_as_user1, True), (matches_as_user2, False)]:
            for match_doc in match_query:
                match_id = match_doc.id
                
                # Skip if we've already processed this match
                if match_id in processed_match_ids:
                    continue
                    
                processed_match_ids.add(match_id)
                match_data = match_doc.to_dict()
                
                # Get the other user's profile based on whether current user is user1 or user2
                other_uid = match_data['user2_uid'] if is_user1 else match_data['user1_uid']
                other_user_doc = db.collection('users').document(other_uid).get()
                
                if other_user_doc.exists:
                    other_user_data = other_user_doc.to_dict()
                    
                    # Get unread message count more efficiently
                    unread_query = db.collection('messages').where('match_id', '==', match_id).where('sender_uid', '==', other_uid).where('read', '==', False).get()
                    unread_count = len(unread_query)
                    
                    # Get last message if any
                    last_message = None
                    last_message_query = db.collection('messages').where('match_id', '==', match_id).order_by('created_at', direction=firestore.Query.DESCENDING).limit(1).get()
                    if len(last_message_query) > 0:
                        last_message_doc = last_message_query[0].to_dict()
                        last_message_doc['id'] = last_message_query[0].id
                        
                        # Format timestamps
                        if 'created_at' in last_message_doc and last_message_doc['created_at']:
                            last_message_doc['created_at'] = last_message_doc['created_at'].isoformat()
                        if 'read_at' in last_message_doc and last_message_doc['read_at']:
                            last_message_doc['read_at'] = last_message_doc['read_at'].isoformat()
                        
                        last_message = last_message_doc
                    
                    # Format match timestamps
                    last_message_at = None
                    if match_data.get('last_message_at'):
                        last_message_at = match_data['last_message_at'].isoformat()
                    elif match_data.get('created_at'):
                        last_message_at = match_data['created_at'].isoformat()
                    
                    # Create the other_user object with user profile data
                    other_user = {
                        'uid': other_uid,
                        'display_name': other_user_data.get('display_name', ''),
                        'photos': other_user_data.get('photos', [])
                    }
                    
                    # Create the conversation object with necessary data
                    conversation = {
                        'match_id': match_id,
                        'other_user': other_user,
                        'last_message': last_message,
                        'last_message_at': last_message_at,
                        'unread_count': unread_count
                    }
                    
                    conversations.append(conversation)
        
        # Sort conversations by last message time (most recent first)
        conversations.sort(key=lambda x: x.get('last_message_at', '') or '', reverse=True)
        
        return jsonify(conversations), 200
        
    except Exception as e:
        print(f"Error in get_conversations: {str(e)}")
        return jsonify({"error": str(e)}), 400 