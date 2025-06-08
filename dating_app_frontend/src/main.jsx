import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Customize theme for the app
const theme = extendTheme({
  fonts: {
    body: 'Inter, system-ui, sans-serif',
    heading: 'Inter, system-ui, sans-serif',
  },
  colors: {
    primary: {
      50: '#ffe1ec',
      100: '#ffb1c6',
      200: '#ff7f9f',
      300: '#ff4d79',
      400: '#ff1b53',
      500: '#e6003a',
      600: '#b4002d',
      700: '#82001f',
      800: '#500011',
      900: '#200005',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      }
    }
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'lg',
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
); 