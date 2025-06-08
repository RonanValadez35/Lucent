# app/api/ratings.py
"""API endpoints for managing user ratings"""

from flask import Blueprint, request, jsonify, g
from firebase_admin import firestore
import datetime
from app.utils.decorators import token_required
from functools import wraps

ratings_bp = Blueprint('ratings', __name__)
db = firestore.client()

def limit_ratings(f):
    """
    Middleware to ensure a user can only rate another user once
    and they have had some interaction (match/conversation)
    """
    @wraps(f)
    def decorated_function(current_user, *args, **kwargs):
        user_id = current_user['uid']
        rated_uid = request.json.get('rated_uid')
        
        # Check if they've already rated this user
        existing_rating = db.collection('ratings').where(
            'rater_uid', '==', user_id).where(
            'rated_uid', '==', rated_uid).limit(1).get()
        
        if len(existing_rating) > 0 and request.method == 'POST':
            return jsonify({
                'error': 'You have already rated this user. Please update your existing rating instead.'
            }), 400
            
        # Check if they've had a match or conversation
        matches = db.collection('matches').where(
            'user1_uid', 'in', [user_id, rated_uid]).where(
            'user2_uid', 'in', [user_id, rated_uid]).limit(1).get()
        
        if len(matches) == 0:
            return jsonify({
                'error': 'You can only rate users you have matched with.'
            }), 400
            
        return f(current_user=current_user, *args, **kwargs)
    return decorated_function

@ratings_bp.route('/api/ratings', methods=['POST'])
@token_required
@limit_ratings
def rate_user(current_user):
    """Add a new rating for a user"""
    data = request.json
    
    # Validate required fields
    required_fields = ['rated_uid', 'overall', 'personality', 
                       'reliability', 'communication', 'authenticity']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate rating values (1-5)
    rating_fields = ['overall', 'personality', 'reliability', 
                    'communication', 'authenticity']
    for field in rating_fields:
        if not isinstance(data[field], (int, float)) or data[field] < 1 or data[field] > 5:
            return jsonify({'error': f'Rating {field} must be between 1 and 5'}), 400
    
    # Create rating document
    timestamp = datetime.datetime.now()
    rating = {
        'rater_uid': current_user['uid'],
        'rated_uid': data['rated_uid'],
        'overall': data['overall'],
        'personality': data['personality'],
        'reliability': data['reliability'],
        'communication': data['communication'],
        'authenticity': data['authenticity'],
        'comment': data.get('comment', ''),
        'created_at': timestamp,
        'updated_at': timestamp
    }
    
    # Add rating to database
    rating_ref = db.collection('ratings').document()
    rating_ref.set(rating)
    
    # Update user's average rating
    update_average_rating(data['rated_uid'])
    
    return jsonify({
        'success': True,
        'message': 'Rating submitted successfully',
        'rating_id': rating_ref.id
    }), 201

@ratings_bp.route('/api/ratings/<rated_uid>', methods=['GET'])
@token_required
def get_user_ratings(current_user, rated_uid):
    """Get all ratings for a specific user"""
    try:
        # Get ratings for user
        ratings = db.collection('ratings').where('rated_uid', '==', rated_uid).get()
        
        result = []
        for rating in ratings:
            rating_data = rating.to_dict()
            rating_data['id'] = rating.id
            
            # Get the rater's display name
            try:
                rater_doc = db.collection('users').document(rating_data['rater_uid']).get()
                if rater_doc.exists:
                    rater_data = rater_doc.to_dict()
                    rating_data['rater_display_name'] = rater_data.get('display_name', 'Anonymous')
                else:
                    rating_data['rater_display_name'] = 'Anonymous'
            except Exception as e:
                print(f"Error fetching rater info: {str(e)}")
                rating_data['rater_display_name'] = 'Anonymous'
            
            result.append(rating_data)
            
        return jsonify({
            'success': True,
            'count': len(result),
            'ratings': result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@ratings_bp.route('/api/ratings/<rating_id>', methods=['PUT'])
@token_required
def update_rating(current_user, rating_id):
    """Update an existing rating"""
    data = request.json
    
    # Validate rating values (1-5)
    rating_fields = ['overall', 'personality', 'reliability', 
                    'communication', 'authenticity']
    for field in rating_fields:
        if field in data:
            if not isinstance(data[field], (int, float)) or data[field] < 1 or data[field] > 5:
                return jsonify({'error': f'Rating {field} must be between 1 and 5'}), 400
    
    # Check if rating exists and belongs to user
    rating_ref = db.collection('ratings').document(rating_id)
    rating = rating_ref.get()
    
    if not rating.exists:
        return jsonify({'error': 'Rating not found'}), 404
        
    rating_data = rating.to_dict()
    if rating_data['rater_uid'] != current_user['uid']:
        return jsonify({'error': 'You can only update your own ratings'}), 403
    
    # Update rating
    update_data = {}
    for field in rating_fields + ['comment']:
        if field in data:
            update_data[field] = data[field]
            
    update_data['updated_at'] = datetime.datetime.now()
    rating_ref.update(update_data)
    
    # Update user's average rating
    update_average_rating(rating_data['rated_uid'])
    
    return jsonify({
        'success': True,
        'message': 'Rating updated successfully'
    })

@ratings_bp.route('/api/ratings/<rating_id>', methods=['DELETE'])
@token_required
def delete_rating(current_user, rating_id):
    """Delete a rating"""
    # Check if rating exists and belongs to user
    rating_ref = db.collection('ratings').document(rating_id)
    rating = rating_ref.get()
    
    if not rating.exists:
        return jsonify({'error': 'Rating not found'}), 404
        
    rating_data = rating.to_dict()
    if rating_data['rater_uid'] != current_user['uid']:
        return jsonify({'error': 'You can only delete your own ratings'}), 403
    
    # Store the rated_uid before deleting
    rated_uid = rating_data['rated_uid']
    
    # Delete rating
    rating_ref.delete()
    
    # Update user's average rating
    update_average_rating(rated_uid)
    
    return jsonify({
        'success': True,
        'message': 'Rating deleted successfully'
    })

@ratings_bp.route('/api/ratings/my/<rated_uid>', methods=['GET'])
@token_required
def get_my_rating(current_user, rated_uid):
    """Get the current user's rating for a specific user"""
    ratings = db.collection('ratings').where(
        'rater_uid', '==', current_user['uid']).where(
        'rated_uid', '==', rated_uid).limit(1).get()
    
    if len(ratings) == 0:
        return jsonify({
            'success': True,
            'exists': False,
            'rating': None
        })
    
    rating = ratings[0]
    rating_data = rating.to_dict()
    rating_data['id'] = rating.id
    
    return jsonify({
        'success': True,
        'exists': True,
        'rating': rating_data
    })

@ratings_bp.route('/api/ratings/clear-all', methods=['POST'])
@token_required
def clear_all_ratings(current_user):
    """Clear all ratings from and to the current user."""
    try:
        uid = current_user['uid']
        
        # Get all ratings FROM this user (ratings they gave to others)
        ratings_from_user = db.collection('ratings').where('rater_uid', '==', uid).stream()
        for rating in ratings_from_user:
            # Store the other user's ID before deleting to update their average
            rating_data = rating.to_dict()
            rated_uid = rating_data.get('rated_uid')
            
            # Delete the rating
            rating.reference.delete()
            
            # Update the other user's average rating
            if rated_uid:
                update_average_rating(rated_uid)
        
        # Get all ratings TO this user (ratings they received)
        ratings_to_user = db.collection('ratings').where('rated_uid', '==', uid).stream()
        for rating in ratings_to_user:
            # Delete the rating
            rating.reference.delete()
        
        # Reset this user's average rating
        average_rating = {
            'overall': 0,
            'personality': 0,
            'reliability': 0,
            'communication': 0,
            'authenticity': 0,
            'rating_count': 0
        }
        
        # Update user document with reset average rating
        db.collection('users').document(uid).update({
            'average_rating': average_rating,
            'updated_at': datetime.datetime.now()
        })
        
        return jsonify({
            'success': True,
            'message': 'All ratings cleared successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

def update_average_rating(user_id):
    """Calculate and update a user's average ratings"""
    # Get all ratings for the user
    ratings = db.collection('ratings').where('rated_uid', '==', user_id).get()
    
    if len(ratings) == 0:
        # No ratings, set defaults
        average_rating = {
            'overall': 0,
            'personality': 0,
            'reliability': 0,
            'communication': 0,
            'authenticity': 0,
            'rating_count': 0
        }
    else:
        # Calculate averages
        total_ratings = len(ratings)
        sums = {
            'overall': 0,  # We'll recalculate this
            'personality': 0,
            'reliability': 0,
            'communication': 0,
            'authenticity': 0
        }
        
        for rating in ratings:
            rating_data = rating.to_dict()
            for field in sums:
                if field != 'overall':  # Skip overall as we'll calculate it
                    sums[field] += float(rating_data[field])
                # Still sum up original overall for historical purposes
                if field == 'overall':
                    sums[field] += float(rating_data[field])
        
        # Calculate category averages
        personality_avg = round(float(sums['personality']) / float(total_ratings), 1)
        reliability_avg = round(float(sums['reliability']) / float(total_ratings), 1)
        communication_avg = round(float(sums['communication']) / float(total_ratings), 1)
        authenticity_avg = round(float(sums['authenticity']) / float(total_ratings), 1)
        
        # Calculate overall as the average of the four detailed categories
        calculated_overall = round((personality_avg + reliability_avg + communication_avg + authenticity_avg) / 4.0, 1)
        
        # Calculate averages - ensure we're using float division and proper rounding
        average_rating = {
            'overall': calculated_overall,  # Now using calculated overall 
            'personality': personality_avg,
            'reliability': reliability_avg,
            'communication': communication_avg,
            'authenticity': authenticity_avg,
            'rating_count': total_ratings
        }
    
    # Update user document with the calculated average rating
    db.collection('users').document(user_id).update({
        'average_rating': average_rating,
        'updated_at': datetime.datetime.now()
    })
    
    return average_rating 