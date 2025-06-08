#!/usr/bin/env python3
"""
Script to standardize capitalization and formatting of profile details in Firestore
"""

import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore
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

# Standardize profile details
def standardize_profile_details(db):
    """Standardize capitalization and formatting in user profiles"""
    
    # Get all user profiles
    users_ref = db.collection('users')
    profiles = users_ref.get()
    
    updated_count = 0
    
    # Define standardized values for each field
    drinking_values = {
        "never": "Never",
        "rarely": "Rarely",
        "socially": "Socially",
        "often": "Often",
        "always": "Regular drinker",
        "regular drinker": "Regular drinker"
    }
    
    smoking_values = {
        "never": "Non-smoker",
        "non-smoker": "Non-smoker",
        "rarely": "Occasionally",
        "occasionally": "Occasionally",
        "socially": "Socially",
        "often": "Regular smoker",
        "always": "Regular smoker",
        "regular smoker": "Regular smoker"
    }
    
    looking_for_values = {
        "friendship": "Friendship",
        "dating": "Dating",
        "relationship": "Relationship",
        "serious relationship": "Serious relationship",
        "long-term": "Serious relationship",
        "short-term": "Casual",
        "casual": "Casual"
    }
    
    for profile in profiles:
        profile_data = profile.to_dict()
        updates = {}
        
        # Fix height format (ensure it's a number and has correct unit)
        if 'height' in profile_data and profile_data['height']:
            try:
                # If it's already a number, keep it
                if isinstance(profile_data['height'], (int, float)):
                    pass
                # If it's a string that might contain 'cm', extract the number
                elif isinstance(profile_data['height'], str):
                    height_str = profile_data['height'].lower()
                    if 'cm' in height_str:
                        # Try to extract just the number
                        height_val = ''.join(c for c in height_str if c.isdigit() or c == '.')
                        if height_val:
                            updates['height'] = float(height_val)
                    else:
                        # If no 'cm', try to convert the whole string to a number
                        try:
                            updates['height'] = float(height_str)
                        except ValueError:
                            print(f"Cannot convert height '{height_str}' to a number for profile {profile.id}")
            except Exception as e:
                print(f"Error processing height for profile {profile.id}: {e}")
        
        # Standardize drinking value
        if 'drinking' in profile_data and profile_data['drinking']:
            drinking_val = str(profile_data['drinking']).lower()
            if drinking_val in drinking_values:
                updates['drinking'] = drinking_values[drinking_val]
        
        # Standardize smoking value
        if 'smoking' in profile_data and profile_data['smoking']:
            smoking_val = str(profile_data['smoking']).lower()
            if smoking_val in smoking_values:
                updates['smoking'] = smoking_values[smoking_val]
        
        # Standardize looking_for value
        if 'looking_for' in profile_data and profile_data['looking_for']:
            looking_for_val = str(profile_data['looking_for']).lower()
            if looking_for_val in looking_for_values:
                updates['looking_for'] = looking_for_values[looking_for_val]
        
        # Update profile if there are changes
        if updates:
            print(f"Updating profile {profile.id} with: {updates}")
            users_ref.document(profile.id).update(updates)
            updated_count += 1
    
    print(f"Standardized {updated_count} profiles out of {len(profiles)} total")
    return updated_count

def main():
    """Main function to standardize profile details"""
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        print("Failed to initialize Firebase. Exiting.")
        sys.exit(1)
    
    # Standardize profile details
    standardize_profile_details(db)
    
    print("Done!")

if __name__ == "__main__":
    main() 