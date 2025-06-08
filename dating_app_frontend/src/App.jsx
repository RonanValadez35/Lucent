import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@chakra-ui/react';

// Layouts
import MainLayout from './components/layouts/MainLayout';

// Page components
import Login from './pages/Login';
import Register from './pages/Register';
import SetupProfile from './pages/SetupProfile';
import Discover from './pages/Discover';
import Matches from './pages/Matches';
import Messages from './pages/Messages';
import Conversation from './pages/Conversation';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import NotFound from './pages/NotFound';

// Auth and protected routes
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <Box h="100%">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes that don't require completed profile */}
        <Route element={<ProtectedRoute />}>
          <Route path="/setup-profile" element={<SetupProfile />} />
        </Route>
        
        {/* Protected routes that require completed profile */}
        <Route element={<ProtectedRoute requireProfileCompleted={true} />}>
          <Route element={<MainLayout />}>
            <Route path="/discover" element={<Discover />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/conversation/:matchId" element={<Conversation />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/user-profile/:userId" element={<UserProfile />} />
          </Route>
        </Route>
        
        {/* Redirects */}
        <Route path="/" element={<Navigate to="/discover" replace />} />
        
        {/* Not found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Box>
  );
};

export default App; 