import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase config is valid (avoid placeholder values)
const isConfigValid = Object.values(firebaseConfig).every(value => 
  value && 
  !value.includes('your-') && 
  !value.includes('placeholder') &&
  !value.includes('123456789012') &&
  !value.includes('abcdef1234567890')
) && 
firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIza') &&
firebaseConfig.projectId && firebaseConfig.projectId !== 'your-project-id';

if (!isConfigValid) {
  if (import.meta.env.MODE === 'production') {
    console.error('Firebase configuration is incomplete. Please set up proper Firebase credentials for production.');
  } else {
    console.info('Firebase using development/placeholder configuration. This is normal for local development.');
  }
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);

export default app; 