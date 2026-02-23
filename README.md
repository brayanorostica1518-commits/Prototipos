# SmartSecAssess - Plataforma de Análisis de Seguridad con IA

## 📋 Descripción

SmartSecAssess es una plataforma profesional de análisis de seguridad y cumplimiento normativo que utiliza inteligencia artificial (Google Gemini) para evaluar documentos contra marcos como ISO 27001, NIST CSF, OWASP Top 10, GDPR, y más.

---

## 🎯 Características Principales

- ✅ Análisis de cumplimiento con IA (Google Gemini 2.0 Flash)
- ✅ Autenticación segura con Google OAuth 2.0
- ✅ Evaluación contra múltiples marcos normativos
- ✅ Dashboard interactivo con visualizaciones
- ✅ Generación de informes PDF y Excel profesionales
- ✅ **Retención de datos configurable** (72h o permanente)
- ✅ Cifrado HTTPS en tránsito
- ✅ Aislamiento de datos por usuario  
- ✅ Sistema de plantillas predefinidas
- ✅ Tutorial interactivo para nuevos usuarios

---

## 🔒 Seguridad y Privacidad

### Retención de Datos Configurable
- **No guardar**: Sesiones eliminadas automáticamente después de 1 hora
- **72 horas**: Retención temporal, eliminación automática después de 3 días  
- **Permanente**: Mantiene el historial indefinidamente

### Medidas de Seguridad
- Autenticación OAuth 2.0
- JWT tokens para sesiones
- Rate limiting (protección contra ataques)
- Input sanitization
- HTTPS obligatorio en producción
- Headers de seguridad (HSTS, X-Frame-Options, CSP)
- Cifrado de datos en MongoDB

---

## 📦 Requisitos Previos

- **Python**: 3.10+
- **Node.js**: 18.x+
- **MongoDB**: 4.4+
- **Yarn**: Gestor de paquetes
- **Google OAuth Credentials**
- **API Key**: Google Gemini o Emergent LLM Key

---

## 🚀 Instalación Local Paso a Paso

### Paso 1: Backend Setup

```bash
# Navegar a backend
cd /app/backend

# Crear entorno virtual
python3 -m venv venv

# Activar entorno (Linux/Mac)
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### Paso 2: Configurar `.env` del Backend

Crear `/app/backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=assessment_db
CORS_ORIGINS=http://localhost:3000,https://tu-dominio.com
EMERGENT_LLM_KEY=sk-emergent-xxxxx
AUTH_API_URL=https://auth-endpoint.com
NODE_ENV=production
PYTHONUNBUFFERED=1
```

### Paso 3: Iniciar MongoDB

```bash
# Con Homebrew (Mac)
brew services start mongodb-community

# Con Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Paso 4: Ejecutar Backend

```bash
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

✅ Backend en: `http://localhost:8001`

### Paso 5: Frontend Setup

```bash
cd /app/frontend
yarn install
```

### Paso 6: Configurar `.env` del Frontend

Crear `/app/frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Paso 7: Ejecutar Frontend

```bash
cd /app/frontend
yarn start
```

✅ Frontend en: `http://localhost:3000`

---

## 📁 Estructura del Proyecto

```
/app/
├── backend/
│   ├── server.py           # API FastAPI principal
│   ├── auth.py             # OAuth 2.0
│   ├── iso_controls.py     # Controles ISO
│   ├── data_retention.py   # Limpieza automática
│   ├── requirements.txt    # Dependencias
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   └── utils/
│   ├── public/
│   │   ├── terminos-servicio.html
│   │   └── politica-privacidad.html
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/google` - Iniciar OAuth
- `GET /api/auth/callback` - Callback
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### Sesiones (Requiere Autenticación)
- `POST /api/sessions?retention_policy=72h` - Crear sesión
- `GET /api/sessions` - Listar sesiones
- `GET /api/sessions/{id}/messages` - Mensajes
- `GET /api/sessions/{id}/analysis` - Análisis

### Análisis
- `POST /api/analyze` - Ejecutar análisis
- `POST /api/upload` - Subir archivos

---

## 🔐 Configuración HTTPS (Producción)

### Con Nginx + Let's Encrypt

```nginx
server {
    listen 443 ssl http2;
    server_name smartsecassess.com;

    ssl_certificate /etc/letsencrypt/live/smartsecassess.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartsecassess.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location /api {
        proxy_pass http://localhost:8001;
    }
    
    location / {
        proxy_pass http://localhost:3000;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

---

## 🔄 Limpieza Automática de Datos

### Cron Job (Ejecutar cada hora)

```bash
# Editar crontab
crontab -e

# Agregar:
0 * * * * cd /app/backend && /app/backend/venv/bin/python data_retention.py >> /var/log/cleanup.log 2>&1
```

### Ejecución Manual

```bash
cd /app/backend
python data_retention.py
```

---

## 🎨 Paleta de Colores

### Tema Oscuro Profesional
- **Fondo principal**: `#0F172A` (navy técnico)
- **Paneles**: `#1E293B`
- **Texto principal**: `#F8FAFC`
- **Texto secundario**: `#CBD5E1`
- **Acento**: `#0EA5E9` (cyan corporativo)
- **Crítico**: `#DC2626`
- **Alto**: `#F97316`
- **Medio**: `#EAB308`
- **Bajo**: `#22C55E`

---

## 🧪 Testing

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && yarn test
```

---

## 📚 Documentación Legal

- [Términos de Servicio](/terminos-servicio.html)
- [Política de Privacidad](/politica-privacidad.html)

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| MongoDB no conecta | Verificar que esté corriendo: `mongosh` |
| CORS blocked | Revisar `CORS_ORIGINS` en backend/.env |
| OAuth falla | Verificar credenciales en Google Cloud Console |
| Sesiones no aparecen | Verificar política de retención (pueden haber expirado) |

---

## 📧 Soporte

- **Email**: support@smartsecassess.com
- **Documentación**: Ver `/app/*.md`
- **Issues**: GitHub Issues

---

**© 2025 SmartSecAssess - Análisis Inteligente de Seguridad**
