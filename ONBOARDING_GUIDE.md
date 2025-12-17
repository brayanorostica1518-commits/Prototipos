# 🎓 Guía del Sistema de Onboarding

## Descripción
El sistema de onboarding es un tutorial interactivo paso a paso que guía a los usuarios nuevos a través de las funcionalidades principales de la plataforma.

## Características

### ✨ Tour Interactivo de 5 Pasos
1. **Sesiones** - Explica el panel de sesiones guardadas
2. **Frameworks** - Muestra cómo seleccionar marcos normativos
3. **Subir Documentos** - Guía sobre carga de archivos
4. **Área de Input** - Explica cómo describir evaluaciones
5. **Plantillas** - Presenta las plantillas predefinidas

### 📱 Diseño Responsive
- **Desktop**: Modal centrado con navegación completa
- **Móvil**: Card deslizante desde abajo, optimizado para táctil
- Instrucciones específicas para móvil cuando aplica

### 🎨 Características Visuales
- Barra de progreso animada
- Indicadores de paso (puntos)
- Botones de navegación (Anterior/Siguiente)
- Opción de saltar en cualquier momento
- Animaciones suaves de entrada/salida

## Cómo Funciona

### Primera Visita
El onboarding se muestra automáticamente cuando:
- Es la primera vez que el usuario accede a la aplicación
- Se espera 1 segundo después de cargar la UI
- El usuario no ha marcado el tutorial como completado

### Activación Manual
Los usuarios pueden ver el tutorial en cualquier momento mediante:
1. **Botón "Ver tutorial"** en la pantalla de inicio
2. **Botón flotante "?"** (morado) en la esquina inferior derecha (móvil)

### Almacenamiento
El estado del onboarding se guarda en `localStorage`:
```javascript
localStorage.getItem('hasSeenOnboarding') // 'true' si ya lo vio
```

## Resetear el Onboarding

### Opción 1: Consola del Navegador
```javascript
localStorage.removeItem('hasSeenOnboarding');
location.reload();
```

### Opción 2: Developer Tools
1. Abre DevTools (F12)
2. Ve a la pestaña "Application" o "Almacenamiento"
3. En "Local Storage", busca el dominio de la app
4. Elimina la key `hasSeenOnboarding`
5. Recarga la página

### Opción 3: Navegación Privada/Incógnito
El tutorial siempre aparecerá en modo incógnito ya que no hay localStorage persistente

## Personalización

### Modificar los Pasos
Edita el array `steps` en `/app/frontend/src/components/OnboardingTour.jsx`:

```javascript
const steps = [
  {
    target: 'sidebar',  // Identificador del elemento
    title: '📁 Sesiones',  // Título del paso
    description: 'Descripción...',  // Texto explicativo
    position: 'right',  // Posición del tooltip
    mobileAction: 'Instrucción específica para móvil'  // Opcional
  },
  // ... más pasos
];
```

### Cambiar el Delay de Aparición
En `/app/frontend/src/pages/ChatInterface.jsx`, línea ~214:
```javascript
setTimeout(() => setShowOnboarding(true), 1000); // Cambiar 1000ms
```

## Integración en Otros Componentes

Para agregar el onboarding a otra página:

```javascript
import OnboardingTour from "@/components/OnboardingTour";

function MiComponente() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  return (
    <>
      {/* Tu contenido */}
      
      {showOnboarding && (
        <OnboardingTour 
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </>
  );
}
```

## Mejoras Futuras Sugeridas

1. **Highlights Contextuales**: Resaltar elementos específicos durante el tour
2. **Animaciones de Puntero**: Mostrar dónde hacer clic
3. **Video Demos**: Incluir GIFs o videos cortos
4. **Onboarding Condicional**: Diferentes tours según el tipo de usuario
5. **Analytics**: Rastrear en qué paso los usuarios abandonan
6. **Multi-idioma**: Soporte para diferentes idiomas

## Archivos Relacionados

- `/app/frontend/src/components/OnboardingTour.jsx` - Componente principal
- `/app/frontend/src/pages/ChatInterface.jsx` - Integración del tour
- `/app/frontend/src/App.css` - Estilos de animaciones

## Troubleshooting

### El onboarding no aparece
- Verifica que `hasSeenOnboarding` no esté en localStorage
- Revisa la consola por errores de JavaScript
- Confirma que el delay de 1 segundo se está ejecutando

### El botón "?" no es visible
- Solo visible en móvil (< 1024px)
- Verifica que el componente esté renderizando correctamente
- Revisa los estilos y z-index

### El tour se ve cortado en móvil
- Ajusta `max-h-[95vh]` en el componente
- Revisa el padding y spacing interno
- Considera reducir el texto de las descripciones
