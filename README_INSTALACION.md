# 📋 Guía de Instalación - Assessment AI Platform

Plataforma de análisis de cumplimiento normativo con IA para evaluación de seguridad y auditoría.

## 🚀 Requisitos Previos

- **Python**: 3.10 o superior
- **Node.js**: 18.x o superior
- **MongoDB**: 5.0 o superior
- **Sistema Operativo**: Linux, macOS, o Windows con WSL

## 📦 Instalación del Backend (FastAPI)

### 1. Navegar al directorio del backend
```bash
cd backend
```

### 2. Crear entorno virtual de Python
```bash
python3 -m venv venv
```

### 3. Activar el entorno virtual
```bash
# En Linux/macOS
source venv/bin/activate

# En Windows
venv\Scripts\activate
```

### 4. Instalar dependencias
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Instalar emergentintegrations (si no está en requirements.txt)
```bash
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

### 6. Configurar variables de entorno
Crea un archivo `.env` en el directorio `backend/` con el siguiente contenido:

```env
# MongoDB Configuration
MONGO_URL="mongodb://localhost:27017"
DB_NAME="assessment_db"

# CORS Configuration
CORS_ORIGINS="http://localhost:3000"

# API Keys
EMERGENT_LLM_KEY=tu_clave_aqui

# Optional: Other API keys if needed
# OPENAI_API_KEY=tu_clave_openai
```

### 7. Iniciar servidor backend
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

El backend estará disponible en: `http://localhost:8001`

## 🎨 Instalación del Frontend (React)

### 1. Navegar al directorio del frontend
```bash
cd frontend
```

### 2. Instalar dependencias con Yarn
```bash
yarn install
```

Si no tienes Yarn instalado:
```bash
npm install -g yarn
yarn install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en el directorio `frontend/` con el siguiente contenido:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4. Iniciar servidor de desarrollo
```bash
yarn start
```

El frontend estará disponible en: `http://localhost:3000`

## 🗄️ Configuración de MongoDB

### Opción 1: MongoDB Local

#### Instalar MongoDB Community Edition

**Ubuntu/Debian:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

**macOS (con Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
```

#### Iniciar MongoDB
```bash
# Linux
sudo systemctl start mongod
sudo systemctl enable mongod

# macOS
brew services start mongodb-community@7.0
```

#### Verificar instalación
```bash
mongosh
```

### Opción 2: MongoDB Atlas (Cloud)

1. Crea una cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un cluster gratuito
3. Obtén tu connection string
4. Actualiza `MONGO_URL` en el `.env` del backend con tu connection string

Ejemplo:
```env
MONGO_URL="mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/assessment_db?retryWrites=true&w=majority"
```

## 🔑 Obtener API Keys

### Emergent LLM Key (Recomendado)
1. Visita tu perfil en Emergent
2. Ve a "Universal Key"
3. Copia tu clave
4. Pégala en `EMERGENT_LLM_KEY` en el `.env` del backend

### OpenAI API Key (Alternativa)
1. Visita [OpenAI Platform](https://platform.openai.com/)
2. Crea una cuenta o inicia sesión
3. Ve a API Keys
4. Crea una nueva clave
5. Agrégala en el `.env` como `OPENAI_API_KEY`

## 🧪 Verificación de la Instalación

### 1. Verificar Backend
```bash
curl http://localhost:8001/api/sessions
```

Deberías recibir una respuesta JSON con una lista de sesiones (puede estar vacía inicialmente).

### 2. Verificar Frontend
Abre tu navegador en `http://localhost:3000`

Deberías ver la interfaz de Assessment AI con el tema cybersecurity.

### 3. Probar análisis completo
1. Sube un documento (PDF, DOCX, XLSX, TXT)
2. Selecciona frameworks (ej: ISO 27001, NIST CSF)
3. Envía el análisis
4. Verifica que recibas respuesta con recomendaciones basadas en controles específicos

## 📁 Estructura del Proyecto

```
assessment-ai/
├── backend/
│   ├── server.py                 # Servidor FastAPI principal
│   ├── security_utils.py         # Utilidades de seguridad
│   ├── prompt_templates.py       # Sistema de plantillas
│   ├── iso_controls.py          # Base de datos de controles ISO ⭐ NUEVO
│   ├── requirements.txt          # Dependencias Python
│   └── .env                      # Variables de entorno (crear)
├── frontend/
│   ├── src/
│   │   ├── App.js               # Componente principal
│   │   ├── pages/
│   │   │   ├── ChatInterface.jsx # Interfaz de chat
│   │   │   └── Dashboard.jsx     # Dashboard de análisis
│   │   ├── components/          # Componentes reutilizables
│   │   └── utils/
│   │       ├── api.js           # Cliente API
│   │       └── security.js      # Utilidades de seguridad
│   ├── package.json             # Dependencias Node.js
│   └── .env                     # Variables de entorno (crear)
└── README_INSTALACION.md        # Este archivo
```

## 🔧 Solución de Problemas

### Backend no inicia
```bash
# Verificar logs
tail -f /var/log/supervisor/backend.err.log

# Verificar puerto
lsof -i :8001

# Reinstalar dependencias
pip install -r requirements.txt --force-reinstall
```

### Frontend no inicia
```bash
# Limpiar caché
rm -rf node_modules package-lock.json yarn.lock
yarn install

# Verificar versión de Node
node --version  # Debe ser >= 18.x
```

### MongoDB no conecta
```bash
# Verificar estado
sudo systemctl status mongod

# Ver logs
sudo journalctl -u mongod

# Reiniciar
sudo systemctl restart mongod
```

### Error de CORS
- Verifica que `CORS_ORIGINS` en backend/.env incluya la URL del frontend
- Asegúrate de que `REACT_APP_BACKEND_URL` en frontend/.env apunte al backend correcto

## 🆕 Nuevas Características - Controles ISO

La aplicación ahora incluye una base de datos de controles de ISO 27001 y ISO 9001 (`iso_controls.py`).

### Características:
- ✅ Recomendaciones fundamentadas en controles específicos
- ✅ Referencia exacta a cláusulas y controles (ej: A.8.5, A.5.1)
- ✅ Descripción del objetivo de cada control
- ✅ Gap analysis detallado con controles afectados
- ✅ Plan de acción alineado con objetivos de controles

### Ejemplo de Análisis Mejorado:
```
GAP ID: 1
Framework: ISO 27001
Gap: Falta implementación de autenticación multifactor
Control/Cláusula Afectada: A.8.5 Autenticación segura
Descripción del Control: Asegurar identidades de usuarios autenticadas de manera segura
Estado Actual: Solo se usa contraseña simple
Recomendación Específica: Implementar MFA usando TOTP o autenticación biométrica
Plazo sugerido: Corto plazo (3 meses)
```

## 📞 Soporte

Si encuentras problemas durante la instalación:
1. Revisa los logs del backend y frontend
2. Verifica que todas las dependencias estén instaladas correctamente
3. Asegúrate de que MongoDB esté corriendo
4. Confirma que las variables de entorno estén configuradas

## 🎯 Próximos Pasos

1. **Configurar autenticación JWT** para usuarios múltiples
2. **Agregar más frameworks** (COBIT, OWASP ASVS, etc.)
3. **Implementar histórico de análisis**
4. **Mejorar exportación de reportes**
5. **Agregar más controles ISO** (ISO 45001, ISO 14001)

---

**Versión:** 1.1.0  
**Última actualización:** Noviembre 2025  
**Tema:** Cybersecurity Dark Theme 🛡️
