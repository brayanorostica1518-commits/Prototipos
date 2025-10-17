import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FileText, Send, Upload, Sparkles, BarChart3, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FRAMEWORKS = [
  { id: "ISO 27001", label: "ISO 27001 - Seguridad de la Información" },
  { id: "ISO 9001", label: "ISO 9001 - Gestión de Calidad" },
  { id: "ISO 45001", label: "ISO 45001 - Seguridad y Salud Ocupacional" },
  { id: "NIST CSF", label: "NIST CSF - Cybersecurity Framework" },
  { id: "COBIT", label: "COBIT - Gobernanza de TI" },
  { id: "SOC 2", label: "SOC 2 - Service Organization Control" },
  { id: "GDPR", label: "GDPR - Protección de Datos" },
  { id: "PCI DSS", label: "PCI DSS - Seguridad de Datos de Tarjetas" }
];

export default function ChatInterface() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedFrameworks, setSelectedFrameworks] = useState(["ISO 27001"]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    createSession();
  }, []);

  const createSession = async () => {
    try {
      const response = await axios.post(`${API}/sessions`);
      setSessionId(response.data.id);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Error al crear la sesión");
    }
  };

  const onDrop = async (acceptedFiles) => {
    const formData = new FormData();
    acceptedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploadedFiles([...uploadedFiles, ...response.data.files]);
      toast.success(`${acceptedFiles.length} archivo(s) subido(s) exitosamente`);
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
      toast.error("Por favor selecciona al menos un marco normativo");
      return;
    }

    if (!sessionId) {
      toast.error("Sesión no inicializada");
      return;
    }

    setIsAnalyzing(true);

    // Add user message to UI immediately
    const userMessage = {
      role: "user",
      content: inputMessage,
      file_names: uploadedFiles.map(f => f.original_name),
      timestamp: new Date().toISOString()
    };
    setMessages([...messages, userMessage]);

    try {
      const response = await axios.post(`${API}/analyze`, {
        session_id: sessionId,
        message: inputMessage,
        frameworks: selectedFrameworks,
        file_ids: uploadedFiles
      });

      // Add AI response to messages
      setMessages(prev => [...prev, response.data.ai_response]);
      
      // Clear input and files
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

  const handleViewDashboard = () => {
    if (sessionId) {
      navigate(`/dashboard/${sessionId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
                  Assessment AI
                </h1>
                <p className="text-sm text-gray-600">Análisis inteligente de cumplimiento normativo</p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                onClick={handleViewDashboard}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                data-testid="view-dashboard-btn"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Ver Dashboard
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            {/* Framework Selection */}
            <Card className="p-5 bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg animate-slide-in" data-testid="framework-selector">
              <h3 className="font-semibold text-lg mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
                Marcos Normativos
              </h3>
              <div className="space-y-3">
                {FRAMEWORKS.map((framework) => (
                  <div key={framework.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                    <Checkbox
                      id={framework.id}
                      checked={selectedFrameworks.includes(framework.id)}
                      onCheckedChange={() => handleFrameworkChange(framework.id)}
                      className="data-[state=checked]:bg-blue-600"
                      data-testid={`framework-${framework.id.toLowerCase().replace(/\s/g, '-')}`}
                    />
                    <label
                      htmlFor={framework.id}
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      {framework.label}
                    </label>
                  </div>
                ))}
              </div>
            </Card>

            {/* File Upload */}
            <Card className="p-5 bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg" data-testid="file-upload-area">
              <h3 className="font-semibold text-lg mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
                Archivos
              </h3>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {isDragActive ? "Suelta los archivos aquí" : "Arrastra archivos o haz clic"}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, Excel, Word, CSV</p>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700 truncate">{file.original_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-9">
            <Card className="h-[calc(100vh-200px)] flex flex-col bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg" data-testid="chat-area">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
                      <Sparkles className="w-16 h-16 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                      Comienza tu análisis
                    </h2>
                    <p className="text-gray-600 max-w-md">
                      Sube tus documentos de assessment y selecciona los marcos normativos que deseas evaluar
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                      data-testid={`message-${msg.role}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-900 shadow-sm"
                        }`}
                      >
                        {msg.file_names && msg.file_names.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {msg.file_names.map((name, i) => (
                              <span key={i} className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                📎 {name}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isAnalyzing && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-600">Analizando...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4 bg-white/50">
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
                    placeholder="Describe tu assessment o solicita análisis específicos..."
                    className="flex-1 min-h-[80px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isAnalyzing}
                    data-testid="message-input"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isAnalyzing}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-[80px] px-6 shadow-md"
                    data-testid="send-message-btn"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
