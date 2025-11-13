import { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import secureAxios from '@/utils/api';
import { toast } from 'sonner';
import { sanitizeText } from '@/utils/security';

/**
 * Template Modal Component
 * Dynamic form based on template variables
 */
export default function TemplateModal({ template, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (varName, value) => {
    setFormData(prev => ({ ...prev, [varName]: value }));
    // Clear error when user types
    if (errors[varName]) {
      setErrors(prev => ({ ...prev, [varName]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    template.variables.forEach(variable => {
      if (variable.required && (!formData[variable.name] || !formData[variable.name].trim())) {
        newErrors[variable.name] = 'Este campo es requerido';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      // Sanitize all inputs
      const sanitizedData = {};
      Object.keys(formData).forEach(key => {
        sanitizedData[key] = sanitizeText(formData[key], 10000);
      });

      const response = await secureAxios.post(`/templates/${template.id}/fill`, sanitizedData);
      
      toast.success('Plantilla cargada exitosamente');
      onSubmit(response.data.filled_prompt, response.data.frameworks);
    } catch (error) {
      console.error('Error filling template:', error);
      toast.error('Error al procesar plantilla');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (variable) => {
    const commonProps = {
      id: variable.name,
      value: formData[variable.name] || '',
      onChange: (e) => handleChange(variable.name, e.target.value),
      placeholder: variable.placeholder || '',
      className: `bg-gray-900/50 border-cyan-500/30 text-white placeholder:text-gray-600 focus:border-cyan-500 ${errors[variable.name] ? 'border-red-500' : ''}`
    };

    switch (variable.type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={4}
            className={`${commonProps.className} resize-none`}
          />
        );
      
      case 'select':
        return (
          <select
            {...commonProps}
            className={`${commonProps.className} p-2 rounded-md w-full`}
          >
            <option value="">Selecciona una opción</option>
            {variable.options?.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
          />
        );
      
      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
          />
        );
      
      default:
        return (
          <Input
            {...commonProps}
            type="text"
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-b border-cyan-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Space Mono, monospace' }}>
                {template.icon} {template.name}
              </h2>
              <p className="text-cyan-400/70 text-sm">{template.description}</p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-white/10"
              data-testid="close-template-modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)] custom-scrollbar">
          <div className="space-y-5">
            {template.variables.map((variable, idx) => (
              <div key={variable.name} className="space-y-2">
                <Label htmlFor={variable.name} className="text-white flex items-center gap-2">
                  {variable.label}
                  {variable.required && <span className="text-red-400 text-xs">*</span>}
                </Label>
                
                {variable.help_text && (
                  <p className="text-xs text-gray-500">{variable.help_text}</p>
                )}
                
                {renderField(variable)}
                
                {errors[variable.name] && (
                  <div className="flex items-center gap-1 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    {errors[variable.name]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-cyan-500/30 p-6 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {template.variable_count} campos • Frameworks: {template.frameworks?.join(', ') || 'Ninguno'}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20"
                data-testid="submit-template"
              >
                {loading ? (
                  'Procesando...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Usar Plantilla
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
