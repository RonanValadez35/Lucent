import React from 'react';
import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="100vh"
      bg="white"
      p={4}
    >
      <VStack spacing={6} textAlign="center">
        <Heading size="2xl" color="primary.500">404</Heading>
        <Heading size="xl">Page Not Found</Heading>
        <Text fontSize="lg" color="gray.600">
          The page you're looking for doesn't exist or has been moved.
        </Text>
        <Button
          as={Link}
          to="/"
          colorScheme="red"
          size="lg"
          bg="primary.500"
          _hover={{ bg: 'primary.600' }}
        >
          Go Home
        </Button>
      </VStack>
    </Box>
  );
};

export default NotFound; 