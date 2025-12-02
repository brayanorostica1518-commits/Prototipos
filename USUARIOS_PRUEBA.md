# 👥 Usuarios de Prueba - Assessment AI

## 🔐 Credenciales de Acceso

### 1. Admin Usuario (Administrador)
- **Email**: `admin@assessmentai.com`
- **Nombre**: Admin Usuario
- **Session Token**: `admin-user-001_session_1764719771`
- **User ID**: `admin-user-001`
- **Válido hasta**: 7 días desde creación

### 2. Usuario Test 1
- **Email**: `usuario1@test.com`
- **Nombre**: Usuario Test 1
- **Session Token**: `test-user-001_session_1764719771`
- **User ID**: `test-user-001`
- **Válido hasta**: 7 días desde creación

### 3. Usuario Test 2
- **Email**: `usuario2@test.com`
- **Nombre**: Usuario Test 2
- **Session Token**: `test-user-002_session_1764719771`
- **User ID**: `test-user-002`
- **Válido hasta**: 7 días desde creación

---

## 🚀 Cómo Usar los Usuarios de Prueba

### Opción 1: Usando Google OAuth (Recomendado para producción)
1. Navega a `http://localhost:3000/login`
2. Click en "Continuar con Google"
3. Inicia sesión con tu cuenta de Google
4. Serás redirigido automáticamente a la aplicación

### Opción 2: Usando Session Token Directamente (Testing)

#### A. Mediante Cookie (Navegador)
1. Abre las DevTools del navegador (F12)
2. Ve a la pestaña "Application" o "Storage"
3. Selecciona "Cookies" > `http://localhost:3000`
4. Agrega una nueva cookie:
   - **Name**: `session_token`
   - **Value**: (copia uno de los tokens de arriba)
   - **Path**: `/`
   - **Expires**: 7 días
5. Refresca la página

#### B. Mediante API Call (Testing backend)
```bash
# Test con curl
curl -X GET "http://localhost:8001/api/auth/me" \
  -H "Authorization: Bearer admin-user-001_session_1764719771"

# O con cookie
curl -X GET "http://localhost:8001/api/auth/me" \
  --cookie "session_token=admin-user-001_session_1764719771"
```

#### C. Mediante Browser DevTools Console
```javascript
// Set cookie desde console del navegador
document.cookie = "session_token=admin-user-001_session_1764719771; path=/; max-age=604800";
// Luego refresca la página
location.reload();
```

---

## 🧪 Testing de Aislamiento de Datos

### Test 1: Verificar Sesiones Privadas
1. Login con Usuario 1
2. Crea algunas sesiones de análisis
3. Logout
4. Login con Usuario 2
5. **Resultado esperado**: No deberías ver las sesiones del Usuario 1

### Test 2: Verificar Acceso a Datos
```bash
# Como Usuario 1
curl -X GET "http://localhost:8001/api/sessions" \
  -H "Authorization: Bearer test-user-001_session_1764719771"

# Como Usuario 2
curl -X GET "http://localhost:8001/api/sessions" \
  -H "Authorization: Bearer test-user-002_session_1764719771"

# Deberían retornar listas diferentes de sesiones
```

### Test 3: Verificar Protección de Datos
```bash
# Intentar acceder a sesión de otro usuario (debería fallar)
# 1. Crear sesión como Usuario 1 y anotar session_id
# 2. Intentar acceder con Usuario 2
curl -X GET "http://localhost:8001/api/sessions/{session_id_de_usuario1}/analysis" \
  -H "Authorization: Bearer test-user-002_session_1764719771"

# Resultado esperado: 403 Forbidden o datos vacíos
```

---

## 🔧 Comandos Útiles de MongoDB

### Ver Todos los Usuarios
```bash
mongosh --eval "
use assessment_db;
db.users.find({}, {_id: 0, id: 1, email: 1, name: 1}).pretty();
"
```

### Ver Todas las Sesiones Activas
```bash
mongosh --eval "
use assessment_db;
db.user_sessions.find({
  expires_at: {\$gt: new Date()}
}, {_id: 0}).pretty();
"
```

### Ver Sesiones por Usuario
```bash
mongosh --eval "
use assessment_db;
db.sessions.find({
  user_id: 'admin-user-001'
}, {_id: 0, id: 1, title: 1, user_id: 1}).pretty();
"
```

### Crear Nuevo Usuario Manualmente
```bash
mongosh --eval "
use assessment_db;
var userId = 'new-user-' + Date.now();
var sessionToken = 'session_' + Date.now();

db.users.insertOne({
  id: userId,
  email: 'nuevo@test.com',
  name: 'Nuevo Usuario',
  picture: 'https://ui-avatars.com/api/?name=Nuevo+Usuario&background=random',
  created_at: new Date()
});

db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});

print('User ID: ' + userId);
print('Session Token: ' + sessionToken);
"
```

### Limpiar Usuarios de Prueba
```bash
mongosh --eval "
use assessment_db;
db.users.deleteMany({email: /test\.com/});
db.user_sessions.deleteMany({user_id: /test-user/});
print('Test users cleaned');
"
```

---

## 📊 Estructura de Datos

### Colección: users
```javascript
{
  id: "admin-user-001",           // UUID único
  email: "admin@assessmentai.com",
  name: "Admin Usuario",
  picture: "https://...",          // URL del avatar
  created_at: ISODate("...")
}
```

### Colección: user_sessions
```javascript
{
  user_id: "admin-user-001",       // Referencia a users.id
  session_token: "admin-user-001_session_1764719771",
  expires_at: ISODate("..."),      // 7 días desde creación
  created_at: ISODate("...")
}
```

### Colección: sessions (Chat Sessions)
```javascript
{
  id: "session-uuid",
  user_id: "admin-user-001",       // NEW: Propietario
  title: "Nueva Evaluación",
  created_at: ISODate("..."),
  updated_at: ISODate("...")
}
```

### Colección: analysis_results
```javascript
{
  id: "analysis-uuid",
  session_id: "session-uuid",
  user_id: "admin-user-001",       // NEW: Propietario
  frameworks: ["ISO 27001", ...],
  analysis: "texto...",
  compliance_scores: {...},
  gaps: [...],
  timestamp: ISODate("...")
}
```

---

## 🔄 Flujo de Autenticación Completo

```
1. Usuario → Click "Continuar con Google"
   ↓
2. Redirect → https://auth.emergentagent.com/?redirect=...
   ↓
3. Google OAuth → Usuario autentica con Google
   ↓
4. Redirect → http://localhost:3000/#session_id=...
   ↓
5. Frontend → POST /api/auth/session-data (X-Session-ID header)
   ↓
6. Backend → GET Emergent Auth API (validar session_id)
   ↓
7. Backend → Create/Get User en MongoDB
   ↓
8. Backend → Create Session Token (7 días)
   ↓
9. Backend → Set Cookie (httpOnly, secure)
   ↓
10. Frontend → Redirect a / (app principal)
   ↓
11. Todas las requests → Include cookie automáticamente
```

---

## ⚠️ Notas Importantes

### Seguridad
- Los session tokens expiran después de 7 días
- Las cookies son httpOnly (no accesibles por JavaScript)
- Todas las rutas de API requieren autenticación
- Los datos están aislados por user_id

### Desarrollo Local
- Las cookies usan `secure: false` para localhost
- En producción debe ser `secure: true` (HTTPS)
- SameSite = "lax" para compatibilidad

### Limitaciones Actuales
- No hay recuperación de contraseña (usa Google OAuth)
- No hay roles/permisos diferenciados
- No hay límite de sesiones por usuario
- No hay 2FA implementado

---

## 📞 Troubleshooting

### "401 Unauthorized" en todas las requests
**Causa**: No hay session_token válido
**Solución**: Verifica que la cookie esté configurada correctamente

### "403 Forbidden" al acceder a sesión
**Causa**: La sesión pertenece a otro usuario
**Solución**: Verifica que el user_id de la sesión coincida

### "Session not found or expired"
**Causa**: El session_token expiró
**Solución**: Crea un nuevo usuario o actualiza expires_at en MongoDB

### Frontend redirect loop a /login
**Causa**: AuthContext no detecta la autenticación
**Solución**: Verifica que el endpoint /api/auth/check funcione

---

**Última actualización**: Diciembre 2025  
**Versión**: 1.3.0 - Sistema de Autenticación Completo
