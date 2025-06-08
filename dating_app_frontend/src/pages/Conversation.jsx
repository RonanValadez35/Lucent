import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  Avatar,
  Text,
  IconButton,
  Input,
  useToast,
  Spinner,
  Center,
  Heading,
  VStack,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPaperPlane, FaEllipsisV } from 'react-icons/fa';
import { messagesAPI, matchesAPI, profilesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Conversation = () => {
  const { matchId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  
  // Fetch conversation details and messages
  useEffect(() => {
    fetchData();
    
    // Set up polling for new messages
    const pollInterval = setInterval(() => {
      fetchMessages(false);
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(pollInterval);
  }, [matchId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch messages and match details in parallel
      await Promise.all([
        fetchMessages(true),
        fetchMatchDetails()
      ]);
      
    } catch (err) {
      console.error('Error fetching conversation data:', err);
      setError('Failed to load conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMessages = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await messagesAPI.getMessages(matchId);
      
      if (response.data) {
        setMessages(response.data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      if (showLoading) {
        setError('Could not load messages. Please try again.');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };
  
  const fetchMatchDetails = async () => {
    try {
      const response = await matchesAPI.getMatches();
      
      if (response.data) {
        // Find the current match
        const match = response.data.find(m => m.id === matchId);
        
        if (match && match.match_profile) {
          setOtherUser(match.match_profile);
        } else {
          // If not found in matches, try fetching from conversations
          const conversationsResponse = await messagesAPI.getConversations();
          
          if (conversationsResponse.data) {
            const conversation = conversationsResponse.data.find(c => c.match_id === matchId);
            
            if (conversation && conversation.other_user) {
              setOtherUser(conversation.other_user);
            } else {
              setError('Could not find match details.');
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching match details:', err);
      setError('Could not load match details.');
    }
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      setSending(true);
      
      const response = await messagesAPI.sendMessage(matchId, newMessage);
      
      if (response.data) {
        // Add new message to state
        const sentMessage = {
          id: response.data.message_id,
          match_id: matchId,
          sender_uid: currentUser.uid,
          content: newMessage,
          created_at: new Date().toISOString(),
          read: false
        };
        
        setMessages([...messages, sentMessage]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: 'Error',
        description: 'Could not send message. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSending(false);
    }
  };
  
  const handleUnmatch = async () => {
    try {
      await matchesAPI.unmatch(matchId);
      
      toast({
        title: 'Unmatched',
        description: `You've unmatched with ${otherUser?.display_name || 'this person'}`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      // Navigate back to matches page
      navigate('/matches');
      
    } catch (err) {
      console.error('Error unmatching:', err);
      toast({
        title: 'Error',
        description: 'Could not unmatch. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Format message timestamp
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at);
      const dateStr = date.toLocaleDateString();
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      
      groups[dateStr].push(message);
    });
    
    return groups;
  };
  
  // Format date header
  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    }
  };
  
  // Show loading spinner while fetching data
  if (loading && messages.length === 0) {
    return (
      <Center h="100%" p={4}>
        <Spinner size="xl" color="primary.500" thickness="4px" />
      </Center>
    );
  }
  
  // Show error message if failed to load
  if (error && messages.length === 0 && !otherUser) {
    return (
      <Box p={4} h="100%">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }
  
  const messageGroups = groupMessagesByDate(messages);
  
  return (
    <Box h="100%" position="relative">
      {/* Header */}
      <Flex
        align="center"
        p={4}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="white"
        position="sticky"
        top="0"
        zIndex="10"
      >
        <IconButton
          icon={<FaArrowLeft />}
          aria-label="Back to matches"
          variant="ghost"
          mr={3}
          onClick={() => navigate('/matches')}
        />
        
        {otherUser && (
          <Flex flex="1" align="center">
            <Avatar 
              size="sm" 
              src={otherUser.photos?.[0] || ''} 
              name={otherUser.display_name} 
              mr={3} 
              cursor="pointer"
              onClick={() => navigate(`/user-profile/${otherUser.uid}`)}
            />
            <Text fontWeight="bold">{otherUser.display_name}</Text>
          </Flex>
        )}
        
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<FaEllipsisV />}
            variant="ghost"
            aria-label="Options"
          />
          <MenuList>
            <MenuItem onClick={handleUnmatch}>Unmatch</MenuItem>
          </MenuList>
        </Menu>
      </Flex>
      
      {/* Messages Area */}
      <Box 
        overflow="auto" 
        p={4}
        pb="80px" /* Add padding to bottom for the input area */
        bg="gray.50"
        h="calc(100% - 72px)" /* Adjust for header height */
        display="flex"
        flexDirection="column"
      >
        {Object.keys(messageGroups).map(date => (
          <VStack key={date} align="stretch" spacing={4} mb={6}>
            {/* Date Header */}
            <Flex justify="center" mb={2}>
              <Text
                fontSize="xs"
                bg="gray.200"
                color="gray.600"
                px={3}
                py={1}
                borderRadius="full"
              >
                {formatDateHeader(date)}
              </Text>
            </Flex>
            
            {/* Messages */}
            {messageGroups[date].map(message => {
              const isCurrentUser = message.sender_uid === currentUser?.uid;
              
              return (
                <Flex
                  key={message.id}
                  justify={isCurrentUser ? 'flex-end' : 'flex-start'}
                  w="100%"
                >
                  {!isCurrentUser && otherUser && (
                    <Avatar
                      size="xs"
                      src={otherUser.photos?.[0] || ''}
                      name={otherUser.display_name}
                      mr={2}
                      alignSelf="flex-end"
                      mb={1}
                    />
                  )}
                  
                  <Box maxW={isCurrentUser ? "65%" : "60%"}>
                    <Box
                      bg={isCurrentUser ? 'primary.500' : 'white'}
                      color={isCurrentUser ? 'white' : 'black'}
                      px={4}
                      py={2}
                      borderRadius="lg"
                      minW="20px"
                      boxShadow="sm"
                      display="inline-block"
                      whiteSpace="normal"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      wordBreak="break-word"
                      overflowWrap="break-word"
                    >
                      <Text overflowWrap="break-word" wordBreak="break-word">
                        {message.content}
                      </Text>
                    </Box>
                    
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      mt={1}
                      textAlign={isCurrentUser ? 'right' : 'left'}
                    >
                      {formatMessageTime(message.created_at)}
                    </Text>
                  </Box>
                </Flex>
              );
            })}
          </VStack>
        ))}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Message Input - Fixed at bottom */}
      <Flex
        as="form"
        onSubmit={handleSendMessage}
        p={3}
        bg="white"
        borderTop="1px solid"
        borderColor="gray.200"
        position="fixed"
        bottom="60px" /* Position above the tabs (60px height) */
        left="0"
        right="0"
        zIndex="10"
      >
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          mr={2}
          borderRadius="full"
        />
        <IconButton
          colorScheme="red"
          aria-label="Send message"
          icon={<FaPaperPlane />}
          isLoading={sending}
          type="submit"
          isDisabled={!newMessage.trim()}
          borderRadius="full"
        />
      </Flex>
    </Box>
  );
};

export default Conversation; 