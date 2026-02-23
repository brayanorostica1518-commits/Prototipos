"""
Professional DOCX Report Generator
Generates Big4-style audit reports with:
- Cover page with logo
- Table of contents
- Headers/footers with branding
- Styled tables
- Full expanded finding details
"""

import io
import os
import re
import logging
from datetime import datetime, timezone
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
from PIL import Image

logger = logging.getLogger(__name__)

# Brand colors
NAVY = RGBColor(0x0A, 0x19, 0x2F)
CYAN = RGBColor(0x06, 0xB6, 0xD4)
DARK_GRAY = RGBColor(0x37, 0x41, 0x51)
MED_GRAY = RGBColor(0x6B, 0x72, 0x80)
LIGHT_GRAY = RGBColor(0xF3, 0xF4, 0xF6)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
RED = RGBColor(0xDC, 0x26, 0x26)
AMBER = RGBColor(0xD9, 0x77, 0x06)
GREEN = RGBColor(0x16, 0xA3, 0x4A)


def _set_cell_shading(cell, color_hex):
    """Set background color of a table cell."""
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}" w:val="clear"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def _set_cell_border(cell, **kwargs):
    """Set cell borders."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}></w:tcBorders>')
    for edge, val in kwargs.items():
        element = parse_xml(
            f'<w:{edge} {nsdecls("w")} w:val="{val.get("val", "single")}" '
            f'w:sz="{val.get("sz", "4")}" w:space="0" '
            f'w:color="{val.get("color", "0A192F")}"/>'
        )
        tcBorders.append(element)
    tcPr.append(tcBorders)


def _add_styled_paragraph(doc, text, font_name="Calibri", size=11, bold=False,
                           color=DARK_GRAY, alignment=None, space_before=0, space_after=6):
    """Add a paragraph with consistent styling."""
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = font_name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    if alignment:
        p.alignment = alignment
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    return p


def _add_section_heading(doc, text, level=1):
    """Add a styled section heading."""
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = "Calibri"
        run.font.color.rgb = NAVY
    return h


def _style_header_row(row, bg_hex="0A192F", text_color=WHITE):
    """Style a table header row."""
    for cell in row.cells:
        _set_cell_shading(cell, bg_hex)
        for paragraph in cell.paragraphs:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in paragraph.runs:
                run.font.bold = True
                run.font.color.rgb = text_color
                run.font.name = "Calibri"
                run.font.size = Pt(9)


def _add_cell_text(cell, text, bold=False, color=DARK_GRAY, size=9, align=None):
    """Add styled text to a table cell."""
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


def generate_report_docx(analysis_data, client_info, logo_path=None):
    """
    Generate a professional Big4-style DOCX audit report.
    
    Args:
        analysis_data: dict with compliance_scores, gaps, expanded_findings, etc.
        client_info: dict with client_name, unit, evaluator, classification
        logo_path: optional path to client logo image
    
    Returns:
        io.BytesIO with the DOCX file
    """
    doc = Document()

    # === DOCUMENT SETUP ===
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    font.color.rgb = DARK_GRAY

    for level in range(1, 4):
        hs = doc.styles[f'Heading {level}']
        hs.font.name = 'Calibri'
        hs.font.color.rgb = NAVY

    for section in doc.sections:
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    client_name = client_info.get('client_name', 'Cliente')
    unit = client_info.get('unit', '')
    evaluator = client_info.get('evaluator', 'SmartSecAssess')
    classification = client_info.get('classification', 'CONFIDENCIAL')
    report_date = datetime.now().strftime('%d de %B de %Y')
    frameworks = analysis_data.get('frameworks', [])
    fw_text = ", ".join(frameworks)

    # === COVER PAGE ===
    # Top spacing
    for _ in range(3):
        doc.add_paragraph()

    # Logo
    if logo_path and os.path.exists(logo_path):
        try:
            logo_p = doc.add_paragraph()
            logo_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            logo_p.add_run().add_picture(logo_path, width=Inches(2.5))
        except Exception as e:
            logger.warning(f"Could not add logo: {e}")

    doc.add_paragraph()

    # Classification badge
    _add_styled_paragraph(doc, classification, size=10, bold=True, color=RED,
                           alignment=WD_ALIGN_PARAGRAPH.CENTER, space_before=12, space_after=24)

    # Main title
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_p.add_run("INFORME DE AUDITORÍA")
    title_run.font.name = "Calibri"
    title_run.font.size = Pt(28)
    title_run.font.bold = True
    title_run.font.color.rgb = NAVY

    # Subtitle
    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = sub_p.add_run("Evaluación de Cumplimiento Normativo")
    sub_run.font.name = "Calibri"
    sub_run.font.size = Pt(16)
    sub_run.font.color.rgb = CYAN

    doc.add_paragraph()

    # Horizontal line
    line_p = doc.add_paragraph()
    line_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    line_run = line_p.add_run("━" * 50)
    line_run.font.color.rgb = CYAN
    line_run.font.size = Pt(10)

    doc.add_paragraph()

    # Cover details table
    cover_table = doc.add_table(rows=6, cols=2)
    cover_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cover_data = [
        ("Cliente:", client_name),
        ("Unidad / Área:", unit),
        ("Evaluador:", evaluator),
        ("Marcos Evaluados:", fw_text),
        ("Fecha de Emisión:", report_date),
        ("Clasificación:", classification),
    ]
    for i, (label, value) in enumerate(cover_data):
        _add_cell_text(cover_table.rows[i].cells[0], label, bold=True, color=NAVY, size=10)
        _add_cell_text(cover_table.rows[i].cells[1], value, color=DARK_GRAY, size=10)

    doc.add_paragraph()
    _add_styled_paragraph(
        doc,
        "Este documento es confidencial y de uso exclusivo del destinatario autorizado.",
        size=8, color=MED_GRAY, alignment=WD_ALIGN_PARAGRAPH.CENTER
    )

    doc.add_page_break()

    # === TABLE OF CONTENTS ===
    _add_section_heading(doc, "TABLA DE CONTENIDOS", level=1)
    toc_items = [
        "1. Resumen Ejecutivo",
        "2. Alcance y Metodología",
        "3. Nivel Global de Cumplimiento",
        "4. Hallazgos Clasificados",
        "5. Matriz de Riesgos Consolidada",
        "6. Recomendaciones Priorizadas",
        "7. Conclusión Estratégica",
        "8. Nota Legal",
    ]
    for item in toc_items:
        _add_styled_paragraph(doc, item, size=11, color=NAVY, space_before=4, space_after=4)

    doc.add_page_break()

    # === HEADERS & FOOTERS ===
    for section in doc.sections:
        # Header
        header = section.header
        header.is_linked_to_previous = False
        hp = header.paragraphs[0] if header.paragraphs else header.add_paragraph()
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hr = hp.add_run(f"{client_name} | Informe de Auditoría")
        hr.font.name = "Calibri"
        hr.font.size = Pt(8)
        hr.font.color.rgb = MED_GRAY

        # Footer
        footer = section.footer
        footer.is_linked_to_previous = False
        fp = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fr = fp.add_run(f"SmartSecAssess | {classification} | v1.0")
        fr.font.name = "Calibri"
        fr.font.size = Pt(7)
        fr.font.color.rgb = MED_GRAY

    # === 1. RESUMEN EJECUTIVO ===
    _add_section_heading(doc, "1. RESUMEN EJECUTIVO", level=1)

    executive_report = analysis_data.get('analysis', '')
    summary_match = re.search(r'1\.\s*RESUMEN EJECUTIVO([\s\S]*?)(?=2\.\s*)', executive_report, re.IGNORECASE)
    if summary_match:
        paragraphs = summary_match.group(1).strip().split('\n')
        for para in paragraphs:
            t = para.strip()
            if t and not re.match(r'^[=═─]+$', t):
                _add_styled_paragraph(doc, t, space_after=8)
    else:
        scores = analysis_data.get('compliance_scores', {})
        avg = round(sum(scores.values()) / max(len(scores), 1)) if scores else 0
        expanded = analysis_data.get('expanded_findings', [])
        crit = sum(1 for f in expanded if f.get('severity') == 'critical')
        maj = sum(1 for f in expanded if f.get('severity') == 'major')
        _add_styled_paragraph(
            doc,
            f"Se ha realizado una evaluación integral de cumplimiento normativo para {client_name}, "
            f"analizando la documentación proporcionada contra los marcos {fw_text}. "
            f"El nivel global de cumplimiento alcanzado es del {avg}%, con {crit} hallazgo(s) "
            f"crítico(s) y {maj} mayor(es) identificados que requieren atención prioritaria."
        )

    # === 2. ALCANCE Y METODOLOGÍA ===
    _add_section_heading(doc, "2. ALCANCE Y METODOLOGÍA", level=1)

    method_match = re.search(r'2\.\s*(?:ALCANCE|METODOLOG)([\s\S]*?)(?=3\.\s*)', executive_report, re.IGNORECASE)
    if method_match:
        for line in method_match.group(1).strip().split('\n'):
            t = line.strip()
            if t and not re.match(r'^[=═─]+$', t):
                if t.startswith('- ') or t.startswith('• '):
                    doc.add_paragraph(t[2:], style='List Bullet')
                else:
                    _add_styled_paragraph(doc, t)
    else:
        _add_styled_paragraph(doc, f"La presente evaluación comprende el análisis de la documentación proporcionada por {client_name} contra los siguientes marcos normativos: {fw_text}.")
        _add_styled_paragraph(doc, "Metodología: Análisis automatizado mediante inteligencia artificial con clasificación de hallazgos por severidad (Crítico, Mayor, Menor), evaluación de impacto CIA (Confidencialidad, Integridad, Disponibilidad) y alineación con ISO/IEC 27002:2022.")

    # === 3. NIVEL GLOBAL DE CUMPLIMIENTO ===
    _add_section_heading(doc, "3. NIVEL GLOBAL DE CUMPLIMIENTO", level=1)

    scores = analysis_data.get('compliance_scores', {})
    if scores:
        avg_score = round(sum(scores.values()) / len(scores))
        status_text = "Crítico" if avg_score < 40 else "Deficiente" if avg_score < 60 else "Aceptable" if avg_score < 75 else "Bueno" if avg_score < 85 else "Excelente"
        _add_styled_paragraph(
            doc,
            f"El nivel de cumplimiento global agregado es del {avg_score}%, clasificado como: {status_text}.",
            bold=True, size=12
        )

        # Compliance table
        table = doc.add_table(rows=1, cols=3)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        hdr = table.rows[0]
        for i, txt in enumerate(['Marco Normativo', 'Cumplimiento', 'Estado']):
            _add_cell_text(hdr.cells[i], txt, bold=True, color=WHITE, align=WD_ALIGN_PARAGRAPH.CENTER)
        _style_header_row(hdr)

        for fw, score in scores.items():
            row = table.add_row()
            _add_cell_text(row.cells[0], fw, bold=True)
            _add_cell_text(row.cells[1], f"{score}%", align=WD_ALIGN_PARAGRAPH.CENTER)
            status = "Crítico" if score < 40 else "Deficiente" if score < 60 else "Aceptable" if score < 75 else "Bueno" if score < 85 else "Excelente"
            color = RED if score < 40 else AMBER if score < 75 else GREEN
            _add_cell_text(row.cells[2], status, bold=True, color=color, align=WD_ALIGN_PARAGRAPH.CENTER)

        # Alternate row shading
        for i, row in enumerate(table.rows[1:], 1):
            if i % 2 == 0:
                for cell in row.cells:
                    _set_cell_shading(cell, "F3F4F6")

    doc.add_paragraph()

    # === 4. HALLAZGOS CLASIFICADOS ===
    _add_section_heading(doc, "4. HALLAZGOS CLASIFICADOS", level=1)

    expanded_findings = analysis_data.get('expanded_findings', [])
    criticals = [f for f in expanded_findings if f.get('severity') == 'critical']
    majors = [f for f in expanded_findings if f.get('severity') == 'major']
    minors = [f for f in expanded_findings if f.get('severity') == 'minor']

    def _render_finding_group(findings, label, severity_color, severity_hex):
        if not findings:
            return
        _add_section_heading(doc, f"4.{['', '1', '2', '3'][['', 'critical', 'major', 'minor'].index(findings[0].get('severity', 'major'))]} {label} ({len(findings)})", level=2)

        for idx, f in enumerate(findings):
            # Finding header
            fid = f.get('id', f'HAL-{idx+1:03d}')
            ctrl = f.get('control', 'N/A')
            ctrl_name = f.get('control_name', '')
            fw = f.get('framework', '')

            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            r = p.add_run(f"{fid} | {fw} | {ctrl} - {ctrl_name}")
            r.font.name = "Calibri"
            r.font.size = Pt(11)
            r.font.bold = True
            r.font.color.rgb = severity_color

            # Finding detail table (2 columns: label, content)
            detail_fields = [
                ("Contexto Normativo", f.get('normative_context', '')),
                ("No Conformidad", f.get('nonconformity_description', f.get('description', ''))),
                ("Análisis Técnico", f.get('technical_analysis', '')),
                ("Justificación Severidad", f.get('severity_justification', '')),
                ("Recomendación", f.get('recommendation', '')),
                ("Alineación ISO 27002", f.get('iso27002_alignment', '')),
                ("Plazo Sugerido", f.get('suggested_timeline', '')),
            ]

            detail_table = doc.add_table(rows=len(detail_fields), cols=2)
            detail_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            for i, (label_txt, value_txt) in enumerate(detail_fields):
                if not value_txt:
                    continue
                _add_cell_text(detail_table.rows[i].cells[0], label_txt, bold=True, color=NAVY, size=9)
                _set_cell_shading(detail_table.rows[i].cells[0], "E8F4FD")
                _add_cell_text(detail_table.rows[i].cells[1], str(value_txt)[:800], size=9)
                # Set column widths
                detail_table.rows[i].cells[0].width = Cm(4)
                detail_table.rows[i].cells[1].width = Cm(12)

            # CIA Impact mini-table
            cia = f.get('cia_impact', {})
            if cia:
                _add_styled_paragraph(doc, "Impacto en Confidencialidad, Integridad y Disponibilidad:",
                                       bold=True, size=9, color=NAVY, space_before=6)
                cia_table = doc.add_table(rows=1, cols=4)
                cia_table.alignment = WD_TABLE_ALIGNMENT.CENTER
                for i, txt in enumerate(['Dimensión', 'Nivel', 'Justificación', '']):
                    if txt:
                        _add_cell_text(cia_table.rows[0].cells[i], txt, bold=True, color=WHITE, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
                _style_header_row(cia_table.rows[0])

                for dim_key, dim_label in [('confidentiality', 'Confidencialidad'), ('integrity', 'Integridad'), ('availability', 'Disponibilidad')]:
                    d = cia.get(dim_key, {})
                    if d:
                        row = cia_table.add_row()
                        _add_cell_text(row.cells[0], dim_label, bold=True, size=8)
                        level_val = d.get('level', 'N/A')
                        level_color = RED if level_val == 'ALTO' else AMBER if level_val == 'MEDIO' else GREEN
                        _add_cell_text(row.cells[1], level_val, bold=True, color=level_color, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
                        _add_cell_text(row.cells[2], d.get('justification', ''), size=8)

                # Remove empty 4th column
                for row in cia_table.rows:
                    row.cells[3].text = ""

            # Risk evaluation
            risk = f.get('risk_evaluation', {})
            if risk.get('risk_level'):
                _add_styled_paragraph(doc, "Evaluación de Riesgo:", bold=True, size=9, color=NAVY, space_before=6)
                risk_text = f"Probabilidad: {risk.get('probability', 'N/A')} | Impacto: {risk.get('impact', 'N/A')} | Nivel de Riesgo: {risk.get('risk_level', 'N/A')}"
                if risk.get('risk_calculation'):
                    risk_text += f" ({risk['risk_calculation']})"
                _add_styled_paragraph(doc, risk_text, size=9)

            # Maturity
            mat = f.get('maturity_level')
            if mat is not None:
                mat_desc = f.get('maturity_description', '')
                _add_styled_paragraph(doc, f"Nivel de Madurez: {mat}/5 - {mat_desc}", size=9, color=MED_GRAY, space_before=4)

            doc.add_paragraph()

    _render_finding_group(criticals, "Hallazgos Críticos", RED, "DC2626")
    _render_finding_group(majors, "Hallazgos Mayores", AMBER, "D97706")
    _render_finding_group(minors, "Hallazgos Menores", GREEN, "16A34A")

    if not expanded_findings:
        # Fallback to basic gaps
        gaps = analysis_data.get('gaps', [])
        if gaps:
            table = doc.add_table(rows=1, cols=4)
            for i, txt in enumerate(['Framework', 'Descripción', 'Severidad', 'Recomendación']):
                _add_cell_text(table.rows[0].cells[i], txt, bold=True, color=WHITE, size=9, align=WD_ALIGN_PARAGRAPH.CENTER)
            _style_header_row(table.rows[0])
            for gap in gaps:
                row = table.add_row()
                _add_cell_text(row.cells[0], gap.get('framework', ''), size=9)
                _add_cell_text(row.cells[1], gap.get('description', '')[:200], size=9)
                sev = gap.get('severity', 'medium')
                sev_label = {'high': 'Alta', 'medium': 'Media', 'low': 'Baja'}.get(sev, 'Media')
                sev_color = RED if sev == 'high' else AMBER if sev == 'medium' else GREEN
                _add_cell_text(row.cells[2], sev_label, bold=True, color=sev_color, size=9, align=WD_ALIGN_PARAGRAPH.CENTER)
                _add_cell_text(row.cells[3], gap.get('recommendation', '')[:200], size=9)
        else:
            _add_styled_paragraph(doc, "No se identificaron hallazgos con la documentación proporcionada.")

    doc.add_page_break()

    # === 5. MATRIZ DE RIESGOS CONSOLIDADA ===
    _add_section_heading(doc, "5. MATRIZ DE RIESGOS CONSOLIDADA", level=1)

    all_findings = expanded_findings if expanded_findings else analysis_data.get('gaps', [])
    if all_findings:
        risk_table = doc.add_table(rows=1, cols=7)
        risk_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        for i, txt in enumerate(['ID', 'Framework', 'Control', 'Riesgo', 'CIA', 'Prioridad', 'Plazo']):
            _add_cell_text(risk_table.rows[0].cells[i], txt, bold=True, color=WHITE, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        _style_header_row(risk_table.rows[0])

        for idx, f in enumerate(all_findings):
            row = risk_table.add_row()
            fid = f.get('id', f'GAP-{idx+1:03d}')
            _add_cell_text(row.cells[0], fid, size=8, bold=True)
            _add_cell_text(row.cells[1], f.get('framework', 'N/A'), size=8)
            _add_cell_text(row.cells[2], f.get('control', 'N/A'), size=8)

            risk = f.get('risk_evaluation', {})
            risk_lvl = risk.get('risk_level', 'MEDIO') if risk else ('ALTO' if f.get('severity') in ['high', 'critical'] else 'MEDIO')
            risk_color = RED if 'CRÍT' in str(risk_lvl).upper() or 'ALT' in str(risk_lvl).upper() else AMBER if 'MED' in str(risk_lvl).upper() else GREEN
            _add_cell_text(row.cells[3], risk_lvl, bold=True, color=risk_color, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)

            cia = f.get('cia_impact', {})
            cia_str = f"C:{cia.get('confidentiality', {}).get('level', '-')} I:{cia.get('integrity', {}).get('level', '-')} D:{cia.get('availability', {}).get('level', '-')}" if cia else "N/A"
            _add_cell_text(row.cells[4], cia_str, size=7)

            sev = f.get('severity', 'major')
            prio = {'critical': 'P1', 'major': 'P2', 'minor': 'P3', 'high': 'P1', 'medium': 'P2', 'low': 'P3'}.get(sev, 'P2')
            _add_cell_text(row.cells[5], prio, bold=True, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
            _add_cell_text(row.cells[6], f.get('suggested_timeline', '30-60 días'), size=8)

            if idx % 2 == 1:
                for cell in row.cells:
                    _set_cell_shading(cell, "F3F4F6")

    doc.add_paragraph()

    # === 6. RECOMENDACIONES PRIORIZADAS ===
    _add_section_heading(doc, "6. RECOMENDACIONES PRIORIZADAS", level=1)

    if expanded_findings:
        for priority, label, findings_group in [
            ('P1', 'Prioridad Crítica (0-30 días)', criticals),
            ('P2', 'Prioridad Alta (30-90 días)', majors),
            ('P3', 'Prioridad Media (90+ días)', minors),
        ]:
            if findings_group:
                _add_section_heading(doc, f"{priority} - {label}", level=2)
                for f in findings_group:
                    fid = f.get('id', 'N/A')
                    rec = f.get('recommendation', 'Sin recomendación específica.')
                    iso = f.get('iso27002_alignment', '')
                    timeline = f.get('suggested_timeline', '')

                    p = doc.add_paragraph()
                    r = p.add_run(f"{fid} [{f.get('framework', '')} - {f.get('control', '')}]")
                    r.font.bold = True
                    r.font.name = "Calibri"
                    r.font.size = Pt(10)
                    r.font.color.rgb = NAVY

                    _add_styled_paragraph(doc, rec, size=10, space_after=4)
                    if iso:
                        _add_styled_paragraph(doc, f"Alineación: {iso}", size=9, color=MED_GRAY)
                    if timeline:
                        _add_styled_paragraph(doc, f"Plazo: {timeline}", size=9, color=MED_GRAY, space_after=10)
    else:
        recs_match = re.search(r'(?:6|7)\.\s*RECOMENDACIONES([\s\S]*?)(?=(?:7|8|9)\.\s*)', executive_report, re.IGNORECASE)
        if recs_match:
            for line in recs_match.group(1).strip().split('\n'):
                t = line.strip()
                if t and not re.match(r'^[=═─]+$', t):
                    _add_styled_paragraph(doc, t)

    doc.add_page_break()

    # === 7. CONCLUSIÓN ESTRATÉGICA ===
    _add_section_heading(doc, "7. CONCLUSIÓN ESTRATÉGICA", level=1)

    conclusion_match = re.search(r'(?:6|8|9|10)\.\s*CONCLUSI[OÓ]N([\s\S]*?)(?=(?:7|8|9|10|NOTA)\.\s*|$)', executive_report, re.IGNORECASE)
    if conclusion_match:
        for line in conclusion_match.group(1).strip().split('\n'):
            t = line.strip()
            if t and not re.match(r'^[=═─]+$', t):
                _add_styled_paragraph(doc, t, space_after=8)
    else:
        avg_s = round(sum(scores.values()) / max(len(scores), 1)) if scores else 0
        _add_styled_paragraph(
            doc,
            f"La evaluación realizada para {client_name} revela un nivel de cumplimiento del {avg_s}%. "
            f"Se identificaron {len(criticals)} hallazgo(s) crítico(s), {len(majors)} mayor(es) y {len(minors)} menor(es). "
            f"Se recomienda priorizar la remediación de los hallazgos críticos dentro de los próximos 30 días.",
            space_after=8
        )

    # === 8. NOTA LEGAL ===
    _add_section_heading(doc, "8. NOTA LEGAL", level=1)
    _add_styled_paragraph(
        doc,
        "Este informe ha sido generado mediante análisis de inteligencia artificial por la plataforma "
        "SmartSecAssess y constituye una evaluación orientativa. Debe ser revisado y validado por un "
        "auditor certificado (CISA, CISSP, ISO 27001 Lead Auditor) antes de su uso oficial o toma de "
        "decisiones críticas. No constituye una certificación de cumplimiento ni asesoramiento legal vinculante.",
        size=9, color=MED_GRAY
    )

    # === SAVE ===
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    return file_stream
