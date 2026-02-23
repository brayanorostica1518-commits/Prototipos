"""
Analysis Pipeline - 3-Stage Report Generation
Stage 1: Classification of findings
Stage 2: Technical expansion per finding
Stage 3: Consolidated executive report construction
"""

import asyncio
import json
import re
import os
import uuid
import time
import logging
from typing import List, Dict, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

logger = logging.getLogger(__name__)

MAX_CONCURRENT_EXPANSIONS = 3


def parse_json_from_text(text: str) -> Optional[dict]:
    """Extract JSON from LLM response, handling code blocks and extra text"""
    # Try <JSON_DATA> tags first
    tag_match = re.search(r'<JSON_DATA>\s*([\s\S]*?)\s*</JSON_DATA>', text)
    if tag_match:
        try:
            return json.loads(tag_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try markdown code blocks
    block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if block_match:
        try:
            return json.loads(block_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try raw JSON object
    brace_match = re.search(r'\{[\s\S]*\}', text)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    return None


# ==================== STAGE 1: CLASSIFICATION ====================

async def stage1_classify(api_key, session_id, user_text, frameworks, file_contents):
    """
    Stage 1: Analyze documents and classify findings.
    Returns: (raw_analysis_text, compliance_scores, findings_list)
    """
    frameworks_text = ", ".join(frameworks)

    system_msg = f"""Eres un auditor senior certificado ISO/IEC 27001:2022.
Analiza la documentación contra: {frameworks_text}.

RESPONDE EN DOS PARTES:

PARTE 1 - ANÁLISIS NARRATIVO:
Proporciona un análisis técnico profesional de los documentos.

PARTE 2 - DATOS ESTRUCTURADOS:
Al FINAL de tu respuesta, incluye un bloque JSON entre <JSON_DATA> y </JSON_DATA>:

<JSON_DATA>
{{
  "compliance_scores": {{
    "{frameworks[0]}": 65
  }},
  "findings": [
    {{
      "id": "HAL-001",
      "framework": "{frameworks[0]}",
      "control": "A.8.5",
      "control_name": "Nombre del control",
      "description": "Descripción del hallazgo",
      "severity": "critical",
      "cia_primary": "confidentiality"
    }}
  ]
}}
</JSON_DATA>

REGLAS:
- severity: "critical", "major" o "minor"
- cia_primary: "confidentiality", "integrity" o "availability"
- Genera TODOS los hallazgos relevantes (mínimo 5 si hay evidencia)
- compliance_scores debe cubrir TODOS los frameworks: {frameworks_text}
- Scores realistas basados en evidencia documental
- NO inventar hallazgos sin base en los documentos"""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"{session_id}_s1",
        system_message=system_msg
    ).with_model("gemini", "gemini-2.0-flash")

    response = await chat.send_message(UserMessage(
        text=user_text,
        file_contents=file_contents if file_contents else None
    ))

    compliance_scores = {}
    findings = []

    # Parse structured data
    data = parse_json_from_text(response)
    if data:
        compliance_scores = data.get('compliance_scores', {})
        findings = data.get('findings', [])

    # Fallback: regex extraction for scores
    if not compliance_scores:
        for fw in frameworks:
            for pattern in [rf"{re.escape(fw)}[:\s]+(\d+)%", rf"{re.escape(fw)}.*?(\d+)%"]:
                match = re.search(pattern, response, re.IGNORECASE)
                if match:
                    compliance_scores[fw] = int(match.group(1))
                    break
            if fw not in compliance_scores:
                compliance_scores[fw] = 50

    # Fallback: extract basic findings if JSON parse failed
    if not findings:
        findings = _extract_basic_findings(response, frameworks)

    # Ensure all finding IDs are unique
    for i, f in enumerate(findings):
        if not f.get('id'):
            f['id'] = f"HAL-{i+1:03d}"

    clean_response = re.sub(r'<JSON_DATA>[\s\S]*?</JSON_DATA>', '', response).strip()
    return clean_response, compliance_scores, findings


def _extract_basic_findings(text, frameworks):
    findings = []
    count = 0
    for line in text.split('\n'):
        s = line.strip()
        if any(kw in s.lower() for kw in ['gap', 'hallazgo', 'no conformidad', 'deficiencia', 'incumplimiento']):
            for fw in frameworks:
                if fw.lower() in s.lower() or fw.split()[0].lower() in s.lower():
                    count += 1
                    findings.append({
                        "id": f"HAL-{count:03d}",
                        "framework": fw,
                        "control": "N/A",
                        "control_name": "Por determinar",
                        "description": s[:200],
                        "severity": "major",
                        "cia_primary": "confidentiality"
                    })
                    break
    return findings[:15]


# ==================== STAGE 2: TECHNICAL EXPANSION ====================

async def stage2_expand_finding(api_key, finding, original_context, frameworks_text):
    """Expand a single finding with full technical detail via LLM."""
    fid = finding.get('id', 'HAL-000')
    fw = finding.get('framework', 'N/A')
    ctrl = finding.get('control', 'N/A')
    ctrl_name = finding.get('control_name', 'N/A')
    desc = finding.get('description', '')
    sev = finding.get('severity', 'major')

    system_msg = """Eres un Auditor Líder ISO/IEC 27001:2022 certificado CISA/CISSP.

Expande el hallazgo de auditoría con máximo detalle técnico.

RESPONDE EXCLUSIVAMENTE en JSON válido (sin texto adicional, sin markdown):

{
  "normative_context": "Contexto normativo completo del control (mínimo 3 oraciones técnicas citando la cláusula exacta)",
  "nonconformity_description": "Descripción formal de la no conformidad (mínimo 4 oraciones profesionales sin frases genéricas)",
  "technical_analysis": "Análisis técnico detallado (mínimo 5 oraciones fundamentadas técnicamente)",
  "cia_impact": {
    "confidentiality": {"level": "ALTO|MEDIO|BAJO", "justification": "Justificación de 2-3 oraciones"},
    "integrity": {"level": "ALTO|MEDIO|BAJO", "justification": "Justificación de 2-3 oraciones"},
    "availability": {"level": "ALTO|MEDIO|BAJO", "justification": "Justificación de 2-3 oraciones"}
  },
  "severity_justification": "Justificación explícita de la severidad asignada (mínimo 3 oraciones)",
  "risk_evaluation": {
    "probability": "ALTA|MEDIA|BAJA",
    "probability_justification": "Justificación",
    "impact": "CRÍTICO|ALTO|MEDIO|BAJO",
    "impact_justification": "Justificación",
    "risk_level": "CRÍTICO|ALTO|MEDIO|BAJO",
    "risk_calculation": "Probabilidad x Impacto = Nivel"
  },
  "recommendation": "Recomendación técnica específica y accionable (mínimo 3 oraciones)",
  "iso27002_alignment": "Cláusula específica de ISO/IEC 27002:2022 y cómo se alinea",
  "suggested_timeline": "0-30 días|30-60 días|60-90 días|90+ días",
  "maturity_level": 2,
  "maturity_description": "Descripción del nivel de madurez (escala 0-5 CMMI)"
}

NO uses frases genéricas. Fundamenta cada campo. Cita controles específicos."""

    user_text = f"""Hallazgo a expandir:
ID: {fid}
Framework: {fw}
Control: {ctrl} - {ctrl_name}
Descripción: {desc}
Severidad: {sev}

Contexto del análisis:
{original_context[:2500]}

Marcos evaluados: {frameworks_text}"""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"exp_{fid}_{uuid.uuid4().hex[:6]}",
        system_message=system_msg
    ).with_model("gemini", "gemini-2.0-flash")

    response = await chat.send_message(UserMessage(text=user_text))

    expanded = parse_json_from_text(response)
    if not expanded:
        logger.warning(f"Failed to parse JSON for finding {fid}, using fallback")
        expanded = _fallback_expansion(finding, response)

    return {**finding, **expanded}


def _fallback_expansion(finding, raw_text):
    sev = finding.get('severity', 'major')
    ctrl = finding.get('control', 'N/A')
    fw = finding.get('framework', 'N/A')
    return {
        "normative_context": f"El control {ctrl} del framework {fw} establece requisitos de seguridad que deben ser implementados.",
        "nonconformity_description": finding.get('description', 'Hallazgo identificado durante la evaluación.'),
        "technical_analysis": raw_text[:500] if raw_text else "Análisis técnico pendiente de expansión manual.",
        "cia_impact": {
            "confidentiality": {"level": "MEDIO", "justification": "Requiere evaluación presencial adicional."},
            "integrity": {"level": "MEDIO", "justification": "Requiere evaluación presencial adicional."},
            "availability": {"level": "BAJO", "justification": "Requiere evaluación presencial adicional."}
        },
        "severity_justification": f"Clasificado como {sev} según evaluación documental inicial.",
        "risk_evaluation": {
            "probability": "MEDIA",
            "probability_justification": "Basado en evidencia documental parcial.",
            "impact": "MEDIO",
            "impact_justification": "Impacto estimado según contexto organizacional.",
            "risk_level": "MEDIO",
            "risk_calculation": "Probabilidad MEDIA x Impacto MEDIO = Riesgo MEDIO"
        },
        "recommendation": "Se requiere auditoría presencial para confirmar este hallazgo y definir acciones correctivas específicas.",
        "iso27002_alignment": "Pendiente de alineación con ISO/IEC 27002:2022.",
        "suggested_timeline": "30-60 días",
        "maturity_level": 2,
        "maturity_description": "Nivel 2 - Gestionado: Procesos parcialmente documentados e implementados."
    }


async def stage2_expand_all(api_key, findings, original_context, frameworks):
    """Expand all findings in parallel with concurrency limit."""
    if not findings:
        return []

    fw_text = ", ".join(frameworks)
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_EXPANSIONS)

    async def _expand(finding):
        async with semaphore:
            try:
                return await stage2_expand_finding(api_key, finding, original_context, fw_text)
            except Exception as e:
                logger.error(f"Error expanding {finding.get('id')}: {e}")
                return {**finding, **_fallback_expansion(finding, str(e))}

    return list(await asyncio.gather(*[_expand(f) for f in findings]))


# ==================== STAGE 3: CONSOLIDATED REPORT ====================

async def stage3_build_report(api_key, session_id, expanded_findings, compliance_scores, frameworks):
    """Build consolidated executive report from expanded findings."""
    fw_text = ", ".join(frameworks)
    avg_score = round(sum(compliance_scores.values()) / max(len(compliance_scores), 1))
    critical = [f for f in expanded_findings if f.get('severity') == 'critical']
    major = [f for f in expanded_findings if f.get('severity') == 'major']
    minor = [f for f in expanded_findings if f.get('severity') == 'minor']

    scores_block = "\n".join(f"- {k}: {v}%" for k, v in compliance_scores.items())

    findings_block = ""
    for f in expanded_findings:
        cia = f.get('cia_impact', {})
        risk = f.get('risk_evaluation', {})
        findings_block += f"""
---
ID: {f.get('id')}
Framework: {f.get('framework')}
Control: {f.get('control')} - {f.get('control_name')}
Severidad: {f.get('severity')}
No Conformidad: {f.get('nonconformity_description', f.get('description', ''))}
Análisis Técnico: {f.get('technical_analysis', '')}
Justificación Severidad: {f.get('severity_justification', '')}
CIA: C={cia.get('confidentiality', {}).get('level', 'N/A')}, I={cia.get('integrity', {}).get('level', 'N/A')}, D={cia.get('availability', {}).get('level', 'N/A')}
Riesgo: {risk.get('risk_level', 'N/A')} ({risk.get('risk_calculation', '')})
Recomendación: {f.get('recommendation', '')}
ISO 27002: {f.get('iso27002_alignment', '')}
Plazo: {f.get('suggested_timeline', '')}
Madurez: Nivel {f.get('maturity_level', 'N/A')} - {f.get('maturity_description', '')}
"""

    system_msg = f"""Eres un Auditor Líder certificado ISO/IEC 27001 con experiencia en informes para comités ejecutivos y certificadoras acreditadas.

Construye el INFORME EJECUTIVO CONSOLIDADO de auditoría.

DATOS:
- Marcos: {fw_text}
- Cumplimiento global: {avg_score}%
- Desglose:
{scores_block}
- Hallazgos: {len(expanded_findings)} total ({len(critical)} críticos, {len(major)} mayores, {len(minor)} menores)

HALLAZGOS EXPANDIDOS:
{findings_block}

ESTRUCTURA OBLIGATORIA:

1. RESUMEN EJECUTIVO
[Mínimo 4 párrafos técnicos: alcance, hallazgos principales, nivel de madurez general, postura de cumplimiento, recomendación estratégica principal. Sin frases genéricas.]

2. METODOLOGÍA APLICADA
[Enfoque de evaluación, marcos aplicados, criterios de clasificación, escala de severidad.]

3. NIVEL GLOBAL DE CUMPLIMIENTO
[Explicar cálculo del {avg_score}%, desglose por framework, fortalezas y debilidades.]

Cumplimiento por Framework:
{scores_block}

4. HALLAZGOS CLASIFICADOS

4.1 HALLAZGOS CRÍTICOS ({len(critical)})
[Para CADA hallazgo crítico: control normativo, evidencia, descripción formal, impacto CIA explicado, evaluación de riesgo, recomendación ISO 27002, plazo.]

4.2 HALLAZGOS MAYORES ({len(major)})
[Mismo formato]

4.3 HALLAZGOS MENORES ({len(minor)})
[Mismo formato]

5. MATRIZ DE RIESGOS CONSOLIDADA
[Tabla con: GAP ID | Framework | Control | Riesgo | CIA | Prioridad | Plazo]

| GAP ID | Framework | Control | Descripción | Riesgo | CIA | Prioridad | Plazo |
|--------|-----------|---------|-------------|--------|-----|-----------|-------|

6. CONCLUSIÓN ESTRATÉGICA
[Mínimo 3 párrafos: estado actual, riesgos principales, hoja de ruta, próximos pasos concretos.]

REGLAS:
- Lenguaje formal y técnico (auditoría profesional)
- NO frases genéricas ni vagas
- Fundamentar CADA afirmación con datos del análisis
- Citar controles y cláusulas específicas
- Porcentajes y métricas cuantificables
- Redacción para certificadora acreditada
- MAYÚSCULAS para títulos, guiones para listas
- Separar columnas de tablas con |"""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"{session_id}_s3",
        system_message=system_msg
    ).with_model("gemini", "gemini-2.0-flash")

    return await chat.send_message(UserMessage(
        text=f"Genera el informe ejecutivo consolidado. {len(expanded_findings)} hallazgos analizados. Cumplimiento global: {avg_score}%. Marcos: {fw_text}."
    ))


# ==================== MAIN PIPELINE ====================

async def run_analysis_pipeline(api_key, session_id, user_text, frameworks, file_contents):
    """
    Run the complete 3-stage analysis pipeline.
    Returns dict with all pipeline results.
    """
    start = time.time()
    logger.info(f"[Pipeline] Starting for session {session_id}")

    # STAGE 1
    t1 = time.time()
    logger.info("[Pipeline] Stage 1: Classification...")
    stage1_text, scores, findings = await stage1_classify(
        api_key, session_id, user_text, frameworks, file_contents
    )
    t1_elapsed = time.time() - t1
    logger.info(f"[Pipeline] Stage 1 done: {len(findings)} findings, {len(scores)} scores ({t1_elapsed:.1f}s)")

    # STAGE 2
    t2 = time.time()
    logger.info(f"[Pipeline] Stage 2: Expanding {len(findings)} findings...")
    expanded = await stage2_expand_all(api_key, findings, stage1_text, frameworks)
    t2_elapsed = time.time() - t2
    logger.info(f"[Pipeline] Stage 2 done: {len(expanded)} expanded ({t2_elapsed:.1f}s)")

    # STAGE 3
    t3 = time.time()
    logger.info("[Pipeline] Stage 3: Building executive report...")
    report = await stage3_build_report(api_key, session_id, expanded, scores, frameworks)
    t3_elapsed = time.time() - t3
    logger.info(f"[Pipeline] Stage 3 done ({t3_elapsed:.1f}s)")

    total = time.time() - start
    logger.info(f"[Pipeline] Complete: {total:.1f}s total")

    return {
        'stage1_analysis': stage1_text,
        'compliance_scores': scores,
        'findings_basic': findings,
        'expanded_findings': expanded,
        'executive_report': report,
        'pipeline_metadata': {
            'total_findings': len(expanded),
            'critical': sum(1 for f in expanded if f.get('severity') == 'critical'),
            'major': sum(1 for f in expanded if f.get('severity') == 'major'),
            'minor': sum(1 for f in expanded if f.get('severity') == 'minor'),
            'stage1_seconds': round(t1_elapsed, 1),
            'stage2_seconds': round(t2_elapsed, 1),
            'stage3_seconds': round(t3_elapsed, 1),
            'total_seconds': round(total, 1)
        }
    }
