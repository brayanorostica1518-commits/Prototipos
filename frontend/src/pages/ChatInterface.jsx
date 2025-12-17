import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  FileText, Send, Upload, Sparkles, BarChart3, Loader2, 
  Menu, X, Plus, MessageSquare, FileCode, Shield, Terminal, Zap
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import secureAxios, { uploadFiles } from "@/utils/api";
import { isValidFileType, isValidFileSize } from "@/utils/security";
import TemplateLibrary from "@/components/TemplateLibrary";
import UserMenu from "@/components/UserMenu";
import OnboardingTour from "@/components/OnboardingTour";

const FRAMEWORKS = [
  { id: "ISO 27001", label: "ISO 27001 - Seguridad de la Información" },
  { id: "ISO 9001", label: "ISO 9001 - Gestión de Calidad" },
  { id: "ISO 45001", label: "ISO 45001 - Seguridad y Salud Ocupacional" },
  { id: "NIST CSF", label: "NIST CSF - Cybersecurity Framework" },
  { id: "COBIT", label: "COBIT - Gobernanza de TI" },
  { id: "SOC 2", label: "SOC 2 - Service Organization Control" },
  { id: "GDPR", label: "GDPR - Protección de Datos" },
  { id: "PCI DSS", label: "PCI DSS - Seguridad de Datos de Tarjetas" },
  { id: "OWASP Top 10", label: "OWASP Top 10 - Vulnerabilidades Web" },
  { id: "OWASP ASVS", label: "OWASP ASVS - Verificación de Seguridad" },
  { id: "OWASP Mobile", label: "OWASP Mobile - Seguridad Móvil" },
  { id: "MITRE ATT&CK", label: "MITRE ATT&CK - Tácticas y Técnicas" },
  { id: "CIS Controls", label: "CIS Controls - Controles Críticos" },
  { id: "SANS Top 25", label: "SANS Top 25 - Errores de Software" }
];

const formatAIResponse = (text) => {
  const lines = text.split('\n');
  const formatted = [];
  let inTable = false;
  let tableRows = [];
  
  const finalizeTable = (idx) => {
    if (tableRows.length > 0) {
      formatted.push(renderTable(tableRows, idx));
      tableRows = [];
      inTable = false;
    }
  };
  
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    // Detect table rows (including separator rows)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableRows.push(trimmed);
      return;
    } else if (inTable) {
      // End of table detected, render it before processing current line
      finalizeTable(idx);
    }
    
    // Section headers (ALL CAPS or numbered)
    if (trimmed.match(/^[0-9]+\\.\\s+[A-ZÁÉÍÓÚÑ\\s]+$/) || trimmed.match(/^[A-ZÁÉÍÓÚÑ\\s]{10,}$/)) {
      formatted.push(
        <div key={idx} className="section-divider">
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400" style={{ fontFamily: 'Orbitron, monospace' }}>
            {trimmed}
          </h3>
        </div>
      );
    } 
    // Subsection headers
    else if (trimmed.match(/^[A-Z][^:]+:$/)) {
      formatted.push(
        <div key={idx} className="mt-4 mb-2">
          <h4 className="text-lg font-semibold text-cyan-300">{trimmed}</h4>
        </div>
      );
    } 
    // List items
    else if (trimmed.startsWith('- ')) {
      formatted.push(
        <div key={idx} className="ml-4 mb-2 flex items-start gap-3">
          <span className="text-cyan-400 font-bold mt-1 text-lg">▸</span>
          <span className="text-base text-gray-200 flex-1 leading-relaxed">{trimmed.substring(2)}</span>
        </div>
      );
    } 
    // Framework with percentage
    else if (trimmed.match(/.*:\\s*\\d+%/)) {
      const [framework, percentage] = trimmed.split(':');
      formatted.push(
        <div key={idx} className="my-3 p-4 glass-card rounded-lg flex justify-between items-center border-2 border-cyan-500/40">
          <span className="font-semibold text-gray-100 text-base">{framework.trim()}</span>
          <span className="percentage-display">{percentage.trim()}</span>
        </div>
      );
    } 
    // Gap ID or control reference
    else if (trimmed.match(/^(GAP ID|Framework|Control|Gap|Impacto|Recomendación|Severidad|Plazo):/i)) {
      const [label, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim();
      formatted.push(
        <div key={idx} className="mb-2 flex gap-2">
          <span className="font-semibold text-cyan-400 min-w-[120px]">{label}:</span>
          <span className="text-gray-200">{value}</span>
        </div>
      );
    }
    // Regular text
    else if (trimmed.length > 0) {
      formatted.push(
        <p key={idx} className="text-base text-gray-200 leading-relaxed mb-3">
          {trimmed}
        </p>
      );
    } 
    // Empty line
    else {
      formatted.push(<div key={idx} className="h-2" />);
    }
  });
  
  // Render any remaining table at the end
  finalizeTable('final');
  
  return <div className="space-y-1">{formatted}</div>;
};

const renderTable = (rows, key) => {
  if (rows.length < 2) return null;
  
  const parseRow = (row) => {
    return row.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);
  };
  
  // Filter out separator rows first
  const validRows = rows.filter(row => {
    const trimmed = row.trim();
    // Filter out rows that are only dashes, equals, or colons
    return trimmed.length > 0 && 
           !trimmed.match(/^\|[\s\-:=]+\|$/) &&
           !trimmed.replace(/\|/g, '').match(/^[\s\-:=]+$/);
  });
  
  if (validRows.length < 2) return null;
  
  const headers = parseRow(validRows[0]);
  const dataRows = validRows.slice(1)
    .map(parseRow)
    .filter(row => row.length > 0 && row.some(cell => cell.length > 0));
  
  if (dataRows.length === 0 || headers.length === 0) return null;
  
  return (
    <div key={key} className="my-6 overflow-x-auto rounded-lg border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50">
            {headers.map((header, i) => (
              <th key={i} className="text-cyan-300 font-bold px-4 py-3 text-left border-b-2 border-cyan-500/50 text-sm uppercase tracking-wider" style={{ fontFamily: 'Orbitron, monospace' }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-gray-900/30">
          {dataRows.map((row, i) => (
            <tr key={i} className="hover:bg-cyan-500/10 transition-all duration-200 border-b border-cyan-500/10">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-gray-200 text-sm leading-relaxed">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function ChatInterface() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedFrameworks, setSelectedFrameworks] = useState(["ISO 27001"]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Cerrado por defecto en móvil
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showMobileFrameworks, setShowMobileFrameworks] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeApp = async () => {
      await loadSessions();
      // Solo crear sesión si no hay ninguna activa
      if (!sessionId) {
        await createSession();
      }
    };
    
    initializeApp();
    
    // Mostrar onboarding si es primera vez
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setTimeout(() => setShowOnboarding(true), 1000);
    }
  }, []); // Ejecutar solo una vez al montar

  const loadSessions = async () => {
    try {
      const response = await secureAxios.get('/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const createSession = async () => {
    // Prevenir múltiples llamadas simultáneas
    if (isCreatingSession) {
      console.log('Ya se está creando una sesión...');
      return;
    }
    
    try {
      setIsCreatingSession(true);
      const response = await secureAxios.post('/sessions');
      setSessionId(response.data.id);
      setMessages([]); // Limpiar mensajes de sesión anterior
      setUploadedFiles([]); // Limpiar archivos
      await loadSessions();
      toast.success('Nueva sesión creada');
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Error al crear la sesión");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const loadSession = async (sid) => {
    try {
      setSessionId(sid);
      const response = await secureAxios.get(`/sessions/${sid}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Error al cargar sesión');
    }
  };

  const onDrop = async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      if (!isValidFileType(file)) {
        toast.error(`Tipo de archivo no permitido: ${file.name}`);
        return;
      }
      if (!isValidFileSize(file)) {
        toast.error(`Archivo muy grande: ${file.name}`);
        return;
      }
    }

    try {
      const response = await uploadFiles(acceptedFiles);
      setUploadedFiles([...uploadedFiles, ...response.data.files]);
      toast.success(`${acceptedFiles.length} archivo(s) subido(s)`);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Error al subir archivos");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    }
  });

  const handleFrameworkChange = (frameworkId) => {
    if (selectedFrameworks.includes(frameworkId)) {
      setSelectedFrameworks(selectedFrameworks.filter(id => id !== frameworkId));
    } else {
      setSelectedFrameworks([...selectedFrameworks, frameworkId]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && uploadedFiles.length === 0) {
      toast.error("Por favor escribe un mensaje o sube archivos");
      return;
    }

    if (selectedFrameworks.length === 0) {
      toast.error("Selecciona al menos un marco normativo");
      return;
    }

    if (!sessionId) {
      toast.error("Sesión no inicializada");
      return;
    }

    setIsAnalyzing(true);

    const userMessage = {
      role: "user",
      content: inputMessage,
      file_names: uploadedFiles.map(f => f.original_name),
      timestamp: new Date().toISOString()
    };
    setMessages([...messages, userMessage]);

    try {
      const response = await secureAxios.post('/analyze', {
        session_id: sessionId,
        message: inputMessage,
        frameworks: selectedFrameworks,
        file_ids: uploadedFiles
      });

      setMessages(prev => [...prev, response.data.ai_response]);
      setInputMessage("");
      setUploadedFiles([]);
      toast.success("Análisis completado");
    } catch (error) {
      console.error("Error analyzing:", error);
      toast.error("Error al analizar");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTemplateSelect = (filledPrompt, frameworks) => {
    setInputMessage(filledPrompt);
    if (frameworks && frameworks.length > 0) {
      setSelectedFrameworks(frameworks);
    }
    toast.success('Plantilla cargada. Puedes editarla antes de enviar.');
  };

  const handleViewDashboard = () => {
    if (sessionId) {
      navigate(`/dashboard/${sessionId}`);
    }
  };

  return (
    <div className="min-h-screen cyber-grid bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - Desktop y Mobile */}
        <div className={`${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:relative inset-y-0 left-0 z-50 w-80 lg:w-64 xl:w-80 transition-transform duration-300 glass-card border-r border-cyan-500/20 flex flex-col bg-gray-900/95 lg:bg-transparent`}>
          {/* Overlay para cerrar en móvil */}
          {showSidebar && (
            <div 
              className="fixed inset-0 bg-black/60 lg:hidden -z-10" 
              onClick={() => setShowSidebar(false)}
            />
          )}
          
          <div className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-600/10 to-blue-600/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base lg:text-lg font-bold cyber-text" style={{ fontFamily: 'Orbitron, monospace' }}>
                  SESIONES
                </h2>
              </div>
              <Button onClick={() => setShowSidebar(false)} variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              onClick={createSession}
              className="w-full neon-button"
              data-testid="new-session-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Sesión
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {sessions.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  No hay sesiones aún
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      loadSession(session.id);
                      // Cerrar sidebar en móvil después de seleccionar
                      if (window.innerWidth < 1024) {
                        setShowSidebar(false);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all glass-card ${
                      session.id === sessionId ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/50 hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span className="text-white text-sm font-medium truncate">{session.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(session.updated_at).toLocaleDateString('es-ES', { 
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </button>
                ))
              )}
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - Responsive */}
          <div className="border-b border-cyan-500/20 glass-card p-3 lg:p-4">
            <div className="flex items-center justify-between gap-2">
              {/* Left Side */}
              <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                <Button 
                  onClick={() => setShowSidebar(true)} 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-cyan-400 flex-shrink-0 lg:hidden"
                >
                  <Menu className="w-5 h-5" />
                </Button>
                
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                  <div className="p-2 lg:p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/30 animate-glow flex-shrink-0">
                    <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base lg:text-2xl font-bold cyber-text-glow truncate" style={{ fontFamily: 'Orbitron, monospace' }}>
                      ASSESSMENT AI
                    </h1>
                    <p className="text-xs lg:text-sm text-cyan-400/70 hidden sm:flex items-center gap-2">
                      <span className="status-online"></span>
                      Sistema de Análisis
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Right Side */}
              <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                <Button 
                  onClick={() => setShowTemplateLibrary(true)} 
                  className="neon-button bg-gradient-to-r from-purple-600 to-pink-600 hidden sm:flex"
                  size="sm"
                >
                  <FileCode className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">Plantillas</span>
                </Button>
                <Button 
                  onClick={() => navigate('/reports')} 
                  className="neon-button bg-gradient-to-r from-green-600 to-emerald-600 hidden sm:flex"
                  size="sm"
                >
                  <FileText className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">Informes</span>
                </Button>
                {messages.length > 0 && (
                  <Button 
                    onClick={handleViewDashboard} 
                    className="neon-button hidden md:flex"
                    size="sm"
                  >
                    <BarChart3 className="w-4 h-4 lg:mr-2" />
                    <span className="hidden lg:inline">Dashboard</span>
                  </Button>
                )}
                <UserMenu />
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Frameworks Panel - Desktop only, modal on mobile */}
            <div className="hidden lg:block w-64 xl:w-80 border-r border-cyan-500/20 glass-card overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <Card className="p-4 glass-card border-cyan-500/30 shadow-lg">
                <h3 className="font-semibold text-lg mb-4 cyber-text flex items-center gap-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                  <Zap className="w-5 h-5" />
                  FRAMEWORKS
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {FRAMEWORKS.map((framework) => (
                    <div key={framework.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-cyan-500/10 transition-colors">
                      <Checkbox
                        id={framework.id}
                        checked={selectedFrameworks.includes(framework.id)}
                        onCheckedChange={() => handleFrameworkChange(framework.id)}
                        className="data-[state=checked]:bg-cyan-600 border-cyan-500/50"
                      />
                      <label htmlFor={framework.id} className="text-sm font-medium text-gray-300 cursor-pointer flex-1">
                        {framework.label}
                      </label>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 glass-card border-cyan-500/30 shadow-lg">
                <h3 className="font-semibold text-lg mb-4 cyber-text flex items-center gap-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                  <Upload className="w-5 h-5" />
                  ARCHIVOS
                </h3>
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${isDragActive ? "border-cyan-500 bg-cyan-500/10" : "border-cyan-500/30 hover:border-cyan-500/60 hover:bg-gray-800/30"}`}>
                  <input {...getInputProps()} />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                  <p className="text-sm text-gray-400">{isDragActive ? "Suelta aquí" : "Arrastra o haz clic"}</p>
                  <p className="text-xs text-gray-600 mt-1">PDF, Excel, Word, CSV</p>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 glass-card border-cyan-500/30 rounded-lg">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm text-gray-300 truncate">{file.original_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                    <div className="p-6 sm:p-8 glass-card rounded-2xl mb-4 sm:mb-6 border border-cyan-500/30 animate-glow">
                      <Sparkles className="w-12 h-12 sm:w-20 sm:h-20 text-cyan-400 mx-auto animate-pulse" />
                    </div>
                    <h2 className="text-xl sm:text-3xl font-bold cyber-text-glow mb-3 sm:mb-4" style={{ fontFamily: 'Orbitron, monospace' }}>
                      INICIA TU ANÁLISIS
                    </h2>
                    <p className="text-sm sm:text-base text-gray-400 max-w-md mb-6">
                      Sube documentos y selecciona marcos normativos
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={() => setShowTemplateLibrary(true)} 
                        className="neon-button bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        <FileCode className="w-4 h-4 mr-2" />
                        Usar plantilla
                      </Button>
                      <Button 
                        onClick={() => setShowOnboarding(true)}
                        variant="outline"
                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        Ver tutorial
                      </Button>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                      <div className={`max-w-full sm:max-w-[85%] lg:max-w-[80%] rounded-2xl p-4 sm:p-5 shadow-xl ${
                        msg.role === "user"
                          ? "chat-bubble-user"
                          : "chat-bubble-assistant"
                      }`}>
                        {msg.file_names && msg.file_names.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {msg.file_names.map((name, i) => (
                              <span key={i} className="chat-file-attachment">
                                📎 {name}
                              </span>
                            ))}
                          </div>
                        )}
                        {msg.role === "assistant" ? (
                          <div className="formatted-response">{formatAIResponse(msg.content)}</div>
                        ) : (
                          <p className="whitespace-pre-wrap text-base leading-relaxed font-medium">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isAnalyzing && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="glass-card rounded-2xl p-4 border-cyan-500/20">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        <span className="text-sm text-gray-400">Analizando...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-cyan-500/20 p-3 sm:p-4 glass-card">
                <div className="flex gap-2 sm:gap-3 items-end">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Describe tu assessment..."
                    className="flex-1 min-h-[60px] sm:min-h-[80px] resize-none bg-gray-900/50 border-cyan-500/30 text-white placeholder:text-gray-600 focus:border-cyan-500 text-sm sm:text-base"
                    disabled={isAnalyzing}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isAnalyzing} 
                    className="neon-button h-[60px] sm:h-[80px] px-4 sm:px-6 flex-shrink-0"
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Botones flotantes para móvil - Mejor posicionados */}
        <div className="lg:hidden fixed bottom-24 right-4 z-40 flex flex-col gap-3">
          {/* Botón de Frameworks */}
          <Button
            onClick={() => setShowMobileFrameworks(true)}
            className="neon-button rounded-full w-14 h-14 p-0 shadow-2xl shadow-cyan-500/50"
            title="Frameworks y Archivos"
          >
            <Zap className="w-6 h-6" />
          </Button>
          
          {/* Botón de ayuda/tutorial */}
          <Button
            onClick={() => setShowOnboarding(true)}
            className="bg-purple-600 hover:bg-purple-700 rounded-full w-12 h-12 p-0 shadow-lg shadow-purple-500/50"
            title="Tutorial"
          >
            <span className="text-lg">?</span>
          </Button>
        </div>
      </div>

      {/* Modal de Frameworks para Móvil */}
      {showMobileFrameworks && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/80" onClick={() => setShowMobileFrameworks(false)} />
          <div className="relative w-full sm:max-w-lg bg-gray-900 border border-cyan-500/30 rounded-t-3xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto custom-scrollbar animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold cyber-text" style={{ fontFamily: 'Orbitron, monospace' }}>
                FRAMEWORKS & ARCHIVOS
              </h3>
              <Button onClick={() => setShowMobileFrameworks(false)} variant="ghost" size="sm">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Frameworks */}
            <Card className="p-4 glass-card border-cyan-500/30 shadow-lg mb-4">
              <h4 className="font-semibold text-base mb-4 cyber-text flex items-center gap-2">
                <Zap className="w-4 h-4" />
                FRAMEWORKS
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {FRAMEWORKS.map((framework) => (
                  <div key={framework.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-cyan-500/10 transition-colors">
                    <Checkbox
                      id={`mobile-${framework.id}`}
                      checked={selectedFrameworks.includes(framework.id)}
                      onCheckedChange={() => handleFrameworkChange(framework.id)}
                      className="data-[state=checked]:bg-cyan-600 border-cyan-500/50"
                    />
                    <label htmlFor={`mobile-${framework.id}`} className="text-sm font-medium text-gray-300 cursor-pointer flex-1">
                      {framework.label}
                    </label>
                  </div>
                ))}
              </div>
            </Card>

            {/* Upload de Archivos */}
            <Card className="p-4 glass-card border-cyan-500/30 shadow-lg">
              <h4 className="font-semibold text-base mb-4 cyber-text flex items-center gap-2">
                <Upload className="w-4 h-4" />
                ARCHIVOS
              </h4>
              <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${isDragActive ? "border-cyan-500 bg-cyan-500/10" : "border-cyan-500/30 hover:border-cyan-500/60 hover:bg-gray-800/30"}`}>
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                <p className="text-sm text-gray-400">{isDragActive ? "Suelta aquí" : "Arrastra o haz clic"}</p>
                <p className="text-xs text-gray-600 mt-1">PDF, Excel, Word, CSV</p>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 glass-card border-cyan-500/30 rounded-lg">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-gray-300 truncate">{file.original_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={handleTemplateSelect}
      />
      
      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour 
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
