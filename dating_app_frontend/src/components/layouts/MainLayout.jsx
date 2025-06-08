import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Flex, 
  Icon, 
  Text, 
  HStack, 
  VStack
} from '@chakra-ui/react';
import { 
  FaHome, 
  FaHeart, 
  FaUser, 
  FaComment 
} from 'react-icons/fa';
import { FiSearch, FiHeart, FiMessageCircle, FiUser } from 'react-icons/fi';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Navigation items
  const navItems = [
    { name: 'Discover', path: '/discover', icon: FiSearch },
    { name: 'Matches', path: '/matches', icon: FiHeart },
    { name: 'Messages', path: '/messages', icon: FiMessageCircle },
    { name: 'Profile', path: '/profile', icon: FiUser },
  ];
  
  // Check if current path is active
  const isActive = (path) => {
    return location.pathname === path || 
      (path === '/matches' && location.pathname.startsWith('/conversation'));
  };
  
  return (
    <Box h="100%" pb="60px">
      {/* Main Content */}
      <Box flex="1" overflow="auto" className="mobile-full-height">
        <Outlet />
      </Box>
      
      {/* Bottom Navigation */}
      <Box 
        position="fixed" 
        bottom="0" 
        left="0" 
        right="0" 
        bg="white" 
        h="60px" 
        borderTop="1px solid" 
        borderColor="gray.200"
        zIndex="1000"
        className="mobile-pb-safe"
      >
        <HStack 
          justify="space-around" 
          align="center" 
          h="100%" 
          px={4}
        >
          {navItems.map((item) => (
            <VStack 
              key={item.name}
              spacing={0}
              cursor="pointer"
              onClick={() => navigate(item.path)}
              color={isActive(item.path) ? 'primary.500' : 'gray.500'}
              w="25%"
            >
              <Icon 
                as={item.icon} 
                boxSize="20px" 
                mb={1}
              />
              <Text 
                fontSize="xs" 
                fontWeight={isActive(item.path) ? 'bold' : 'normal'}
              >
                {item.name}
              </Text>
            </VStack>
          ))}
        </HStack>
      </Box>
    </Box>
  );
};

export default MainLayout; 