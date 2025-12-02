import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shield, Lock, CheckCircle } from 'lucide-react';

export default function Login() {
  const { user, loading, checking, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already authenticated, redirect to main app
    if (user && !loading && !checking) {
      navigate('/');
    }
  }, [user, loading, checking, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-screen cyber-grid bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
          <p className="text-cyan-400 mt-4 text-lg">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cyber-grid bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/30 mb-4 animate-glow">
            <Shield className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold cyber-text-glow mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
            ASSESSMENT AI
          </h1>
          <p className="text-gray-400 text-lg">
            Plataforma de Análisis de Seguridad y Cumplimiento
          </p>
        </div>

        {/* Login Card */}
        <Card className="glass-card border-cyan-500/30 p-8 shadow-lg shadow-cyan-500/20">
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-cyan-300 mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
              INICIAR SESIÓN
            </h2>
            <p className="text-gray-400 text-sm">
              Accede a tu entorno privado de análisis de cumplimiento
            </p>
          </div>

          {/* Google Login Button */}
          <Button
            onClick={loginWithGoogle}
            className="w-full neon-button bg-white hover:bg-gray-100 text-gray-900 font-semibold py-6 text-lg flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </Button>

          <div className="mt-6 text-center">
            <div className="text-xs text-gray-500 space-y-2">
              <p>Al iniciar sesión, aceptas nuestros</p>
              <p>Términos de Servicio y Política de Privacidad</p>
            </div>
          </div>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="inline-flex p-3 bg-cyan-500/10 rounded-lg mb-2">
              <CheckCircle className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-xs text-gray-400">Sesiones Privadas</p>
          </div>
          <div className="text-center">
            <div className="inline-flex p-3 bg-cyan-500/10 rounded-lg mb-2">
              <CheckCircle className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-xs text-gray-400">Datos Seguros</p>
          </div>
          <div className="text-center">
            <div className="inline-flex p-3 bg-cyan-500/10 rounded-lg mb-2">
              <CheckCircle className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-xs text-gray-400">Análisis IA Avanzado</p>
          </div>
        </div>
      </div>
    </div>
  );
}
