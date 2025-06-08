import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Flex,
  Avatar,
  Divider,
  Badge,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  useColorModeValue,
  IconButton,
  Tooltip,
  useToast
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { messagesAPI } from '../services/api';
import { FaComment, FaStar } from 'react-icons/fa';
import UserRating from '../components/UserRating';
import RatingModal from '../components/RatingModal';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const navigate = useNavigate();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const toast = useToast();
  
  useEffect(() => {
    fetchConversations();
  }, []);
  
  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await messagesAPI.getConversations();
      
      if (response.data) {
        // Remove any potential duplicates by creating a map keyed by match_id
        const uniqueConvoMap = new Map();
        response.data.forEach(convo => {
          // Only add if this match_id doesn't exist yet, or replace with newer data
          if (!uniqueConvoMap.has(convo.match_id) || 
              (convo.last_message_at && convo.last_message_at > uniqueConvoMap.get(convo.match_id).last_message_at)) {
            uniqueConvoMap.set(convo.match_id, convo);
          }
        });
        
        // Convert back to array and sort by most recent message
        const uniqueConversations = Array.from(uniqueConvoMap.values())
          .sort((a, b) => {
            // Sort by last_message_at (most recent first)
            const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return timeB - timeA;
          });
        
        setConversations(uniqueConversations);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Could not load conversations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRateUser = (user, e) => {
    e.stopPropagation(); // Prevent navigating to conversation
    setSelectedUser(user);
    setRatingModalOpen(true);
  };
  
  const handleRatingComplete = (updatedRating) => {
    // Instead of fetching all conversations again, just update the UI directly
    if (selectedUser && updatedRating) {
      // Create a shallow copy of conversations
      const updatedConversations = conversations.map(convo => {
        if (convo.other_user.uid === selectedUser.uid) {
          // Create a new copy of the other_user object
          const updatedUser = { ...convo.other_user };
          
          // If this user didn't have any ratings before, initialize the average_rating object
          if (!updatedUser.average_rating) {
            updatedUser.average_rating = {
              overall: updatedRating.overall,
              personality: updatedRating.personality,
              reliability: updatedRating.reliability,
              communication: updatedRating.communication,
              authenticity: updatedRating.authenticity,
              rating_count: 1
            };
          } else {
            // Update the user's average_rating (this is an approximation)
            const currentCount = updatedUser.average_rating.rating_count || 0;
            updatedUser.average_rating = {
              ...updatedUser.average_rating,
              overall: updatedRating.overall, // Just show the user's latest rating
              rating_count: currentCount + 1
            };
          }
          
          return {
            ...convo,
            other_user: updatedUser
          };
        }
        return convo;
      });
      
      setConversations(updatedConversations);
      
      // Show success message
      toast({
        title: 'Rating updated',
        description: 'Your rating has been saved successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    }
    
    // Close the modal
    setRatingModalOpen(false);
    setSelectedUser(null);
  };
  
  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // Same day
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Within last week
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Older
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  // Navigate to conversation
  const goToConversation = (matchId) => {
    navigate(`/conversation/${matchId}`);
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
  if (error) {
    return (
      <Box p={4} h="100%">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }
  
  return (
    <>
      <Box h="100%" bg="gray.50">
        <Box bg={bgColor} p={4} borderBottom="1px solid" borderColor={borderColor} position="sticky" top="0" zIndex="1">
          <Heading size="md" textAlign="center">Messages</Heading>
        </Box>
        
        {conversations.length === 0 ? (
          <Center py={16} px={4} flexDirection="column">
            <Box rounded="full" bg="gray.100" p={4} mb={4}>
              <FaComment size={32} color="#CBD5E0" />
            </Box>
            <Heading size="md" mb={2} textAlign="center">No messages yet</Heading>
            <Text textAlign="center" color="gray.500">
              When you start conversations with your matches, they'll appear here
            </Text>
          </Center>
        ) : (
          <VStack spacing={0} w="full" align="stretch" divider={<Divider />}>
            {conversations.map((convo) => (
              <Flex
                key={convo.match_id}
                p={4}
                align="center"
                bg={bgColor}
                onClick={() => goToConversation(convo.match_id)}
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
              >
                <Avatar 
                  size="md" 
                  src={convo.other_user.photos?.[0] || ''} 
                  name={convo.other_user.display_name} 
                  mr={4}
                  cursor="pointer"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent bubbling to parent onClick
                    navigate(`/user-profile/${convo.other_user.uid}`);
                  }}
                />
                
                <Box flex="1">
                  <Flex justify="space-between" align="center">
                    <Heading size="sm">{convo.other_user.display_name}</Heading>
                    {convo.last_message && (
                      <Text fontSize="xs" color="gray.500">
                        {formatDate(convo.last_message.created_at)}
                      </Text>
                    )}
                  </Flex>
                  
                  {/* User rating */}
                  <Flex align="center" mt={1} mb={1} justify="space-between">
                    <UserRating 
                      userId={convo.other_user.uid} 
                      readOnly={true} 
                      compact={true} 
                      showDetails={false}
                      preloadedRating={convo.other_user.average_rating}
                    />
                    <Tooltip label="Rate this user" placement="top">
                      <IconButton
                        icon={<FaStar />}
                        size="xs"
                        colorScheme="yellow"
                        variant="outline"
                        aria-label="Rate this user"
                        onClick={(e) => handleRateUser(convo.other_user, e)}
                      />
                    </Tooltip>
                  </Flex>
                  
                  {convo.last_message ? (
                    <Text fontSize="sm" color="gray.600" noOfLines={1}>
                      {convo.last_message.content}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="gray.500" fontStyle="italic">
                      No messages yet
                    </Text>
                  )}
                </Box>
                
                {convo.unread_count > 0 && (
                  <Badge ml={2} colorScheme="red" borderRadius="full">
                    {convo.unread_count}
                  </Badge>
                )}
              </Flex>
            ))}
          </VStack>
        )}
      </Box>
      
      {/* Rating Modal */}
      {selectedUser && (
        <RatingModal
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
          userId={selectedUser.uid}
          userName={selectedUser.display_name}
          onRatingComplete={handleRatingComplete}
          preloadedRating={selectedUser.average_rating}
        />
      )}
    </>
  );
};

export default Messages; 