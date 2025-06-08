import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  Box,
  VStack,
  HStack,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { ratingsAPI } from '../services/api';
import RatingStars from './RatingStars';

const RatingModal = ({ isOpen, onClose, userId, userName, onRatingComplete }) => {
  const [rating, setRating] = useState({
    overall: 0,
    personality: 0,
    reliability: 0,
    communication: 0,
    authenticity: 0,
    comment: ''
  });
  
  const [existingRatingId, setExistingRatingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const toast = useToast();
  
  // Fetch existing rating if any
  useEffect(() => {
    if (isOpen && userId) {
      fetchExistingRating();
    }
  }, [isOpen, userId]);
  
  // Reset form when modal is opened
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);
  
  const fetchExistingRating = async () => {
    try {
      const response = await ratingsAPI.getMyRating(userId);
      
      if (response.data.exists) {
        setRating(response.data.rating);
        setExistingRatingId(response.data.rating.id);
      }
    } catch (err) {
      console.error('Error fetching existing rating:', err);
      // Continue with empty rating form
    }
  };
  
  const handleRatingChange = (category, value) => {
    setRating(prev => ({
      ...prev,
      [category]: value
    }));
  };
  
  const handleCommentChange = (e) => {
    setRating(prev => ({
      ...prev,
      comment: e.target.value
    }));
  };
  
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const payload = {
        rated_uid: userId,
        overall: rating.overall,
        personality: rating.personality,
        reliability: rating.reliability,
        communication: rating.communication,
        authenticity: rating.authenticity,
        comment: rating.comment
      };
      
      let response;
      
      if (existingRatingId) {
        // Update existing rating
        response = await ratingsAPI.updateRating(existingRatingId, payload);
      } else {
        // Create new rating
        response = await ratingsAPI.submitRating(payload);
        
        // If we got a new rating ID, save it
        if (response.data && response.data.rating_id) {
          setExistingRatingId(response.data.rating_id);
        }
      }
      
      toast({
        title: existingRatingId ? 'Rating updated' : 'Rating submitted',
        description: 'Thank you for your feedback!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Call the onRatingComplete callback to notify the parent component
      // that a rating was successfully submitted
      if (onRatingComplete) {
        // Pass the updated rating data to the parent
        onRatingComplete({
          ...payload,
          id: existingRatingId || (response.data && response.data.rating_id)
        });
      }
      
      onClose();
    } catch (err) {
      console.error('Error submitting rating:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to submit rating. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };
  
  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };
  
  // Define the steps of the questionnaire
  const steps = [
    {
      title: "Personality",
      description: "How would you rate their personality and character?",
      field: "personality",
    },
    {
      title: "Reliability",
      description: "How reliable were they in your interactions?",
      field: "reliability",
    },
    {
      title: "Communication",
      description: "How well did they communicate with you?",
      field: "communication",
    },
    {
      title: "Authenticity",
      description: "How authentic do you feel they were?",
      field: "authenticity",
    },
    {
      title: "Overall",
      description: "What's your overall impression?",
      field: "overall",
    },
    {
      title: "Comments",
      description: "Anything else you'd like to share about your experience?",
      field: "comment",
      isComment: true
    }
  ];
  
  const currentQuestion = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  
  // Check if all required ratings are completed
  const isComplete = steps.every(step => {
    if (step.isComment) return true; // Comment is optional
    return rating[step.field] > 0;
  });
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Rate {userName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontWeight="bold">{currentQuestion.title}</Text>
            <Text>{currentQuestion.description}</Text>
            
            {currentQuestion.isComment ? (
              <Textarea
                value={rating.comment}
                onChange={handleCommentChange}
                placeholder="Share your thoughts (optional)"
                size="md"
                rows={4}
              />
            ) : (
              <Box py={3} w="100%" display="flex" justifyContent="center" alignItems="center">
                <RatingStars
                  value={rating[currentQuestion.field]}
                  onChange={(val) => handleRatingChange(currentQuestion.field, val)}
                  size="lg"
                  labelAbove={true} 
                  label={null}
                />
              </Box>
            )}
            
            {/* Progress indicator */}
            <HStack spacing={1} justify="center" mt={2}>
              {steps.map((_, index) => (
                <Box
                  key={index}
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  bg={index === currentStep ? "blue.500" : "gray.200"}
                />
              ))}
            </HStack>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <HStack spacing={2}>
            {!isFirstStep && (
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
            )}
            
            {!isLastStep ? (
              <Button 
                colorScheme="blue" 
                onClick={nextStep}
                isDisabled={currentQuestion.isComment ? false : rating[currentQuestion.field] === 0}
              >
                Next
              </Button>
            ) : (
              <Button 
                colorScheme="green" 
                onClick={handleSubmit} 
                isLoading={isSubmitting}
                isDisabled={!isComplete}
              >
                Submit
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RatingModal; 