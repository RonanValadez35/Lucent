# app/config/firebase.py

import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from dotenv import load_dotenv

load_dotenv()

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

# Get database instance
db = initialize_firebase()