"""
Template Manager - Upload, store, manage and render DOCX templates.
Uses docxtpl (Jinja2) for template rendering.
"""

import io
import os
import uuid
import hashlib
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from docxtpl import DocxTemplate
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path("/app/backend/uploads/templates")
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
BASE_TEMPLATE_PATH = TEMPLATES_DIR / "_base_template.docx"

MAX_TEMPLATE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.docx', '.dotx'}

# Brand colors
NAVY = RGBColor(0x0A, 0x19, 0x2F)
CYAN = RGBColor(0x06, 0xB6, 0xD4)
DARK_GRAY = RGBColor(0x37, 0x41, 0x51)
MED_GRAY = RGBColor(0x6B, 0x72, 0x80)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
RED = RGBColor(0xDC, 0x26, 0x26)
AMBER = RGBColor(0xD9, 0x77, 0x06)
GREEN = RGBColor(0x16, 0xA3, 0x4A)


def _set_cell_shading(cell, color_hex):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}" w:val="clear"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def _add_cell_text(cell, text, bold=False, color=DARK_GRAY, size=9, align=None):
    cell.text = ""
    p = cell.paragraphs[0]
    if align:
        p.alignment = align
    run = p.add_run(str(text))
    run.font.name = "Calibri"
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER


def _style_header_row(row, bg_hex="0A192F"):
    for cell in row.cells:
        _set_cell_shading(cell, bg_hex)
        for p in cell.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in p.runs:
                run.font.bold = True
                run.font.color.rgb = WHITE
                run.font.name = "Calibri"
                run.font.size = Pt(9)


def compute_checksum(file_path):
    h = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()[:16]


def validate_template_file(file_path, original_name):
    """Validate uploaded template file."""
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Tipo de archivo no permitido. Solo: {', '.join(ALLOWED_EXTENSIONS)}"

    size = os.path.getsize(file_path)
    if size > MAX_TEMPLATE_SIZE:
        return False, f"Archivo demasiado grande. Máximo: {MAX_TEMPLATE_SIZE // (1024*1024)}MB"

    try:
        DocxTemplate(str(file_path))
    except Exception as e:
        return False, f"Archivo DOCX inválido: {str(e)[:100]}"

    return True, "OK"


# ==================== BASE TEMPLATE BUILDER ====================

def create_base_template():
    """
    Create the internal base template with Jinja2 placeholders.
    This template is used when no custom template is active.
    """
    doc = Document()

    # Styles
    style = doc.styles['Normal']
    style.font.name = 'Calibri'
    style.font.size = Pt(11)
    style.font.color.rgb = DARK_GRAY

    for level in range(1, 4):
        hs = doc.styles[f'Heading {level}']
        hs.font.name = 'Calibri'
        hs.font.color.rgb = NAVY

    for section in doc.sections:
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    # === COVER PAGE ===
    for _ in range(4):
        doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("{{ classification }}")
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = RED

    doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("INFORME DE AUDITORÍA")
    r.font.size = Pt(28)
    r.font.bold = True
    r.font.color.rgb = NAVY
    r.font.name = "Calibri"

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Evaluación de Cumplimiento Normativo")
    r.font.size = Pt(14)
    r.font.color.rgb = CYAN
    r.font.name = "Calibri"

    doc.add_paragraph()

    # Cover info as plain text with placeholders
    cover_fields = [
        ("Cliente:", "{{ client_name }}"),
        ("Unidad / Área:", "{{ unit }}"),
        ("Evaluador:", "{{ evaluator }}"),
        ("Marcos Evaluados:", "{{ frameworks_text }}"),
        ("Fecha de Emisión:", "{{ report_date }}"),
        ("Versión:", "{{ report_version }}"),
        ("Clasificación:", "{{ classification }}"),
    ]
    for label, value in cover_fields:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(f"{label} ")
        r.font.name = "Calibri"
        r.font.size = Pt(10)
        r.font.bold = True
        r.font.color.rgb = NAVY
        r = p.add_run(value)
        r.font.name = "Calibri"
        r.font.size = Pt(10)
        r.font.color.rgb = DARK_GRAY

    doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Documento confidencial. Uso exclusivo del destinatario autorizado.")
    r.font.size = Pt(8)
    r.font.color.rgb = MED_GRAY

    doc.add_page_break()

    # === TABLE OF CONTENTS ===
    doc.add_heading("TABLA DE CONTENIDOS", level=1)
    for item in [
        "1. Resumen Ejecutivo",
        "2. Metodología y Supuestos",
        "3. Nivel Global de Cumplimiento",
        "4. Resultados por Marco Normativo",
        "5. Hallazgos Clasificados",
        "6. Matriz de Riesgos Consolidada",
        "7. Recomendaciones Priorizadas",
        "8. Conclusión Ejecutiva y Próximos Pasos",
        "9. Nota Legal",
    ]:
        p = doc.add_paragraph(item)
        p.paragraph_format.space_after = Pt(4)
        for run in p.runs:
            run.font.name = "Calibri"
            run.font.color.rgb = NAVY

    doc.add_page_break()

    # === SECTIONS WITH PLACEHOLDERS ===
    # 1. Executive Summary
    doc.add_heading("1. RESUMEN EJECUTIVO", level=1)
    p = doc.add_paragraph("{{ executive_summary }}")
    p.paragraph_format.space_after = Pt(8)

    # 2. Methodology
    doc.add_heading("2. METODOLOGÍA Y SUPUESTOS", level=1)
    p = doc.add_paragraph("{{ methodology }}")
    p.paragraph_format.space_after = Pt(8)

    # 3. Global Compliance
    doc.add_heading("3. NIVEL GLOBAL DE CUMPLIMIENTO", level=1)
    p = doc.add_paragraph("{{ compliance_explanation }}")
    p.paragraph_format.space_after = Pt(8)

    # Compliance scores will be rendered programmatically
    p = doc.add_paragraph("{{ compliance_scores_text }}")

    # 4. Results per framework
    doc.add_heading("4. RESULTADOS POR MARCO NORMATIVO", level=1)
    p = doc.add_paragraph("{{ framework_results }}")

    # 5. Findings
    doc.add_heading("5. HALLAZGOS CLASIFICADOS", level=1)
    p = doc.add_paragraph("{{ findings_text }}")

    # 6. Risk Matrix
    doc.add_heading("6. MATRIZ DE RIESGOS CONSOLIDADA", level=1)
    p = doc.add_paragraph("{{ risk_matrix_text }}")

    # 7. Recommendations
    doc.add_heading("7. RECOMENDACIONES PRIORIZADAS", level=1)
    p = doc.add_paragraph("{{ recommendations_text }}")

    # 8. Conclusion
    doc.add_heading("8. CONCLUSIÓN EJECUTIVA Y PRÓXIMOS PASOS", level=1)
    p = doc.add_paragraph("{{ conclusion }}")

    # 9. Legal
    doc.add_heading("9. NOTA LEGAL", level=1)
    p = doc.add_paragraph("{{ legal_note }}")
    for run in p.runs:
        run.font.size = Pt(9)
        run.font.color.rgb = MED_GRAY

    doc.save(str(BASE_TEMPLATE_PATH))
    logger.info(f"Base template created at {BASE_TEMPLATE_PATH}")
    return BASE_TEMPLATE_PATH


# ==================== REPORT RENDERING ====================

def prepare_template_context(analysis_data, client_info, expanded_findings=None):
    """
    Build the Jinja2 context dict for template rendering.
    All content is pre-formatted as rich text strings.
    """
    scores = analysis_data.get('compliance_scores', {})
    findings = expanded_findings or analysis_data.get('expanded_findings', [])
    gaps = analysis_data.get('gaps', [])
    frameworks = analysis_data.get('frameworks', [])
    report_text = analysis_data.get('analysis', '')

    avg_score = round(sum(scores.values()) / max(len(scores), 1)) if scores else 0
    criticals = [f for f in findings if f.get('severity') == 'critical']
    majors = [f for f in findings if f.get('severity') == 'major']
    minors = [f for f in findings if f.get('severity') == 'minor']
    opportunities = [f for f in findings if f.get('severity') not in ('critical', 'major', 'minor')]

    client_name = client_info.get('client_name', 'Cliente')
    unit = client_info.get('unit', '')
    evaluator = client_info.get('evaluator', 'SmartSecAssess')
    classification = client_info.get('classification', 'CONFIDENCIAL')
    report_version = client_info.get('report_version', 'v1.0')
    report_date = client_info.get('report_date', datetime.now().strftime('%d de %B de %Y'))
    systems = client_info.get('systems', [])

    fw_text = ", ".join(frameworks)
    systems_text = ", ".join(systems) if systems else "No especificados"

    # Executive Summary
    exec_match = _extract_section(report_text, r'1\.\s*RESUMEN EJECUTIVO', r'2\.\s*')
    executive_summary = exec_match or (
        f"Se ha realizado una evaluación de cumplimiento normativo para {client_name} "
        f"contra los marcos {fw_text}. El nivel global de cumplimiento es del {avg_score}%. "
        f"Se identificaron {len(criticals)} hallazgo(s) crítico(s), {len(majors)} mayor(es) "
        f"y {len(minors)} menor(es). Los resultados requieren atención prioritaria en los "
        f"hallazgos críticos dentro de los próximos 30 días para mitigar riesgos operacionales."
    )

    # Methodology
    method_match = _extract_section(report_text, r'2\.\s*(?:METODOLOG|ALCANCE)', r'3\.\s*')
    methodology = method_match or (
        f"La evaluación comprende el análisis de documentación proporcionada por {client_name} "
        f"contra: {fw_text}. Sistemas evaluados: {systems_text}.\n\n"
        f"Metodología: Análisis automatizado mediante IA con clasificación por severidad "
        f"(Crítico, Mayor, Menor, Oportunidad), evaluación CIA, y alineación ISO 27002:2022.\n\n"
        f"Limitaciones: Esta evaluación se basa exclusivamente en la documentación proporcionada. "
        f"No sustituye una auditoría presencial ni pruebas de penetración."
    )

    # Compliance explanation
    compliance_explanation = (
        f"El nivel global de cumplimiento agregado es del {avg_score}%.\n\n"
        f"Criterio de cálculo: Se evalúa cada control normativo aplicable contra la evidencia "
        f"documental proporcionada. Cada control recibe una puntuación de 0% (no implementado), "
        f"50% (parcialmente implementado) o 100% (completamente implementado). El porcentaje "
        f"final por framework es el promedio de los controles evaluados.\n\n"
        f"Evidencia que cuenta: Políticas documentadas, procedimientos formales, registros de "
        f"implementación, configuraciones técnicas, evidencia de revisión periódica.\n"
        f"Evidencia que NO cuenta: Declaraciones verbales sin soporte documental, intenciones "
        f"futuras no implementadas, documentos sin fecha ni aprobación formal."
    )

    # Compliance scores text
    scores_lines = []
    for fw, score in scores.items():
        status = "Crítico" if score < 40 else "Deficiente" if score < 60 else "Aceptable" if score < 75 else "Bueno" if score < 85 else "Excelente"
        scores_lines.append(f"• {fw}: {score}% - {status}")
    compliance_scores_text = "\n".join(scores_lines) if scores_lines else "Sin datos de cumplimiento."

    # Framework results
    fw_results_match = _extract_section(report_text, r'(?:3|4)\.\s*(?:RESULTADO|ANÁLISIS DETALLADO)', r'(?:4|5|6)\.\s*')
    framework_results = fw_results_match or compliance_scores_text

    # Findings text (detailed)
    findings_parts = []
    for severity_label, group in [("HALLAZGOS CRÍTICOS", criticals), ("HALLAZGOS MAYORES", majors), ("HALLAZGOS MENORES", minors)]:
        if group:
            findings_parts.append(f"\n{severity_label} ({len(group)}):\n")
            for f in group:
                cia = f.get('cia_impact', {})
                risk = f.get('risk_evaluation', {})
                entry = (
                    f"\n{'='*60}\n"
                    f"{f.get('id', 'N/A')} | {f.get('framework', '')} | {f.get('control', '')} - {f.get('control_name', '')}\n"
                    f"{'='*60}\n"
                    f"\nContexto Normativo:\n{f.get('normative_context', 'N/A')}\n"
                    f"\nNo Conformidad:\n{f.get('nonconformity_description', f.get('description', 'N/A'))}\n"
                    f"\nAnálisis Técnico:\n{f.get('technical_analysis', 'N/A')}\n"
                    f"\nImpacto CIA:\n"
                    f"  - Confidencialidad: {cia.get('confidentiality', {}).get('level', 'N/A')} - {cia.get('confidentiality', {}).get('justification', '')}\n"
                    f"  - Integridad: {cia.get('integrity', {}).get('level', 'N/A')} - {cia.get('integrity', {}).get('justification', '')}\n"
                    f"  - Disponibilidad: {cia.get('availability', {}).get('level', 'N/A')} - {cia.get('availability', {}).get('justification', '')}\n"
                    f"\nJustificación Severidad:\n{f.get('severity_justification', 'N/A')}\n"
                    f"\nEvaluación de Riesgo:\n"
                    f"  Probabilidad: {risk.get('probability', 'N/A')} | Impacto: {risk.get('impact', 'N/A')} | Riesgo: {risk.get('risk_level', 'N/A')}\n"
                    f"  {risk.get('risk_calculation', '')}\n"
                    f"\nRecomendación:\n{f.get('recommendation', 'N/A')}\n"
                    f"\nAlineación ISO 27002: {f.get('iso27002_alignment', 'N/A')}\n"
                    f"Plazo: {f.get('suggested_timeline', 'N/A')}\n"
                    f"Madurez: Nivel {f.get('maturity_level', 'N/A')}/5 - {f.get('maturity_description', '')}\n"
                )
                findings_parts.append(entry)

    findings_text = "".join(findings_parts) if findings_parts else "No se identificaron hallazgos."

    # Risk matrix text
    risk_lines = ["ID | Framework | Control | Riesgo | CIA | Prioridad | Plazo"]
    risk_lines.append("-" * 80)
    for idx, f in enumerate(findings):
        risk = f.get('risk_evaluation', {})
        cia = f.get('cia_impact', {})
        cia_str = f"C:{cia.get('confidentiality', {}).get('level', '-')} I:{cia.get('integrity', {}).get('level', '-')} D:{cia.get('availability', {}).get('level', '-')}"
        sev = f.get('severity', 'major')
        prio = {'critical': 'P1', 'major': 'P2', 'minor': 'P3'}.get(sev, 'P2')
        risk_lines.append(
            f"{f.get('id', f'GAP-{idx+1:03d}')} | {f.get('framework', 'N/A')} | "
            f"{f.get('control', 'N/A')} | {risk.get('risk_level', 'MEDIO')} | "
            f"{cia_str} | {prio} | {f.get('suggested_timeline', '30-60 días')}"
        )
    risk_matrix_text = "\n".join(risk_lines) if len(risk_lines) > 2 else "Sin datos para la matriz de riesgos."

    # Recommendations
    rec_parts = []
    for prio_label, group in [("P1 - CRÍTICA (0-30 días)", criticals), ("P2 - ALTA (30-90 días)", majors), ("P3 - MEDIA (90+ días)", minors)]:
        if group:
            rec_parts.append(f"\n{prio_label}:\n")
            for f in group:
                rec_parts.append(
                    f"\n{f.get('id', 'N/A')} [{f.get('framework', '')} - {f.get('control', '')}]:\n"
                    f"{f.get('recommendation', 'Sin recomendación específica.')}\n"
                    f"Alineación: {f.get('iso27002_alignment', 'N/A')}\n"
                    f"Plazo: {f.get('suggested_timeline', 'N/A')}\n"
                )
    recommendations_text = "".join(rec_parts) if rec_parts else "Las recomendaciones se detallan en cada hallazgo."

    # Conclusion
    conc_match = _extract_section(report_text, r'(?:6|8|9|10)\.\s*CONCLUSI', r'(?:NOTA|$)')
    conclusion = conc_match or (
        f"La evaluación de {client_name} revela un nivel de cumplimiento del {avg_score}%. "
        f"Se requiere atención inmediata a los {len(criticals)} hallazgo(s) crítico(s). "
        f"Se recomienda validar resultados con auditoría presencial antes de decisiones críticas."
    )

    legal_note = (
        "Este informe ha sido generado mediante análisis de inteligencia artificial por SmartSecAssess. "
        "Constituye una evaluación orientativa que debe ser revisada y validada por un auditor "
        "certificado (CISA, CISSP, ISO 27001 Lead Auditor) antes de su uso oficial. "
        "No constituye certificación de cumplimiento ni asesoramiento legal vinculante."
    )

    return {
        "client_name": client_name,
        "unit": unit,
        "evaluator": evaluator,
        "classification": classification,
        "report_version": report_version,
        "report_date": report_date,
        "frameworks_text": fw_text,
        "systems_text": systems_text,
        "avg_score": avg_score,
        "total_findings": len(findings),
        "critical_count": len(criticals),
        "major_count": len(majors),
        "minor_count": len(minors),
        "executive_summary": executive_summary,
        "methodology": methodology,
        "compliance_explanation": compliance_explanation,
        "compliance_scores_text": compliance_scores_text,
        "framework_results": framework_results,
        "findings_text": findings_text,
        "risk_matrix_text": risk_matrix_text,
        "recommendations_text": recommendations_text,
        "conclusion": conclusion,
        "legal_note": legal_note,
        # Structured data for loops in custom templates
        "scores": [{"framework": k, "score": v, "status": _score_status(v)} for k, v in scores.items()],
        "findings": findings,
        "criticals": criticals,
        "majors": majors,
        "minors": minors,
    }


def _score_status(score):
    if score < 40: return "Crítico"
    if score < 60: return "Deficiente"
    if score < 75: return "Aceptable"
    if score < 85: return "Bueno"
    return "Excelente"


def _extract_section(text, start_pattern, end_pattern):
    import re
    match = re.search(f'{start_pattern}([\\s\\S]*?)(?={end_pattern})', text, re.IGNORECASE)
    if match:
        result = match.group(1).strip()
        return result if len(result) > 30 else None
    return None


def render_with_template(template_path, context):
    """Render a DOCX template with Jinja2 context using docxtpl."""
    tpl = DocxTemplate(str(template_path))
    tpl.render(context)
    output = io.BytesIO()
    tpl.save(output)
    output.seek(0)
    return output


def render_base_report(analysis_data, client_info, logo_path=None):
    """
    Render report using the internal base template.
    Falls back to programmatic generation if template rendering fails.
    """
    # Ensure base template exists
    if not BASE_TEMPLATE_PATH.exists():
        create_base_template()

    context = prepare_template_context(analysis_data, client_info)

    try:
        output = render_with_template(BASE_TEMPLATE_PATH, context)
        logger.info("Report rendered with base template via docxtpl")
        return output
    except Exception as e:
        logger.warning(f"Base template render failed, falling back to programmatic: {e}")
        from report_generator import generate_report_docx
        return generate_report_docx(analysis_data, client_info, logo_path)


def render_custom_report(template_path, analysis_data, client_info):
    """Render report using a custom user-uploaded template."""
    context = prepare_template_context(analysis_data, client_info)
    return render_with_template(template_path, context)


# Initialize base template on module load
if not BASE_TEMPLATE_PATH.exists():
    try:
        create_base_template()
    except Exception as e:
        logger.error(f"Failed to create base template: {e}")
