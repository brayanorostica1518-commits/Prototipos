import { useState, useEffect } from 'react';
import { X, FileText, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import secureAxios from '@/utils/api';
import { toast } from 'sonner';
import TemplateModal from './TemplateModal';

/**
 * Template Library Component
 * Displays available prompt templates with filtering
 */
export default function TemplateLibrary({ isOpen, onClose, onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchCategories();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await secureAxios.get('/templates');
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await secureAxios.get('/templates/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleTemplateClick = async (template) => {
    try {
      const response = await secureAxios.get(`/templates/${template.id}`);
      setSelectedTemplate(response.data);
      setShowTemplateModal(true);
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast.error('Error al cargar plantilla');
    }
  };

  const handleTemplateSubmit = (filledPrompt, frameworks) => {
    setShowTemplateModal(false);
    onSelectTemplate(filledPrompt, frameworks);
    onClose();
  };

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-fade-in">
        <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-b border-cyan-500/30 p-3 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-cyan-500/20 rounded-lg flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-2xl font-bold text-white truncate" style={{ fontFamily: 'Space Mono, monospace' }}>
                      PLANTILLAS
                    </h2>
                    <p className="text-cyan-400/70 text-xs sm:text-sm hidden sm:block">Selecciona una plantilla</p>
                  </div>
                </div>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-white/10 flex-shrink-0"
                  data-testid="close-template-library"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-900/50 border-cyan-500/30 text-white placeholder:text-gray-500 focus:border-cyan-500 text-sm"
                    data-testid="template-search"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full sm:w-auto pl-10 pr-8 py-2 bg-gray-900/50 border border-cyan-500/30 text-white rounded-md focus:border-cyan-500 focus:outline-none text-sm"
                    data-testid="category-filter"
                  >
                    <option value="all">Todas</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label} ({cat.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Templates Grid */}
            <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-160px)] sm:max-h-[calc(90vh-200px)] custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-cyan-400">Cargando plantillas...</div>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <FileText className="w-16 h-16 mb-4 opacity-30" />
                  <p>No se encontraron plantillas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className="group bg-gray-900/50 border-cyan-500/20 hover:border-cyan-500/60 hover:bg-gray-800/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-500/20 p-4"
                      data-testid={`template-card-${template.id}`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-3xl">{template.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-sm mb-1 group-hover:text-cyan-400 transition-colors truncate">
                            {template.name}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                            {template.category}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                        {template.description}
                      </p>

                      {template.frameworks && template.frameworks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {template.frameworks.slice(0, 2).map((fw, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                              {fw}
                            </span>
                          ))}
                          {template.frameworks.length > 2 && (
                            <span className="text-xs text-gray-500">+{template.frameworks.length - 2}</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-cyan-500/20">
                        <span>{template.variable_count} campos</span>
                        <span className="text-cyan-400 group-hover:translate-x-1 transition-transform">Usar →</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && selectedTemplate && (
        <TemplateModal
          template={selectedTemplate}
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onSubmit={handleTemplateSubmit}
        />
      )}
    </>
  );
}
