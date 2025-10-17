import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const exportToPDF = () => {
    if (!analysisData) return;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text("Reporte de Assessment", 20, 20);
    
    // Date
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 30);
    
    // Compliance Scores Table
    doc.setFontSize(14);
    doc.text("Niveles de Cumplimiento", 20, 45);
    
    const complianceData = Object.entries(analysisData.compliance_scores || {}).map(([framework, score]) => [
      framework,
      `${score}%`
    ]);
    
    doc.autoTable({
      startY: 50,
      head: [['Marco Normativo', 'Cumplimiento']],
      body: complianceData,
    });
    
    // Gaps Table
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.text("Gaps Identificados", 20, finalY);
    
    const gapsData = (analysisData.gaps || []).map(gap => [
      gap.framework,
      gap.description,
      gap.severity
    ]);
    
    doc.autoTable({
      startY: finalY + 5,
      head: [['Framework', 'Descripción', 'Severidad']],
      body: gapsData,
      styles: { fontSize: 9 }
    });
    
    // Analysis Text
    finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text("Análisis Detallado", 20, finalY);
    
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(analysisData.analysis || '', 170);
    doc.text(splitText, 20, finalY + 7);
    
    doc.save(`assessment-report-${sessionId}.pdf`);
    toast.success("Reporte exportado exitosamente");
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Bar Chart */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg" data-testid="bar-chart">
            <h3 className="text-xl font-semibold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
              Comparativa de Cumplimiento
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
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
          </Card>

          {/* Radar Chart */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg" data-testid="radar-chart">
            <h3 className="text-xl font-semibold mb-4 text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
              Análisis Multidimensional
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarChartData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" stroke="#6b7280" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" />
                <Radar name="Cumplimiento" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>

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
