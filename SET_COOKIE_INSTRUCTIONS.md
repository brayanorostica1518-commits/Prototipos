# 🍪 Instrucciones para Configurar Cookie de Sesión

## Método 1: Usando DevTools del Navegador (Recomendado)

1. **Abre la aplicación**: `http://localhost:3000/login`

2. **Abre DevTools**: 
   - Presiona `F12` o
   - Click derecho → "Inspeccionar"

3. **Ve a la pestaña Console**

4. **Pega este código** (usa uno de los tokens de USUARIOS_PRUEBA.md):

```javascript
// Admin Usuario
document.cookie = "session_token=admin-user-001_session_1764719771; path=/; max-age=604800; SameSite=Lax";

// O Usuario Test 1
// document.cookie = "session_token=test-user-001_session_1764719771; path=/; max-age=604800; SameSite=Lax";

// O Usuario Test 2  
// document.cookie = "session_token=test-user-002_session_1764719771; path=/; max-age=604800; SameSite=Lax";
```

5. **Refresca la página**: `F5` o `Ctrl+R`

6. **Deberías ser redirigido automáticamente** a la aplicación principal

---

## Método 2: Usando Application/Storage Tab

1. **Abre DevTools** (F12)

2. **Ve a "Application"** (Chrome) o **"Storage"** (Firefox)

3. **Expandir "Cookies"** en el panel izquierdo

4. **Click en** `http://localhost:3000`

5. **Click en el botón "+" o "Add Cookie"**

6. **Ingresa los valores**:
   - **Name**: `session_token`
   - **Value**: `admin-user-001_session_1764719771` (o uno de los otros)
   - **Domain**: `localhost`
   - **Path**: `/`
   - **Expires**: (selecciona una fecha 7 días en el futuro)
   - **HttpOnly**: ❌ (no marcar, porque lo estás agregando manualmente)
   - **Secure**: ❌ (no marcar, es localhost)
   - **SameSite**: `Lax`

7. **Refresca la página**

---

## Método 3: Usando Playwright Script

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  // Set cookie
  await context.addCookies([{
    name: 'session_token',
    value: 'admin-user-001_session_1764719771',
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
    expires: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  }]);
  
  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  
  // Page should now be authenticated
  await page.waitForTimeout(5000);
  
  console.log('Current URL:', page.url());
})();
```

---

## Método 4: Extensión de Navegador (EditThisCookie)

1. **Instala extensión**: 
   - Chrome: [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg)
   - Firefox: [Cookie-Editor](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/)

2. **Abre** `http://localhost:3000/login`

3. **Click en el ícono de la extensión**

4. **Agrega nueva cookie**:
   ```json
   {
     "name": "session_token",
     "value": "admin-user-001_session_1764719771",
     "domain": "localhost",
     "path": "/",
     "expires": "2025-12-10T00:00:00.000Z",
     "httpOnly": false,
     "secure": false,
     "sameSite": "Lax"
   }
   ```

5. **Guarda y refresca**

---

## Verificar que la Cookie Funciona

### Opción A: DevTools Console
```javascript
// Ver todas las cookies
document.cookie

// Debería mostrar:
// "session_token=admin-user-001_session_1764719771"
```

### Opción B: Application/Storage Tab
1. Abre DevTools → Application → Cookies → http://localhost:3000
2. Deberías ver la cookie `session_token` listada

### Opción C: Network Tab
1. Abre DevTools → Network
2. Refresca la página
3. Click en cualquier request a `/api/...`
4. Ve a "Headers" → "Request Headers"
5. Deberías ver: `Cookie: session_token=admin-user-001_session_1764719771`

---

## Troubleshooting

### Cookie no se guarda
**Problema**: La cookie desaparece al refrescar
**Solución**: 
- Verifica que `max-age` o `expires` esté configurado
- Asegúrate que `path` sea `/`
- Verifica que no haya espacios extras en el valor

### Sigue pidiendo login después de configurar cookie
**Problema**: La cookie existe pero no autentica
**Solución**:
- Verifica que el token no haya expirado en MongoDB
- Comprueba backend logs: `tail -f /var/log/supervisor/backend.err.log`
- Verifica que el user_id coincida con un usuario existente

### Error "Invalid or expired session"
**Problema**: El token no es válido
**Solución**:
- Crea un nuevo usuario con el script Python en USUARIOS_PRUEBA.md
- Usa el nuevo token generado

---

## Tokens Disponibles (Válidos 7 días desde creación)

| Usuario | Email | Token |
|---------|-------|-------|
| Admin | admin@assessmentai.com | `admin-user-001_session_1764719771` |
| Usuario 1 | usuario1@test.com | `test-user-001_session_1764719771` |
| Usuario 2 | usuario2@test.com | `test-user-002_session_1764719771` |

**Nota**: Si los tokens expiraron, ejecuta el script de creación de usuarios nuevamente.

---

## Testing Rápido con cURL

```bash
# Test authentication con token
curl -X GET "http://localhost:8001/api/auth/me" \
  --cookie "session_token=admin-user-001_session_1764719771"

# Debería retornar:
# {"id":"admin-user-001","email":"admin@assessmentai.com","name":"Admin Usuario",...}

# Test sin token (debería fallar)
curl -X GET "http://localhost:8001/api/sessions"
# {"detail":"Not authenticated"}
```

---

**Última actualización**: Diciembre 2025  
**Válido para**: Development/Testing en localhost
