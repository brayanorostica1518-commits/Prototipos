import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }) {
  const { user, loading, checking } = useAuth();
  const [timeout, setTimeout] = useState(false);

  // Set a timeout to avoid infinite loading
  useEffect(() => {
    const timer = window.setTimeout(() => {
      console.log('Auth check timeout - redirecting to login');
      setTimeout(true);
    }, 5000); // 5 seconds timeout

    return () => window.clearTimeout(timer);
  }, []);

  // Show loading screen while checking authentication (max 5 seconds)
  if ((loading || checking) && !timeout) {
    return (
      <div className="min-h-screen cyber-grid bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
          <p className="text-cyan-400 mt-4 text-lg">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated or timeout
  if (!user || timeout) {
    console.log('Redirecting to login - user:', !!user, 'timeout:', timeout);
    return <Navigate to="/login" replace />;
  }

  // Render protected content
  return children;
}
