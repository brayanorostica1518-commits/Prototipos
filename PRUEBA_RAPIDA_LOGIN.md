# 🚀 Prueba Rápida de Login - Assessment AI

## ✅ Página de Login Funcionando

La página de login ya NO tiene loops y se muestra correctamente en:
```
http://localhost:3000/login
```

## 🍪 Método Rápido: Configurar Cookie Manualmente

Ya que tu sesión ya fue creada con Google OAuth, puedes obtener tu token y usarlo:

### Paso 1: Obtener tu Session Token

```bash
# Ejecuta esto en terminal
mongosh --eval "
use assessment_db;
db.user_sessions.find(
  {user_id: 'ff18f8d3-2f39-45f9-9f66-240fb73f7c77'},
  {session_token: 1, expires_at: 1, _id: 0}
).pretty();
"
```

**Salida esperada:**
```json
{
  "session_token": "ff18f8d3-2f39-45f9-9f66-240fb73f7c77_session_1733191973",
  "expires_at": ISODate("2025-12-10T00:32:53.056Z")
}
```

### Paso 2: Configurar la Cookie

1. **Abre la página de login**: http://localhost:3000/login

2. **Abre DevTools**: Presiona `F12`

3. **Ve a Console**

4. **Pega este código** (reemplaza `TU_TOKEN_AQUI` con el token del Paso 1):

```javascript
// Reemplaza con tu token real
const myToken = "ff18f8d3-2f39-45f9-9f66-240fb73f7c77_session_1733191973";

// Configurar cookie
document.cookie = `session_token=${myToken}; path=/; max-age=604800; SameSite=Lax`;

// Verificar que se guardó
console.log("Cookie configurada:", document.cookie);

// Navegar a la app
location.href = '/';
```

5. **Presiona Enter**

6. **La página se recargará** y deberías estar dentro de la aplicación

### Paso 3: Verificar que Funciona

Deberías ver:
- ✅ Tu nombre y foto en el User Menu (esquina superior derecha)
- ✅ La interfaz principal del chat
- ✅ Botones: Plantillas, Informes, Dashboard
- ✅ Sin mensajes de "No autenticado"

---

## 🔄 Método Alternativo: Google OAuth

Si prefieres probar el flujo completo de OAuth:

### Antes de Empezar: Limpiar Cookies

```javascript
// En DevTools Console
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});
console.log("Cookies limpiadas");
location.reload();
```

### Flujo OAuth:

1. Ve a: http://localhost:3000/login
2. Click en "Continuar con Google"
3. Autentica con tu cuenta de Google
4. Espera el redirect
5. Deberías estar dentro de la app

**Notas**:
- Puede mostrar toasts de error durante el proceso (normal)
- El redirect debería completarse en 2-3 segundos
- Si ves loops, reporta el error en DevTools Console

---

## 🧪 Verificar Estado de Autenticación

### Desde el Navegador:

```javascript
// DevTools Console
fetch('/api/auth/check', {credentials: 'include'})
  .then(r => r.json())
  .then(d => console.log('Auth status:', d));
```

**Resultado esperado**:
```json
{
  "authenticated": true,
  "user": {
    "id": "ff18f8d3-2f39-45f9-9f66-240fb73f7c77",
    "email": "brayan.orostica@cftsa.cl",
    "name": "Brayan Orostica",
    "picture": "https://..."
  }
}
```

### Desde Terminal:

```bash
# Reemplaza TU_TOKEN con tu token real
curl -X GET "http://localhost:8001/api/auth/me" \
  --cookie "session_token=TU_TOKEN" | jq
```

---

## 🎯 Scripts Útiles

### Script 1: Login Completo Automático

```javascript
// Pega esto en Console después de obtener tu token de MongoDB
(async () => {
  const token = "ff18f8d3-2f39-45f9-9f66-240fb73f7c77_session_1733191973"; // TU TOKEN
  
  // Configurar cookie
  document.cookie = `session_token=${token}; path=/; max-age=604800; SameSite=Lax`;
  
  // Verificar
  const response = await fetch('/api/auth/check', {credentials: 'include'});
  const data = await response.json();
  
  if (data.authenticated) {
    console.log('✅ Autenticado como:', data.user.name);
    console.log('Redirigiendo...');
    setTimeout(() => location.href = '/', 1000);
  } else {
    console.error('❌ Token inválido o expirado');
  }
})();
```

### Script 2: Ver Información de Usuario

```javascript
// Ver tu información de usuario
fetch('/api/auth/me', {credentials: 'include'})
  .then(r => r.json())
  .then(user => {
    console.log('👤 Usuario:', user.name);
    console.log('📧 Email:', user.email);
    console.log('🆔 ID:', user.id);
    console.log('🖼️ Avatar:', user.picture);
  })
  .catch(e => console.error('Error:', e.message));
```

### Script 3: Logout

```javascript
// Cerrar sesión
fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'include'
})
.then(() => {
  console.log('Sesión cerrada');
  location.href = '/login';
});
```

---

## 🐛 Troubleshooting

### Problema: Cookie no se guarda

**Verificar**:
```javascript
console.log(document.cookie);
// Debería mostrar: session_token=...
```

**Si está vacío**:
- Verifica que no haya espacios en el token
- Intenta cerrar y abrir DevTools
- Usa la pestaña Application → Cookies para verificar

### Problema: "401 Unauthorized"

**Causa**: Token expirado o inválido

**Solución**: Obtener nuevo token de MongoDB o crear sesión nueva

### Problema: Sigue mostrando login

**Verificar que el token sea válido**:
```bash
mongosh --eval "
use assessment_db;
db.user_sessions.findOne({
  session_token: 'TU_TOKEN',
  expires_at: {\$gt: new Date()}
});
"
```

Si es `null`, el token expiró. Necesitas uno nuevo.

---

## 📋 Checklist Rápido

- [ ] Abrir http://localhost:3000/login
- [ ] Obtener session_token de MongoDB
- [ ] Abrir DevTools Console
- [ ] Pegar script de configuración de cookie
- [ ] Verificar que cookie se guardó
- [ ] Navegar a /
- [ ] Ver User Menu con tu nombre
- [ ] ✅ Login exitoso!

---

## 💡 Tip Pro

Guarda este bookmarklet en tu navegador:

```javascript
javascript:(function(){const t=prompt('Session Token:');if(t){document.cookie=`session_token=${t};path=/;max-age=604800;SameSite=Lax`;location.href='/';}})();
```

**Uso**: 
1. Click en el bookmarklet
2. Pega tu token
3. Enter
4. ¡Listo!

---

**Última actualización**: 3 de diciembre 2025, 00:45 UTC  
**Estado**: ✅ Página de login funcionando sin loops
