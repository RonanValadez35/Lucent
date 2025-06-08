import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  Text,
  Heading,
  Button,
  Flex,
  IconButton,
  useToast,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Image,
  Avatar,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import { FaHeart, FaTimes, FaInfo, FaArrowUp } from 'react-icons/fa';
import { profilesAPI, matchesAPI, ratingsAPI } from '../services/api';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import UserRating from '../components/UserRating';
import UserComments from '../components/UserComments';
import { AnimatePresence } from 'framer-motion';

const Discover = () => {
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchPopup, setMatchPopup] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const toast = useToast();
  
  // Motion values for swipe effect
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const rotateValue = useTransform(dragX, [-200, 0, 200], [-10, 0, 10]);
  const cardOpacity = useTransform(dragX, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(dragX, [0, 100, 200], [0, 0.5, 1]);
  const nopeOpacity = useTransform(dragX, [-200, -100, 0], [1, 0.5, 0]);
  const infoOpacity = useTransform(dragY, [0, -100, -200], [0, 0.5, 1]);
  
  const cardConstraints = {
    top: -300,
    bottom: 0,
    left: -300,
    right: 300
  };
  
  // Store disliked profile UIDs in state and localStorage
  const [dislikedProfiles, setDislikedProfiles] = useState(() => {
    // Initialize from localStorage on component mount
    const stored = localStorage.getItem(`disliked_profiles_${currentUser?.uid}`);
    return stored ? JSON.parse(stored) : [];
  });
  
  // Store liked profile UIDs to also filter them out
  const [likedProfiles, setLikedProfiles] = useState(() => {
    // Initialize from localStorage on component mount
    const stored = localStorage.getItem(`liked_profiles_${currentUser?.uid}`);
    return stored ? JSON.parse(stored) : [];
  });
  
  // Store matched profile UIDs
  const [matchedProfiles, setMatchedProfiles] = useState([]);
  
  // Update localStorage whenever dislikedProfiles changes
  useEffect(() => {
    if (currentUser?.uid) {
      localStorage.setItem(`disliked_profiles_${currentUser.uid}`, JSON.stringify(dislikedProfiles));
    }
  }, [dislikedProfiles, currentUser]);
  
  // Update localStorage whenever likedProfiles changes
  useEffect(() => {
    if (currentUser?.uid) {
      localStorage.setItem(`liked_profiles_${currentUser.uid}`, JSON.stringify(likedProfiles));
    }
  }, [likedProfiles, currentUser]);
  
  // Fetch all matches to filter them out from discover
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await matchesAPI.getMatches();
        if (response.data && Array.isArray(response.data)) {
          // Extract UIDs from match profiles
          const matchUids = response.data.map(match => match.match_profile?.uid).filter(Boolean);
          console.log('Filtering out matched profiles:', matchUids);
          setMatchedProfiles(matchUids);
        }
      } catch (err) {
        console.error('Error fetching matches:', err);
      }
    };
    
    fetchMatches();
  }, []);
  
  // Fetch profiles
  useEffect(() => {
    fetchProfiles();
  }, [matchedProfiles]); // Refetch when matches list changes
  
  const fetchProfiles = async (skipFilter = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await profilesAPI.discoverProfiles();
      
      if (response.data) {
        console.log('Profiles data:', response.data);
        
        // Filter out any profiles that were previously disliked, liked, or matched
        // Skip filtering if skipFilter is true
        const filteredProfiles = skipFilter 
          ? response.data 
          : response.data.filter(
              profile => !dislikedProfiles.includes(profile.uid) && 
                        !likedProfiles.includes(profile.uid) &&
                        !matchedProfiles.includes(profile.uid)
            );
        
        console.log('Filtered profiles count:', filteredProfiles.length);
        
        // Use the filtered profiles
        setProfiles(filteredProfiles);
        
        // Reset currentIndex when fetching new profiles
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Could not load profiles. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle swipe-like
  const handleLike = async () => {
    if (currentIndex >= profiles.length) return;
    
    const profile = profiles[currentIndex];
    
    try {
      console.log('Liking profile with UID:', profile.uid);
      
      // Make sure we have a valid UID
      if (!profile.uid) {
        throw new Error("Invalid profile UID");
      }
      
      const response = await matchesAPI.likeProfile(profile.uid);
      
      // Add to liked profiles so we don't show them again
      setLikedProfiles(prev => [...prev, profile.uid]);
      
      console.log('Like response:', response.data);
      
      if (response.data && response.data.is_match === true) {
        console.log('MATCH DETECTED! Showing match popup for', profile.display_name);
        
        // Add to matched profiles list
        setMatchedProfiles(prev => [...prev, profile.uid]);
        
        // Show match notification with setTimeout to ensure it's rendered after state updates
        setTimeout(() => {
          console.log('Setting matchPopup state to:', profile);
          setMatchPopup(profile);
        }, 300);
        
        // Don't move to next profile immediately when there's a match
        return;
      } else {
        console.log('No match yet. Normal like processed.');
        toast({
          title: "Liked!",
          description: "You liked " + profile.display_name,
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
      
      // Move to next profile
      setCurrentIndex(prevIndex => prevIndex + 1);
      dragX.set(0);
      dragY.set(0);
      
    } catch (err) {
      console.error('Error liking profile:', err);
      toast({
        title: "Error",
        description: "Couldn't process your like. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Handle swipe-dislike
  const handleDislike = async () => {
    if (currentIndex >= profiles.length) return;
    
    const profile = profiles[currentIndex];
    
    try {
      console.log('Disliking profile with UID:', profile.uid);
      
      // Make sure we have a valid UID
      if (!profile.uid) {
        throw new Error("Invalid profile UID");
      }
      
      await matchesAPI.dislikeProfile(profile.uid);
      
      // Add to disliked profiles so we don't show them again
      setDislikedProfiles(prev => [...prev, profile.uid]);
      
      // Move to next profile
      setCurrentIndex(prevIndex => prevIndex + 1);
      dragX.set(0);
      dragY.set(0);
      
    } catch (err) {
      console.error('Error disliking profile:', err);
      toast({
        title: "Error",
        description: "Couldn't process your dislike. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Handle info view
  const handleInfo = () => {
    if (currentIndex >= profiles.length) return;
    
    const profile = profiles[currentIndex];
    
    // Open the profile details modal
    onOpen();
  };
  
  // Handle drag end (user releases card after dragging)
  const handleDragEnd = (event, info) => {
    const swipeThreshold = 150; // Increased threshold for more definitive swipes
    
    if (info.offset.x > swipeThreshold) {
      // Swiped right - Like
      handleLike();
    } else if (info.offset.x < -swipeThreshold) {
      // Swiped left - Dislike
      handleDislike();
    } else if (info.offset.y < -swipeThreshold) {
      // Swiped up - Info
      handleInfo();
    }
    // No need for else - dragSnapToOrigin will handle returning to center
  };
  
  // Add effect to fetch more profiles when running low
  useEffect(() => {
    // If we're down to the last profile, fetch more
    if (profiles.length > 0 && currentIndex >= profiles.length - 1) {
      fetchProfiles();
    }
  }, [currentIndex]);
  
  // Add effect to reset drag position when currentIndex changes
  useEffect(() => {
    // Reset position when moving to a new profile
    dragX.set(0);
    dragY.set(0);
    
    // Log the current profile to help with debugging
    if (profiles[currentIndex]) {
      console.log('Switched to profile:', profiles[currentIndex].display_name);
    }
  }, [currentIndex, profiles]);
  
  // Add effect to log when matchPopup changes
  useEffect(() => {
    if (matchPopup) {
      console.log('🎉 Match popup active for:', matchPopup.display_name);
    }
  }, [matchPopup]);
  
  // Clear all disliked profiles function (for debugging/testing)
  const clearDislikedProfiles = async () => {
    try {
      setLoading(true);
      
      // First get all matches
      const response = await matchesAPI.getMatches();
      
      if (response.data && Array.isArray(response.data)) {
        // Unmatch all existing matches
        const unmatchPromises = response.data.map(match => 
          matchesAPI.unmatch(match.match_id)
        );
        
        // Wait for all unmatches to complete
        await Promise.all(unmatchPromises);
        console.log('Unmatched all existing matches');
      }
      
      // Clear likes (both ways)
      try {
        // This will clear all likes TO and FROM this user
        await matchesAPI.clearAllLikes();
        console.log('Cleared all likes');
      } catch (err) {
        console.error('Error clearing likes:', err);
        throw err;
      }
      
      // Clear all ratings
      try {
        await ratingsAPI.clearAllRatings();
        console.log('Cleared all ratings');
      } catch (err) {
        console.error('Error clearing ratings:', err);
        // Don't throw here, we can continue even if ratings fail
      }
      
      // Clear local state
      setDislikedProfiles([]);
      setLikedProfiles([]);
      setMatchedProfiles([]);
      
      // Clear localStorage
      localStorage.removeItem(`disliked_profiles_${currentUser?.uid}`);
      localStorage.removeItem(`liked_profiles_${currentUser?.uid}`);
      
      // Fetch profiles with skipFilter=true to ignore the dislikedProfiles state
      // that hasn't been updated in the state yet
      fetchProfiles(true);
      
      toast({
        title: "Profile history cleared",
        description: "Your likes, matches, and ratings have been reset. You can now rediscover profiles you previously passed on, and you'll still match with anyone who previously liked you!",
        status: "info",
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error clearing profile history:', err);
      toast({
        title: "Error",
        description: "Could not completely reset your profile history. Some matches, likes, or ratings may remain.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Show loading spinner while fetching profiles
  if (loading) {
    return (
      <Center h="100%" p={4}>
        <Spinner size="xl" color="primary.500" thickness="4px" />
      </Center>
    );
  }
  
  // Show error message if failed to load profiles
  if (error) {
    return (
      <Box p={4} h="100%">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button mt={4} onClick={fetchProfiles} colorScheme="red">
          Try Again
        </Button>
      </Box>
    );
  }
  
  // Show empty state if no more profiles
  if (profiles.length === 0 || currentIndex >= profiles.length) {
    return (
      <Center h="100%" p={4} flexDirection="column">
        <Heading size="lg" mb={4} textAlign="center">No More Profiles</Heading>
        <Text textAlign="center" mb={6}>
          There are no more profiles to discover right now. Check back later!
        </Text>
        <Flex gap={3} direction="column" align="center">
          <Button onClick={() => { setCurrentIndex(0); fetchProfiles(); }} colorScheme="red">
            Refresh
          </Button>
          <Button 
            onClick={clearDislikedProfiles} 
            colorScheme="gray" 
            size="sm"
            isLoading={loading}
            loadingText="Resetting..."
          >
            Reset History
          </Button>
        </Flex>
      </Center>
    );
  }
  
  const currentProfile = profiles[currentIndex];
  
  // Get the actual profile photo URL
  const photoUrl = currentProfile?.photos?.[0] || null;
  console.log('Profile photo URL:', photoUrl);
  console.log('Full profile data:', currentProfile);
  
  return (
    <Box h="100vh" position="relative" overflow="hidden">
      {/* Match Popup */}
      {matchPopup && (
        <Box
          position="fixed" 
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0,0,0,0.85)"
          zIndex="9999"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          p={4}
          backdropFilter="blur(8px)"
        >
          <Box 
            bg="rgba(0,0,0,0.7)" 
            p={8} 
            borderRadius="xl" 
            boxShadow="0 0 20px rgba(255,59,48,0.6)" 
            border="3px solid"
            borderColor="red.500"
            maxW="400px"
            w="100%"
            textAlign="center"
          >
            <Heading color="white" mb={4} textAlign="center">
              It's a Match!
            </Heading>
            
            <Flex justify="center" mb={6}>
              <Box position="relative" mr="-20px">
                <Avatar 
                  size="xl" 
                  name={currentUser?.displayName} 
                  src={currentUser?.photoURL}
                  border="3px solid"
                  borderColor="red.500"
                />
              </Box>
              <Box position="relative">
                <Avatar 
                  size="xl" 
                  name={matchPopup.display_name} 
                  src={matchPopup.photos?.[0]}
                  border="3px solid"
                  borderColor="red.500"
                />
              </Box>
            </Flex>
            
            <Text color="white" fontSize="xl" mb={8} textAlign="center">
              You and {matchPopup.display_name} liked each other
            </Text>
            
            <Flex gap={4} justifyContent="center">
              <Button
                colorScheme="gray"
                onClick={() => {
                  console.log('Closing match popup');
                  setMatchPopup(null);
                  // Move to next profile after closing match popup
                  setCurrentIndex(prevIndex => prevIndex + 1);
                  dragX.set(0);
                  dragY.set(0);
                }}
              >
                Keep Swiping
              </Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  setMatchPopup(null);
                  // Navigate to matches page
                  navigate('/matches');
                  // Reset card position
                  dragX.set(0);
                  dragY.set(0);
                }}
              >
                View Matches
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
      
      {/* Profile Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay backdropFilter="blur(10px)" />
        <ModalContent maxW="90%" h="80%" overflow="hidden" borderRadius="lg">
          <ModalCloseButton color="white" bg="rgba(0,0,0,0.3)" zIndex="10" />
          <ModalBody p={0} position="relative" overflow="auto">
            <Box position="relative" h="50%" minH="300px">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={`${currentProfile.display_name}'s photo`}
                  objectFit="cover"
                  w="100%"
                  h="100%"
                  fallbackSrc="https://via.placeholder.com/400?text=No+Photo"
                />
              ) : (
                <Center h="100%" bg="gray.100">
                  <Avatar 
                    size="2xl" 
                    name={currentProfile.display_name} 
                    bg="red.500" 
                  />
                </Center>
              )}
              
              {/* Gradient overlay */}
              <Box 
                position="absolute" 
                bottom="0" 
                left="0" 
                right="0"
                h="80px"
                bgGradient="linear(to-t, blackAlpha.700, transparent)"
              />
            </Box>
            
            <Box p={6}>
              <Heading size="xl">
                {currentProfile.display_name}, {currentProfile.age}
              </Heading>
              
              {currentProfile.location && (
                <Text fontSize="md" mt={1} color="gray.600">
                  {currentProfile.location.city}, {currentProfile.location.country}
                </Text>
              )}
              
              {/* Job & Education */}
              {(currentProfile.job_title || currentProfile.education) && (
                <Flex mt={4} flexDirection="column" gap={1}>
                  {currentProfile.job_title && (
                    <Text fontWeight="medium">
                      {currentProfile.job_title}
                    </Text>
                  )}
                  
                  {currentProfile.education && (
                    <Text color="gray.600">
                      {currentProfile.education}
                    </Text>
                  )}
                </Flex>
              )}
              
              {/* Bio - full version */}
              {currentProfile.bio && (
                <Box mt={6}>
                  <Heading size="md" mb={2}>About me</Heading>
                  <Text>{currentProfile.bio}</Text>
                </Box>
              )}
              
              {/* User Rating */}
              <Box mt={6}>
                <Heading size="md" mb={3}>Rating</Heading>
                <UserRating 
                  userId={currentProfile.uid} 
                  readOnly={true} 
                  showDetails={true}
                />
              </Box>
              
              {/* Interests */}
              {currentProfile.interests && currentProfile.interests.length > 0 && (
                <Box mt={6}>
                  <Heading size="md" mb={3}>Interests</Heading>
                  <Flex flexWrap="wrap" gap={2}>
                    {currentProfile.interests.map((interest, index) => (
                      <Box
                        key={index}
                        bg="red.100"
                        color="red.800"
                        px={3}
                        py={1}
                        borderRadius="full"
                        fontSize="sm"
                      >
                        {interest}
                      </Box>
                    ))}
                  </Flex>
                </Box>
              )}
              
              {/* Additional profile attributes can be displayed here */}
              <Box mt={6}>
                <Heading size="md" mb={3}>Details</Heading>
                <Flex flexWrap="wrap" gap={6}>
                  {currentProfile.height && (
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" color="gray.500">Height</Text>
                      <Text>{currentProfile.height} cm</Text>
                    </Box>
                  )}
                  
                  {currentProfile.drinking && (
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" color="gray.500">Drinking</Text>
                      <Text>{currentProfile.drinking}</Text>
                    </Box>
                  )}
                  
                  {currentProfile.smoking && (
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" color="gray.500">Smoking</Text>
                      <Text>{currentProfile.smoking}</Text>
                    </Box>
                  )}
                  
                  {currentProfile.looking_for && (
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" color="gray.500">Looking for</Text>
                      <Text>{currentProfile.looking_for}</Text>
                    </Box>
                  )}
                  
                  {!currentProfile.height && !currentProfile.drinking && 
                   !currentProfile.smoking && !currentProfile.looking_for && (
                    <Text color="gray.500">No details provided</Text>
                  )}
                </Flex>
              </Box>
              
              {/* What Others Have Said Section */}
              <UserComments userId={currentProfile.uid} />
            </Box>
          </ModalBody>
          <ModalFooter bg="white" borderTop="1px solid" borderColor="gray.100">
            <Button colorScheme="gray" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button colorScheme="red" onClick={() => { onClose(); handleLike(); }}>
              Like
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Swipe instructions */}
      <Box 
        position="absolute" 
        top="10px" 
        left="0" 
        right="0" 
        textAlign="center" 
        color="gray.500"
        fontSize="sm"
        zIndex="1"
      >
        Swipe left to dislike, right to like, up for details
      </Box>
      
      {/* Profile Card */}
      <Box
        position="absolute"
        top="40px"
        left="0"
        right="0"
        bottom="0"
        p={4}
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <motion.div
          key={`profile-${currentProfile?.uid || currentIndex}`}
          className="swipe-card"
          drag={true}
          dragSnapToOrigin={true}
          dragConstraints={cardConstraints}
          style={{
            x: dragX,
            y: dragY,
            rotate: rotateValue,
            opacity: cardOpacity,
            width: '100%',
            height: '90%',
            maxWidth: '600px',
            position: 'relative',
            touchAction: 'none'
          }}
          onDragEnd={handleDragEnd}
          whileDrag={{ cursor: 'grabbing', scale: 1.01 }}
          dragElastic={0.6}
          dragTransition={{ 
            bounceStiffness: 400, 
            bounceDamping: 40
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            h="100%"
            w="100%"
            borderRadius="lg"
            overflow="hidden"
            position="relative"
            boxShadow="lg"
            bg="gray.100"
          >
            {/* Profile Image Display */}
            <Box 
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              overflow="hidden"
            >
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt="Profile photo"
                  w="100%"
                  h="100%"
                  objectFit="cover"
                  objectPosition="center"
                  fallbackSrc="https://via.placeholder.com/400?text=No+Photo"
                  draggable="false"
                />
              ) : (
                <Center 
                  position="absolute"
                  top="0"
                  left="0"
                  right="0"
                  bottom="0"
                  bg="gray.200"
                >
                  <Avatar 
                    size="2xl" 
                    name={currentProfile.display_name} 
                    bg="red.500"
                    draggable="false"
                  />
                </Center>
              )}
            </Box>
            
            {/* Swipe indicators */}
            <Box
              position="absolute"
              top="40px"
              right="40px"
              transform="rotate(30deg)"
              zIndex="1"
              pointerEvents="none"
            >
              <motion.div style={{ opacity: likeOpacity }}>
                <Box
                  px={6}
                  py={2}
                  bg="green.500"
                  color="white"
                  fontWeight="bold"
                  fontSize="2xl"
                  border="4px solid"
                  borderColor="white"
                  borderRadius="lg"
                >
                  LIKE
                </Box>
              </motion.div>
            </Box>
            
            <Box
              position="absolute"
              top="40px"
              left="40px"
              transform="rotate(-30deg)"
              zIndex="1"
              pointerEvents="none"
            >
              <motion.div style={{ opacity: nopeOpacity }}>
                <Box
                  px={6}
                  py={2}
                  bg="red.500"
                  color="white"
                  fontWeight="bold"
                  fontSize="2xl"
                  border="4px solid"
                  borderColor="white"
                  borderRadius="lg"
                >
                  NOPE
                </Box>
              </motion.div>
            </Box>
            
            <Box
              position="absolute"
              top="40px"
              left="0"
              right="0"
              display="flex"
              justifyContent="center"
              zIndex="1"
              pointerEvents="none"
            >
              <motion.div style={{ opacity: infoOpacity }}>
                <Box
                  px={6}
                  py={2}
                  bg="blue.500"
                  color="white"
                  fontWeight="bold"
                  fontSize="2xl"
                  border="4px solid"
                  borderColor="white"
                  borderRadius="lg"
                >
                  INFO
                </Box>
              </motion.div>
            </Box>
            
            {/* Overlay for gradient effect and text */}
            <Box
              position="absolute"
              bottom="0"
              left="0"
              right="0"
              p={6}
              bg="linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))"
              color="white"
              zIndex="1"
              pointerEvents="none"
            >
              <Heading size="xl">
                {currentProfile.display_name}, {currentProfile.age}
              </Heading>
              
              {currentProfile.location && (
                <Text fontSize="md" mt={1}>
                  {currentProfile.location.city}, {currentProfile.location.country}
                </Text>
              )}
              
              {/* User rating */}
              <Box mt={2}>
                <UserRating 
                  userId={currentProfile.uid} 
                  readOnly={true} 
                  compact={true} 
                  showDetails={false}
                />
              </Box>
              
              {/* Bio */}
              <Text fontSize="md" mt={4} noOfLines={2}>
                {currentProfile.bio}
              </Text>
              
              {/* Interests */}
              {currentProfile.interests && currentProfile.interests.length > 0 && (
                <Flex flexWrap="wrap" gap={2} mt={3}>
                  {currentProfile.interests.map((interest, index) => (
                    <Box
                      key={index}
                      bg="rgba(255,255,255,0.2)"
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="xs"
                    >
                      {interest}
                    </Box>
                  ))}
                </Flex>
              )}
            </Box>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Discover; 