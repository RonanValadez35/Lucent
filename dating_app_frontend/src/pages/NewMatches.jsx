import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Heading,
  Text,
  Flex,
  Avatar,
  Button,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  useToast,
  useColorModeValue
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { matchesAPI } from '../services/api';
import { FaRegHeart } from 'react-icons/fa';

const NewMatches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  useEffect(() => {
    fetchMatches();
  }, []);
  
  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await matchesAPI.getMatches();
      
      if (response.data) {
        // Sort matches by created_at (newest first)
        const sortedMatches = [...response.data].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        setMatches(sortedMatches);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Could not load matches. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUnmatch = async (matchId) => {
    try {
      await matchesAPI.unmatch(matchId);
      
      // Update local state
      setMatches(matches.filter(match => match.match_id !== matchId));
      
      toast({
        title: 'Unmatched successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (err) {
      console.error('Error unmatching:', err);
      toast({
        title: 'Failed to unmatch',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };
  
  const goToMessage = (matchId) => {
    navigate(`/conversation/${matchId}`);
  };
  
  // Format date for display
  const formatMatchDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString();
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
    <Box h="100%" bg="gray.50">
      <Box bg={bgColor} p={4} borderBottom="1px solid" borderColor={borderColor} position="sticky" top="0" zIndex="1">
        <Heading size="md" textAlign="center">New Matches</Heading>
      </Box>
      
      {matches.length === 0 ? (
        <Center py={16} px={4} flexDirection="column">
          <Box rounded="full" bg="gray.100" p={4} mb={4}>
            <FaRegHeart size={32} color="#CBD5E0" />
          </Box>
          <Heading size="md" mb={2} textAlign="center">No new matches</Heading>
          <Text textAlign="center" color="gray.500">
            Continue discovering new profiles to find your matches
          </Text>
        </Center>
      ) : (
        <Grid templateColumns={{base: "repeat(2, 1fr)", md: "repeat(3, 1fr)"}} gap={4} p={4}>
          {matches.map((match) => (
            <Box 
              key={match.match_id}
              bg={bgColor}
              borderRadius="lg"
              overflow="hidden"
              boxShadow="sm"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <Avatar 
                size="xl" 
                src={match.user_info.photos?.[0] || ''} 
                name={match.user_info.display_name} 
                mx="auto" 
                mt={4} 
                mb={2}
              />
              
              <Box p={3} textAlign="center">
                <Heading size="sm" mb={1}>
                  {match.user_info.display_name}
                  {match.user_info.age && `, ${match.user_info.age}`}
                </Heading>
                
                <Text fontSize="xs" color="gray.500" mb={3}>
                  Matched {formatMatchDate(match.created_at)}
                </Text>
                
                <Flex direction="column" gap={2}>
                  <Button 
                    colorScheme="primary" 
                    size="sm" 
                    onClick={() => goToMessage(match.match_id)}
                  >
                    Message
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    colorScheme="gray"
                    onClick={() => handleUnmatch(match.match_id)}
                  >
                    Unmatch
                  </Button>
                </Flex>
              </Box>
            </Box>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default NewMatches; 