"""
Prompt Templates System
Provides predefined templates for common assessment tasks
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum
import uuid
import re


class TemplateCategory(str, Enum):
    """Template categories"""
    CYBERSECURITY = "Ciberseguridad"
    LEGAL = "Legal"
    MARKETING = "Marketing"
    HR = "Recursos Humanos"
    FINANCE = "Finanzas"
    COMPLIANCE = "Cumplimiento"


class VariableType(str, Enum):
    """Variable input types"""
    TEXT = "text"
    TEXTAREA = "textarea"
    SELECT = "select"
    MULTISELECT = "multiselect"
    DATE = "date"
    NUMBER = "number"


class TemplateVariable(BaseModel):
    """Variable definition in template"""
    name: str = Field(description="Variable name (used as {{name}} in template)")
    label: str = Field(description="Human-readable label for the field")
    type: VariableType = Field(default=VariableType.TEXTAREA)
    required: bool = Field(default=True)
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None  # For select/multiselect
    help_text: Optional[str] = None


class PromptTemplate(BaseModel):
    """Prompt template model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(max_length=200)
    category: TemplateCategory
    description: str = Field(max_length=1000)
    frameworks: List[str] = Field(default=[])
    icon: str = Field(default="📋")  # Emoji icon for UI
    template: str = Field(description="Template text with {{variables}}")
    variables: List[TemplateVariable] = Field(default=[])
    output_format: str = Field(description="Expected output structure")
    is_active: bool = Field(default=True)


# ==================== PREDEFINED TEMPLATES ====================

TEMPLATES_DATABASE = [
    PromptTemplate(
        name="Auditoría ISO 27001 Completa",
        category=TemplateCategory.CYBERSECURITY,
        description="Auditoría exhaustiva de cumplimiento ISO 27001 con análisis de controles y recomendaciones",
        frameworks=["ISO 27001"],
        icon="🔒",
        template="""
Realiza una auditoría completa ISO 27001 con los siguientes parámetros:

ALCANCE DE LA AUDITORÍA:
{{alcance}}

ESTADO ACTUAL DE POLÍTICAS:
{{estado_politicas}}

HALLAZGOS DE AUDITORÍAS PREVIAS:
{{hallazgos_previos}}

CONTROLES ESPECÍFICOS A EVALUAR:
{{controles_especificos}}

OBJETIVOS DE LA AUDITORÍA:
{{objetivos}}

INSTRUCCIONES:
Analiza el estado de cumplimiento ISO 27001 considerando:
1. Evalúa cada dominio de control de ISO 27001
2. Identifica gaps específicos con referencias a cláusulas
3. Prioriza hallazgos por impacto (Crítico/Alto/Medio/Bajo)
4. Proporciona recomendaciones accionables con plazos
5. Genera matriz de riesgos y plan de remediación

FORMATO DE SALIDA REQUERIDO:

1. RESUMEN EJECUTIVO
[Síntesis de nivel gerencial del estado de cumplimiento]

2. ALCANCE Y METODOLOGÍA
[Detalles de la auditoría]

3. ESTADO DE CUMPLIMIENTO POR DOMINIO
[Para cada dominio de ISO 27001, indicar % cumplimiento]

4. HALLAZGOS CRÍTICOS
[Cada hallazgo debe incluir: ID, Dominio, Cláusula ISO, Descripción, Impacto, Riesgo, Recomendación, Plazo]

5. HALLAZGOS MAYORES
[Mismo formato que hallazgos críticos]

6. HALLAZGOS MENORES
[Mismo formato]

7. OPORTUNIDADES DE MEJORA
[Recomendaciones no obligatorias pero beneficiosas]

8. MATRIZ DE RIESGOS
[Tabla con: Hallazgo, Probabilidad, Impacto, Nivel de Riesgo, Prioridad]

9. PLAN DE REMEDIACIÓN
[Cronograma con: Hallazgo, Acción, Responsable Sugerido, Plazo, Recursos]

10. CONCLUSIONES Y PRÓXIMOS PASOS
[Recomendaciones finales]
""",
        variables=[
            TemplateVariable(
                name="alcance",
                label="¿Cuál es el alcance de la auditoría?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Infraestructura de TI, aplicaciones críticas, data centers...",
                help_text="Define qué áreas, sistemas y procesos serán evaluados"
            ),
            TemplateVariable(
                name="estado_politicas",
                label="¿Existen políticas de seguridad documentadas? Describe su estado",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Existen políticas para algunos dominios pero no están actualizadas...",
                help_text="Describe qué políticas existen y su nivel de implementación"
            ),
            TemplateVariable(
                name="hallazgos_previos",
                label="¿Hay hallazgos de auditorías previas? Enuméralos",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Ej: 1. Falta de segregación de funciones, 2. Logs no monitoreados...",
                help_text="Lista cualquier hallazgo pendiente de auditorías anteriores"
            ),
            TemplateVariable(
                name="controles_especificos",
                label="¿Hay controles específicos que requieren atención prioritaria?",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Ej: A.9.2 (Gestión de acceso), A.12.3 (Backup)...",
                help_text="Lista los controles de ISO 27001 que son prioridad"
            ),
            TemplateVariable(
                name="objetivos",
                label="¿Cuáles son los objetivos principales de esta auditoría?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Preparación para certificación, identificar riesgos críticos...",
                help_text="Define qué se busca lograr con esta auditoría"
            )
        ],
        output_format="Reporte estructurado con 10 secciones detalladas"
    ),
    
    PromptTemplate(
        name="Análisis de Riesgos NIST CSF",
        category=TemplateCategory.CYBERSECURITY,
        description="Evaluación de riesgos de ciberseguridad siguiendo el marco NIST Cybersecurity Framework",
        frameworks=["NIST CSF"],
        icon="🛡️",
        template="""
Realiza un análisis de riesgos de ciberseguridad usando NIST CSF:

ACTIVOS CRÍTICOS:
{{activos_criticos}}

AMENAZAS CONOCIDAS:
{{amenazas}}

CONTROLES ACTUALES:
{{controles_actuales}}

INCIDENTES PREVIOS:
{{incidentes_previos}}

APETITO DE RIESGO:
{{apetito_riesgo}}

INSTRUCCIONES:
Analiza los riesgos según las 5 funciones de NIST CSF (Identificar, Proteger, Detectar, Responder, Recuperar):
1. Identifica riesgos por función
2. Calcula probabilidad e impacto
3. Evalúa nivel de riesgo residual
4. Proporciona estrategias de mitigación
5. Prioriza acciones por ROI de seguridad

FORMATO DE SALIDA:

1. RESUMEN EJECUTIVO

2. INVENTARIO DE ACTIVOS CRÍTICOS

3. MATRIZ DE RIESGOS
[Tabla: Riesgo, Categoría NIST, Probabilidad, Impacto, Nivel, Prioridad]

4. ANÁLISIS POR FUNCIÓN NIST
- Identificar: [Riesgos y recomendaciones]
- Proteger: [Riesgos y recomendaciones]
- Detectar: [Riesgos y recomendaciones]
- Responder: [Riesgos y recomendaciones]
- Recuperar: [Riesgos y recomendaciones]

5. ESTRATEGIAS DE MITIGACIÓN PRIORIZADAS

6. ROADMAP DE IMPLEMENTACIÓN

7. MÉTRICAS Y KPIS RECOMENDADOS
""",
        variables=[
            TemplateVariable(
                name="activos_criticos",
                label="Lista los activos críticos de la organización",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Base de datos de clientes, sistema de pagos, propiedad intelectual..."
            ),
            TemplateVariable(
                name="amenazas",
                label="¿Cuáles son las principales amenazas identificadas?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Ransomware, phishing, ataques DDoS, insider threats..."
            ),
            TemplateVariable(
                name="controles_actuales",
                label="Describe los controles de seguridad implementados",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Firewall, antivirus, autenticación 2FA, backups diarios..."
            ),
            TemplateVariable(
                name="incidentes_previos",
                label="¿Ha habido incidentes de seguridad previos?",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Ej: Ataque de phishing en 2024, ransomware bloqueó servidor..."
            ),
            TemplateVariable(
                name="apetito_riesgo",
                label="¿Cuál es el apetito de riesgo de la organización?",
                type=VariableType.SELECT,
                required=True,
                options=["Muy bajo (cero tolerancia)", "Bajo", "Moderado", "Alto"],
                help_text="Define cuánto riesgo la organización está dispuesta a aceptar"
            )
        ],
        output_format="Análisis completo por funciones NIST con matriz de riesgos"
    ),
    
    PromptTemplate(
        name="Evaluación OWASP Top 10",
        category=TemplateCategory.CYBERSECURITY,
        description="Análisis de seguridad de aplicaciones web contra las vulnerabilidades OWASP Top 10",
        frameworks=["OWASP Top 10"],
        icon="🌐",
        template="""
Realiza una evaluación de seguridad de aplicación web basada en OWASP Top 10:

DESCRIPCIÓN DE LA APLICACIÓN:
{{descripcion_app}}

TECNOLOGÍAS UTILIZADAS:
{{tecnologias}}

FUNCIONALIDADES CRÍTICAS:
{{funcionalidades}}

TIPO DE DATOS MANEJADOS:
{{tipos_datos}}

PRUEBAS DE SEGURIDAD PREVIAS:
{{pruebas_previas}}

INSTRUCCIONES:
Analiza la aplicación contra cada categoría de OWASP Top 10:
1. Evalúa vulnerabilidades potenciales
2. Clasifica severidad (Crítica/Alta/Media/Baja)
3. Proporciona escenarios de explotación
4. Recomienda controles específicos
5. Prioriza remediación

FORMATO DE SALIDA:

1. RESUMEN EJECUTIVO

2. PERFIL DE LA APLICACIÓN

3. EVALUACIÓN POR CATEGORÍA OWASP
[Para cada una de las 10 categorías:
 - Estado: Vulnerable / Parcialmente Protegido / Protegido
 - Hallazgos específicos
 - Nivel de severidad
 - Evidencia
 - Recomendaciones]

4. VULNERABILIDADES CRÍTICAS DETECTADAS
[ID, Categoría OWASP, Descripción, Impacto, Explotabilidad, Remediación]

5. PLAN DE REMEDIACIÓN PRIORIZADO
[Corto/Mediano/Largo plazo]

6. MEJORES PRÁCTICAS RECOMENDADAS

7. CONTROLES DE SEGURIDAD ADICIONALES
""",
        variables=[
            TemplateVariable(
                name="descripcion_app",
                label="Describe la aplicación web a evaluar",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: E-commerce de venta de productos, con carrito, pagos y gestión de usuarios..."
            ),
            TemplateVariable(
                name="tecnologias",
                label="¿Qué tecnologías utiliza la aplicación?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: React frontend, Node.js backend, PostgreSQL, AWS..."
            ),
            TemplateVariable(
                name="funcionalidades",
                label="Lista las funcionalidades críticas",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Login, procesamiento de pagos, gestión de inventario, API REST..."
            ),
            TemplateVariable(
                name="tipos_datos",
                label="¿Qué tipo de datos sensibles maneja?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Datos personales, información de tarjetas, historial médico..."
            ),
            TemplateVariable(
                name="pruebas_previas",
                label="¿Se han realizado pruebas de seguridad previas?",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Ej: Pentest en 2024 encontró XSS y SQL injection..."
            )
        ],
        output_format="Evaluación detallada de las 10 categorías OWASP con plan de remediación"
    ),
    
    PromptTemplate(
        name="Evaluación de Cumplimiento GDPR",
        category=TemplateCategory.LEGAL,
        description="Análisis de cumplimiento con el Reglamento General de Protección de Datos (GDPR)",
        frameworks=["GDPR"],
        icon="⚖️",
        template="""
Realiza una evaluación de cumplimiento GDPR:

DESCRIPCIÓN DE LA ORGANIZACIÓN:
{{descripcion_org}}

TIPOS DE DATOS PERSONALES PROCESADOS:
{{datos_procesados}}

BASE LEGAL PARA PROCESAMIENTO:
{{base_legal}}

TRANSFERENCIAS INTERNACIONALES:
{{transferencias}}

MEDIDAS DE SEGURIDAD ACTUALES:
{{medidas_seguridad}}

INSTRUCCIONES:
Analiza el cumplimiento GDPR considerando:
1. Principios de protección de datos (Art. 5)
2. Base legal para tratamiento (Art. 6)
3. Derechos de los interesados (Art. 15-22)
4. Medidas de seguridad (Art. 32)
5. Responsabilidad proactiva (Art. 24)
6. Transferencias internacionales (Cap. V)
7. Evaluación de Impacto (Art. 35)

FORMATO DE SALIDA:

1. RESUMEN EJECUTIVO

2. ALCANCE DEL PROCESAMIENTO DE DATOS

3. CUMPLIMIENTO POR ARTÍCULO
[Para cada artículo relevante: Estado, Gaps, Riesgo, Recomendaciones]

4. ANÁLISIS DE RIESGOS GDPR
[Matriz de riesgos con probabilidad de multas]

5. DERECHOS DE LOS INTERESADOS
[Evaluación de implementación de cada derecho]

6. MEDIDAS TÉCNICAS Y ORGANIZATIVAS
[Gap análisis de medidas de seguridad]

7. PLAN DE ACCIÓN DE CUMPLIMIENTO
[Priorizado por riesgo de multa]

8. DOCUMENTACIÓN REQUERIDA
[Lista de documentos que faltan o necesitan actualización]

9. RECOMENDACIONES FINALES
""",
        variables=[
            TemplateVariable(
                name="descripcion_org",
                label="Describe la organización y su actividad",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Empresa de marketing digital que procesa datos de 50,000 clientes..."
            ),
            TemplateVariable(
                name="datos_procesados",
                label="¿Qué tipos de datos personales se procesan?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Nombres, emails, direcciones, historial de compras, IPs..."
            ),
            TemplateVariable(
                name="base_legal",
                label="¿Cuál es la base legal para procesar estos datos?",
                type=VariableType.SELECT,
                required=True,
                options=[
                    "Consentimiento",
                    "Ejecución de contrato",
                    "Obligación legal",
                    "Interés vital",
                    "Misión de interés público",
                    "Interés legítimo"
                ]
            ),
            TemplateVariable(
                name="transferencias",
                label="¿Se realizan transferencias internacionales de datos?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Sí, usamos AWS en EE.UU. con cláusulas contractuales tipo..."
            ),
            TemplateVariable(
                name="medidas_seguridad",
                label="Describe las medidas de seguridad implementadas",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Cifrado en reposo y en tránsito, control de acceso basado en roles..."
            )
        ],
        output_format="Evaluación completa de cumplimiento GDPR con plan de acción"
    ),
    
    PromptTemplate(
        name="Análisis de Campaña de Marketing Digital",
        category=TemplateCategory.MARKETING,
        description="Evaluación de efectividad de campañas de marketing digital con métricas y recomendaciones",
        frameworks=[],
        icon="📊",
        template="""
Analiza la campaña de marketing digital:

OBJETIVOS DE LA CAMPAÑA:
{{objetivos}}

CANALES UTILIZADOS:
{{canales}}

PRESUPUESTO INVERTIDO:
{{presupuesto}}

MÉTRICAS ACTUALES:
{{metricas}}

PÚBLICO OBJETIVO:
{{publico}}

INSTRUCCIONES:
Analiza la campaña considerando:
1. ROI y ROAS
2. Tasa de conversión por canal
3. Costo por adquisición (CPA)
4. Engagement y alcance
5. Optimizaciones recomendadas

FORMATO DE SALIDA:

1. RESUMEN EJECUTIVO

2. ANÁLISIS DE RENDIMIENTO POR CANAL
[Para cada canal: Inversión, Resultados, ROI, Recomendaciones]

3. MÉTRICAS CLAVE
[Tabla con: Métrica, Objetivo, Real, Variación, Estado]

4. ANÁLISIS DE PÚBLICO
[Demografía, comportamiento, segmentos de mayor valor]

5. OPORTUNIDADES DE MEJORA
[Priorizadas por impacto esperado]

6. BENCHMARKING DEL SECTOR

7. PLAN DE OPTIMIZACIÓN
[Acciones específicas con plazos y recursos]

8. PROYECCIÓN DE RESULTADOS
""",
        variables=[
            TemplateVariable(
                name="objetivos",
                label="¿Cuáles son los objetivos de la campaña?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Aumentar ventas online en 30%, generar 500 leads cualificados..."
            ),
            TemplateVariable(
                name="canales",
                label="¿Qué canales de marketing se están utilizando?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Google Ads, Facebook Ads, Instagram, Email marketing, SEO..."
            ),
            TemplateVariable(
                name="presupuesto",
                label="¿Cuál es el presupuesto total invertido?",
                type=VariableType.TEXT,
                required=True,
                placeholder="Ej: $50,000 USD mensuales"
            ),
            TemplateVariable(
                name="metricas",
                label="Proporciona las métricas actuales de la campaña",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: CTR 2.5%, Conversión 3%, CPA $45, ROAS 3.2x, Impresiones 500k..."
            ),
            TemplateVariable(
                name="publico",
                label="Describe el público objetivo",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Mujeres 25-45 años, interés en fitness, ingresos medios-altos..."
            )
        ],
        output_format="Análisis completo de rendimiento con plan de optimización"
    ),
    
    PromptTemplate(
        name="Evaluación de Contrato Legal",
        category=TemplateCategory.LEGAL,
        description="Análisis de cláusulas y riesgos en contratos comerciales y legales",
        frameworks=[],
        icon="📄",
        template="""
Analiza el siguiente contrato legal:

TIPO DE CONTRATO:
{{tipo_contrato}}

PARTES INVOLUCRADAS:
{{partes}}

OBJETO DEL CONTRATO:
{{objeto}}

VALOR/MONTO:
{{valor}}

DURACIÓN:
{{duracion}}

CLÁUSULAS CLAVE A REVISAR:
{{clausulas_clave}}

INSTRUCCIONES:
Analiza el contrato identificando:
1. Riesgos legales y comerciales
2. Cláusulas desfavorables o ausentes
3. Obligaciones de cada parte
4. Cláusulas de terminación y penalidades
5. Jurisdicción y ley aplicable
6. Recomendaciones de negociación

FORMATO DE SALIDA:

1. RESUMEN EJECUTIVO

2. ANÁLISIS DE PARTES Y OBJETO

3. OBLIGACIONES PRINCIPALES
[Tabla: Parte, Obligación, Plazo, Penalidad por incumplimiento]

4. ANÁLISIS DE CLÁUSULAS CRÍTICAS
[Para cada cláusula: Contenido, Riesgo, Nivel, Recomendación]

5. CLÁUSULAS AUSENTES O DÉBILES
[Lista de protecciones que deberían incluirse]

6. RIESGOS IDENTIFICADOS
[Matriz: Riesgo, Probabilidad, Impacto, Mitigación sugerida]

7. PUNTOS DE NEGOCIACIÓN
[Priorizados por importancia]

8. RECOMENDACIÓN FINAL
[Firmar, Negociar o Rechazar con justificación]
""",
        variables=[
            TemplateVariable(
                name="tipo_contrato",
                label="¿Qué tipo de contrato es?",
                type=VariableType.SELECT,
                required=True,
                options=[
                    "Compraventa",
                    "Prestación de servicios",
                    "Confidencialidad (NDA)",
                    "Sociedad/Joint Venture",
                    "Licenciamiento",
                    "Arrendamiento",
                    "Laboral",
                    "Otro"
                ]
            ),
            TemplateVariable(
                name="partes",
                label="¿Quiénes son las partes del contrato?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Mi empresa (Compradora) y Proveedor XYZ S.A. (Vendedor)..."
            ),
            TemplateVariable(
                name="objeto",
                label="¿Cuál es el objeto del contrato?",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ej: Compra de 1000 unidades de producto X con entrega mensual..."
            ),
            TemplateVariable(
                name="valor",
                label="¿Cuál es el valor o monto del contrato?",
                type=VariableType.TEXT,
                required=True,
                placeholder="Ej: $100,000 USD anuales"
            ),
            TemplateVariable(
                name="duracion",
                label="¿Cuál es la duración del contrato?",
                type=VariableType.TEXT,
                required=True,
                placeholder="Ej: 2 años renovables automáticamente"
            ),
            TemplateVariable(
                name="clausulas_clave",
                label="¿Hay cláusulas específicas que te preocupan?",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Ej: Cláusula de no competencia, penalidades por incumplimiento..."
            )
        ],
        output_format="Análisis legal detallado con recomendaciones de negociación"
    )
]


# ==================== TEMPLATE FUNCTIONS ====================

def get_all_templates(category: Optional[TemplateCategory] = None) -> List[PromptTemplate]:
    """Get all templates, optionally filtered by category"""
    if category:
        return [t for t in TEMPLATES_DATABASE if t.category == category and t.is_active]
    return [t for t in TEMPLATES_DATABASE if t.is_active]


def get_template_by_id(template_id: str) -> Optional[PromptTemplate]:
    """Get a specific template by ID"""
    for template in TEMPLATES_DATABASE:
        if template.id == template_id:
            return template
    return None


def parse_template_variables(template_text: str) -> List[str]:
    """Extract variable names from template text"""
    pattern = r'{{(\w+)}}'
    return re.findall(pattern, template_text)


def fill_template(template_text: str, variables: Dict[str, str]) -> str:
    """Fill template with user-provided variable values"""
    result = template_text
    for var_name, var_value in variables.items():
        placeholder = f"{{{{{var_name}}}}}"
        result = result.replace(placeholder, var_value)
    return result


def get_categories() -> List[Dict[str, str]]:
    """Get all available categories"""
    return [
        {"value": cat.value, "label": cat.value, "count": len([t for t in TEMPLATES_DATABASE if t.category == cat])}
        for cat in TemplateCategory
    ]
