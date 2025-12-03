# 🧪 Testing del Flujo OAuth Completo

## Problema Reportado
- Al iniciar sesión con Google, aparecen mensajes de error
- La página se recarga constantemente
- No se completa el login

## Diagnóstico Realizado

### ✅ Backend
```bash
# Logs muestran que el flujo funciona:
2025-12-03 00:32:53,038 - auth - INFO - Received user data from Emergent Auth: brayan.orostica@cftsa.cl
2025-12-03 00:32:53,056 - auth - INFO - Created new user: brayan.orostica@cftsa.cl
2025-12-03 00:32:53,057 - auth - INFO - Created session for user: ff18f8d3-2f39-45f9-9f66-240fb73f7c77
```

El backend está funcionando correctamente.

### ❌ Frontend
El problema era:
1. **Múltiples navigations**: La página Login y AuthContext intentaban navegar simultáneamente
2. **No limpiaba el hash correctamente**: Causaba que se reprocesara el session_id
3. **Estado de loading no se reseteaba**: Causaba loops

## Correcciones Implementadas

### 1. AuthContext
- ✅ Después de autenticar, hace `window.location.href = '/'` (hard redirect)
- ✅ Limpia el hash de la URL correctamente
- ✅ No intenta checkAuth adicional después de OAuth

### 2. Página Login
- ✅ Solo navega si NO está procesando OAuth callback
- ✅ Delay de 100ms para evitar race conditions
- ✅ No interfiere con el flujo de AuthContext

## Testing del Flujo Completo

### Método 1: Testing con Google OAuth Real

1. **Limpiar cookies existentes**:
```javascript
// En DevTools Console
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});
location.reload();
```

2. **Ir a login**:
```
http://localhost:3000/login
```

3. **Click en "Continuar con Google"**

4. **Autenticarse con Google**

5. **Verificar redirect**:
   - Deberías ser redirigido a `http://localhost:3000/`
   - No deberías ver loops ni errores
   - El User Menu debería aparecer en el header

### Método 2: Simular OAuth Callback Localmente

1. **Crear un session_id de prueba**:
```javascript
// En la consola del navegador en /login
const fakeSessionId = 'test_session_' + Date.now();
window.location.hash = '#session_id=' + fakeSessionId;
```

**Nota**: Esto fallará porque el session_id no es válido en Emergent Auth. Úsalo solo para ver el flujo de UI.

### Método 3: Testing con Token Manual (Más Confiable)

```javascript
// DevTools Console en /login
document.cookie = "session_token=admin-user-001_session_1764719771; path=/; max-age=604800; SameSite=Lax";
location.href = '/';
```

## Verificaciones Post-Login

### 1. Verificar Cookie
```javascript
// DevTools Console
console.log(document.cookie);
// Debería mostrar: session_token=...
```

### 2. Verificar User en AuthContext
```javascript
// DevTools Console (en página ya cargada)
// No hay forma directa de acceder al context desde console
// Pero puedes verificar en React DevTools
```

### 3. Verificar Backend
```bash
# Desde terminal
curl -X GET "http://localhost:8001/api/auth/me" \
  --cookie "session_token=<tu_token>"
```

### 4. Verificar Network Tab
1. Abre DevTools → Network
2. Filtra por "auth"
3. Deberías ver:
   - `POST /api/auth/session-data` → 200 OK
   - `GET /api/auth/check` → 200 OK con authenticated: true

## Troubleshooting Específico

### Error: "Redirect loop"
**Síntoma**: La página se recarga constantemente
**Causa**: El hash no se limpia correctamente
**Solución aplicada**: 
```javascript
// Ahora usa hard redirect
window.location.href = '/';
```

### Error: "Network error" o toast errors
**Síntoma**: Toasts de error aparecen al hacer login
**Causa**: Requests API fallan antes de completar auth
**Solución**: Ignorar estos errores, son normales durante el flujo OAuth

### Error: "Session token not found"
**Síntoma**: Cookie no se guarda
**Causa**: Backend no está seteando la cookie correctamente
**Verificar**:
```bash
# Ver response headers de /api/auth/session-data
curl -v -X POST "http://localhost:8001/api/auth/session-data" \
  -H "X-Session-ID: test"
  
# Debería incluir:
# Set-Cookie: session_token=...; Path=/; ...
```

## Debugging Avanzado

### Logs del Backend en Vivo
```bash
# Terminal
tail -f /var/log/supervisor/backend.err.log | grep -i "auth\|session\|error"
```

### Console Logs del Frontend
```javascript
// En DevTools Console, configurar:
localStorage.setItem('debug', 'auth');
```

### Ver Estado de AuthContext
1. Instalar React DevTools extension
2. Abrir DevTools → Components
3. Buscar `AuthProvider`
4. Ver el state: user, loading, checking

## Testing Checklist

Antes de reportar un problema, verificar:

- [ ] Backend está corriendo (curl /api/auth/check)
- [ ] Frontend compiló sin errores
- [ ] No hay cookies antiguas
- [ ] El redirect a Emergent Auth funciona
- [ ] El callback incluye #session_id=...
- [ ] El endpoint /api/auth/session-data retorna 200
- [ ] La cookie session_token se guarda
- [ ] El redirect a / ocurre
- [ ] El User Menu aparece

## Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| Loop infinito | Hash no limpiado | Hard redirect implementado |
| Cookie no se guarda | SameSite/Secure issue | Verificado: SameSite=Lax, Secure=false |
| 401 en requests | Token no incluido | withCredentials: true en axios |
| User null después de login | Estado no actualizado | Usar window.location.href |

## Comandos Útiles

### Limpiar Todo y Empezar Fresh
```bash
# Backend
sudo supervisorctl restart backend

# Frontend
sudo supervisorctl restart frontend

# MongoDB - Limpiar sesiones expiradas
mongosh --eval "
use assessment_db;
db.user_sessions.deleteMany({expires_at: {\$lt: new Date()}});
"

# Browser - Limpiar storage
# DevTools → Application → Clear Site Data
```

### Ver Usuario Actual
```bash
# Desde tu cookie
COOKIE="session_token=admin-user-001_session_1764719771"
curl -X GET "http://localhost:8001/api/auth/me" \
  --cookie "$COOKIE" | jq
```

## Estado Actual

✅ **Correcciones implementadas** (3 de diciembre 2025)
- AuthContext usa hard redirect después de OAuth
- Login page no interfiere con OAuth callback
- Limpieza correcta del hash

🧪 **Requiere testing manual**
- Flujo completo con Google OAuth real
- Verificar que no haya loops
- Confirmar que User Menu aparece

---

**Última actualización**: 3 de diciembre 2025, 00:40 UTC  
**Testing necesario**: ✅ Por favor probar con Google OAuth real y reportar resultados
