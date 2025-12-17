import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

/**
 * Onboarding Tour Component
 * Shows interactive step-by-step tutorial for first-time users
 */
export default function OnboardingTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenTour) {
      setIsVisible(true);
    }
  }, []);

  const steps = [
    {
      target: 'sidebar',
      title: '📁 Sesiones',
      description: 'Aquí verás todas tus evaluaciones guardadas. Cada sesión mantiene tu historial de análisis.',
      position: 'right'
    },
    {
      target: 'frameworks',
      title: '⚡ Marcos Normativos',
      description: 'Selecciona los frameworks que quieres evaluar: ISO 27001, NIST, OWASP, GDPR, y más.',
      position: 'left',
      mobileAction: 'Toca el botón flotante ⚡ en la esquina inferior derecha'
    },
    {
      target: 'upload',
      title: '📄 Subir Documentos',
      description: 'Arrastra o sube tus documentos (PDF, Excel, Word, CSV) para analizar.',
      position: 'left'
    },
    {
      target: 'input',
      title: '✍️ Describe tu Evaluación',
      description: 'Escribe detalles sobre lo que quieres evaluar. Puedes hacer preguntas específicas.',
      position: 'top'
    },
    {
      target: 'templates',
      title: '📋 Plantillas Rápidas',
      description: 'Usa plantillas predefinidas para auditorías ISO, análisis GDPR, evaluaciones de seguridad, etc.',
      position: 'bottom'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay oscuro */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] animate-fade-in" />
      
      {/* Tour card */}
      <div className="fixed inset-x-0 bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 z-[70] animate-slide-up">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border-2 border-cyan-500/50 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-cyan-500/30 max-w-md mx-auto sm:mx-0">
          {/* Progress bar */}
          <div className="h-1 bg-gray-800 rounded-t-3xl sm:rounded-t-2xl overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="text-xs text-cyan-400 mb-2">
                  Paso {currentStep + 1} de {steps.length}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                  {step.title}
                </h3>
              </div>
              <Button
                onClick={handleSkip}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white -mt-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">
              {step.description}
            </p>

            {/* Mobile specific instruction */}
            {step.mobileAction && (
              <div className="sm:hidden mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-cyan-400 text-xs">
                  💡 {step.mobileAction}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <Button
                onClick={handlePrev}
                disabled={currentStep === 0}
                variant="outline"
                size="sm"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>

              <div className="flex gap-1.5">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentStep 
                        ? 'w-6 bg-cyan-500' 
                        : idx < currentStep 
                          ? 'w-1.5 bg-cyan-500/50'
                          : 'w-1.5 bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                className="neon-button"
                size="sm"
              >
                {currentStep === steps.length - 1 ? (
                  '¡Comenzar! 🚀'
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>

            {/* Skip option */}
            <button
              onClick={handleSkip}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-400 mt-4 transition-colors"
            >
              Saltar tutorial
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
