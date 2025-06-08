import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, Spinner, Center } from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ requireProfileCompleted = false }) => {
  const { currentUser, userProfile, loading } = useAuth();

  // Show loading spinner while authenticating
  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="primary.500" thickness="4px" />
      </Center>
    );
  }

  // If not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If profile completion required but profile not complete, redirect to profile setup
  if (requireProfileCompleted && (!userProfile || !userProfile.profile_completed)) {
    return <Navigate to="/setup-profile" replace />;
  }

  // User is authenticated (and profile is complete if required)
  return <Outlet />;
};

export default ProtectedRoute; 