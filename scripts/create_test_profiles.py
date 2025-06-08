#!/usr/bin/env python3
"""
Script to create test profiles with stock images in the Lucent Dating App
"""

import os
import sys
import json
import random
import datetime
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Firebase
def initialize_firebase():
    """Initialize Firebase with credentials."""
    try:
        # This file should be downloaded from Firebase Console > Project Settings > Service Accounts
        cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
        
        # Initialize Firebase with credentials
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        
        # Get Firestore database instance
        db = firestore.client()
        
        print("Firebase initialized successfully")
        return db
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return None

# Test profile data
MALE_PROFILES = [
    {
        "display_name": "Alex Johnson",
        "email": "test_alex@lucentdating.com",
        "password": "TestPass123",
        "age": 28,
        "gender": "male",
        "bio": "Software engineer by day, rock climber by weekend. Looking for someone to share adventures with!",
        "interests": ["rock climbing", "hiking", "coding", "craft beer"],
        "height": 183,
        "job_title": "Software Engineer",
        "education": "Computer Science, Stanford",
        "drinking": "Social drinker",
        "smoking": "Non-smoker",
        "looking_for": "Relationship",
        "photos": [
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=500"
        ],
        "location": {
            "city": "San Francisco",
            "country": "USA",
            "latitude": 37.7749,
            "longitude": -122.4194
        }
    },
    {
        "display_name": "Mike Chen",
        "email": "test_mike@lucentdating.com",
        "password": "TestPass123",
        "age": 31,
        "gender": "male",
        "bio": "Chef and food enthusiast. Love exploring new restaurants and cooking for friends. Let's bond over good food and wine!",
        "interests": ["cooking", "fine dining", "travel", "photography"],
        "height": 175,
        "job_title": "Executive Chef",
        "education": "Culinary Institute of America",
        "drinking": "Regular drinker",
        "smoking": "Non-smoker",
        "looking_for": "Dating",
        "photos": [
            "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=500"
        ],
        "location": {
            "city": "New York",
            "country": "USA",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
    },
    {
        "display_name": "James Wilson",
        "email": "test_james@lucentdating.com",
        "password": "TestPass123",
        "age": 29,
        "gender": "male",
        "bio": "Musician and music producer. Always on the lookout for new sounds and experiences. Let's go to a concert together!",
        "interests": ["music", "concerts", "vinyl records", "music production", "instruments"],
        "height": 180,
        "job_title": "Music Producer",
        "education": "Berklee College of Music",
        "drinking": "Social drinker",
        "smoking": "Occasionally",
        "looking_for": "Casual",
        "photos": [
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=500"
        ],
        "location": {
            "city": "Los Angeles",
            "country": "USA",
            "latitude": 34.0522,
            "longitude": -118.2437
        }
    },
    {
        "display_name": "David Park",
        "email": "test_david@lucentdating.com",
        "password": "TestPass123",
        "age": 27,
        "gender": "male",
        "bio": "Fitness trainer and health enthusiast. Believe in balancing a healthy body and mind. Looking for someone who shares my passion for wellness.",
        "interests": ["fitness", "nutrition", "meditation", "outdoor activities"],
        "height": 178,
        "job_title": "Personal Trainer",
        "education": "Sports Science, UCLA",
        "drinking": "Rarely",
        "smoking": "Non-smoker",
        "looking_for": "Relationship",
        "photos": [
            "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=500"
        ],
        "location": {
            "city": "Chicago",
            "country": "USA",
            "latitude": 41.8781,
            "longitude": -87.6298
        }
    },
    {
        "display_name": "Robert Taylor",
        "email": "test_robert@lucentdating.com",
        "password": "TestPass123",
        "age": 33,
        "gender": "male",
        "bio": "Finance professional by day, amateur photographer by night. Love capturing the world through my lens and exploring new places.",
        "interests": ["photography", "travel", "finance", "wines"],
        "height": 188,
        "job_title": "Investment Banker",
        "education": "MBA, Harvard Business School",
        "drinking": "Social drinker",
        "smoking": "Non-smoker",
        "looking_for": "Serious relationship",
        "photos": [
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=500"
        ],
        "location": {
            "city": "Boston",
            "country": "USA",
            "latitude": 42.3601,
            "longitude": -71.0589
        }
    }
]

FEMALE_PROFILES = [
    {
        "display_name": "Emily Rodriguez",
        "email": "test_emily@lucentdating.com",
        "password": "TestPass123",
        "age": 26,
        "gender": "female",
        "bio": "UX designer passionate about creating beautiful experiences. When I'm not designing, you can find me at a yoga studio or exploring local cafes.",
        "interests": ["design", "yoga", "coffee", "art", "hiking"],
        "height": 165,
        "job_title": "UX Designer",
        "education": "Design, RISD",
        "drinking": "Occasionally",
        "smoking": "Non-smoker",
        "looking_for": "Dating",
        "photos": [
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=500"
        ],
        "location": {
            "city": "San Francisco",
            "country": "USA",
            "latitude": 37.7749,
            "longitude": -122.4194
        }
    },
    {
        "display_name": "Sophia Kim",
        "email": "test_sophia@lucentdating.com",
        "password": "TestPass123",
        "age": 29,
        "gender": "female",
        "bio": "Doctor by profession, avid reader and traveler by heart. Love discussing books and planning my next adventure.",
        "interests": ["reading", "travel", "medicine", "hiking", "cultural events"],
        "height": 170,
        "job_title": "Medical Doctor",
        "education": "MD, Johns Hopkins",
        "drinking": "Social drinker",
        "smoking": "Non-smoker",
        "looking_for": "Relationship",
        "photos": [
            "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=500"
        ],
        "location": {
            "city": "New York",
            "country": "USA",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
    },
    {
        "display_name": "Olivia Martinez",
        "email": "test_olivia@lucentdating.com",
        "password": "TestPass123",
        "age": 27,
        "gender": "female",
        "bio": "Environmental lawyer fighting for a better planet. In my free time, I love hiking with my dog and trying plant-based recipes.",
        "interests": ["environment", "hiking", "dogs", "vegan cooking", "activism"],
        "height": 168,
        "job_title": "Environmental Lawyer",
        "education": "Law, UC Berkeley",
        "drinking": "Occasionally",
        "smoking": "Non-smoker",
        "looking_for": "Serious relationship",
        "photos": [
            "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?auto=format&fit=crop&q=80&w=500"
        ],
        "location": {
            "city": "Seattle",
            "country": "USA",
            "latitude": 47.6062,
            "longitude": -122.3321
        }
    },
    {
        "display_name": "Isabella Clark",
        "email": "test_isabella@lucentdating.com",
        "password": "TestPass123",
        "age": 30,
        "gender": "female",
        "bio": "Marketing executive who loves arts and culture. Most weekends you'll find me at a museum, gallery, or theater performance.",
        "interests": ["art", "theater", "museums", "marketing", "literature"],
        "height": 172,
        "job_title": "Marketing Director",
        "education": "MBA, Northwestern",
        "drinking": "Social drinker",
        "smoking": "Non-smoker",
        "looking_for": "Dating",
        "photos": [
            "https://images.unsplash.com/photo-1504703395950-b89145a5425b?auto=format&fit=crop&q=80&w=500"
        ],
        "location": {
            "city": "Chicago",
            "country": "USA",
            "latitude": 41.8781,
            "longitude": -87.6298
        }
    },
    {
        "display_name": "Emma Johnson",
        "email": "test_emma@lucentdating.com",
        "password": "TestPass123",
        "age": 28,
        "gender": "female",
        "bio": "Tech entrepreneur and fitness enthusiast. Building my startup during the day, hitting the gym in the evening. Looking for someone with similar drive and energy.",
        "interests": ["startups", "fitness", "technology", "running", "business"],
        "height": 165,
        "job_title": "Tech Entrepreneur",
        "education": "Computer Science, MIT",
        "drinking": "Occasionally",
        "smoking": "Non-smoker",
        "looking_for": "Relationship",
        "photos": [
            "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&q=80&w=500"
        ],
        "location": {
            "city": "Austin",
            "country": "USA",
            "latitude": 30.2672,
            "longitude": -97.7431
        }
    }
]

def create_test_profiles(db):
    """Create test profiles in Firebase Authentication and Firestore"""
    
    print("Starting to create test profiles...")
    
    # Combine male and female profiles
    all_profiles = MALE_PROFILES + FEMALE_PROFILES
    successful_creations = 0
    
    for profile in all_profiles:
        try:
            email = profile['email']
            password = profile['password']
            display_name = profile['display_name']
            
            # Check if user already exists
            try:
                existing_user = auth.get_user_by_email(email)
                print(f"User {email} already exists with UID: {existing_user.uid}")
                uid = existing_user.uid
            except:
                # Create user in Firebase Authentication
                user = auth.create_user(
                    email=email,
                    password=password,
                    display_name=display_name
                )
                uid = user.uid
                print(f"Created new user {email} with UID: {uid}")
            
            # Prepare user data for Firestore
            user_data = profile.copy()
            user_data['uid'] = uid
            user_data['profile_completed'] = True
            user_data['created_at'] = firestore.SERVER_TIMESTAMP
            user_data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            # Remove password before storing
            if 'password' in user_data:
                del user_data['password']
            
            # Add user to Firestore collection
            db.collection('users').document(uid).set(user_data)
            
            print(f"Successfully created profile for {display_name}")
            successful_creations += 1
        
        except Exception as e:
            print(f"Error creating profile for {profile.get('display_name', 'unknown')}: {str(e)}")
    
    print(f"Created {successful_creations} out of {len(all_profiles)} test profiles")
    return successful_creations

# Add ratings and comments for profiles
def add_profile_ratings(db):
    """Add sample ratings and comments between test profiles"""
    
    try:
        # Get all test profiles
        users_ref = db.collection('users')
        test_profiles = users_ref.where('email', '>=', 'test_').where('email', '<=', 'test_z').get()
        
        profile_uids = [doc.id for doc in test_profiles]
        
        if len(profile_uids) < 2:
            print("Not enough test profiles to add ratings")
            return 0
        
        print(f"Found {len(profile_uids)} test profiles for adding ratings")
        
        # Positive comments for good ratings
        positive_comments = [
            "Really enjoyed our conversation. Very thoughtful and engaging!",
            "Great personality and super fun to talk with!",
            "Authentic and genuine person. Would definitely recommend.",
            "Very kind and respectful in our interactions.",
            "Awesome profile, matches perfectly with the person!",
            "One of the most interesting conversations I've had on here.",
            "Intelligent and witty - never a dull moment!"
        ]
        
        # Neutral comments for medium ratings
        neutral_comments = [
            "Nice person, but we didn't click that well.",
            "Good conversation but somewhat different interests.",
            "Decent interaction overall.",
            "Seems like a nice person, just not for me.",
            "Friendly but conversation was a bit slow."
        ]
        
        # Add random ratings between profiles
        successful_ratings = 0
        ratings_to_create = min(30, len(profile_uids) * 3)  # Create up to 30 ratings
        
        for _ in range(ratings_to_create):
            # Get two random distinct profiles
            rater_uid, rated_uid = random.sample(profile_uids, 2)
            
            # Get rater profile data
            rater_doc = users_ref.document(rater_uid).get()
            if not rater_doc.exists:
                continue
                
            rater_data = rater_doc.to_dict()
            
            # Generate random rating value (weighted toward positive)
            rating_value = random.choices(
                [5, 4, 3, 2, 1],
                weights=[0.4, 0.3, 0.2, 0.07, 0.03]  # More positive ratings
            )[0]
            
            # Choose comment based on rating
            if rating_value >= 4:
                comment = random.choice(positive_comments)
            elif rating_value >= 3:
                comment = random.choice(neutral_comments)
            else:
                comment = ""  # No comment for low ratings
                
            # Create rating document
            rating_data = {
                "rater_uid": rater_uid,
                "rater_display_name": rater_data.get("display_name", "Anonymous"),
                "rated_uid": rated_uid,
                "overall": rating_value,
                "authenticity": random.randint(max(1, rating_value-1), min(5, rating_value+1)),
                "communication": random.randint(max(1, rating_value-1), min(5, rating_value+1)),
                "respect": random.randint(max(1, rating_value-1), min(5, rating_value+1)),
                "comment": comment,
                "created_at": firestore.SERVER_TIMESTAMP
            }
            
            # Add to ratings collection
            db.collection('ratings').add(rating_data)
            successful_ratings += 1
            
        print(f"Successfully added {successful_ratings} ratings")
        return successful_ratings
            
    except Exception as e:
        print(f"Error adding ratings: {str(e)}")
        return 0

def main():
    """Main function to create test profiles and ratings"""
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        print("Failed to initialize Firebase. Exiting.")
        sys.exit(1)
    
    # Create test profiles
    profiles_created = create_test_profiles(db)
    
    if profiles_created > 0:
        # Add ratings between profiles
        add_profile_ratings(db)
        
    print("Done!")

if __name__ == "__main__":
    main() 