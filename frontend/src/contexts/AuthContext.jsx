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
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Handle session_id from URL fragment FIRST (after Google OAuth redirect)
  useEffect(() => {
    const handleSessionId = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        console.log('OAuth callback detected - processing session_id...');
        setLoading(true);
        setChecking(false);
        
        const sessionId = hash.split('session_id=')[1].split('&')[0];
        
        try {
          console.log('Calling /api/auth/session-data...');
          const response = await secureAxios.post('/auth/session-data', null, {
            headers: {
              'X-Session-ID': sessionId
            }
          });
          
          console.log('Authentication successful:', response.data.email);
          setUser(response.data);
          
          // Clean URL and redirect
          console.log('Redirecting to home page...');
          window.location.href = '/';
        } catch (error) {
          console.error('Error processing session ID:', error);
          setUser(null);
          setLoading(false);
          setChecking(false);
          // Redirect to login on error
          window.location.href = '/login';
        }
      } else {
        // No session_id in URL, check existing auth
        console.log('No OAuth callback, checking existing authentication...');
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
        console.log('User is authenticated:', response.data.user.email);
      } else {
        setUser(null);
        console.log('User is not authenticated');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setChecking(false);
      console.log('Auth check complete');
    }
  };

  const loginWithGoogle = () => {
    const redirectUrl = `${window.location.origin}`;
    const authUrl = process.env.REACT_APP_AUTH_URL || 'https://auth.emergentagent.com';
    window.location.href = `${authUrl}/?redirect=${encodeURIComponent(redirectUrl)}`;
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
