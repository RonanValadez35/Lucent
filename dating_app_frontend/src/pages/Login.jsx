import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input, 
  VStack, 
  Heading, 
  Text, 
  Alert, 
  AlertIcon, 
  InputGroup,
  InputRightElement,
  IconButton,
  Flex,
  useToast
} from '@chakra-ui/react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { signIn, currentUser } = useAuth();
  const navigate = useNavigate();
  
  // If already logged in, redirect to discover page
  if (currentUser) {
    return <Navigate to="/discover" replace />;
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Sign in using auth context
      await signIn(email, password);
      
      // Navigate to discover page on success
      navigate('/discover');
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to sign in. Please check your credentials.');
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
        <VStack spacing={2} textAlign="center" mb={8}>
          <Heading size="xl" color="primary.500">Lucent Dating</Heading>
          <Text fontSize="lg" color="gray.600">Find your perfect match</Text>
        </VStack>
        
        {/* Error Alert */}
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        {/* Login Form */}
        <VStack as="form" spacing={4} w="full" onSubmit={handleSubmit}>
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
          
          <FormControl id="password" isInvalid={!!error}>
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
            <FormErrorMessage>{error}</FormErrorMessage>
          </FormControl>
          
          <Button
            type="submit"
            size="lg"
            w="full"
            mt={4}
            colorScheme="red"
            isLoading={loading}
            loadingText="Signing in"
            bg="primary.500"
            _hover={{ bg: 'primary.600' }}
          >
            Sign In
          </Button>
        </VStack>
        
        {/* Register Link */}
        <Text fontSize="md">
          Don't have an account?{' '}
          <Link to="/register">
            <Text as="span" color="primary.500" fontWeight="semibold">
              Sign Up
            </Text>
          </Link>
        </Text>
      </VStack>
    </Box>
  );
};

export default Login;