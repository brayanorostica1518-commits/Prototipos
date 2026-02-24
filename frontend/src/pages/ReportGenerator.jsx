import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import secureAxios from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, FileText, Download, Upload, Building2, User, Shield, Tag,
  Image, Loader2, CheckCircle2, FileDown, Trash2, Power, File, Calendar,
  Hash, Monitor, X
} from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "generate", label: "Generar Informe", icon: FileDown },
  { id: "templates", label: "Plantillas", icon: File },
];

export default function ReportGenerator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("generate");
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef(null);
  const templateInputRef = useRef(null);

  // Client info
  const [clientName, setClientName] = useState("");
  const [unit, setUnit] = useState("");
  const [evaluator, setEvaluator] = useState("");
  const [classification, setClassification] = useState("CONFIDENCIAL");
  const [reportVersion, setReportVersion] = useState("v1.0");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [systems, setSystems] = useState([]);
  const [systemInput, setSystemInput] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  useEffect(() => {
    loadSessions();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedSession) loadSessionData(selectedSession);
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      const r = await secureAxios.get("/sessions");
      setSessions(r.data);
    } catch { /* ignore */ }
  };

  const loadSessionData = async (sid) => {
    try {
      setLoading(true);
      const r = await secureAxios.get(`/sessions/${sid}/analysis`);
      if (r.data && Object.keys(r.data).length > 0) {
        setSessionData(r.data);
      } else {
        toast.warning("Sin análisis completado en esta sesión");
        setSessionData(null);
      }
    } catch {
      setSessionData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const r = await secureAxios.get("/templates");
      setTemplates(r.data);
    } catch { /* ignore */ }
  };

  // Logo
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo máx 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setLogoPreview(ev.target.result); setLogoBase64(ev.target.result); };
    reader.readAsDataURL(file);
  };

  // Systems list
  const addSystem = () => {
    if (systemInput.trim() && !systems.includes(systemInput.trim())) {
      setSystems([...systems, systemInput.trim()]);
      setSystemInput("");
    }
  };
  const removeSystem = (s) => setSystems(systems.filter(x => x !== s));

  // Template upload
  const handleTemplateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTemplate(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await secureAxios.post("/templates/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Plantilla cargada");
      loadTemplates();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al cargar plantilla");
    } finally {
      setUploadingTemplate(false);
      if (templateInputRef.current) templateInputRef.current.value = "";
    }
  };

  const activateTemplate = async (id) => {
    try {
      await secureAxios.post(`/templates/${id}/activate`);
      toast.success("Plantilla activada");
      loadTemplates();
    } catch { toast.error("Error al activar"); }
  };

  const deleteTemplate = async (id) => {
    try {
      await secureAxios.delete(`/templates/${id}`);
      toast.success("Plantilla eliminada");
      loadTemplates();
    } catch { toast.error("Error al eliminar"); }
  };

  const downloadTemplate = async (id, name) => {
    try {
      const r = await secureAxios.get(`/templates/${id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Error al descargar"); }
  };

  const canGenerate = selectedSession && clientName.trim() && sessionData;
  const activeTemplate = templates.find(t => t.active);

  const generateReport = async () => {
    if (!canGenerate) { toast.error("Completa los campos obligatorios"); return; }
    setGenerating(true);
    toast.info(activeTemplate ? `Usando plantilla: ${activeTemplate.name}` : "Usando plantilla base interna");
    try {
      const r = await secureAxios.post("/reports/generate", {
        session_id: selectedSession,
        format: "docx",
        client_info: {
          client_name: clientName,
          unit,
          evaluator: evaluator || "SmartSecAssess",
          classification,
          report_version: reportVersion,
          report_date: reportDate,
          systems,
        },
        logo_base64: logoBase64,
      }, { responseType: "blob", timeout: 120000 });

      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      const safeName = clientName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").substring(0, 30);
      a.download = `Informe_Auditoria_${safeName}_${reportDate}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Informe DOCX generado exitosamente");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al generar informe");
    } finally {
      setGenerating(false);
    }
  };

  // Stats
  const scores = sessionData?.compliance_scores || {};
  const expandedFindings = sessionData?.expanded_findings || [];
  const findingsCount = expandedFindings.length || (sessionData?.gaps || []).length;
  const critCount = expandedFindings.filter(f => f.severity === "critical").length;
  const majCount = expandedFindings.filter(f => f.severity === "major").length;
  const minCount = expandedFindings.filter(f => f.severity === "minor").length;
  const avgScore = Object.values(scores).length > 0
    ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length) : 0;

  return (
    <div className="min-h-screen cyber-grid bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 animate-fade-in">
          <Button onClick={() => navigate("/")} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" data-testid="report-back-btn">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "Orbitron, monospace" }}>GENERADOR DE INFORMES</h1>
            <p className="text-sm text-gray-400">Documento ejecutivo corporativo</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-800/40 p-1 rounded-xl w-fit" data-testid="report-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"}`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* === TEMPLATES TAB === */}
        {activeTab === "templates" && (
          <div className="space-y-6 animate-fade-in" data-testid="templates-tab">
            <Card className="p-5 glass-card border-cyan-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Plantillas Corporativas</h3>
                <Button
                  onClick={() => templateInputRef.current?.click()}
                  disabled={uploadingTemplate}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm"
                  data-testid="upload-template-btn"
                >
                  {uploadingTemplate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Cargar Plantilla
                </Button>
                <input ref={templateInputRef} type="file" accept=".docx,.dotx" onChange={handleTemplateUpload} className="hidden" />
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Sube plantillas DOCX/DOTX con placeholders Jinja2. Variables disponibles:
                <code className="text-cyan-400 mx-1">{"{{ client_name }}"}</code>
                <code className="text-cyan-400 mx-1">{"{{ findings_text }}"}</code>
                <code className="text-cyan-400 mx-1">{"{{ executive_summary }}"}</code>
                y más.
              </p>

              {templates.length === 0 ? (
                <div className="text-center py-10">
                  <File className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No hay plantillas cargadas</p>
                  <p className="text-xs text-gray-600 mt-1">El sistema usará la plantilla base interna</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map(t => (
                    <div key={t.id} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${t.active ? "bg-cyan-900/20 border-cyan-500/40" : "bg-gray-800/30 border-gray-700/50 hover:border-gray-600"}`} data-testid={`template-${t.id}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className={`w-5 h-5 flex-shrink-0 ${t.active ? "text-cyan-400" : "text-gray-500"}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-200 font-medium truncate">{t.name}</span>
                            {t.active && <span className="px-2 py-0.5 bg-cyan-600 text-white text-[10px] font-bold rounded-full">ACTIVA</span>}
                          </div>
                          <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                            <span>v{t.version}</span>
                            <span>{new Date(t.created_at).toLocaleDateString("es-ES")}</span>
                            <span>{(t.size_bytes / 1024).toFixed(0)} KB</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-3">
                        {!t.active && (
                          <Button size="sm" variant="ghost" onClick={() => activateTemplate(t.id)} className="text-cyan-400 hover:bg-cyan-500/10 h-8 px-2" title="Activar" data-testid={`activate-${t.id}`}>
                            <Power className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => downloadTemplate(t.id, t.name)} className="text-gray-400 hover:bg-gray-700/50 h-8 px-2" title="Descargar" data-testid={`download-${t.id}`}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)} className="text-red-400 hover:bg-red-500/10 h-8 px-2" title="Eliminar" data-testid={`delete-${t.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Placeholder guide */}
            <Card className="p-5 glass-card border-cyan-500/20">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Variables Disponibles para Plantillas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {[
                  ["{{ client_name }}", "Nombre del cliente"],
                  ["{{ unit }}", "Unidad/Área evaluada"],
                  ["{{ evaluator }}", "Evaluador"],
                  ["{{ classification }}", "Clasificación del documento"],
                  ["{{ report_version }}", "Versión del informe"],
                  ["{{ report_date }}", "Fecha de emisión"],
                  ["{{ frameworks_text }}", "Marcos evaluados"],
                  ["{{ systems_text }}", "Sistemas evaluados"],
                  ["{{ avg_score }}", "% cumplimiento global"],
                  ["{{ total_findings }}", "Total hallazgos"],
                  ["{{ executive_summary }}", "Resumen ejecutivo"],
                  ["{{ methodology }}", "Metodología"],
                  ["{{ compliance_explanation }}", "Explicación del cálculo"],
                  ["{{ compliance_scores_text }}", "Scores por framework"],
                  ["{{ findings_text }}", "Hallazgos detallados"],
                  ["{{ risk_matrix_text }}", "Matriz de riesgos"],
                  ["{{ recommendations_text }}", "Recomendaciones"],
                  ["{{ conclusion }}", "Conclusión ejecutiva"],
                ].map(([v, d]) => (
                  <div key={v} className="flex items-center gap-2 py-1 border-b border-gray-800/50">
                    <code className="text-cyan-400 bg-gray-800/50 px-1.5 py-0.5 rounded text-[10px] font-mono flex-shrink-0">{v}</code>
                    <span className="text-gray-500 truncate">{d}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* === GENERATE TAB === */}
        {activeTab === "generate" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in" data-testid="generate-tab">
            {/* Left: Config */}
            <div className="lg:col-span-2 space-y-4">
              {/* Template Status */}
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${activeTemplate ? "bg-cyan-900/20 border-cyan-500/30 text-cyan-300" : "bg-gray-800/30 border-gray-700/50 text-gray-400"}`} data-testid="template-status">
                <FileText className="w-4 h-4" />
                {activeTemplate ? (
                  <span>Plantilla activa: <strong>{activeTemplate.name}</strong></span>
                ) : (
                  <span>Sin plantilla activa — se usará la plantilla base interna</span>
                )}
              </div>

              {/* Assessment */}
              <Card className="p-4 glass-card border-cyan-500/20" data-testid="assessment-select-card">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Assessment Base</h3>
                <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)} className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500" data-testid="session-select">
                  <option value="">Seleccionar assessment...</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.title} - {new Date(s.created_at).toLocaleDateString("es-ES")}</option>)}
                </select>
                {sessionData && (
                  <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded text-[11px] text-green-300 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{findingsCount} hallazgos | {avgScore}% cumplimiento</span>
                  </div>
                )}
              </Card>

              {/* Client Info */}
              <Card className="p-4 glass-card border-cyan-500/20" data-testid="client-info-card">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">Metadatos del Informe</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-[11px] text-gray-400 flex items-center gap-1 mb-1"><Building2 className="w-3 h-3" /> Cliente *</Label>
                    <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Empresa S.A." className="bg-gray-800/60 border-gray-700 text-gray-200 text-sm h-9" data-testid="client-name-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] text-gray-400 flex items-center gap-1 mb-1"><Shield className="w-3 h-3" /> Unidad</Label>
                      <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Dir. TI" className="bg-gray-800/60 border-gray-700 text-gray-200 text-sm h-9" data-testid="unit-input" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-400 flex items-center gap-1 mb-1"><User className="w-3 h-3" /> Evaluador</Label>
                      <Input value={evaluator} onChange={e => setEvaluator(e.target.value)} placeholder="SmartSecAssess" className="bg-gray-800/60 border-gray-700 text-gray-200 text-sm h-9" data-testid="evaluator-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] text-gray-400 flex items-center gap-1 mb-1"><Tag className="w-3 h-3" /> Clasificación</Label>
                      <select value={classification} onChange={e => setClassification(e.target.value)} className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500" data-testid="classification-select">
                        <option value="CONFIDENCIAL">CONFIDENCIAL</option>
                        <option value="USO INTERNO">USO INTERNO</option>
                        <option value="RESTRINGIDO">RESTRINGIDO</option>
                        <option value="PÚBLICO">PÚBLICO</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-400 flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Fecha</Label>
                      <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="bg-gray-800/60 border-gray-700 text-gray-200 text-sm h-9" data-testid="report-date-input" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-400 flex items-center gap-1 mb-1"><Hash className="w-3 h-3" /> Versión</Label>
                      <Input value={reportVersion} onChange={e => setReportVersion(e.target.value)} placeholder="v1.0" className="bg-gray-800/60 border-gray-700 text-gray-200 text-sm h-9" data-testid="report-version-input" />
                    </div>
                  </div>
                  {/* Systems */}
                  <div>
                    <Label className="text-[11px] text-gray-400 flex items-center gap-1 mb-1"><Monitor className="w-3 h-3" /> Sistemas Evaluados</Label>
                    <div className="flex gap-2">
                      <Input value={systemInput} onChange={e => setSystemInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSystem())} placeholder="Agregar sistema..." className="bg-gray-800/60 border-gray-700 text-gray-200 text-sm h-9 flex-1" data-testid="system-input" />
                      <Button type="button" onClick={addSystem} size="sm" className="bg-gray-700 hover:bg-gray-600 h-9 px-3" data-testid="add-system-btn">+</Button>
                    </div>
                    {systems.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {systems.map(s => (
                          <span key={s} className="flex items-center gap-1 bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">
                            {s}
                            <button onClick={() => removeSystem(s)} className="text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Logo */}
                  <div>
                    <Label className="text-[11px] text-gray-400 flex items-center gap-1 mb-1"><Image className="w-3 h-3" /> Logo (opcional)</Label>
                    <div onClick={() => fileInputRef.current?.click()} className="border border-dashed border-gray-700 hover:border-cyan-500/50 rounded-lg p-3 text-center cursor-pointer transition-colors" data-testid="logo-upload-area">
                      {logoPreview ? <img src={logoPreview} alt="Logo" className="h-10 mx-auto object-contain" /> : (
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-xs"><Upload className="w-4 h-4" /> PNG/JPG, máx 2MB</div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} className="hidden" />
                  </div>
                </div>
              </Card>

              {/* Generate Button */}
              <Button onClick={generateReport} disabled={!canGenerate || generating} className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm" data-testid="generate-docx-btn">
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                {generating ? "Generando..." : "Generar Informe DOCX"}
              </Button>
            </div>

            {/* Right: Preview */}
            <div className="lg:col-span-3">
              <Card className="glass-card border-cyan-500/20 min-h-[600px] overflow-hidden" data-testid="report-preview-card">
                {!selectedSession || !sessionData ? (
                  <div className="flex flex-col items-center justify-center h-full py-20">
                    <FileText className="w-16 h-16 text-cyan-400/30 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Vista Previa</h3>
                    <p className="text-sm text-gray-500 text-center max-w-xs">Selecciona un assessment con análisis completado</p>
                  </div>
                ) : (
                  <div className="p-0">
                    {/* Cover preview */}
                    <div className="bg-gradient-to-br from-[#0A192F] to-[#0d2847] p-6 text-center">
                      {logoPreview && <img src={logoPreview} alt="Logo" className="h-8 mx-auto mb-3 object-contain" />}
                      <div className="inline-block px-2 py-0.5 border border-red-400/50 rounded text-[10px] text-red-300 mb-3">{classification}</div>
                      <h2 className="text-xl font-bold text-white mb-1">INFORME DE AUDITORÍA</h2>
                      <p className="text-xs text-cyan-400 mb-2">Evaluación de Cumplimiento Normativo</p>
                      <div className="w-16 h-0.5 bg-cyan-500 mx-auto mb-3"></div>
                      <div className="text-[11px] text-gray-400 space-y-0.5">
                        {clientName && <p className="text-gray-200 font-semibold">{clientName}</p>}
                        {unit && <p>{unit}</p>}
                        <p>{reportDate} | {reportVersion}</p>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Scores */}
                      {Object.keys(scores).length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Cumplimiento</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(scores).map(([fw, score]) => (
                              <div key={fw} className="bg-gray-800/40 rounded-lg p-2.5 border border-gray-700/50">
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="text-gray-300">{fw}</span>
                                  <span className={`font-bold ${score >= 75 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400"}`}>{score}%</span>
                                </div>
                                <div className="h-1 bg-gray-700 rounded-full">
                                  <div className={`h-full rounded-full ${score >= 75 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Findings count */}
                      {findingsCount > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { n: critCount, l: "Críticos", c: "red" },
                            { n: majCount, l: "Mayores", c: "amber" },
                            { n: minCount, l: "Menores", c: "green" },
                          ].map(({ n, l, c }) => (
                            <div key={l} className={`bg-${c}-900/20 border border-${c}-500/30 rounded-lg p-2 text-center`}>
                              <div className={`text-xl font-bold text-${c}-400`}>{n}</div>
                              <div className={`text-[10px] text-${c}-300`}>{l}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Structure */}
                      <div>
                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Estructura</h4>
                        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 divide-y divide-gray-700/50">
                          {["1. Resumen Ejecutivo", "2. Metodología y Supuestos", "3. Nivel Global de Cumplimiento", `4. Resultados por Marco`, `5. Hallazgos (${findingsCount})`, "6. Matriz de Riesgos", "7. Recomendaciones", "8. Conclusión", "9. Nota Legal"].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" /> {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Systems */}
                      {systems.length > 0 && (
                        <div className="text-xs text-gray-500">Sistemas: {systems.join(", ")}</div>
                      )}

                      {/* Info */}
                      <div className="bg-cyan-900/20 border border-cyan-500/20 rounded-lg p-3 text-[11px] text-cyan-300 flex items-start gap-2">
                        <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-0.5">Formato Profesional Big4</p>
                          <p className="text-cyan-400/70">DOCX editable con portada, TOC, encabezados, Calibri, tablas estilizadas, hallazgos con CIA/riesgo/madurez.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
