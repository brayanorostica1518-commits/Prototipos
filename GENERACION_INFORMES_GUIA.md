# 📊 Guía de Generación de Informes - Assessment AI

## 🎯 Descripción General

La nueva funcionalidad de **Generación de Informes** permite crear reportes profesionales personalizados basados en los análisis de seguridad realizados previamente. Esta herramienta facilita la creación de documentación formal para auditorías, certificaciones y presentaciones ejecutivas.

## 🚀 Características Principales

### 1. Tipos de Informes Disponibles

#### 📈 Informe Ejecutivo
- **Público Objetivo**: Directivos y Alta Gerencia
- **Contenido**: Resumen de alto nivel, métricas clave, recomendaciones estratégicas
- **Nivel de Detalle**: Alto nivel, enfocado en impacto de negocio
- **Extensión**: 5-10 páginas

#### 🔧 Técnico Detallado
- **Público Objetivo**: Equipos técnicos, Ingenieros, Administradores de Sistemas
- **Contenido**: Análisis técnico profundo, detalles de implementación, configuraciones
- **Nivel de Detalle**: Muy detallado, incluye comandos y configuraciones específicas
- **Extensión**: 15-25 páginas

#### ✅ De Cumplimiento
- **Público Objetivo**: Auditores, Oficiales de Cumplimiento, CISOs
- **Contenido**: Enfocado en cumplimiento normativo, gaps identificados, evidencias
- **Nivel de Detalle**: Detallado por control y cláusula específica
- **Extensión**: 10-20 páginas

#### 📅 Plan de Acción
- **Público Objetivo**: Project Managers, Líderes de Implementación
- **Contenido**: Roadmap de implementación, prioridades, recursos, plazos
- **Nivel de Detalle**: Enfocado en accionabilidad y cronograma
- **Extensión**: 8-15 páginas

### 2. Secciones Configurables

#### ✅ Requeridas (Siempre Incluidas)
- **Resumen Ejecutivo**: Overview del estado de seguridad
- **Overview de Cumplimiento**: Tabla y gráficos de cumplimiento por framework

#### ☑️ Opcionales (Seleccionables)
- **Hallazgos Detallados**: Tabla completa de gaps identificados con severidad
- **Evaluación de Riesgos**: Análisis de riesgos por probabilidad e impacto
- **Plan de Acción**: Roadmap con actividades priorizadas
- **Anexos y Apéndices**: Documentación adicional, evidencias

### 3. Visualizaciones Mejoradas

#### 📊 Gráfico de Torta (Pie Chart)
- Distribución de cumplimiento por framework
- Colores diferenciados para cada estándar
- Porcentajes mostrados en cada segmento
- **Ubicación**: Vista previa y PDF

#### 📊 Gráfico de Barras
- Comparación directa de niveles de cumplimiento
- Valores mostrados sobre cada barra
- Colores según nivel (rojo < 40%, amarillo 40-60%, verde > 80%)

#### 📊 Tarjetas de Cumplimiento
- Resumen visual por framework
- Barra de progreso individual
- Estado codificado por color

## 🎨 Interfaz de Usuario

### Diseño
- **Tema**: Cybersecurity dark theme con acentos cyan
- **Layout**: Dos columnas (configuración + vista previa)
- **Tabs**: Vista Previa, Plantillas, Historial

### Panel de Configuración (Izquierda)

```
┌─────────────────────────────────┐
│ CONFIGURACIÓN DEL INFORME       │
├─────────────────────────────────┤
│ Assessment Base                 │
│ [Dropdown: Seleccionar]         │
├─────────────────────────────────┤
│ Tipo de Informe                 │
│ [Dropdown: Ejecutivo/Técnico]   │
├─────────────────────────────────┤
│ Secciones del Informe           │
│ ☑ Resumen Ejecutivo (requerido) │
│ ☑ Overview Cumplimiento (req.)  │
│ ☐ Hallazgos Detallados          │
│ ☐ Evaluación de Riesgos         │
│ ☐ Plan de Acción                │
│ ☐ Anexos y Apéndices            │
├─────────────────────────────────┤
│ [Generar Informe PDF]           │
│ [Exportar a Excel]              │
└─────────────────────────────────┘
```

### Panel de Vista Previa (Derecha)

```
┌─────────────────────────────────────────┐
│ [Vista Previa] [Plantillas] [Historial] │
├─────────────────────────────────────────┤
│                                         │
│  Informe Ejecutivo                      │
│  Fecha: 28 de noviembre de 2025         │
│  ───────────────────────────────────    │
│                                         │
│  Resumen de Cumplimiento                │
│  ┌────────────┬────────────┐           │
│  │ Pie Chart  │  Cards     │           │
│  │            │  ISO 27001 │           │
│  │            │  75% ████  │           │
│  └────────────┴────────────┘           │
│                                         │
│  Gaps Críticos (4)                      │
│  ┌─────────────────────────┐           │
│  │ ISO 27001 - Alta        │           │
│  │ Falta MFA...            │           │
│  └─────────────────────────┘           │
│                                         │
└─────────────────────────────────────────┘
```

## 📋 Flujo de Trabajo

### Paso 1: Seleccionar Assessment Base
1. Navegar a `/reports` (botón "Informes" en header)
2. Abrir dropdown "Assessment Base"
3. Seleccionar una evaluación completada de la lista
   - Formato: "Título - Fecha"
   - Solo se listan assessments con análisis completo

### Paso 2: Elegir Tipo de Informe
1. Abrir dropdown "Tipo de Informe"
2. Seleccionar entre:
   - Informe Ejecutivo
   - Técnico Detallado
   - De Cumplimiento
   - Plan de Acción
3. Leer la descripción mostrada debajo del selector

### Paso 3: Configurar Secciones
1. Las secciones requeridas están pre-seleccionadas y no se pueden deseleccionar
2. Marcar/desmarcar secciones opcionales según necesidad
3. La vista previa se actualiza en tiempo real

### Paso 4: Revisar Vista Previa
1. Ver resumen de cumplimiento con gráficos
2. Revisar gaps críticos mostrados
3. Verificar que la información sea correcta

### Paso 5: Generar Informe
- **Opción A - PDF**: Click en "Generar Informe PDF"
  - Se genera un PDF multi-página profesional
  - Incluye todas las secciones seleccionadas
  - Gráficos embebidos como imágenes
  - Descarga automática
  
- **Opción B - Excel**: Click en "Exportar a Excel"
  - Exporta datos tabulares
  - Incluye tablas de cumplimiento y gaps
  - Formato XLSX

## 📄 Estructura del PDF Generado

### Página 1: Portada
- Título del tipo de informe (grande, en mayúsculas)
- Subtítulo: "Assessment de Seguridad y Cumplimiento"
- Fecha de generación
- ID de sesión
- Lista de frameworks evaluados

### Página 2: Resumen Ejecutivo
- Header con fondo cyan
- Texto extraído de la sección "1. RESUMEN EJECUTIVO" del análisis
- Máximo 500 caracteres si no se encuentra sección específica

### Página 3: Overview de Cumplimiento
- Tabla de cumplimiento por framework
  - Columnas: Marco Normativo, Cumplimiento (%), Estado
  - Estado codificado por color (verde/amarillo/naranja/rojo)
- Gráfico de torta (pie chart) embebido
  - Capturado desde la vista previa
  - Alta resolución (scale: 2)

### Página 4: Hallazgos Detallados
*(Si está seleccionado)*
- Tabla de gaps identificados
  - Columnas: Framework, Descripción, Severidad
  - Severidad codificada por color
- Fuente pequeña (9pt) para mayor detalle

### Página 5: Plan de Acción
*(Si está seleccionado)*
- Estructura:
  - Corto Plazo (0-3 meses)
  - Mediano Plazo (3-6 meses)
  - Largo Plazo (6-12 meses)
- Acciones específicas en viñetas

### Pie de Página (Todas las páginas)
- Número de página (centro)
- "Assessment AI - Reporte Confidencial" (izquierda)
- Color gris claro

## 🎨 Elementos Visuales

### Colores de los Gráficos
```javascript
const COLORS = [
  '#06b6d4', // Cyan - ISO 27001
  '#3b82f6', // Blue - NIST CSF
  '#8b5cf6', // Violet - OWASP
  '#ec4899', // Pink - PCI DSS
  '#f59e0b', // Amber - GDPR
  '#10b981', // Emerald - SOC 2
  '#ef4444', // Red - COBIT
  '#6366f1'  // Indigo - CIS
];
```

### Estados de Cumplimiento
- **Excelente** (≥ 80%): Verde `#22c55e`
- **Aceptable** (60-79%): Amarillo `#eab308`
- **Bajo** (40-59%): Naranja `#fb923c`
- **Crítico** (< 40%): Rojo `#dc2626`

## 🔐 Consideraciones de Seguridad

### Control de Acceso
- Solo se listan assessments de la sesión actual
- No hay autenticación multi-usuario (futuro)

### Datos Sensibles
- Los PDFs generados son confidenciales
- Marca de agua "Reporte Confidencial" en pie de página
- No se almacenan PDFs en servidor (descarga directa)

### Limitaciones
- Máximo 10 MB por PDF generado
- Timeout de generación: 60 segundos
- Rate limiting aplicado (heredado del backend)

## 🚧 Funcionalidades Futuras

### Tab "Plantillas" (Próximamente)
- Guardar configuraciones de informes frecuentes
- Plantillas predefinidas por industria
- Importar/exportar configuraciones

### Tab "Historial" (Próximamente)
- Lista de informes generados previamente
- Re-descarga de informes antiguos
- Comparación entre versiones

### Mejoras Planificadas
- [ ] Gráficos adicionales (radar chart en PDF)
- [ ] Personalización de portada (logo, colores)
- [ ] Firma digital de informes
- [ ] Envío por email automatizado
- [ ] Programación de generación recurrente
- [ ] Integración con SharePoint/Google Drive

## 📱 Acceso Rápido

### Desde la Aplicación
1. **Botón "Informes"** en el header principal (verde)
2. Disponible siempre, no requiere análisis activo
3. Ruta directa: `http://localhost:3000/reports`

### Navegación
- **Volver**: Botón "Volver" en esquina superior izquierda
- **Home**: Click en logo o navegación manual a `/`

## 🐛 Resolución de Problemas

### "Esta sesión no tiene análisis completado"
**Causa**: El assessment seleccionado no ha sido analizado por la IA
**Solución**: Seleccionar un assessment diferente que tenga análisis completo

### "Error al generar el informe"
**Causas posibles**:
1. No hay datos de compliance_scores
2. Error en captura de gráficos (html2canvas)
3. Timeout en generación

**Solución**: Verificar console logs, reintentar con otro assessment

### Vista previa no se muestra
**Causa**: Falta seleccionar assessment o tipo de informe
**Solución**: Asegurarse de seleccionar ambos campos

### Gráfico de torta vacío
**Causa**: No hay compliance_scores en el análisis
**Solución**: Re-analizar el assessment con la IA

## 💡 Mejores Prácticas

### Para Auditorías
1. Usar tipo "De Cumplimiento"
2. Incluir todas las secciones opcionales
3. Generar PDF para documentación oficial
4. Mantener historial de versiones

### Para Presentaciones Ejecutivas
1. Usar tipo "Informe Ejecutivo"
2. Solo secciones requeridas + Plan de Acción
3. Enfocarse en gráficos visuales
4. Limitar a 10 páginas máximo

### Para Implementación Técnica
1. Usar tipo "Técnico Detallado"
2. Incluir Hallazgos Detallados + Plan de Acción
3. Usar Excel para tracking de tareas
4. Actualizar periódicamente

## 📞 Soporte

Para problemas o sugerencias sobre la generación de informes:
1. Verificar console logs del navegador (F12)
2. Revisar logs del backend (`/var/log/supervisor/backend.err.log`)
3. Probar con un assessment diferente

---

**Versión**: 1.2.0  
**Última actualización**: Noviembre 2025  
**Nuevas características**: Generación de Informes con Gráficos de Torta 🥧
