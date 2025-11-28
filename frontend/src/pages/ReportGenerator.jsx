import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import secureAxios from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, FileText, Download, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

const REPORT_TYPES = [
  { id: "executive", label: "Informe Ejecutivo", description: "Resumen de alto nivel para directivos" },
  { id: "technical", label: "Técnico Detallado", description: "Análisis técnico profundo con detalles de implementación" },
  { id: "compliance", label: "De Cumplimiento", description: "Enfocado en cumplimiento normativo y gaps" },
  { id: "action", label: "Plan de Acción", description: "Roadmap de implementación con prioridades y plazos" }
];

const REPORT_SECTIONS = [
  { id: "executive_summary", label: "Resumen Ejecutivo", required: true },
  { id: "compliance_overview", label: "Overview de Cumplimiento", required: true },
  { id: "detailed_findings", label: "Hallazgos Detallados", required: false },
  { id: "risk_assessment", label: "Evaluación de Riesgos", required: false },
  { id: "action_plan", label: "Plan de Acción", required: false },
  { id: "annexes", label: "Anexos y Apéndices", required: false }
];

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

export default function ReportGenerator() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [reportType, setReportType] = useState("");
  const [selectedSections, setSelectedSections] = useState(
    REPORT_SECTIONS.filter(s => s.required).map(s => s.id)
  );
  const [activeTab, setActiveTab] = useState("preview");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadSessionData(selectedSession);
    }
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await secureAxios.get('/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("Error al cargar las sesiones");
    } finally {
      setLoading(false);
    }
  };

  const loadSessionData = async (sessionId) => {
    try {
      setLoading(true);
      const response = await secureAxios.get(`/sessions/${sessionId}/analysis`);
      if (response.data && Object.keys(response.data).length > 0) {
        setSessionData(response.data);
      } else {
        toast.warning("Esta sesión no tiene análisis completado");
        setSessionData(null);
      }
    } catch (error) {
      console.error("Error loading session data:", error);
      toast.error("Error al cargar los datos de la sesión");
      setSessionData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId) => {
    const section = REPORT_SECTIONS.find(s => s.id === sectionId);
    if (section?.required) return; // Can't toggle required sections

    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const generatePDF = async () => {
    if (!selectedSession || !reportType || !sessionData) {
      toast.error("Por favor selecciona un assessment y tipo de informe");
      return;
    }

    setGenerating(true);
    toast.info("Generando informe PDF...");

    try {
      const doc = new jsPDF();
      let yPos = 20;

      // ===== PORTADA =====
      doc.setFillColor(6, 182, 212); // Cyan
      doc.rect(0, 0, 210, 60, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      const reportTypeLabel = REPORT_TYPES.find(t => t.id === reportType)?.label || "Informe";
      doc.text(reportTypeLabel.toUpperCase(), 105, 30, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text("Assessment de Seguridad y Cumplimiento", 105, 42, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      yPos = 75;
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 20, yPos);
      
      yPos += 10;
      doc.text(`ID de sesión: ${selectedSession.substring(0, 8)}...`, 20, yPos);
      
      // Frameworks evaluados
      yPos += 15;
      doc.setFontSize(14);
      doc.setTextColor(6, 182, 212);
      doc.text("Marcos Normativos Evaluados:", 20, yPos);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      yPos += 8;
      (sessionData.frameworks || []).forEach((fw) => {
        doc.text(`• ${fw}`, 25, yPos);
        yPos += 6;
      });

      // ===== PÁGINA 2: RESUMEN EJECUTIVO =====
      if (selectedSections.includes('executive_summary')) {
        doc.addPage();
        yPos = 20;
        
        doc.setFillColor(6, 182, 212);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text("RESUMEN EJECUTIVO", 105, 10, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
        yPos = 30;
        
        const analysisText = sessionData.analysis || '';
        const summaryMatch = analysisText.match(/1\. RESUMEN EJECUTIVO([\s\S]*?)(?=2\.|$)/i);
        const summaryText = summaryMatch ? summaryMatch[1].trim() : analysisText.substring(0, 500);
        
        doc.setFontSize(11);
        const splitSummary = doc.splitTextToSize(summaryText, 170);
        doc.text(splitSummary, 20, yPos);
      }

      // ===== COMPLIANCE OVERVIEW CON GRÁFICOS =====
      if (selectedSections.includes('compliance_overview')) {
        doc.addPage();
        
        doc.setFillColor(6, 182, 212);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text("OVERVIEW DE CUMPLIMIENTO", 105, 10, { align: 'center' });
        
        yPos = 25;

        // Tabla de cumplimiento
        const complianceData = Object.entries(sessionData.compliance_scores || {}).map(([framework, score]) => {
          let status = "Crítico";
          let color = [220, 38, 38];
          if (score >= 80) {
            status = "Excelente";
            color = [34, 197, 94];
          } else if (score >= 60) {
            status = "Aceptable";
            color = [234, 179, 8];
          } else if (score >= 40) {
            status = "Bajo";
            color = [249, 115, 22];
          }
          
          return [framework, `${score}%`, { content: status, styles: { textColor: color, fontStyle: 'bold' } }];
        });
        
        autoTable(doc, {
          startY: yPos,
          head: [['Marco Normativo', 'Cumplimiento', 'Estado']],
          body: complianceData,
          headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 20, right: 20 }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // Capturar gráficos
        if (pieChartRef.current) {
          try {
            const pieCanvas = await html2canvas(pieChartRef.current, { scale: 2 });
            const pieImgData = pieCanvas.toDataURL('image/png');
            
            if (yPos > 180) {
              doc.addPage();
              yPos = 20;
            }
            
            doc.addImage(pieImgData, 'PNG', 15, yPos, 180, 90);
            yPos += 95;
          } catch (e) {
            console.error("Error capturing pie chart:", e);
          }
        }
      }

      // ===== DETAILED FINDINGS =====
      if (selectedSections.includes('detailed_findings') && sessionData.gaps && sessionData.gaps.length > 0) {
        doc.addPage();
        
        doc.setFillColor(6, 182, 212);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text("HALLAZGOS DETALLADOS", 105, 10, { align: 'center' });
        
        const gapsData = sessionData.gaps.map(gap => {
          const severityText = gap.severity === "high" ? "Alta" : gap.severity === "medium" ? "Media" : "Baja";
          const severityColor = gap.severity === "high" ? [220, 38, 38] : gap.severity === "medium" ? [234, 179, 8] : [34, 197, 94];
          
          return [
            gap.framework,
            { content: gap.description, styles: { cellWidth: 90 } },
            { content: severityText, styles: { textColor: severityColor, fontStyle: 'bold', halign: 'center' } }
          ];
        });
        
        autoTable(doc, {
          startY: 25,
          head: [['Framework', 'Descripción del Gap', 'Severidad']],
          body: gapsData,
          headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 9, cellPadding: 5 }
        });
      }

      // ===== ACTION PLAN =====
      if (selectedSections.includes('action_plan')) {
        doc.addPage();
        
        doc.setFillColor(6, 182, 212);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text("PLAN DE ACCIÓN", 105, 10, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        yPos = 30;
        
        const actionPlanText = `
Plan de Acción Recomendado:

Corto Plazo (0-3 meses):
• Implementar autenticación multifactor (MFA) en todos los sistemas críticos
• Realizar auditoría completa de permisos y accesos privilegiados
• Establecer proceso formal de gestión de vulnerabilidades

Mediano Plazo (3-6 meses):
• Implementar sistema de monitoreo y detección de amenazas (SIEM)
• Actualizar y documentar políticas de seguridad de la información
• Realizar capacitación de concienciación en seguridad para todo el personal

Largo Plazo (6-12 meses):
• Obtener certificación ISO 27001
• Implementar programa de respuesta a incidentes
• Establecer proceso de mejora continua
        `.trim();
        
        const splitPlan = doc.splitTextToSize(actionPlanText, 170);
        doc.text(splitPlan, 20, yPos);
      }

      // ===== PIE DE PÁGINA =====
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
        doc.text('Assessment AI - Reporte Confidencial', 20, 290);
      }

      doc.save(`Informe-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Informe PDF generado exitosamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el informe");
    } finally {
      setGenerating(false);
    }
  };

  const exportToExcel = async () => {
    if (!selectedSession || !sessionData) {
      toast.error("Por favor selecciona un assessment");
      return;
    }

    try {
      const response = await secureAxios.post('/export/word', 
        { session_id: selectedSession },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Datos-Assessment-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Datos exportados a Excel exitosamente');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al exportar a Excel');
    }
  };

  // Prepare pie chart data
  const pieChartData = sessionData ? Object.entries(sessionData.compliance_scores || {}).map(([name, value]) => ({
    name,
    value
  })) : [];

  return (
    <div className="min-h-screen cyber-grid bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/30">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold cyber-text-glow" style={{ fontFamily: 'Orbitron, monospace' }}>
                  GENERACIÓN DE INFORMES
                </h1>
                <p className="text-sm text-gray-400 mt-1">Genera informes profesionales y exporta datos de tus assessments de seguridad</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-1">
            <Card className="p-6 glass-card border-cyan-500/30">
              <h2 className="text-xl font-bold text-cyan-300 mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                CONFIGURACIÓN DEL INFORME
              </h2>
              <p className="text-sm text-gray-400 mb-6">Personaliza tu informe según tus necesidades</p>

              {/* Assessment Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-cyan-300 mb-2">Assessment Base</label>
                <select
                  value={selectedSession || ""}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full bg-gray-800/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
                  disabled={loading}
                >
                  <option value="">Seleccionar assessment</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title} - {new Date(session.created_at).toLocaleDateString('es-ES')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Report Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-cyan-300 mb-2">Tipo de Informe</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-gray-800/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Seleccionar tipo</option>
                  {REPORT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {reportType && (
                  <p className="text-xs text-gray-400 mt-2">
                    {REPORT_TYPES.find(t => t.id === reportType)?.description}
                  </p>
                )}
              </div>

              {/* Sections Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-cyan-300 mb-3">Secciones del Informe</label>
                <div className="space-y-3">
                  {REPORT_SECTIONS.map((section) => (
                    <div key={section.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={section.id}
                        checked={selectedSections.includes(section.id)}
                        onCheckedChange={() => toggleSection(section.id)}
                        disabled={section.required}
                        className="border-cyan-500/50"
                      />
                      <label
                        htmlFor={section.id}
                        className={`text-sm ${
                          section.required ? 'text-gray-300 font-semibold' : 'text-gray-400'
                        } cursor-pointer flex items-center gap-2`}
                      >
                        {section.label}
                        {section.required && (
                          <>
                            <span className="text-xs text-cyan-400">(requerido)</span>
                            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                          </>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-cyan-500/20">
                <Button
                  onClick={generatePDF}
                  disabled={!selectedSession || !reportType || generating}
                  className="w-full neon-button bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                >
                  {generating ? (
                    <>
                      <FileText className="w-4 h-4 mr-2 animate-pulse" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generar Informe PDF
                    </>
                  )}
                </Button>

                <Button
                  onClick={exportToExcel}
                  disabled={!selectedSession || generating}
                  variant="outline"
                  className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar a Excel
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-2">
            <Card className="glass-card border-cyan-500/30 min-h-[600px]">
              {/* Tabs */}
              <div className="flex border-b border-cyan-500/20">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-6 py-3 text-sm font-semibold transition-colors ${
                    activeTab === "preview"
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Vista Previa
                </button>
                <button
                  onClick={() => setActiveTab("templates")}
                  className={`px-6 py-3 text-sm font-semibold transition-colors ${
                    activeTab === "templates"
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Plantillas
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-6 py-3 text-sm font-semibold transition-colors ${
                    activeTab === "history"
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Historial
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "preview" && (
                  <>
                    {!selectedSession || !reportType || !sessionData ? (
                      <div className="flex flex-col items-center justify-center h-96">
                        <div className="p-6 bg-cyan-500/10 rounded-full mb-4">
                          <FileText className="w-16 h-16 text-cyan-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-cyan-300 mb-2">Vista Previa del Informe</h3>
                        <p className="text-gray-400 text-center">
                          Selecciona un assessment y tipo de informe para ver la vista previa
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Report Header */}
                        <div className="border-b border-cyan-500/20 pb-4">
                          <h2 className="text-2xl font-bold text-cyan-300 mb-2">
                            {REPORT_TYPES.find(t => t.id === reportType)?.label}
                          </h2>
                          <p className="text-sm text-gray-400">
                            Fecha: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>

                        {/* Compliance Overview with Pie Chart */}
                        {sessionData.compliance_scores && Object.keys(sessionData.compliance_scores).length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-cyan-300 mb-4">Resumen de Cumplimiento</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Pie Chart */}
                              <div ref={pieChartRef} className="bg-gray-800/30 p-4 rounded-lg border border-cyan-500/20">
                                <ResponsiveContainer width="100%" height={300}>
                                  <PieChart>
                                    <Pie
                                      data={pieChartData}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                                        border: '1px solid #06b6d4',
                                        borderRadius: '8px',
                                        color: '#fff'
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>

                              {/* Compliance Cards */}
                              <div className="space-y-3">
                                {Object.entries(sessionData.compliance_scores).map(([framework, score]) => (
                                  <div key={framework} className="bg-gray-800/30 p-4 rounded-lg border border-cyan-500/20">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-semibold text-gray-300">{framework}</span>
                                      <span className="text-lg font-bold text-cyan-400">{score}%</span>
                                    </div>
                                    <div className="mt-2 w-full bg-gray-700/50 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all"
                                        style={{ width: `${score}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Gaps Summary */}
                        {sessionData.gaps && sessionData.gaps.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-cyan-300 mb-4">Gaps Críticos ({sessionData.gaps.length})</h3>
                            <div className="space-y-3">
                              {sessionData.gaps.slice(0, 3).map((gap, idx) => (
                                <div key={idx} className="bg-gray-800/30 p-4 rounded-lg border border-cyan-500/20">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-semibold text-gray-300">{gap.framework}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      gap.severity === "high" 
                                        ? "bg-red-500/20 text-red-400" 
                                        : gap.severity === "medium"
                                        ? "bg-yellow-500/20 text-yellow-400"
                                        : "bg-green-500/20 text-green-400"
                                    }`}>
                                      {gap.severity === "high" ? "Alta" : gap.severity === "medium" ? "Media" : "Baja"}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-400">{gap.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "templates" && (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">Plantillas Predefinidas</h3>
                    <p className="text-gray-400">Próximamente: Guarda y reutiliza configuraciones de informes</p>
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-cyan-400 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">Historial de Informes</h3>
                    <p className="text-gray-400">Próximamente: Accede a informes generados previamente</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
