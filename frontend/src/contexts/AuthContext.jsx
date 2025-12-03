import { createContext, useContext, useState, useEffect } from 'react';
import secureAxios from '@/utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);

  // Handle session_id from URL fragment FIRST (after Google OAuth redirect)
  useEffect(() => {
    const handleSessionId = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        console.log('Processing session_id from URL...');
        setLoading(true);
        setChecking(false);
        
        const sessionId = hash.split('session_id=')[1].split('&')[0];
        
        try {
          // Call backend to process session_id
          const response = await secureAxios.post('/auth/session-data', null, {
            headers: {
              'X-Session-ID': sessionId
            }
          });
          
          setUser(response.data);
          
          console.log('User authenticated successfully:', response.data.email);
          
          // Clean URL fragment and navigate to home
          window.history.replaceState(null, '', '/');
          
          // Force navigation to home
          window.location.href = '/';
        } catch (error) {
          console.error('Error processing session ID:', error);
          setUser(null);
          setLoading(false);
        }
      } else {
        // No session_id in URL, check existing auth
        checkAuth();
      }
    };

    handleSessionId();
  }, []);

  const checkAuth = async () => {
    try {
      setChecking(true);
      const response = await secureAxios.get('/auth/check');
      
      if (response.data.authenticated) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setChecking(false);
    }
  };

  const loginWithGoogle = () => {
    const redirectUrl = `${window.location.origin}`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    try {
      await secureAxios.post('/auth/logout');
      setUser(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const value = {
    user,
    loading: loading || checking,
    checking,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
