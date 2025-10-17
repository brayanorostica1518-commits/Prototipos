import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const barChartRef = useRef(null);
  const radarChartRef = useRef(null);

  useEffect(() => {
    fetchAnalysis();
  }, [sessionId]);

  const fetchAnalysis = async () => {
    try {
      const response = await axios.get(`${API}/sessions/${sessionId}/analysis`);
      setAnalysisData(response.data);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      toast.error("Error al cargar análisis");
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!analysisData) return;

    setExporting(true);
    toast.info("Generando reporte completo...");

    try {
      const doc = new jsPDF();
      let yPos = 20;

      // ===== PORTADA =====
      doc.setFillColor(59, 130, 246); // Blue
      doc.rect(0, 0, 210, 60, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.text("REPORTE DE ASSESSMENT", 105, 30, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text("Análisis de Cumplimiento Normativo", 105, 42, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      yPos = 75;
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 20, yPos);
      
      yPos += 10;
      doc.text(`ID de sesión: ${sessionId.substring(0, 8)}...`, 20, yPos);
      
      // Frameworks evaluados
      yPos += 15;
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("Marcos Normativos Evaluados:", 20, yPos);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      yPos += 8;
      (analysisData.frameworks || []).forEach((fw) => {
        doc.text(`• ${fw}`, 25, yPos);
        yPos += 6;
      });

      // ===== PÁGINA 2: RESUMEN EJECUTIVO =====
      doc.addPage();
      yPos = 20;
      
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("RESUMEN EJECUTIVO", 105, 10, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      yPos = 30;
      
      // Extract executive summary from analysis
      const analysisText = analysisData.analysis || '';
      const summaryMatch = analysisText.match(/1\. RESUMEN EJECUTIVO([\s\S]*?)(?=2\.|$)/i);
      const summaryText = summaryMatch ? summaryMatch[1].trim() : analysisText.substring(0, 500);
      
      doc.setFontSize(11);
      const splitSummary = doc.splitTextToSize(summaryText, 170);
      doc.text(splitSummary, 20, yPos);
      
      yPos += (splitSummary.length * 5) + 15;

      // Tabla de cumplimiento resumida
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      const complianceData = Object.entries(analysisData.compliance_scores || {}).map(([framework, score]) => {
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
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 20, right: 20 }
      });

      // ===== PÁGINA 3: GRÁFICAS =====
      doc.addPage();
      
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("ANÁLISIS VISUAL", 105, 10, { align: 'center' });
      
      yPos = 25;

      // Capturar gráficas como imágenes
      if (barChartRef.current) {
        try {
          const barCanvas = await html2canvas(barChartRef.current, { scale: 2 });
          const barImgData = barCanvas.toDataURL('image/png');
          doc.addImage(barImgData, 'PNG', 15, yPos, 180, 80);
          yPos += 90;
        } catch (e) {
          console.error("Error capturing bar chart:", e);
        }
      }

      if (radarChartRef.current) {
        try {
          const radarCanvas = await html2canvas(radarChartRef.current, { scale: 2 });
          const radarImgData = radarCanvas.toDataURL('image/png');
          doc.addImage(radarImgData, 'PNG', 15, yPos, 180, 80);
        } catch (e) {
          console.error("Error capturing radar chart:", e);
        }
      }

      // ===== PÁGINA 4: GAPS IDENTIFICADOS =====
      if (analysisData.gaps && analysisData.gaps.length > 0) {
        doc.addPage();
        
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text("GAPS IDENTIFICADOS", 105, 10, { align: 'center' });
        
        const gapsData = analysisData.gaps.map(gap => {
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
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 9, cellPadding: 5 }
        });
      }

      // ===== PÁGINAS SIGUIENTES: ANÁLISIS DETALLADO =====
      doc.addPage();
      
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("ANÁLISIS DETALLADO", 105, 10, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      yPos = 25;
      
      // Split analysis into sections
      const sections = analysisText.split(/(?=\d+\.\s+[A-ZÁÉÍÓÚÑ])/);
      
      sections.forEach((section, idx) => {
        if (!section.trim()) return;
        
        const lines = section.split('\n');
        
        lines.forEach((line) => {
          if (!line.trim()) {
            yPos += 3;
            return;
          }
          
          // Check if we need a new page
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          // Section headers
          if (line.match(/^\d+\.\s+[A-ZÁÉÍÓÚÑ]/)) {
            doc.setFontSize(13);
            doc.setTextColor(59, 130, 246);
            doc.text(line.trim(), 20, yPos);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            yPos += 8;
          }
          // Subsection headers
          else if (line.trim().match(/^[A-Z][^:]+:$/)) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(line.trim(), 20, yPos);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            yPos += 6;
          }
          // List items
          else if (line.trim().startsWith('-')) {
            const splitLine = doc.splitTextToSize(line.trim(), 165);
            doc.text(splitLine, 25, yPos);
            yPos += splitLine.length * 5;
          }
          // Regular text
          else {
            const splitLine = doc.splitTextToSize(line.trim(), 170);
            doc.text(splitLine, 20, yPos);
            yPos += splitLine.length * 5;
          }
        });
      });

      // ===== ÚLTIMA PÁGINA: PIE DE PÁGINA =====
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
        doc.text('Assessment AI - Reporte Confidencial', 20, 290);
      }

      doc.save(`Reporte-Assessment-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Reporte completo generado exitosamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el reporte");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  if (!analysisData || !analysisData.compliance_scores) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No hay datos de análisis</h2>
          <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Chat
          </Button>
        </Card>
      </div>
    );
  }

  // Prepare chart data
  const barChartData = Object.entries(analysisData.compliance_scores || {}).map(([framework, score]) => ({
    framework,
    cumplimiento: score
  }));

  const radarChartData = Object.entries(analysisData.compliance_scores || {}).map(([framework, score]) => ({
    subject: framework,
    A: score,
    fullMark: 100
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="shadow-sm"
              data-testid="back-to-chat-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
              Dashboard de Análisis
            </h1>
          </div>
          <Button
            onClick={exportToPDF}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
            data-testid="export-pdf-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        {/* Compliance Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {Object.entries(analysisData.compliance_scores || {}).map(([framework, score]) => (
            <Card key={framework} className="p-6 bg-white/80 backdrop-blur-sm shadow-lg animate-fade-in" data-testid={`compliance-card-${framework.toLowerCase().replace(/\s/g, '-')}`}>
              <h3 className="text-lg font-semibold mb-2 text-gray-700">{framework}</h3>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold text-blue-600" style={{ fontFamily: 'Space Grotesk' }}>
                  {score}
                </span>
                <span className="text-2xl text-gray-500 mb-1">%</span>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${score}%` }}
                ></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts */}
        {barChartData && barChartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Bar Chart */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg" data-testid="bar-chart">
              <h3 className="text-xl font-semibold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
                Comparativa de Cumplimiento
              </h3>
              <div ref={barChartRef} style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="framework" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="cumplimiento" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Radar Chart */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg" data-testid="radar-chart">
              <h3 className="text-xl font-semibold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
                Análisis Multidimensional
              </h3>
              <div ref={radarChartRef} style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" stroke="#6b7280" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" />
                    <Radar name="Cumplimiento" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* Gaps Table */}
        {analysisData.gaps && analysisData.gaps.length > 0 && (
          <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg mb-6" data-testid="gaps-table">
            <h3 className="text-xl font-semibold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
              Gaps Identificados
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Framework</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Descripción</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Severidad</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisData.gaps.map((gap, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="py-3 px-4 text-gray-700">{gap.framework}</td>
                      <td className="py-3 px-4 text-gray-600">{gap.description}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            gap.severity === "high"
                              ? "bg-red-100 text-red-700"
                              : gap.severity === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {gap.severity === "high" ? "Alta" : gap.severity === "medium" ? "Media" : "Baja"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Detailed Analysis */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg" data-testid="detailed-analysis">
          <h3 className="text-xl font-semibold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
            Análisis Detallado
          </h3>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{analysisData.analysis}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
