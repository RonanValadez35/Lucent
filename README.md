# Lucent Backend

A Flask-based REST API backend for a lucent using Firebase and Firestore.

## Setup Instructions

### Prerequisites
- Python 3.8+
- Firebase account with Firestore enabled
- Firebase Admin SDK service account key

### Installation

1. Clone the repository

2. Create a virtual environment and activate it
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Set up your Firebase credentials
   - Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore database
   - Go to Project Settings > Service Accounts
   - Generate a new private key (JSON format)
   - Save the JSON file to your project directory
   - Create a `.env` file in the root directory with:
   ```
   FIREBASE_CREDENTIALS_PATH=path/to/your/credentials.json
   ```

5. Run the application
```bash
python run.py
```

## API Endpoints

### Authentication

#### Register
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123",
    "display_name": "Jane Doe"
  }
  ```
- **Response**: User UID and confirmation message

#### Login (Client-side Firebase Auth)
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Note**: Authentication should be handled on the client side using Firebase Auth SDK.

#### Verify Token
- **URL**: `/api/auth/verify-token`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "token": "firebase-id-token"
  }
  ```
- **Response**: User information if token is valid

#### Get Current User
- **URL**: `/api/auth/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: Current user information

### Profiles

#### Get Own Profile
- **URL**: `/api/profiles/`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: User profile data

#### Update Profile
- **URL**: `/api/profiles/`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**: Profile data to update
- **Response**: Confirmation message

#### Discover Profiles
- **URL**: `/api/profiles/discover`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: List of potential matches based on preferences

#### Get User Profile
- **URL**: `/api/profiles/{uid}`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: Public profile data for the specified user

### Matches

#### Like Profile
- **URL**: `/api/matches/like/{target_uid}`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: Like confirmation and match notification if mutual

#### Dislike Profile
- **URL**: `/api/matches/dislike/{target_uid}`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: Dislike confirmation

#### Get Matches
- **URL**: `/api/matches/matches`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: List of active matches

#### Unmatch
- **URL**: `/api/matches/unmatch/{match_id}`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: Unmatch confirmation

### Messages

#### Get Messages
- **URL**: `/api/messages/{match_id}`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: Messages for the specified match

#### Send Message
- **URL**: `/api/messages/{match_id}`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "content": "Hello there!",
    "image_url": "optional-image-url"
  }
  ```
- **Response**: Message confirmation

#### Get Unread Count
- **URL**: `/api/messages/{match_id}/unread`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: Count of unread messages in the match

#### Get All Conversations
- **URL**: `/api/messages/conversations`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: List of all matches with last message and unread counts

## Database Schema

The application uses Firestore with the following collections:

- **users**: User profiles and preferences
- **likes**: Record of likes between users
- **dislikes**: Record of dislikes between users
- **matches**: Active matches between users
- **messages**: Messages exchanged in matches

For detailed schema information, see `app/models/schema.py`

## Development

To run the app in development mode:

```bash
python run.py
```

To run tests:

```bash
pytest
```

## Deployment

For production deployment, set the environment variable:

```bash
export FLASK_ENV=production
```

Then run with a production WSGI server like Gunicorn:

```bash
gunicorn "app:create_app('production')"
```
