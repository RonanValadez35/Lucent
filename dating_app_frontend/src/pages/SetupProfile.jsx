import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Select,
  Textarea,
  HStack,
  Tag,
  TagLabel,
  TagCloseButton,
  Flex,
  useToast,
  InputGroup,
  InputRightElement,
  Image,
  SimpleGrid,
  IconButton,
  Alert,
  AlertIcon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaPlus, FaCamera, FaTrash } from 'react-icons/fa';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { api } from '../services/api';

const SetupProfile = () => {
  const { userProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const storage = getStorage();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Form state
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [ageMinPref, setAgeMinPref] = useState('18');
  const [ageMaxPref, setAgeMaxPref] = useState('50');
  const [genderPref, setGenderPref] = useState('');
  const [distanceMaxPref, setDistanceMaxPref] = useState('50');
  const [interests, setInterests] = useState([]);
  const [newInterest, setNewInterest] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [nsfwChecking, setNsfwChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inappropriateImageDetails, setInappropriateImageDetails] = useState(null);
  
  // Additional profile details
  const [height, setHeight] = useState('');
  const [drinking, setDrinking] = useState('');
  const [smoking, setSmoking] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [education, setEducation] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  
  // Load existing profile data if available
  useEffect(() => {
    if (userProfile) {
      setBio(userProfile.bio || '');
      setAge(userProfile.age || '');
      setGender(userProfile.gender || '');
      setInterests(userProfile.interests || []);
      
      // Location
      if (userProfile.location) {
        setCity(userProfile.location.city || '');
        setCountry(userProfile.location.country || '');
      }
      
      // Preferences
      if (userProfile.preferences) {
        setAgeMinPref(userProfile.preferences.age_min || '18');
        setAgeMaxPref(userProfile.preferences.age_max || '50');
        setGenderPref(userProfile.preferences.gender || '');
        setDistanceMaxPref(userProfile.preferences.distance_max || '50');
      }
      
      // Photos
      if (userProfile.photos) {
        setPhotos(userProfile.photos);
      }
      
      // Additional profile details
      setHeight(userProfile.height || '');
      setDrinking(userProfile.drinking || '');
      setSmoking(userProfile.smoking || '');
      setLookingFor(userProfile.looking_for || '');
      setEducation(userProfile.education || '');
      setJobTitle(userProfile.job_title || '');
    }
  }, [userProfile]);
  
  // Handle adding interests
  const addInterest = () => {
    if (newInterest && !interests.includes(newInterest)) {
      setInterests([...interests, newInterest]);
      setNewInterest('');
    }
  };
  
  // Handle removing interests
  const removeInterest = (interest) => {
    setInterests(interests.filter(item => item !== interest));
  };
  
  // Helper function to check image for NSFW content
  const checkImageNSFW = async (imageBlob) => {
    try {
      // Create FormData to send the image file
      const formData = new FormData();
      formData.append('image', imageBlob, 'image.jpg');
      
      // Call our NSFW detection API
      const response = await api.post('/api/images/nsfw-check-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout for image processing
      });
      
      if (response.data.success) {
        return {
          is_inappropriate: response.data.is_inappropriate,
          nsfw_probability: response.data.nsfw_probability,
          sfw_probability: response.data.sfw_probability,
          confidence: response.data.confidence,
          model_used: response.data.model_used
        };
      } else {
        console.error('NSFW check API error:', response.data.error);
        // If API fails, allow the image but log the error
        return {
          is_inappropriate: false,
          nsfw_probability: 0.0,
          confidence: 0.5,
          error: response.data.error || 'API check failed'
        };
      }
      
    } catch (error) {
      console.error('Error checking image for NSFW content:', error);
      
      // If network error or API is down, allow the image but log the error
      // In production, you might want to be more strict here
      return {
        is_inappropriate: false,
        nsfw_probability: 0.0,
        confidence: 0.5,
        error: 'Network error or API unavailable'
      };
    }
  };
  
  // Handle photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log("No file selected");
      return;
    }
    
    console.log("File selected:", file.name, "Type:", file.type, "Size:", file.size);
    
    const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!fileTypes.includes(file.type)) {
      setError('Please upload an image file (jpeg, png, jpg)');
      // Reset the file input so the same file can be selected again
      e.target.value = null;
      return;
    }
    
    // Check file size (limit to 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      setError(`Image is too large. Please upload an image less than 5MB.`);
      // Reset the file input
      e.target.value = null;
      return;
    }
    
    // Limit to 5 photos maximum
    const MAX_PHOTOS = 5;
    if (photos.length >= MAX_PHOTOS) {
      setError(`You can only upload a maximum of ${MAX_PHOTOS} photos. Please remove some before adding more.`);
      // Reset the file input
      e.target.value = null;
      return;
    }
    
    try {
      setPhotoUploading(true);
      setNsfwChecking(false);
      setError('');
      
      // Compress image before processing
      const compressedImage = await compressImage(file);
      console.log("Original size:", file.size, "Compressed size:", compressedImage.size);
      
      // Check for NSFW content before adding to profile
      setNsfwChecking(true);
      console.log("Checking image for inappropriate content...");
      const nsfwResult = await checkImageNSFW(compressedImage);
      setNsfwChecking(false);
      
      // If image is flagged as inappropriate, reject it
      if (nsfwResult.is_inappropriate) {
        // Store details for the modal
        setInappropriateImageDetails({
          probability: nsfwResult.nsfw_probability,
          confidence: nsfwResult.confidence,
          model: nsfwResult.model_used
        });
        
        // Show modal popup
        onOpen();
        
        // Also show toast for immediate feedback
        toast({
          title: 'Photo Not Allowed',
          description: `This image was flagged as inappropriate content (${(nsfwResult.nsfw_probability * 100).toFixed(1)}% confidence). Please upload a different picture that follows our community guidelines.`,
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
        setError(`This image was flagged as inappropriate and cannot be uploaded. NSFW probability: ${(nsfwResult.nsfw_probability * 100).toFixed(1)}%`);
        setPhotoUploading(false);
        e.target.value = null;
        return;
      }
      
      // Log NSFW check result for monitoring
      console.log(`NSFW check result: ${(nsfwResult.nsfw_probability * 100).toFixed(2)}% inappropriate (confidence: ${(nsfwResult.confidence * 100).toFixed(1)}%)`);
      
      // Show warning if NSFW probability is moderate (but still allowed)
      if (nsfwResult.nsfw_probability > 0.3) {
        toast({
          title: 'Content Warning',
          description: `This image has a ${(nsfwResult.nsfw_probability * 100).toFixed(1)}% chance of inappropriate content. Please ensure it follows community guidelines.`,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
      
      // Convert compressed image to data URL
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const photoURL = event.target.result; // This is a data URL
        console.log("Photo processed. Data URL length:", photoURL.length);
        
        // Validate that the data URL isn't too massive (can cause API issues)
        if (photoURL.length > 900000) { // Reduced to stay under Firestore's 1MB limit
          setError('Image is too large after processing. Please use a smaller or more compressed image.');
          setPhotoUploading(false);
          // Reset the file input
          if (document.getElementById('photo-upload')) {
            document.getElementById('photo-upload').value = null;
          }
          return;
        }
        
        // Update photos state with the new photo
        const updatedPhotos = [...photos, photoURL];
        setPhotos(updatedPhotos);
        console.log("Photos updated, new count:", updatedPhotos.length);
        
        toast({
          title: 'Photo uploaded successfully',
          description: `Photo ${photos.length + 1} of ${MAX_PHOTOS} added and verified as appropriate content (${(nsfwResult.sfw_probability * 100).toFixed(1)}% safe)`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
        
        setPhotoUploading(false);
        
        // Reset the file input so the same file can be selected again
        if (document.getElementById('photo-upload')) {
          document.getElementById('photo-upload').value = null;
        }
      };
      
      reader.onerror = () => {
        console.error('FileReader error:', reader.error);
        setError('Failed to read the image file. Please try again.');
        setPhotoUploading(false);
        // Reset the file input
        document.getElementById('photo-upload').value = null;
      };
      
      // Read the compressed file as a data URL
      reader.readAsDataURL(compressedImage);
      
    } catch (err) {
      console.error('Photo upload error:', err);
      setError('Failed to upload photo. Please try again.');
      setPhotoUploading(false);
      // Reset the file input
      document.getElementById('photo-upload').value = null;
    }
  };
  
  // Function to compress an image using canvas
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      // Create image element - use window.Image to reference browser's built-in Image constructor
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        
        // Calculate new dimensions (max 800px width or height)
        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 800;
        
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round(height * (MAX_DIMENSION / width));
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round(width * (MAX_DIMENSION / height));
            height = MAX_DIMENSION;
          }
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to blob (compressed image)
        canvas.toBlob((blob) => {
          if (blob) {
            // Create a new File object from the compressed blob
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Canvas to Blob conversion failed'));
          }
        }, file.type, 0.7); // 0.7 quality (70%) - adjust as needed
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    });
  };
  
  // Handle removing photos
  const removePhoto = (photoUrl) => {
    console.log("Removing photo:", photoUrl.substring(0, 50) + '...');
    const updatedPhotos = photos.filter(url => url !== photoUrl);
    console.log(`Photos count before: ${photos.length}, after: ${updatedPhotos.length}`);
    setPhotos(updatedPhotos);
    
    toast({
      title: 'Photo removed',
      description: `Photo removed successfully. ${updatedPhotos.length} of 5 remaining.`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!bio || !age || !gender || !city || !country || interests.length === 0 || photos.length === 0) {
      setError('Please fill out all required fields and add at least one photo and interest');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Prepare profile data
      const profileData = {
        bio,
        age: Number(age),
        gender,
        interests,
        location: {
          city,
          country,
          // Note: In a real app, you would get latitude and longitude
          // from a maps API using the city and country
          latitude: 0,
          longitude: 0
        },
        preferences: {
          age_min: Number(ageMinPref),
          age_max: Number(ageMaxPref),
          gender: genderPref,
          distance_max: Number(distanceMaxPref)
        },
        photos,
        profile_completed: true,
        // Additional profile details
        height: height ? Number(height) : null,
        drinking,
        smoking,
        looking_for: lookingFor,
        education,
        job_title: jobTitle
      };
      
      // Update profile
      await updateProfile(profileData);
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully set up!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Navigate to discover page
      navigate('/discover');
      
    } catch (err) {
      console.error('Profile update error:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // First, let's add the MAX_BIO_LENGTH constant since it's used in the code
  const MAX_BIO_LENGTH = 500;
  
  return (
    <Box bg="white" minH="100vh" py={8} px={4}>
      <VStack spacing={8} w="full" maxW="md" mx="auto">
        {/* Header */}
        <VStack spacing={2} textAlign="center" mb={2}>
          <Heading size="xl" color="primary.500">Setup Your Profile</Heading>
          <Text fontSize="md" color="gray.600">Tell us about yourself to find better matches</Text>
        </VStack>
        
        {/* Error Alert */}
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        {/* Profile Form */}
        <VStack as="form" spacing={6} w="full" onSubmit={handleSubmit}>
          {/* Basic Info Section */}
          <VStack align="start" spacing={4} w="full">
            <Heading size="md">Basic Information</Heading>
            
            <FormControl isRequired>
              <FormLabel>About Me</FormLabel>
              <InputGroup>
                <Textarea
                  id="bio-counter"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us something interesting about yourself..."
                  maxLength={MAX_BIO_LENGTH}
                  rows={4}
                />
                <InputRightElement width="4.5rem">
                  <Button
                    size="sm"
                    onClick={() => document.getElementById('bio-counter').focus()}
                    colorScheme="gray"
                    variant="ghost"
                  >
                    {bio.length}/{MAX_BIO_LENGTH}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel>Age</FormLabel>
              <NumberInput min={18} max={100} value={age} onChange={(value) => setAge(value)}>
                <NumberInputField placeholder="Your age" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel>Gender</FormLabel>
              <Select
                placeholder="Select gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </Select>
            </FormControl>
          </VStack>
          
          {/* Location Section */}
          <VStack align="start" spacing={4} w="full">
            <Heading size="md">Location</Heading>
            
            <FormControl isRequired>
              <FormLabel>City</FormLabel>
              <Input
                placeholder="Your city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel>Country</FormLabel>
              <Input
                placeholder="Your country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </FormControl>
          </VStack>
          
          {/* Interests Section */}
          <VStack align="start" spacing={4} w="full">
            <Heading size="md">Interests</Heading>
            
            <FormControl>
              <FormLabel>Add your interests</FormLabel>
              <InputGroup>
                <Input
                  placeholder="e.g., hiking, cooking, movies..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                />
                <InputRightElement>
                  <IconButton
                    aria-label="Add interest"
                    icon={<FaPlus />}
                    size="sm"
                    onClick={addInterest}
                    colorScheme="gray"
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>
            
            <Flex wrap="wrap" gap={2}>
              {interests.map((interest, index) => (
                <Tag
                  key={index}
                  size="md"
                  borderRadius="full"
                  variant="solid"
                  colorScheme="primary"
                >
                  <TagLabel>{interest}</TagLabel>
                  <TagCloseButton onClick={() => removeInterest(interest)} />
                </Tag>
              ))}
            </Flex>
          </VStack>
          
          {/* Photos Section */}
          <VStack align="start" spacing={4} w="full">
            <Heading size="md">Photos</Heading>
            
            <FormControl>
              <FormLabel>Add profile photos</FormLabel>
              <Button
                leftIcon={<FaCamera />}
                onClick={() => document.getElementById('photo-upload').click()}
                colorScheme="gray"
                isLoading={photoUploading || nsfwChecking}
                loadingText={nsfwChecking ? "Checking content..." : "Uploading..."}
                isDisabled={photoUploading || nsfwChecking}
                width="full"
              >
                Add Photo ({photos.length} of 5)
              </Button>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                display="none"
              />
            </FormControl>
            
            {photos.length > 0 ? (
              <>
                <Text fontSize="sm" color="gray.600">
                  {photos.length} photo{photos.length > 1 ? 's' : ''} added
                </Text>
                <SimpleGrid columns={2} spacing={4} width="full">
                  {photos.map((photo, index) => {
                    console.log(`Rendering photo ${index + 1}:`, photo.substring(0, 50) + '...');
                    return (
                      <Box 
                        key={index} 
                        position="relative" 
                        borderRadius="md" 
                        overflow="hidden"
                        h="150px"
                      >
                        <Image
                          src={photo}
                          alt={`Profile photo ${index + 1}`}
                          w="100%"
                          h="100%"
                          objectFit="cover"
                          fallbackSrc="https://via.placeholder.com/150?text=Loading..."
                        />
                        <IconButton
                          aria-label="Remove photo"
                          icon={<FaTrash />}
                          size="sm"
                          colorScheme="red"
                          position="absolute"
                          top={2}
                          right={2}
                          onClick={() => removePhoto(photo)}
                        />
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </>
            ) : (
              <Text color="gray.500">No photos added yet. Please add at least one photo.</Text>
            )}
          </VStack>
          
          {/* Preferences Section */}
          <VStack align="start" spacing={4} w="full">
            <Heading size="md">Dating Preferences</Heading>
            
            <FormControl>
              <FormLabel>Age Range</FormLabel>
              <HStack>
                <NumberInput
                  min={18}
                  max={100}
                  value={ageMinPref}
                  onChange={(value) => setAgeMinPref(value)}
                  width="50%"
                >
                  <NumberInputField placeholder="Min age" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text>to</Text>
                <NumberInput
                  min={18}
                  max={100}
                  value={ageMaxPref}
                  onChange={(value) => setAgeMaxPref(value)}
                  width="50%"
                >
                  <NumberInputField placeholder="Max age" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </HStack>
            </FormControl>
            
            <FormControl>
              <FormLabel>Preferred Gender</FormLabel>
              <Select
                placeholder="Select preference"
                value={genderPref}
                onChange={(e) => setGenderPref(e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="all">All</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Maximum Distance (km)</FormLabel>
              <NumberInput
                min={1}
                max={500}
                value={distanceMaxPref}
                onChange={(value) => setDistanceMaxPref(value)}
              >
                <NumberInputField placeholder="Distance in km" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </VStack>
          
          {/* Additional Details Section */}
          <VStack align="start" spacing={4} w="full">
            <Heading size="md">Details</Heading>
            
            <FormControl>
              <FormLabel>Height (cm)</FormLabel>
              <NumberInput
                min={140}
                max={220}
                value={height}
                onChange={(value) => setHeight(value)}
              >
                <NumberInputField placeholder="Your height in centimeters" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>Drinking</FormLabel>
              <Select
                placeholder="Select drinking preference"
                value={drinking}
                onChange={(e) => setDrinking(e.target.value)}
              >
                <option value="Never">Never</option>
                <option value="Rarely">Rarely</option>
                <option value="Socially">Socially</option>
                <option value="Often">Often</option>
                <option value="Regular drinker">Regular drinker</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Smoking</FormLabel>
              <Select
                placeholder="Select smoking preference"
                value={smoking}
                onChange={(e) => setSmoking(e.target.value)}
              >
                <option value="Non-smoker">Non-smoker</option>
                <option value="Occasionally">Occasionally</option>
                <option value="Socially">Socially</option>
                <option value="Regular smoker">Regular smoker</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Looking For</FormLabel>
              <Select
                placeholder="Select looking for"
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
              >
                <option value="Friendship">Friendship</option>
                <option value="Dating">Dating</option>
                <option value="Relationship">Relationship</option>
                <option value="Serious relationship">Serious relationship</option>
                <option value="Casual">Casual</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Education</FormLabel>
              <Input
                placeholder="Your education"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Job Title</FormLabel>
              <Input
                placeholder="Your job title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </FormControl>
          </VStack>
          
          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            w="full"
            mt={4}
            colorScheme="red"
            isLoading={loading}
            loadingText="Saving Profile"
            bg="primary.500"
            _hover={{ bg: 'primary.600' }}
          >
            Complete Profile
          </Button>
        </VStack>
        
        {/* Inappropriate Content Modal */}
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader color="red.500">
              ⚠️ Photo Not Allowed
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="start">
                <Text>
                  The image you tried to upload was flagged as inappropriate content and cannot be added to your profile.
                </Text>
                
                {inappropriateImageDetails && (
                  <Box bg="red.50" p={3} borderRadius="md" w="full">
                    <Text fontSize="sm" color="red.700">
                      <strong>Detection Details:</strong>
                    </Text>
                    <Text fontSize="sm" color="red.600">
                      • Inappropriate probability: {(inappropriateImageDetails.probability * 100).toFixed(1)}%
                    </Text>
                    <Text fontSize="sm" color="red.600">
                      • Confidence level: {(inappropriateImageDetails.confidence * 100).toFixed(1)}%
                    </Text>
                    <Text fontSize="sm" color="red.600">
                      • Detection model: {inappropriateImageDetails.model}
                    </Text>
                  </Box>
                )}
                
                <Text>
                  Please choose a different photo that follows our community guidelines:
                </Text>
                
                <Box bg="blue.50" p={3} borderRadius="md" w="full">
                  <Text fontSize="sm" color="blue.700">
                    <strong>Acceptable photos:</strong>
                  </Text>
                  <Text fontSize="sm" color="blue.600">
                    • Clear face photos
                  </Text>
                  <Text fontSize="sm" color="blue.600">
                    • Fully clothed images
                  </Text>
                  <Text fontSize="sm" color="blue.600">
                    • Appropriate social settings
                  </Text>
                  <Text fontSize="sm" color="blue.600">
                    • No suggestive content
                  </Text>
                </Box>
              </VStack>
            </ModalBody>
            
            <ModalFooter>
              <Button colorScheme="blue" onClick={onClose}>
                I Understand
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

export default SetupProfile; 