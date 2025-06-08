# Lucent Dating App Frontend

A mobile-friendly frontend for the Lucent Dating App built with React, Chakra UI, and Vite.

## Features

- Responsive UI optimized for mobile devices
- Real-time messaging
- Swipe-based profile discovery
- User profile management
- Match management
- Photo uploads
- Authentication with Firebase

## Technologies Used

- React 18
- React Router v6
- Chakra UI
- Firebase Authentication
- Firebase Storage
- Framer Motion (for swipe animations)
- Axios (for API calls)
- Vite (for bundling)

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn
- Backend API running at http://localhost:5001 (or configure in .env)
- Firebase project

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/dating_app_frontend.git
   cd dating_app_frontend
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_API_URL=http://localhost:5001
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open http://localhost:5173 in your browser (or the URL shown in your terminal)

### Building for Production

```bash
npm run build
# or
yarn build
```

The build files will be in the `dist` directory.

## Project Structure

```
dating_app_frontend/
├── public/               # Public assets
├── src/
│   ├── components/       # Reusable components
│   │   └── layouts/      # Layout components
│   ├── context/          # React context providers
│   ├── pages/            # Page components
│   ├── services/         # API and Firebase services
│   ├── utils/            # Utility functions
│   ├── App.jsx           # Main app component with routes
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── .env                  # Environment variables
├── index.html            # HTML template
├── package.json          # Dependencies and scripts
└── vite.config.js        # Vite configuration
```

## Features to Implement Next

- Notifications for new matches and messages
- User blocking
- Advanced profile search
- Video chat integration
- Social login (Google, Facebook, etc.)
- Premium subscription features 