import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Image,
  Button,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  SimpleGrid,
  useToast,
  IconButton
} from '@chakra-ui/react';
import { matchesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import UserRating from '../components/UserRating';
import RatingModal from '../components/RatingModal';
import { FaStar } from 'react-icons/fa';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingJustUpdated, setRatingJustUpdated] = useState(false);
  
  const navigate = useNavigate();
  const toast = useToast();
  
  useEffect(() => {
    fetchMatches();
  }, []);
  
  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const matchesResponse = await matchesAPI.getMatches();
      if (matchesResponse.data) {
        console.log('Matches data:', matchesResponse.data);
        setMatches(matchesResponse.data);
      }
      
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Could not load your matches. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUnmatch = async (matchId) => {
    try {
      await matchesAPI.unmatch(matchId);
      
      // Remove match from state
      setMatches(matches.filter(match => match.match_id !== matchId));
      
      toast({
        title: 'Match removed',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error unmatching:', err);
      toast({
        title: 'Could not unmatch',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleMessageMatch = (matchId) => {
    navigate(`/conversation/${matchId}`);
  };
  
  const handleRateUser = (match) => {
    setSelectedMatch(match);
    setIsRatingModalOpen(true);
  };
  
  const handleRatingComplete = (updatedRating) => {
    if (!selectedMatch) return;
    
    // Create a shallow copy of the matches array
    const updatedMatches = [...matches];
    
    // Find the index of the match that was rated
    const matchIndex = updatedMatches.findIndex(m => m.match_id === selectedMatch.match_id);
    
    if (matchIndex !== -1) {
      // Create a shallow copy of the match object
      const updatedMatch = { ...updatedMatches[matchIndex] };
      
      // If this user didn't have any ratings before, initialize the average_rating object
      if (!updatedMatch.average_rating) {
        updatedMatch.average_rating = {
          overall: updatedRating.overall,
          personality: updatedRating.personality,
          reliability: updatedRating.reliability,
          communication: updatedRating.communication,
          authenticity: updatedRating.authenticity,
          rating_count: 1
        };
      } else {
        // Update the match's average_rating (this is an approximation)
        const currentCount = updatedMatch.average_rating.rating_count || 0;
        updatedMatch.average_rating = {
          ...updatedMatch.average_rating,
          overall: updatedRating.overall, // Just show the user's latest rating
          rating_count: currentCount + 1
        };
      }
      
      // Update the match in the array
      updatedMatches[matchIndex] = updatedMatch;
      
      // Update the matches state
      setMatches(updatedMatches);
      
      // Set flag to avoid unnecessary API calls
      setRatingJustUpdated(true);
      
      // Show success toast
      toast({
        title: "Rating submitted successfully!",
        status: "success",
        duration: 3000,
        isClosable: true
      });
    }
    
    // Close the modal
    setIsRatingModalOpen(false);
    setSelectedMatch(null);
  };
  
  const formatMatchDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      return `Matched ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}`;
    } catch (e) {
      return 'Recently matched';
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
        <Box bg="white" p={4} borderBottom="1px solid" borderColor="gray.200" position="sticky" top="0" zIndex="1">
          <Heading size="md" textAlign="center">New Matches</Heading>
        </Box>
        
        {matches.length === 0 ? (
          <Center py={16} flexDirection="column">
            <Heading size="md" mb={2} textAlign="center">No new matches yet</Heading>
            <Text textAlign="center" color="gray.500">
              Keep swiping to find your matches!
            </Text>
          </Center>
        ) : (
          <SimpleGrid columns={2} spacing={4} p={4}>
            {matches.map((match) => {
              console.log('Match photo URL:', match.photos?.[0] || 'No photo');
              return (
              <Box 
                key={match.match_id}
                bg="white"
                borderRadius="lg"
                overflow="hidden"
                boxShadow="md"
              >
                <Image
                  src={match.photos?.[0] || ''}
                  alt={match.display_name || 'Match'}
                  objectFit="cover"
                  h="180px"
                  w="100%"
                  fallbackSrc="https://via.placeholder.com/150?text=No+Image"
                  cursor="pointer"
                  onClick={() => navigate(`/user-profile/${match.user_uid}`)}
                />
                <Box p={3}>
                  <Heading size="sm" mb={1}>
                    {match.display_name}
                  </Heading>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    {formatMatchDate(match.created_at)}
                  </Text>
                  
                  {/* Display user rating */}
                  <Box mb={2}>
                    <Flex justify="space-between" align="center">
                      <UserRating 
                        userId={match.user_uid} 
                        readOnly={true} 
                        compact={true} 
                        showDetails={false}
                      />
                      <IconButton
                        icon={<FaStar />}
                        size="sm"
                        colorScheme="yellow"
                        variant="outline"
                        aria-label="Rate this user"
                        onClick={() => handleRateUser(match)}
                      />
                    </Flex>
                  </Box>
                  
                  <Flex>
                    <Button 
                      size="sm" 
                      colorScheme="primary"
                      mr={2}
                      flex="1"
                      onClick={() => handleMessageMatch(match.match_id)}
                    >
                      Message
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      flex="1"
                      onClick={() => handleUnmatch(match.match_id)}
                    >
                      Unmatch
                    </Button>
                  </Flex>
                </Box>
              </Box>
              )})}
          </SimpleGrid>
        )}
      </Box>
      
      {/* Rating Modal */}
      {isRatingModalOpen && selectedMatch && (
        <RatingModal
          isOpen={isRatingModalOpen}
          userId={selectedMatch.user_uid}
          userName={selectedMatch.display_name}
          onClose={() => {
            setIsRatingModalOpen(false);
            setSelectedMatch(null);
          }}
          onRatingComplete={handleRatingComplete}
        />
      )}
    </>
  );
};

export default Matches; 