import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { api } from '../services/api';
import { app } from '../services/firebase';

// Create auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const auth = getAuth(app);

  // Register a new user
  const register = async (email, password, displayName) => {
    try {
      setLoading(true);
      console.log('Attempting to register user with backend API...');
      
      const response = await api.post('/api/auth/register', {
        email,
        password,
        display_name: displayName
      });
      
      console.log('Backend registration response:', response.data);
      
      // If registration successful through API, sign in using Firebase
      if (response.data && response.data.uid) {
        console.log('Registration successful, now attempting to sign in...');
        try {
          // Try to sign in now
          const loginResult = await signIn(email, password);
          console.log('Sign in successful after registration:', loginResult);
          return response.data;
        } catch (signInError) {
          console.error('Sign-in error after registration:', signInError);
          // If sign-in fails after registration, we can still proceed
          // because the account was created on the backend
          
          // Store the UID for later use
          localStorage.setItem('pendingUserId', response.data.uid);
          
          return response.data;
        }
      } else {
        throw new Error('Invalid response from registration API');
      }
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in a user
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      console.log('Attempting to sign in with backend...');
      
      const response = await api.post('/api/auth/login', {
        email,
        password
      });
      
      console.log('Login response:', response.data);
      
      // If login successful, set user data
      if (response.data && response.data.token) {
        // Store token in localStorage
        localStorage.setItem('authToken', response.data.token);
        
        try {
          // Get the current Firebase auth instance
          console.log('Setting up Firebase auth with custom token...');
          const auth = getAuth(app);
          
          // Check if we have a custom token from the backend
          if (response.data.token) {
            try {
              // Try to sign in with the custom token
              await signInWithCustomToken(auth, response.data.token);
              console.log('Firebase auth with custom token successful');
            } catch (customTokenError) {
              console.error('Custom token sign in failed:', customTokenError);
              
              // Fall back to email/password if custom token fails
              try {
                await signInWithEmailAndPassword(auth, email, password);
                console.log('Firebase email/password auth successful');
              } catch (emailPasswordError) {
                console.error('Email/password sign in also failed:', emailPasswordError);
                
                // Try to get a test token as last resort
                try {
                  const tokenResponse = await api.get(`/api/auth/get-test-token/${response.data.uid}`);
                  if (tokenResponse.data && tokenResponse.data.token) {
                    await signInWithCustomToken(auth, tokenResponse.data.token);
                    console.log('Firebase auth with test token successful');
                  }
                } catch (testTokenError) {
                  console.error('Test token auth failed:', testTokenError);
                }
              }
            }
          } else {
            // No token in response, try email/password
            await signInWithEmailAndPassword(auth, email, password);
          }
        } catch (firebaseErr) {
          console.error('All Firebase auth methods failed:', firebaseErr);
          // We can continue even if Firebase auth fails since we have the backend token
        }
        
        // Get user profile
        await fetchUserProfile();
        
        return response.data;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem('authToken');
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/api/profiles/');
        if (response.data) {
          setUserProfile(response.data);
        }
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
      if (error.response && error.response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('authToken');
        setCurrentUser(null);
        setUserProfile(null);
      }
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      // Log the number of photos being sent (for debugging)
      if (profileData.photos) {
        console.log(`Sending ${profileData.photos.length} photos in profile update`);
        
        // Check total size of photos array
        const photosSize = JSON.stringify(profileData.photos).length;
        console.log(`Total photos size: ${(photosSize/1024/1024).toFixed(2)} MB`);
        
        // Check if we need to split the update due to large photos array
        if (photosSize > 750000) { // Approaching Firestore's 1MB limit
          console.log("Photos array is too large - splitting update");
          
          // First update profile without photos
          const profileWithoutPhotos = {...profileData};
          delete profileWithoutPhotos.photos;
          
          // Update profile data first
          await api.put('/api/profiles/', profileWithoutPhotos);
          console.log("Profile updated without photos");
          
          // Then update photos one by one if there are multiple
          if (profileData.photos.length > 1) {
            for (let i = 0; i < profileData.photos.length; i++) {
              const photoUpdate = {
                photos: [profileData.photos[i]],
                photo_update_type: 'add_single',
                photo_index: i
              };
              
              console.log(`Updating photo ${i+1} of ${profileData.photos.length}`);
              await api.put('/api/profiles/photo', photoUpdate);
            }
            
            // Update local state
            setUserProfile(prev => ({...prev, ...profileData}));
            return { message: "Profile updated successfully", split_update: true };
          }
        }
      }
      
      // Standard update if photos aren't too large
      const response = await api.put('/api/profiles/', profileData);
      if (response.data) {
        setUserProfile(prev => ({...prev, ...profileData}));
        return response.data;
      }
    } catch (error) {
      console.error('Update profile error:', error);
      
      // More detailed error messaging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error data:", error.response.data);
        console.error("Error status:", error.response.status);
        
        // Add a specific message for payload too large
        if (error.response.status === 413 || 
           (error.response.data && error.response.data.error && 
            error.response.data.error.includes("longer than 1048487 bytes"))) {
          throw new Error("Photo data is too large. Please use smaller or fewer images, or try compressing them more.");
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
        throw new Error("No response from server. The request may have timed out due to large images.");
      }
      
      throw error;
    }
  };

  // Effect to monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // User is signed in
        try {
          // If token exists, fetch profile
          if (localStorage.getItem('authToken')) {
            await fetchUserProfile();
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
      
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  // Context value
  const value = {
    currentUser,
    userProfile,
    loading,
    register,
    signIn,
    signOut,
    updateProfile,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : null}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
}; 