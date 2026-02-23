import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import secureAxios from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  FileText,
  Download,
  Upload,
  Building2,
  User,
  Shield,
  Tag,
  Image,
  Loader2,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";

export default function ReportGenerator() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef(null);

  // Client info form
  const [clientName, setClientName] = useState("");
  const [unit, setUnit] = useState("");
  const [evaluator, setEvaluator] = useState("");
  const [classification, setClassification] = useState("CONFIDENCIAL");
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) loadSessionData(selectedSession);
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await secureAxios.get("/sessions");
      setSessions(response.data);
    } catch {
      toast.error("Error al cargar sesiones");
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
    } catch {
      toast.error("Error al cargar datos de la sesión");
      setSessionData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El logo no debe superar 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target.result);
      setLogoBase64(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const canGenerate = selectedSession && clientName.trim() && sessionData;

  const generateReport = async (format = "docx") => {
    if (!canGenerate) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    setGenerating(true);
    toast.info("Generando informe profesional...");

    try {
      const response = await secureAxios.post(
        "/reports/generate",
        {
          session_id: selectedSession,
          format,
          client_info: {
            client_name: clientName,
            unit,
            evaluator: evaluator || "SmartSecAssess",
            classification,
          },
          logo_base64: logoBase64,
        },
        { responseType: "blob", timeout: 120000 }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const ext = format === "pdf" ? "pdf" : "docx";
      const safeName = clientName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").substring(0, 30);
      link.setAttribute("download", `Informe_Auditoria_${safeName}_${new Date().toISOString().split("T")[0]}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Informe ${ext.toUpperCase()} generado exitosamente`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Error al generar el informe");
    } finally {
      setGenerating(false);
    }
  };

  // Stats from session data
  const scores = sessionData?.compliance_scores || {};
  const expandedFindings = sessionData?.expanded_findings || [];
  const gaps = sessionData?.gaps || [];
  const findingsCount = expandedFindings.length || gaps.length;
  const critCount = expandedFindings.filter((f) => f.severity === "critical").length;
  const majCount = expandedFindings.filter((f) => f.severity === "major").length;
  const minCount = expandedFindings.filter((f) => f.severity === "minor").length;
  const avgScore = Object.values(scores).length > 0
    ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)
    : 0;

  return (
    <div className="min-h-screen cyber-grid bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            data-testid="report-back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "Orbitron, monospace" }}>
              GENERADOR DE INFORMES
            </h1>
            <p className="text-sm text-gray-400">Documento ejecutivo corporativo estilo Big4</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Configuration */}
          <div className="lg:col-span-2 space-y-5">
            {/* Assessment Selection */}
            <Card className="p-5 glass-card border-cyan-500/20" data-testid="assessment-select-card">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Assessment Base</h3>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition-colors"
                data-testid="session-select"
              >
                <option value="">Seleccionar assessment...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} - {new Date(s.created_at).toLocaleDateString("es-ES")}
                  </option>
                ))}
              </select>
              {sessionData && (
                <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-xs text-green-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{findingsCount} hallazgos | {Object.keys(scores).length} framework(s) | {avgScore}% cumplimiento</span>
                </div>
              )}
            </Card>

            {/* Client Info */}
            <Card className="p-5 glass-card border-cyan-500/20" data-testid="client-info-card">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">Datos del Cliente</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-400 flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Nombre del Cliente *
                  </Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Empresa S.A. de C.V."
                    className="bg-gray-800/60 border-gray-700 text-gray-200 focus:border-cyan-500 text-sm"
                    data-testid="client-name-input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-400 flex items-center gap-1.5 mb-1.5">
                    <Shield className="w-3.5 h-3.5" /> Unidad / Área
                  </Label>
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Ej: Dirección de TI"
                    className="bg-gray-800/60 border-gray-700 text-gray-200 focus:border-cyan-500 text-sm"
                    data-testid="unit-input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-400 flex items-center gap-1.5 mb-1.5">
                    <User className="w-3.5 h-3.5" /> Evaluador
                  </Label>
                  <Input
                    value={evaluator}
                    onChange={(e) => setEvaluator(e.target.value)}
                    placeholder="SmartSecAssess"
                    className="bg-gray-800/60 border-gray-700 text-gray-200 focus:border-cyan-500 text-sm"
                    data-testid="evaluator-input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-400 flex items-center gap-1.5 mb-1.5">
                    <Tag className="w-3.5 h-3.5" /> Clasificación
                  </Label>
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value)}
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
                    data-testid="classification-select"
                  >
                    <option value="CONFIDENCIAL">CONFIDENCIAL</option>
                    <option value="USO INTERNO">USO INTERNO</option>
                    <option value="RESTRINGIDO">RESTRINGIDO</option>
                    <option value="PÚBLICO">PÚBLICO</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-400 flex items-center gap-1.5 mb-1.5">
                    <Image className="w-3.5 h-3.5" /> Logo del Cliente (opcional)
                  </Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-lg p-4 text-center cursor-pointer transition-colors"
                    data-testid="logo-upload-area"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-12 mx-auto object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-500">
                        <Upload className="w-5 h-5" />
                        <span className="text-xs">Click para subir logo (PNG, JPG, max 2MB)</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </Card>

            {/* Generate Buttons */}
            <Card className="p-5 glass-card border-cyan-500/20" data-testid="generate-buttons-card">
              <div className="space-y-3">
                <Button
                  onClick={() => generateReport("docx")}
                  disabled={!canGenerate || generating}
                  className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm"
                  data-testid="generate-docx-btn"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  {generating ? "Generando..." : "Generar Informe DOCX"}
                </Button>
                <p className="text-center text-xs text-gray-500">Documento Word editable con formato profesional</p>
              </div>
            </Card>
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-3">
            <Card className="glass-card border-cyan-500/20 min-h-[600px] overflow-hidden" data-testid="report-preview-card">
              {!selectedSession || !sessionData ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <FileText className="w-16 h-16 text-cyan-400/30 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">Vista Previa del Informe</h3>
                  <p className="text-sm text-gray-500 text-center max-w-xs">
                    Selecciona un assessment con análisis completado para ver la vista previa
                  </p>
                </div>
              ) : (
                <div className="p-0">
                  {/* Preview Header - simulates cover page */}
                  <div className="bg-gradient-to-br from-[#0A192F] to-[#0d2847] p-8 text-center">
                    {logoPreview && <img src={logoPreview} alt="Logo" className="h-10 mx-auto mb-4 object-contain" />}
                    <div className="inline-block px-3 py-1 border border-red-400/50 rounded text-xs text-red-300 mb-4">
                      {classification}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">INFORME DE AUDITORÍA</h2>
                    <p className="text-sm text-cyan-400 mb-3">Evaluación de Cumplimiento Normativo</p>
                    <div className="w-24 h-0.5 bg-cyan-500 mx-auto mb-4"></div>
                    <div className="text-xs text-gray-400 space-y-1">
                      {clientName && <p className="text-gray-200 font-semibold">{clientName}</p>}
                      {unit && <p>{unit}</p>}
                      <p>{new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                  </div>

                  {/* Preview Body */}
                  <div className="p-6 space-y-5">
                    {/* Compliance Summary */}
                    <div>
                      <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Nivel de Cumplimiento</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(scores).map(([fw, score]) => {
                          const color = score >= 75 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400";
                          const bg = score >= 75 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
                          return (
                            <div key={fw} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
                              <div className="flex justify-between items-center text-xs mb-2">
                                <span className="text-gray-300 font-medium">{fw}</span>
                                <span className={`font-bold ${color}`}>{score}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-700 rounded-full">
                                <div className={`h-full ${bg} rounded-full transition-all`} style={{ width: `${score}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {avgScore > 0 && (
                        <div className="mt-3 text-center">
                          <span className="text-xs text-gray-500">Cumplimiento Global: </span>
                          <span className={`text-lg font-bold ${avgScore >= 75 ? "text-green-400" : avgScore >= 60 ? "text-amber-400" : "text-red-400"}`}>
                            {avgScore}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Findings Summary */}
                    {findingsCount > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Resumen de Hallazgos</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-red-400">{critCount}</div>
                            <div className="text-xs text-red-300">Críticos</div>
                          </div>
                          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-amber-400">{majCount}</div>
                            <div className="text-xs text-amber-300">Mayores</div>
                          </div>
                          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-400">{minCount}</div>
                            <div className="text-xs text-green-300">Menores</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Document Structure Preview */}
                    <div>
                      <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Estructura del Documento</h4>
                      <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 divide-y divide-gray-700/50">
                        {[
                          "1. Resumen Ejecutivo",
                          "2. Alcance y Metodología",
                          "3. Nivel Global de Cumplimiento",
                          `4. Hallazgos Clasificados (${findingsCount})`,
                          "5. Matriz de Riesgos Consolidada",
                          "6. Recomendaciones Priorizadas",
                          "7. Conclusión Estratégica",
                          "8. Nota Legal",
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Finding preview (first one) */}
                    {expandedFindings.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
                          Ejemplo de Hallazgo Expandido
                        </h4>
                        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4 text-xs space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                              {expandedFindings[0].severity?.toUpperCase()}
                            </span>
                            <span className="text-gray-200 font-semibold">{expandedFindings[0].id}</span>
                            <span className="text-gray-500">|</span>
                            <span className="text-cyan-400">{expandedFindings[0].framework}</span>
                          </div>
                          {expandedFindings[0].normative_context && (
                            <p className="text-gray-400 line-clamp-2">{expandedFindings[0].normative_context}</p>
                          )}
                          <p className="text-gray-500 italic">
                            + Contexto normativo, no conformidad, análisis técnico, impacto CIA, evaluación de riesgo, recomendación, plazo, madurez
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Info banner */}
                    <div className="bg-cyan-900/20 border border-cyan-500/20 rounded-lg p-4 text-xs text-cyan-300 flex items-start gap-3">
                      <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Formato Profesional Big4</p>
                        <p className="text-cyan-400/70">
                          Documento DOCX editable con portada, tabla de contenidos, encabezados con logo, pie de página con
                          clasificación, tipografía Calibri, márgenes formales, tablas estilizadas y hallazgos detallados con
                          impacto CIA, evaluación de riesgo y nivel de madurez.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
