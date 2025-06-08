import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Flex,
  Avatar,
  Badge,
  IconButton,
  Image,
  SimpleGrid,
  Divider,
  Button,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { profilesAPI } from '../services/api';
import UserRating from '../components/UserRating';
import UserComments from '../components/UserComments';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ratingRef = useRef(null);
  
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchUserProfile();
  }, [userId]);
  
  // Scroll to rating section if coming from a "Rate" button click
  useEffect(() => {
    // Check if we need to scroll to rating section
    if (!loading && location.state?.scrollToRating && ratingRef.current) {
      // Add a short delay to ensure the component is fully rendered
      setTimeout(() => {
        ratingRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [loading, location.state]);
  
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await profilesAPI.getUserProfile(userId);
      
      if (response.data) {
        setUserProfile(response.data);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Could not load this user profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Show loading spinner while fetching data
  if (loading) {
    return (
      <Center h="100%" p={4}>
        <Spinner size="xl" color="primary.500" thickness="4px" />
      </Center>
    );
  }
  
  // Show error message if failed to load
  if (error || !userProfile) {
    return (
      <Box p={4} h="100%">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error || 'User profile not found'}</AlertDescription>
        </Alert>
        <Button mt={4} leftIcon={<FaArrowLeft />} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }
  
  return (
    <Box h="100%" bg="gray.50" position="relative" overflow="auto">
      {/* Header with back button */}
      <Box 
        position="sticky"
        top="0"
        bg="white"
        p={4}
        zIndex="10"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Flex align="center">
          <IconButton
            icon={<FaArrowLeft />}
            aria-label="Go back"
            variant="ghost"
            mr={3}
            onClick={() => navigate(-1)}
          />
          <Heading size="md">Profile</Heading>
        </Flex>
      </Box>
      
      {/* Main Content */}
      <Box p={4} pb="80px">
        {/* Profile Header */}
        <Box bg="white" p={4} mb={4} borderRadius="md" boxShadow="sm">
          <Flex direction="column" align="center">
            <Avatar 
              size="xl" 
              src={userProfile.photos?.[0] || ''} 
              name={userProfile.display_name} 
              mb={4}
              border="3px solid"
              borderColor="primary.500"
            />
            
            <Heading size="lg">{userProfile.display_name}</Heading>
            
            <Badge colorScheme="red" mt={2}>
              {userProfile.age} years old
            </Badge>
            
            {userProfile.location && (
              <Text fontSize="sm" color="gray.600" mt={2}>
                {userProfile.location.city}, {userProfile.location.country}
              </Text>
            )}
            
            {/* Display compact rating in profile header */}
            <Box mt={2}>
              <UserRating 
                userId={userId} 
                readOnly={true} 
                compact={true} 
                showDetails={false}
              />
            </Box>
          </Flex>
        </Box>
        
        {/* Bio Section */}
        <Box bg="white" p={4} mb={4} borderRadius="md" boxShadow="sm">
          <Heading size="md" mb={3}>Bio</Heading>
          <Text>{userProfile.bio || 'No bio available'}</Text>
        </Box>
        
        {/* Interests Section */}
        {userProfile.interests && userProfile.interests.length > 0 && (
          <Box bg="white" p={4} mb={4} borderRadius="md" boxShadow="sm">
            <Heading size="md" mb={3}>Interests</Heading>
            <Flex flexWrap="wrap" gap={2}>
              {userProfile.interests.map((interest, index) => (
                <Badge key={index} colorScheme="red" px={2} py={1} borderRadius="full">
                  {interest}
                </Badge>
              ))}
            </Flex>
          </Box>
        )}
        
        {/* User Rating Section - add ref for scrolling */}
        <Box ref={ratingRef} bg="white" p={4} mb={4} borderRadius="md" boxShadow="sm">
          <Heading size="md" mb={3}>Ratings</Heading>
          <UserRating userId={userId} readOnly={true} showDetails={true} />
        </Box>
        
        {/* User Comments Section */}
        <UserComments userId={userId} />
        
        {/* Photos Section */}
        {userProfile.photos && userProfile.photos.length > 0 && (
          <Box bg="white" p={4} mb={4} borderRadius="md" boxShadow="sm">
            <Heading size="md" mb={3}>Photos</Heading>
            <SimpleGrid columns={2} spacing={4}>
              {userProfile.photos.map((photo, index) => (
                <Box
                  key={index}
                  borderRadius="md"
                  overflow="hidden"
                  boxShadow="sm"
                >
                  <Image
                    src={photo}
                    alt={`${userProfile.display_name}'s photo ${index + 1}`}
                    h="180px"
                    w="100%"
                    objectFit="cover"
                  />
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}
        
        {/* Additional Info Section */}
        <Box bg="white" p={4} borderRadius="md" boxShadow="sm">
          <Heading size="md" mb={3}>Details</Heading>
          <VStack align="start" spacing={3} divider={<Divider />}>
            {userProfile.height && (
              <Flex justify="space-between" w="100%">
                <Text fontWeight="bold">Height</Text>
                <Text>{userProfile.height} cm</Text>
              </Flex>
            )}
            
            {userProfile.education && (
              <Flex justify="space-between" w="100%">
                <Text fontWeight="bold">Education</Text>
                <Text>{userProfile.education}</Text>
              </Flex>
            )}
            
            {userProfile.job_title && (
              <Flex justify="space-between" w="100%">
                <Text fontWeight="bold">Job</Text>
                <Text>{userProfile.job_title}</Text>
              </Flex>
            )}
            
            {userProfile.drinking && (
              <Flex justify="space-between" w="100%">
                <Text fontWeight="bold">Drinking</Text>
                <Text>{userProfile.drinking}</Text>
              </Flex>
            )}
            
            {userProfile.smoking && (
              <Flex justify="space-between" w="100%">
                <Text fontWeight="bold">Smoking</Text>
                <Text>{userProfile.smoking}</Text>
              </Flex>
            )}
            
            {userProfile.looking_for && (
              <Flex justify="space-between" w="100%">
                <Text fontWeight="bold">Looking for</Text>
                <Text>{userProfile.looking_for}</Text>
              </Flex>
            )}
          </VStack>
        </Box>
      </Box>
    </Box>
  );
};

export default UserProfile; 