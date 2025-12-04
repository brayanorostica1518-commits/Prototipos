# 🐛 Debugging Error al Analizar Archivo Excel

## Mejoras Implementadas

He mejorado el logging del backend para capturar errores específicos de Excel:

### 1. Logging Detallado en `extract_text_from_excel()`
- Log cuando se intenta cargar el archivo
- Log del número de hojas encontradas
- Log del número de filas procesadas por hoja
- Log del total de caracteres extraídos
- Captura de excepciones específicas de openpyxl

### 2. Mensajes de Error Más Claros
- **InvalidFileException**: "El archivo no es un Excel válido (.xlsx)"
- **PermissionError**: "Error de permisos al leer el archivo"
- **Otros errores**: Mensaje específico con detalles

### 3. Stack Traces Completos
- Ahora se registra el stack trace completo con `exc_info=True`
- Más fácil identificar la causa raíz del error

## Cómo Probar y Reportar el Error

### Paso 1: Preparar el Entorno

```bash
# Terminal 1: Monitorear logs del backend en tiempo real
tail -f /var/log/supervisor/backend.err.log
```

### Paso 2: Subir y Analizar el Archivo Excel

1. **Ir a la aplicación**: http://localhost:3000
2. **Subir el archivo Excel**: 
   - Click en el botón de archivo
   - Selecciona tu archivo .xlsx
3. **Seleccionar frameworks** (ej: ISO 27001, NIST CSF)
4. **Click "Enviar"**

### Paso 3: Capturar el Error

Mientras el análisis corre, observa los logs en Terminal 1. Deberías ver:

```
✅ Éxito:
INFO - Attempting to load Excel file: /tmp/uploads/...
INFO - Excel file loaded. Found X sheets
INFO - Processed Y rows from sheet: Sheet1
INFO - Excel extraction complete. Extracted Z characters

❌ Error:
ERROR - Invalid Excel file format: ...
ERROR - Error extracting Excel: ...
```

### Paso 4: Copiar el Error Exacto

Copia el mensaje de error completo que aparece en:
- Los logs del backend (Terminal)
- El toast/notificación en el navegador
- La consola del navegador (F12 → Console)

## Errores Comunes y Soluciones

### Error 1: "El archivo no es un Excel válido"

**Causa**: El archivo está corrupto o no es realmente un .xlsx

**Verificar**:
```bash
# Ver tipo de archivo real
file /path/to/archivo.xlsx

# Debería decir:
# Microsoft Excel 2007+ (ZIP-based format)
```

**Solución**:
- Abre el archivo en Excel
- "Guardar Como" → .xlsx (Excel Workbook)
- Intenta de nuevo

### Error 2: "Error de permisos al leer el archivo"

**Causa**: El backend no tiene permisos para leer el archivo subido

**Verificar**:
```bash
# Ver permisos de uploads
ls -la /tmp/uploads/

# Debería mostrar:
# drwxr-xr-x ... uploads
# -rw-r--r-- ... archivo.xlsx
```

**Solución**:
```bash
# Dar permisos correctos
sudo chown -R www-data:www-data /tmp/uploads/
sudo chmod -R 755 /tmp/uploads/
```

### Error 3: "Read-only mode - openpyxl"

**Causa**: Archivo Excel con protección o fórmulas complejas

**Solución**:
- El código ya usa `data_only=True` para evitar esto
- Si persiste, guarda el archivo como "Valores" en Excel

### Error 4: "Memory error" o timeout

**Causa**: Archivo Excel muy grande (>100MB o >10,000 filas)

**Limitaciones actuales**:
- Máximo 10 hojas procesadas
- Máximo 10,000 filas por hoja
- Máximo 100,000 caracteres extraídos

**Solución**:
- Divide el archivo en partes más pequeñas
- Elimina hojas innecesarias
- Filtra solo datos relevantes

## Comandos de Debugging

### Ver últimos errores
```bash
tail -n 100 /var/log/supervisor/backend.err.log | grep -i error
```

### Ver solo logs de Excel
```bash
tail -n 100 /var/log/supervisor/backend.err.log | grep -i "excel\|xlsx\|openpyxl"
```

### Ver stack trace completo del último error
```bash
tail -n 500 /var/log/supervisor/backend.err.log | grep -A 50 "ERROR.*Excel"
```

### Test manual de extracción de Excel
```python
python3 << 'EOF'
import sys
sys.path.append('/app/backend')
from pathlib import Path
import openpyxl

# Reemplaza con la ruta de tu archivo
file_path = Path("/tmp/uploads/tu_archivo.xlsx")

try:
    print(f"Cargando: {file_path}")
    wb = openpyxl.load_workbook(file_path, data_only=True)
    print(f"✓ Archivo cargado")
    print(f"  Hojas: {wb.sheetnames}")
    
    for sheet_name in wb.sheetnames[:3]:
        sheet = wb[sheet_name]
        print(f"\n  Hoja: {sheet_name}")
        print(f"  Dimensiones: {sheet.dimensions}")
        
        # Primera fila
        first_row = list(sheet.iter_rows(min_row=1, max_row=1, values_only=True))[0]
        print(f"  Primera fila: {first_row}")
        
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
EOF
```

## Información Necesaria para Reportar

Si el error persiste, por favor proporciona:

1. **Mensaje de error exacto** (del navegador o logs)
2. **Información del archivo**:
   ```bash
   file nombre_archivo.xlsx
   ls -lh nombre_archivo.xlsx
   ```
3. **Estructura del archivo**:
   - ¿Cuántas hojas tiene?
   - ¿Aproximadamente cuántas filas?
   - ¿Tiene fórmulas complejas o macros?
4. **Screenshot del error** (si aparece en el navegador)
5. **Logs del backend** (últimas 50 líneas con el error)

## Workaround Temporal

Si el error persiste, puedes:

### Opción 1: Convertir a CSV

```bash
# Usando ssconvert (instalar gnumeric)
ssconvert archivo.xlsx archivo.csv

# O usar Python
python3 << 'EOF'
import pandas as pd
df = pd.read_excel('archivo.xlsx')
df.to_csv('archivo.csv', index=False)
print("Convertido a CSV")
EOF
```

Luego sube el CSV en lugar del Excel.

### Opción 2: Simplificar el Excel

1. Abre en Excel
2. Elimina hojas innecesarias
3. Copia solo los datos (sin formato)
4. Pega en un nuevo libro
5. Guarda como .xlsx

### Opción 3: Exportar como valores

1. Excel → Seleccionar todo
2. Copiar
3. Pegar Especial → Valores
4. Guardar

## Verificación Post-Fix

Después de aplicar una solución:

```bash
# Reiniciar backend
sudo supervisorctl restart backend

# Verificar que inició correctamente
tail -n 20 /var/log/supervisor/backend.err.log | grep -i "startup\|error"

# Debería mostrar:
# INFO:     Application startup complete.
```

---

**Estado actual**: Backend actualizado con mejor logging
**Próximo paso**: Intenta subir el archivo Excel nuevamente y reporta el error exacto que aparece

Si necesitas ayuda adicional, comparte:
- El mensaje de error completo
- Los últimos 100 logs del backend
- Información del archivo (nombre, tamaño, número de hojas)
