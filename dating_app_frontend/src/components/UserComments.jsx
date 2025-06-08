import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Divider,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Badge,
} from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';
import { ratingsAPI } from '../services/api';

/**
 * Component for displaying comments from other users' ratings
 * 
 * @param {Object} props
 * @param {string} props.userId - ID of the user whose comments to display
 */
const UserComments = ({ userId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComments();
  }, [userId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await ratingsAPI.getUserRatings(userId);
      
      if (response.data && response.data.ratings) {
        // Filter ratings to only include those with comments
        const ratingsWithComments = response.data.ratings.filter(
          rating => rating.comment && rating.comment.trim() !== ''
        );
        
        console.log('Found ratings with comments:', ratingsWithComments.length);
        setComments(ratingsWithComments);
      } else {
        setComments([]);
      }
      
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Could not load comments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'Some time ago';
    }
  };

  // Don't show anything if there are no comments and we're not loading
  if (!loading && comments.length === 0 && !error) {
    return null;
  }

  return (
    <Box bg="white" p={4} mb={4} borderRadius="md" boxShadow="sm">
      <Heading size="md" mb={3}>What Others Said</Heading>
      
      {loading ? (
        <Center p={4}>
          <Spinner size="md" color="gray.500" />
        </Center>
      ) : error ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      ) : comments.length === 0 ? (
        <Text color="gray.500" fontSize="sm">No comments yet</Text>
      ) : (
        <Box>
          {comments.map((comment, index) => (
            <Box key={comment.id || index} mb={index < comments.length - 1 ? 4 : 0}>
              <Text fontSize="md" fontStyle="italic" mb={2} color="gray.700">
                "{comment.comment}"
              </Text>
              <Flex justify="space-between" alignItems="center" fontSize="sm">
                <Flex alignItems="center">
                  <Badge colorScheme="blue" mr={2}>
                    {comment.rater_display_name || 'Anonymous'}
                  </Badge>
                  <Box fontSize="xs" color="gray.500">
                    rated {Number(comment.overall).toFixed(1)}/5
                  </Box>
                </Flex>
                <Text color="gray.500" fontSize="xs">
                  {formatDate(comment.created_at)}
                </Text>
              </Flex>
              {index < comments.length - 1 && <Divider mt={4} />}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default UserComments; 