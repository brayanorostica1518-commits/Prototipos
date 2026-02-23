import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import secureAxios from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, FileText, Shield } from "lucide-react";
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
      const response = await secureAxios.get(`/sessions/${sessionId}/analysis`);
      setAnalysisData(response.data);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      toast.error("Error al cargar análisis");
    } finally {
      setLoading(false);
    }
  };

  const exportToWord = async () => {
    if (!analysisData) return;
    setExporting(true);
    toast.info("Generando reporte Word...");

    try {
      const response = await secureAxios.post('/export/word', 
        { session_id: sessionId },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte-Assessment-${new Date().toISOString().split('T')[0]}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte Word descargado exitosamente');
    } catch (error) {
      console.error('Error exporting Word:', error);
      toast.error('Error al exportar a Word');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!analysisData) return;

    setExporting(true);
    toast.info("Generando informe profesional de auditoría...");

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 20;

      const addPageHeader = (title) => {
        doc.setFillColor(10, 25, 47);
        doc.rect(0, 0, pageWidth, 18, 'F');
        doc.setFillColor(6, 182, 212);
        doc.rect(0, 18, pageWidth, 1.5, 'F');
        doc.setTextColor(6, 182, 212);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(title, pageWidth / 2, 12, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        return 28;
      };

      const checkNewPage = (needed = 25) => {
        if (yPos + needed > pageHeight - 25) {
          doc.addPage();
          yPos = 20;
          return true;
        }
        return false;
      };

      const addSectionTitle = (text) => {
        checkNewPage(20);
        doc.setFillColor(10, 25, 47);
        doc.roundedRect(margin - 2, yPos - 5, contentWidth + 4, 10, 1, 1, 'F');
        doc.setTextColor(6, 182, 212);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(text, margin + 2, yPos + 2);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        yPos += 14;
      };

      const addSubTitle = (text) => {
        checkNewPage(12);
        doc.setTextColor(10, 25, 47);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(text, margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        yPos += 7;
      };

      const addParagraph = (text, indent = 0) => {
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(text, contentWidth - indent);
        for (const line of lines) {
          checkNewPage(6);
          doc.text(line, margin + indent, yPos);
          yPos += 4.8;
        }
        yPos += 2;
      };

      const addListItem = (text, indent = 4) => {
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(text, contentWidth - indent - 4);
        checkNewPage(6);
        doc.setTextColor(6, 182, 212);
        doc.text('\u2022', margin + indent, yPos);
        doc.setTextColor(0, 0, 0);
        doc.text(lines[0], margin + indent + 4, yPos);
        yPos += 4.8;
        for (let i = 1; i < lines.length; i++) {
          checkNewPage(6);
          doc.text(lines[i], margin + indent + 4, yPos);
          yPos += 4.8;
        }
      };

      // ===== PORTADA =====
      doc.setFillColor(10, 25, 47);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setFillColor(6, 182, 212);
      doc.rect(0, 55, pageWidth, 2, 'F');
      doc.rect(0, 145, pageWidth, 2, 'F');

      doc.setTextColor(6, 182, 212);
      doc.setFontSize(10);
      doc.text('CONFIDENCIAL', pageWidth / 2, 35, { align: 'center' });

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont(undefined, 'bold');
      doc.text('INFORME DE', pageWidth / 2, 78, { align: 'center' });
      doc.text('AUDITORÍA', pageWidth / 2, 92, { align: 'center' });

      doc.setTextColor(6, 182, 212);
      doc.setFontSize(14);
      doc.setFont(undefined, 'normal');
      doc.text('Evaluación de Cumplimiento Normativo', pageWidth / 2, 110, { align: 'center' });

      doc.setFontSize(11);
      doc.text('SmartSecAssess', pageWidth / 2, 125, { align: 'center' });

      doc.setTextColor(180, 200, 220);
      doc.setFontSize(10);
      const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Fecha de emisión: ${dateStr}`, pageWidth / 2, 165, { align: 'center' });
      doc.text(`Referencia: SSA-${sessionId.substring(0, 8).toUpperCase()}`, pageWidth / 2, 175, { align: 'center' });

      const fws = analysisData.frameworks || [];
      if (fws.length > 0) {
        doc.setTextColor(150, 170, 190);
        doc.setFontSize(9);
        doc.text('Marcos normativos evaluados:', pageWidth / 2, 195, { align: 'center' });
        doc.setTextColor(6, 182, 212);
        doc.text(fws.join(' | '), pageWidth / 2, 205, { align: 'center' });
      }

      doc.setTextColor(100, 120, 140);
      doc.setFontSize(8);
      doc.text('Este documento es confidencial y de uso exclusivo del destinatario.', pageWidth / 2, pageHeight - 20, { align: 'center' });

      // ===== ÍNDICE =====
      doc.addPage();
      yPos = addPageHeader('ÍNDICE DE CONTENIDOS');

      const tocItems = [
        '1. Resumen Ejecutivo',
        '2. Alcance y Metodología',
        '3. Nivel Global de Cumplimiento',
        '4. Hallazgos Clasificados',
        '5. Matriz de Riesgos Consolidada',
        '6. Análisis Detallado Completo',
        '7. Recomendaciones',
        '8. Conclusión Ejecutiva',
        '9. Nota Legal'
      ];

      doc.setFontSize(11);
      tocItems.forEach((item, i) => {
        doc.setTextColor(10, 25, 47);
        doc.setFont(undefined, 'bold');
        doc.text(item, margin + 5, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 9;
      });

      // Parse AI analysis sections
      const analysisText = analysisData.analysis || '';
      const parseSectionContent = (sectionPattern, nextPattern) => {
        const regex = new RegExp(sectionPattern + '([\\s\\S]*?)(?=' + nextPattern + '|$)', 'i');
        const match = analysisText.match(regex);
        return match ? match[1].trim() : '';
      };

      // ===== 1. RESUMEN EJECUTIVO =====
      doc.addPage();
      yPos = addPageHeader('INFORME DE AUDITORÍA - SmartSecAssess');
      addSectionTitle('1. RESUMEN EJECUTIVO');

      const summaryContent = parseSectionContent('1\\.\\s*RESUMEN EJECUTIVO', '2\\.\\s*');
      if (summaryContent) {
        const paragraphs = summaryContent.split(/\n\n+|\n(?=[A-Z])/);
        paragraphs.forEach(p => {
          const trimmed = p.trim();
          if (trimmed && !trimmed.match(/^[-|=]+$/)) {
            if (trimmed.startsWith('- ')) {
              addListItem(trimmed.substring(2));
            } else {
              addParagraph(trimmed);
            }
          }
        });
      } else {
        addParagraph('Se ha realizado una evaluación integral de cumplimiento normativo utilizando inteligencia artificial, analizando la documentación proporcionada contra los marcos normativos seleccionados. Los resultados se presentan a continuación.');
      }

      // ===== 2. ALCANCE Y METODOLOGÍA =====
      yPos += 4;
      addSectionTitle('2. ALCANCE Y METODOLOGÍA');

      const scopeContent = parseSectionContent('2\\.\\s*(?:CONTEXTO|ALCANCE)', '3\\.\\s*');
      if (scopeContent) {
        scopeContent.split('\n').forEach(line => {
          const t = line.trim();
          if (!t || t.match(/^[-|=]+$/)) return;
          if (t.startsWith('- ')) addListItem(t.substring(2));
          else if (t.endsWith(':') && t.length < 80) addSubTitle(t);
          else addParagraph(t);
        });
      } else {
        addParagraph(`Marcos normativos evaluados: ${fws.join(', ')}`);
        addParagraph('Metodología: Análisis automatizado mediante IA con verificación cruzada de controles normativos, evaluación de evidencia documental y clasificación de hallazgos por severidad e impacto CIA (Confidencialidad, Integridad, Disponibilidad).');
      }

      // ===== 3. NIVEL GLOBAL DE CUMPLIMIENTO =====
      checkNewPage(60);
      yPos += 4;
      addSectionTitle('3. NIVEL GLOBAL DE CUMPLIMIENTO');

      const scores = analysisData.compliance_scores || {};
      const scoreEntries = Object.entries(scores);

      if (scoreEntries.length > 0) {
        const avgScore = Math.round(scoreEntries.reduce((sum, [, s]) => sum + s, 0) / scoreEntries.length);
        let globalStatus = 'Crítico';
        let statusColor = [220, 38, 38];
        if (avgScore >= 85) { globalStatus = 'Excelente'; statusColor = [34, 197, 94]; }
        else if (avgScore >= 75) { globalStatus = 'Bueno'; statusColor = [34, 197, 94]; }
        else if (avgScore >= 60) { globalStatus = 'Aceptable'; statusColor = [234, 179, 8]; }
        else if (avgScore >= 40) { globalStatus = 'Deficiente'; statusColor = [249, 115, 22]; }

        addParagraph(`Nivel de cumplimiento global agregado: ${avgScore}% - Estado: ${globalStatus}`);
        addParagraph(`Este porcentaje refleja el promedio ponderado de los ${scoreEntries.length} marco(s) normativo(s) evaluado(s). A continuación se presenta el desglose por framework.`);

        yPos += 3;

        const complianceTableData = scoreEntries.map(([framework, score]) => {
          let status = 'Crítico';
          let color = [220, 38, 38];
          if (score >= 85) { status = 'Excelente'; color = [34, 197, 94]; }
          else if (score >= 75) { status = 'Bueno'; color = [34, 197, 94]; }
          else if (score >= 60) { status = 'Aceptable'; color = [234, 179, 8]; }
          else if (score >= 40) { status = 'Deficiente'; color = [249, 115, 22]; }

          return [
            framework,
            `${score}%`,
            { content: status, styles: { textColor: color, fontStyle: 'bold' } }
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Marco Normativo', 'Cumplimiento', 'Estado']],
          body: complianceTableData,
          headStyles: { fillColor: [10, 25, 47], textColor: [6, 182, 212], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [245, 248, 252] },
          margin: { left: margin, right: margin },
          theme: 'grid',
          styles: { cellPadding: 4, lineColor: [200, 210, 220], lineWidth: 0.3 }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ===== CHARTS PAGE =====
      doc.addPage();
      yPos = addPageHeader('ANÁLISIS VISUAL DE CUMPLIMIENTO');
      yPos += 5;

      if (barChartRef.current) {
        try {
          const barCanvas = await html2canvas(barChartRef.current, { scale: 2, backgroundColor: '#ffffff' });
          const barImgData = barCanvas.toDataURL('image/png');
          addSubTitle('Comparativa de Cumplimiento por Framework');
          doc.addImage(barImgData, 'PNG', margin, yPos, contentWidth, 75);
          yPos += 85;
        } catch (e) { console.error("Error capturing bar chart:", e); }
      }

      if (radarChartRef.current) {
        try {
          checkNewPage(90);
          const radarCanvas = await html2canvas(radarChartRef.current, { scale: 2, backgroundColor: '#ffffff' });
          const radarImgData = radarCanvas.toDataURL('image/png');
          addSubTitle('Análisis Multidimensional (Radar)');
          doc.addImage(radarImgData, 'PNG', margin, yPos, contentWidth, 75);
          yPos += 85;
        } catch (e) { console.error("Error capturing radar chart:", e); }
      }

      // ===== 4. HALLAZGOS CLASIFICADOS =====
      doc.addPage();
      yPos = addPageHeader('HALLAZGOS DE AUDITORÍA');
      addSectionTitle('4. HALLAZGOS CLASIFICADOS');

      const gaps = analysisData.gaps || [];
      const criticalGaps = gaps.filter(g => g.severity === 'high');
      const majorGaps = gaps.filter(g => g.severity === 'medium');
      const minorGaps = gaps.filter(g => g.severity === 'low');

      if (criticalGaps.length > 0) {
        addSubTitle(`4.1 Hallazgos Críticos (${criticalGaps.length})`);
        criticalGaps.forEach((gap, i) => {
          checkNewPage(25);
          doc.setFillColor(254, 226, 226);
          doc.roundedRect(margin, yPos - 3, contentWidth, 5, 0.5, 0.5, 'F');
          doc.setTextColor(185, 28, 28);
          doc.setFontSize(9.5);
          doc.setFont(undefined, 'bold');
          doc.text(`HC-${String(i + 1).padStart(3, '0')}: ${gap.framework || 'General'}`, margin + 2, yPos);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          yPos += 7;
          addParagraph(gap.description || 'Hallazgo crítico identificado.', 4);
          if (gap.recommendation) {
            doc.setTextColor(10, 25, 47);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            checkNewPage(6);
            doc.text('Recomendación:', margin + 4, yPos);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            yPos += 5;
            addParagraph(gap.recommendation, 8);
          }
          yPos += 3;
        });
      }

      if (majorGaps.length > 0) {
        addSubTitle(`4.2 Hallazgos Mayores (${majorGaps.length})`);
        majorGaps.forEach((gap, i) => {
          checkNewPage(25);
          doc.setFillColor(254, 249, 195);
          doc.roundedRect(margin, yPos - 3, contentWidth, 5, 0.5, 0.5, 'F');
          doc.setTextColor(146, 64, 14);
          doc.setFontSize(9.5);
          doc.setFont(undefined, 'bold');
          doc.text(`HM-${String(i + 1).padStart(3, '0')}: ${gap.framework || 'General'}`, margin + 2, yPos);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          yPos += 7;
          addParagraph(gap.description || 'Hallazgo mayor identificado.', 4);
          yPos += 3;
        });
      }

      if (minorGaps.length > 0) {
        addSubTitle(`4.3 Hallazgos Menores (${minorGaps.length})`);
        minorGaps.forEach((gap, i) => {
          checkNewPage(20);
          doc.setFillColor(220, 252, 231);
          doc.roundedRect(margin, yPos - 3, contentWidth, 5, 0.5, 0.5, 'F');
          doc.setTextColor(21, 128, 61);
          doc.setFontSize(9.5);
          doc.setFont(undefined, 'bold');
          doc.text(`Hm-${String(i + 1).padStart(3, '0')}: ${gap.framework || 'General'}`, margin + 2, yPos);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          yPos += 7;
          addParagraph(gap.description || 'Hallazgo menor identificado.', 4);
          yPos += 2;
        });
      }

      if (gaps.length === 0) {
        addParagraph('No se identificaron hallazgos clasificables con la información proporcionada. Se recomienda realizar una auditoría presencial complementaria.');
      }

      // ===== 5. MATRIZ DE RIESGOS =====
      doc.addPage();
      yPos = addPageHeader('MATRIZ DE RIESGOS');
      addSectionTitle('5. MATRIZ DE RIESGOS CONSOLIDADA');

      if (gaps.length > 0) {
        const riskTableData = gaps.map((gap, i) => {
          const sevLabel = gap.severity === 'high' ? 'CRÍTICO' : gap.severity === 'medium' ? 'ALTO' : 'MEDIO';
          const sevColor = gap.severity === 'high' ? [220, 38, 38] : gap.severity === 'medium' ? [234, 179, 8] : [34, 197, 94];
          const desc = (gap.description || '').length > 60 ? gap.description.substring(0, 60) + '...' : (gap.description || 'N/A');
          return [
            `GAP-${String(i + 1).padStart(3, '0')}`,
            gap.framework || 'General',
            desc,
            { content: sevLabel, styles: { textColor: sevColor, fontStyle: 'bold', halign: 'center' } },
            gap.severity === 'high' ? '0-30 días' : gap.severity === 'medium' ? '30-90 días' : '90+ días'
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['GAP ID', 'Framework', 'Descripción', 'Riesgo', 'Plazo']],
          body: riskTableData,
          headStyles: { fillColor: [10, 25, 47], textColor: [6, 182, 212], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 30 },
            2: { cellWidth: 70 },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 24, halign: 'center' }
          },
          alternateRowStyles: { fillColor: [245, 248, 252] },
          margin: { left: margin, right: margin },
          theme: 'grid',
          styles: { cellPadding: 3, lineColor: [200, 210, 220], lineWidth: 0.3 }
        });
        yPos = doc.lastAutoTable.finalY + 10;
      } else {
        addParagraph('No se generaron entradas en la matriz de riesgos. Es necesario realizar un análisis más profundo con documentación adicional.');
      }

      // ===== 6. ANÁLISIS DETALLADO COMPLETO =====
      doc.addPage();
      yPos = addPageHeader('ANÁLISIS DETALLADO');
      addSectionTitle('6. ANÁLISIS DETALLADO COMPLETO');

      const sections = analysisText.split(/\n/);
      sections.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.match(/^[=═─]+$/)) return;

        if (trimmed.match(/^\d+\.\s+[A-ZÁÉÍÓÚÑ]/)) {
          yPos += 3;
          addSubTitle(trimmed);
        } else if (trimmed.match(/^[A-Z][^:]+:$/) && trimmed.length < 80) {
          addSubTitle(trimmed);
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          addListItem(trimmed.replace(/^[-•]\s*/, ''));
        } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          // skip table rows in text, they are handled separately
        } else {
          addParagraph(trimmed);
        }
      });

      // ===== 7. RECOMENDACIONES =====
      doc.addPage();
      yPos = addPageHeader('RECOMENDACIONES');
      addSectionTitle('7. RECOMENDACIONES PRIORIZADAS');

      const recsContent = parseSectionContent('(?:6|7)\\.\\s*(?:RECOMENDACIONES|PLAN)', '(?:7|8|9|10)\\.\\s*');
      if (recsContent) {
        recsContent.split('\n').forEach(line => {
          const t = line.trim();
          if (!t || t.match(/^[=═─]+$/)) return;
          if (t.startsWith('- ')) addListItem(t.substring(2));
          else if (t.endsWith(':') && t.length < 80) addSubTitle(t);
          else if (t.match(/^R-\d+/)) {
            yPos += 2;
            addSubTitle(t);
          }
          else addParagraph(t);
        });
      } else {
        addParagraph('Las recomendaciones específicas se encuentran integradas en el análisis detallado de cada hallazgo en la sección anterior.');
        if (criticalGaps.length > 0) {
          addSubTitle('Acciones Inmediatas Sugeridas (P1 - 0 a 30 días):');
          criticalGaps.forEach(gap => {
            addListItem(`${gap.framework}: ${gap.description || 'Remediar hallazgo crítico'}`);
          });
        }
        if (majorGaps.length > 0) {
          addSubTitle('Acciones a Corto Plazo (P2 - 30 a 90 días):');
          majorGaps.forEach(gap => {
            addListItem(`${gap.framework}: ${gap.description || 'Remediar hallazgo mayor'}`);
          });
        }
      }

      // ===== 8. CONCLUSIÓN EJECUTIVA =====
      checkNewPage(50);
      yPos += 6;
      addSectionTitle('8. CONCLUSIÓN EJECUTIVA');

      const conclusionContent = parseSectionContent('(?:8|9|10)\\.\\s*(?:CONCLUSI)', '(?:9|10|NOTA)\\.?\\s*');
      if (conclusionContent) {
        conclusionContent.split('\n').forEach(line => {
          const t = line.trim();
          if (t && !t.match(/^[=═─]+$/)) {
            if (t.startsWith('- ')) addListItem(t.substring(2));
            else addParagraph(t);
          }
        });
      } else {
        const avgScore = scoreEntries.length > 0
          ? Math.round(scoreEntries.reduce((sum, [, s]) => sum + s, 0) / scoreEntries.length)
          : 0;
        addParagraph(`La evaluación de cumplimiento normativo arroja un nivel global del ${avgScore}%, con ${criticalGaps.length} hallazgo(s) crítico(s), ${majorGaps.length} mayor(es) y ${minorGaps.length} menor(es). Se requiere atención prioritaria a los hallazgos críticos dentro de los próximos 30 días para mitigar riesgos operacionales y de cumplimiento.`);
        addParagraph('Se recomienda validar estos resultados con una auditoría presencial realizada por un profesional certificado (CISA, CISSP, ISO 27001 Lead Auditor) antes de cualquier toma de decisión crítica.');
      }

      // ===== 9. NOTA LEGAL =====
      checkNewPage(30);
      yPos += 6;
      addSectionTitle('9. NOTA LEGAL');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const legalText = 'Este informe ha sido generado mediante análisis de inteligencia artificial por la plataforma SmartSecAssess y constituye una evaluación orientativa. Debe ser revisado y validado por un auditor certificado (CISA, CISSP, ISO 27001 Lead Auditor) antes de su uso oficial o toma de decisiones críticas. No constituye una certificación de cumplimiento ni asesoramiento legal vinculante. La información contenida es confidencial y de uso exclusivo del destinatario autorizado.';
      const legalLines = doc.splitTextToSize(legalText, contentWidth);
      legalLines.forEach(line => {
        checkNewPage(5);
        doc.text(line, margin, yPos);
        yPos += 4;
      });

      // ===== PIE DE PÁGINA EN TODAS LAS PÁGINAS =====
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(10, 25, 47);
        doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
        doc.setFontSize(7);
        doc.setTextColor(6, 182, 212);
        doc.text(`SmartSecAssess | Informe Confidencial | Ref: SSA-${sessionId.substring(0, 8).toUpperCase()}`, margin, pageHeight - 5);
        doc.setTextColor(180, 200, 220);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
      }

      doc.save(`SmartSecAssess-Auditoria-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Informe de auditoría generado exitosamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el informe");
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

  // Color palette for frameworks
  const COLORS = [
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#6366f1', // indigo
  ];

  // Prepare chart data with colors
  const barChartData = Object.entries(analysisData.compliance_scores || {}).map(([framework, score], index) => ({
    framework: framework.length > 15 ? framework.substring(0, 15) + '...' : framework,
    fullName: framework,
    cumplimiento: score,
    fill: COLORS[index % COLORS.length]
  }));

  const radarChartData = Object.entries(analysisData.compliance_scores || {}).map(([framework, score]) => ({
    subject: framework.length > 12 ? framework.substring(0, 12) + '...' : framework,
    fullName: framework,
    cumplimiento: score,
    fullMark: 100
  }));

  return (
    <div className="min-h-screen cyber-grid bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in glass-card p-4 rounded-xl border border-cyan-500/20">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500"
              data-testid="back-to-chat-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold cyber-text-glow" style={{ fontFamily: 'Orbitron, monospace' }}>
                DASHBOARD
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportToWord}
              disabled={exporting}
              className="neon-button bg-gradient-to-r from-green-600 to-emerald-600"
              data-testid="export-word-btn"
            >
              {exporting ? (
                <>
                  <FileText className="w-4 h-4 mr-2 animate-pulse" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Word
                </>
              )}
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={exporting}
              className="neon-button"
              data-testid="export-pdf-btn"
            >
              {exporting ? (
                <>
                  <FileText className="w-4 h-4 mr-2 animate-pulse" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Compliance Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {Object.entries(analysisData.compliance_scores || {}).map(([framework, score]) => (
            <Card key={framework} className="p-6 glass-card border-cyan-500/30 shadow-lg animate-fade-in hover:border-cyan-500/60 transition-all" data-testid={`compliance-card-${framework.toLowerCase().replace(/\s/g, '-')}`}>
              <h3 className="text-lg font-semibold mb-2 text-cyan-300">{framework}</h3>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold cyber-text-glow" style={{ fontFamily: 'Orbitron, monospace' }}>
                  {score}
                </span>
                <span className="text-2xl text-gray-500 mb-1">%</span>
              </div>
              <div className="mt-3 w-full bg-gray-800/50 rounded-full h-2.5 border border-cyan-500/30">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-cyan-500/50"
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
            <Card className="p-6 glass-card border-cyan-500/30 shadow-lg shadow-cyan-500/20" data-testid="bar-chart">
              <h3 className="text-xl font-semibold mb-4 text-cyan-300" style={{ fontFamily: 'Orbitron, monospace' }}>
                COMPARATIVA DE CUMPLIMIENTO
              </h3>
              <div ref={barChartRef} style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <defs>
                      {COLORS.map((color, idx) => (
                        <linearGradient key={`gradient-${idx}`} id={`colorGradient${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.9}/>
                          <stop offset="100%" stopColor={color} stopOpacity={0.6}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="framework" 
                      stroke="#9ca3af" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: '#d1d5db', fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      domain={[0, 100]}
                      tick={{ fill: '#d1d5db', fontSize: 11 }}
                      label={{ value: 'Cumplimiento (%)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                        border: '1px solid #06b6d4', 
                        borderRadius: '8px',
                        color: '#fff',
                        padding: '10px'
                      }}
                      labelStyle={{ color: '#06b6d4', fontWeight: 'bold', marginBottom: '5px' }}
                      itemStyle={{ color: '#d1d5db' }}
                      formatter={(value, name, props) => [
                        `${value}% de cumplimiento`,
                        props.payload.fullName || name
                      ]}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#d1d5db', paddingTop: '10px' }}
                      formatter={() => 'Nivel de Cumplimiento'}
                    />
                    <Bar 
                      dataKey="cumplimiento"
                      radius={[8, 8, 0, 0]}
                      label={{ 
                        position: 'top', 
                        fill: '#06b6d4',
                        fontSize: 13,
                        fontWeight: 'bold',
                        formatter: (value) => `${value}%`
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Radar Chart */}
            <Card className="p-6 glass-card border-cyan-500/30 shadow-lg shadow-cyan-500/20" data-testid="radar-chart">
              <h3 className="text-xl font-semibold mb-4 text-cyan-300" style={{ fontFamily: 'Orbitron, monospace' }}>
                ANÁLISIS MULTIDIMENSIONAL
              </h3>
              <div ref={radarChartRef} style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarChartData} margin={{ top: 20, right: 50, left: 50, bottom: 20 }}>
                    <defs>
                      <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <PolarGrid 
                      stroke="#374151" 
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                    />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#d1d5db', fontSize: 11, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]} 
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickCount={6}
                      stroke="#4b5563"
                    />
                    <Radar 
                      name="Nivel de Cumplimiento" 
                      dataKey="cumplimiento" 
                      stroke="#06b6d4" 
                      fill="url(#radarGradient)"
                      fillOpacity={0.65}
                      strokeWidth={3}
                      dot={{ 
                        fill: '#06b6d4', 
                        stroke: '#fff',
                        strokeWidth: 2,
                        r: 5 
                      }}
                      activeDot={{ 
                        fill: '#06b6d4', 
                        stroke: '#fff',
                        strokeWidth: 2,
                        r: 7 
                      }}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                        border: '1px solid #06b6d4', 
                        borderRadius: '8px',
                        color: '#fff',
                        padding: '10px'
                      }}
                      labelStyle={{ color: '#06b6d4', fontWeight: 'bold', marginBottom: '5px' }}
                      itemStyle={{ color: '#d1d5db' }}
                      formatter={(value, name, props) => [
                        `${value}% de cumplimiento`,
                        props.payload.fullName || 'Cumplimiento'
                      ]}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#d1d5db', paddingTop: '10px' }}
                    />
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
