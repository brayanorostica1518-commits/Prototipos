import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  // Only show loading briefly while checking
  if (checking) {
    return (
      <div className="min-h-screen cyber-grid bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
          <p className="text-cyan-400 mt-4 text-lg">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('No user found, redirecting to login from:', location.pathname);
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Render protected content
  console.log('User authenticated, rendering protected route');
  return children;
}
