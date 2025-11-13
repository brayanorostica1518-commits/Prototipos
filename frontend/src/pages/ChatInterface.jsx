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
  
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    if (trimmed.match(/^[0-9]+\\.\\s+[A-ZÁÉÍÓÚÑ\\s]+$/) || trimmed.match(/^[A-ZÁÉÍÓÚÑ\\s]{10,}$/)) {
      formatted.push(
        <div key={idx} className="mt-6 mb-3 pb-2 border-b-2 border-cyan-500/30">
          <h3 className="text-lg font-bold cyber-text-glow" style={{ fontFamily: 'Orbitron, monospace' }}>
            {trimmed}
          </h3>
        </div>
      );
    } else if (trimmed.match(/^[A-Z][^:]+:$/)) {
      formatted.push(
        <div key={idx} className="mt-4 mb-2">
          <h4 className="text-base font-semibold text-cyan-300">{trimmed}</h4>
        </div>
      );
    } else if (trimmed.startsWith('- ')) {
      formatted.push(
        <div key={idx} className="ml-4 mb-1 flex items-start gap-2">
          <span className="text-cyan-400 font-bold mt-1">▸</span>
          <span className="text-sm text-gray-400 flex-1">{trimmed.substring(2)}</span>
        </div>
      );
    } else if (trimmed.match(/.*:\\s*\\d+%/)) {
      const [framework, percentage] = trimmed.split(':');
      formatted.push(
        <div key={idx} className="my-2 p-3 glass-card rounded-lg flex justify-between items-center">
          <span className="font-semibold text-gray-300">{framework.trim()}</span>
          <span className="text-2xl font-bold cyber-text" style={{ fontFamily: 'Orbitron, monospace' }}>
            {percentage.trim()}
          </span>
        </div>
      );
    } else if (trimmed.length > 0) {
      formatted.push(
        <p key={idx} className="text-sm text-gray-400 leading-relaxed mb-2">
          {trimmed}
        </p>
      );
    } else {
      formatted.push(<div key={idx} className="h-2" />);
    }
  });
  
  return <div className="space-y-1">{formatted}</div>;
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSessions();
    createSession();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await secureAxios.get('/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createSession = async () => {
    try {
      const response = await secureAxios.post('/sessions');
      setSessionId(response.data.id);
      loadSessions();
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Error al crear la sesión");
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
        toast.error(\`Tipo de archivo no permitido: \${file.name}\`);
        return;
      }
      if (!isValidFileSize(file)) {
        toast.error(\`Archivo muy grande: \${file.name}\`);
        return;
      }
    }

    try {
      const response = await uploadFiles(acceptedFiles);
      setUploadedFiles([...uploadedFiles, ...response.data.files]);
      toast.success(\`\${acceptedFiles.length} archivo(s) subido(s)\`);
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
      navigate(\`/dashboard/\${sessionId}\`);
    }
  };

  return (
    <div className="min-h-screen cyber-grid bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={\`\${
          showSidebar ? 'w-80' : 'w-0'
        } transition-all duration-300 glass-card border-r border-cyan-500/20 overflow-hidden flex flex-col\`}>
          {showSidebar && (
            <>
              <div className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-600/10 to-blue-600/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold cyber-text" style={{ fontFamily: 'Orbitron, monospace' }}>
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
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={\`w-full text-left p-3 rounded-lg transition-all glass-card \${
                      session.id === sessionId ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/50 hover:border-cyan-500/50'
                    }\`}
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
                ))}
              </div>
            </>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-cyan-500/20 glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {!showSidebar && (
                  <Button onClick={() => setShowSidebar(true)} variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400">
                    <Menu className="w-5 h-5" />
                  </Button>
                )}
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/30 animate-glow">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold cyber-text-glow" style={{ fontFamily: 'Orbitron, monospace' }}>
                      ASSESSMENT AI
                    </h1>
                    <p className="text-sm text-cyan-400/70 flex items-center gap-2">
                      <span className="status-online"></span>
                      Sistema de Análisis de Cumplimiento
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowTemplateLibrary(true)} className="neon-button bg-gradient-to-r from-purple-600 to-pink-600">
                  <FileCode className="w-4 h-4 mr-2" />
                  Plantillas
                </Button>
                {messages.length > 0 && (
                  <Button onClick={handleViewDashboard} className="neon-button">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Frameworks Panel */}
            <div className="w-80 border-r border-cyan-500/20 glass-card overflow-y-auto p-4 space-y-4 custom-scrollbar">
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
                <div {...getRootProps()} className={\`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all \${isDragActive ? "border-cyan-500 bg-cyan-500/10" : "border-cyan-500/30 hover:border-cyan-500/60 hover:bg-gray-800/30"}\`}>
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
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-8 glass-card rounded-2xl mb-4 border border-cyan-500/30 animate-glow">
                      <Sparkles className="w-20 h-20 text-cyan-400 mx-auto animate-pulse" />
                    </div>
                    <h2 className="text-3xl font-bold cyber-text-glow mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                      INICIA TU ANÁLISIS
                    </h2>
                    <p className="text-gray-400 max-w-md mb-4">
                      Sube documentos y selecciona marcos normativos
                    </p>
                    <Button onClick={() => setShowTemplateLibrary(true)} className="neon-button bg-gradient-to-r from-purple-600 to-pink-600">
                      <FileCode className="w-4 h-4 mr-2" />
                      O usa una plantilla
                    </Button>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={\`flex \${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in\`}>
                      <div className={\`max-w-[80%] rounded-2xl p-4 shadow-lg \${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-500/50"
                          : "glass-card border-cyan-500/20"
                      }\`}>
                        {msg.file_names && msg.file_names.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {msg.file_names.map((name, i) => (
                              <span key={i} className="text-xs bg-white/20 px-2 py-1 rounded-full border border-white/30">
                                📎 {name}
                              </span>
                            ))}
                          </div>
                        )}
                        {msg.role === "assistant" ? (
                          <div className="formatted-response">{formatAIResponse(msg.content)}</div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
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
              <div className="border-t border-cyan-500/20 p-4 glass-card">
                <div className="flex gap-3">
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
                    className="flex-1 min-h-[80px] resize-none bg-gray-900/50 border-cyan-500/30 text-white placeholder:text-gray-600 focus:border-cyan-500"
                    disabled={isAnalyzing}
                  />
                  <Button onClick={handleSendMessage} disabled={isAnalyzing} className="neon-button h-[80px] px-6">
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
}
