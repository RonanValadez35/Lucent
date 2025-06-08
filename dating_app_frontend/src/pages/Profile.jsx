import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Flex,
  Avatar,
  Badge,
  IconButton,
  Image,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Spinner,
  Center
} from '@chakra-ui/react';
import { FaSignOutAlt, FaCamera, FaEdit, FaTrash, FaImages } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { userProfile, signOut, fetchUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const navigate = useNavigate();
  const toast = useToast();
  
  useEffect(() => {
    fetchUserData();
  }, []);
  
  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await fetchUserProfile();
      
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Could not load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditProfile = () => {
    navigate('/setup-profile');
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
      toast({
        title: 'Error',
        description: 'Could not sign out. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Show loading spinner while fetching data
  if (loading && !userProfile) {
    return (
      <Center h="100%" p={4}>
        <Spinner size="xl" color="primary.500" thickness="4px" />
      </Center>
    );
  }
  
  // Show error message if failed to load
  if (error && !userProfile) {
    return (
      <Box p={4} h="100%">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button mt={4} onClick={fetchUserData} colorScheme="red">
          Try Again
        </Button>
      </Box>
    );
  }
  
  // Show empty state if no profile
  if (!userProfile) {
    return (
      <Center h="100%" p={4} flexDirection="column">
        <Alert status="warning" borderRadius="md" mb={4}>
          <AlertIcon />
          Profile data not available
        </Alert>
        <Button onClick={fetchUserData} colorScheme="red">
          Refresh
        </Button>
      </Center>
    );
  }
  
  return (
    <Box h="100%" bg="gray.50">
      {/* Profile Header */}
      <Box bg="white" p={4} mb={4} position="relative">
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
          
          <Flex mt={4} gap={4}>
            <Button
              leftIcon={<FaEdit />}
              onClick={handleEditProfile}
              colorScheme="red"
              size="sm"
              variant="outline"
            >
              Edit Profile
            </Button>
            
            <Button
              leftIcon={<FaSignOutAlt />}
              onClick={onOpen}
              colorScheme="gray"
              size="sm"
              variant="outline"
            >
              Sign Out
            </Button>
          </Flex>
        </Flex>
      </Box>
      
      {/* Profile Details */}
      <Tabs isFitted colorScheme="red" bg="white" mb={4}>
        <TabList>
          <Tab fontWeight="semibold">About</Tab>
          <Tab fontWeight="semibold">Photos</Tab>
          <Tab fontWeight="semibold">Preferences</Tab>
        </TabList>
        
        <TabPanels>
          {/* About Tab */}
          <TabPanel>
            <VStack align="start" spacing={4}>
              <Box w="full">
                <Heading size="sm" mb={2}>Bio</Heading>
                <Text>{userProfile.bio || 'No bio available'}</Text>
              </Box>
              
              <Box w="full">
                <Heading size="sm" mb={2}>Interests</Heading>
                {userProfile.interests && userProfile.interests.length > 0 ? (
                  <Flex flexWrap="wrap" gap={2}>
                    {userProfile.interests.map((interest, index) => (
                      <Badge key={index} colorScheme="red" px={2} py={1} borderRadius="full">
                        {interest}
                      </Badge>
                    ))}
                  </Flex>
                ) : (
                  <Text color="gray.500">No interests listed</Text>
                )}
              </Box>
            </VStack>
          </TabPanel>
          
          {/* Photos Tab */}
          <TabPanel>
            {userProfile.photos && userProfile.photos.length > 0 ? (
              <SimpleGrid columns={2} spacing={4}>
                {userProfile.photos.map((photo, index) => (
                  <Box
                    key={index}
                    borderRadius="md"
                    overflow="hidden"
                    boxShadow="sm"
                    position="relative"
                  >
                    <Image
                      src={photo}
                      alt={`Profile photo ${index + 1}`}
                      h="180px"
                      w="100%"
                      objectFit="cover"
                    />
                    {index === 0 && (
                      <Badge
                        position="absolute"
                        top={2}
                        left={2}
                        colorScheme="red"
                      >
                        Main Photo
                      </Badge>
                    )}
                  </Box>
                ))}
              </SimpleGrid>
            ) : (
              <Text color="gray.500">No photos available</Text>
            )}
          </TabPanel>
          
          {/* Preferences Tab */}
          <TabPanel>
            <VStack align="start" spacing={4}>
              {userProfile.preferences ? (
                <>
                  <Box w="full">
                    <Heading size="sm" mb={2}>Age Range</Heading>
                    <Text>{userProfile.preferences.age_min} - {userProfile.preferences.age_max} years</Text>
                  </Box>
                  
                  <Divider />
                  
                  <Box w="full">
                    <Heading size="sm" mb={2}>Looking For</Heading>
                    <Text textTransform="capitalize">{userProfile.preferences.gender || 'All'}</Text>
                  </Box>
                  
                  <Divider />
                  
                  <Box w="full">
                    <Heading size="sm" mb={2}>Distance</Heading>
                    <Text>Up to {userProfile.preferences.distance_max} km</Text>
                  </Box>
                </>
              ) : (
                <Text color="gray.500">No preferences set</Text>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* Sign Out Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Sign Out</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to sign out?
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleSignOut}>
              Sign Out
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Profile; 