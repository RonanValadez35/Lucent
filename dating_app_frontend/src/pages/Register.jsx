import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  FormControl,
  FormLabel,
  Input, 
  VStack, 
  Heading, 
  Text, 
  Alert, 
  AlertIcon, 
  InputGroup,
  InputRightElement,
  IconButton,
  FormErrorMessage
} from '@chakra-ui/react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Register = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { register, currentUser } = useAuth();
  const navigate = useNavigate();
  
  // If already logged in, redirect to discover page
  if (currentUser) {
    return <Navigate to="/discover" replace />;
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!displayName || !email || !password || !confirmPassword) {
      setError('Please fill out all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      console.log('Starting registration process...');
      
      // Register using auth context
      const result = await register(email, password, displayName);
      console.log('Registration completed:', result);
      
      // Navigate to profile setup on success
      navigate('/setup-profile');
      
    } catch (err) {
      console.error('Registration error in component:', err);
      // Extract error message from API response if available
      let errorMessage = 'Failed to create an account.';
      if (err.response && err.response.data && err.response.data.error) {
        errorMessage += ' ' + err.response.data.error;
      } else if (err.message) {
        errorMessage += ' ' + err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box 
      bg="white" 
      minH="100vh" 
      py={12} 
      px={4}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <VStack spacing={8} w="full" maxW="md">
        {/* Header */}
        <VStack spacing={2} textAlign="center" mb={4}>
          <Heading size="xl" color="primary.500">Create Account</Heading>
          <Text fontSize="lg" color="gray.600">Join Lucent Dating today</Text>
        </VStack>
        
        {/* Error Alert */}
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        {/* Registration Form */}
        <VStack as="form" spacing={4} w="full" onSubmit={handleSubmit}>
          <FormControl id="displayName" isRequired>
            <FormLabel>Display Name</FormLabel>
            <Input 
              type="text"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              size="lg"
              borderRadius="md"
            />
          </FormControl>
          
          <FormControl id="email" isRequired>
            <FormLabel>Email</FormLabel>
            <Input 
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              size="lg"
              borderRadius="md"
            />
          </FormControl>
          
          <FormControl id="password" isRequired isInvalid={!!errors.password}>
            <FormLabel>Password</FormLabel>
            <InputGroup>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="lg"
                borderRadius="md"
                placeholder="Enter your password"
              />
              <InputRightElement h="full">
                <IconButton
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                  variant="ghost"
                  onClick={() => setShowPassword(!showPassword)}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors.password}</FormErrorMessage>
          </FormControl>
          
          <FormControl id="confirmPassword" isRequired>
            <FormLabel>Confirm Password</FormLabel>
            <Input 
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              size="lg"
              borderRadius="md"
            />
          </FormControl>
          
          <Button
            type="submit"
            size="lg"
            w="full"
            mt={4}
            colorScheme="red"
            isLoading={loading}
            loadingText="Creating Account"
            bg="primary.500"
            _hover={{ bg: 'primary.600' }}
          >
            Sign Up
          </Button>
        </VStack>
        
        {/* Login Link */}
        <Text fontSize="md">
          Already have an account?{' '}
          <Link to="/login">
            <Text as="span" color="primary.500" fontWeight="semibold">
              Sign In
            </Text>
          </Link>
        </Text>
      </VStack>
    </Box>
  );
};

export default Register; 