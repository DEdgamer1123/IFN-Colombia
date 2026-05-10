# IFN - Inventario Forestal Nacional

Edgar Andres Figueroa Hernandez - 01240372037  
Juan Manuel Santamaria Amado - 01240372042

Sistema de información para el Inventario Forestal Nacional de Colombia (IDEAM).

## 📋 Descripción

Aplicación web para gestionar los datos del Inventario Forestal Nacional, permitiendo:
- Registro de conglomerados, brigadas, muestras vegetales, conteos DAP e inspecciones
- Consultas avanzadas con filtros por región, departamento, uso de especie, fecha
- Dashboard con estadísticas y visualización de datos
- Exportación de datos en formato CSV

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+)
- **Backend/Base de datos**: Supabase (PostgreSQL)
- **Despliegue**: Vercel

## 📁 Estructura del Proyecto

```
proyecto-ifn/
├── public/
│   ├── index.html              # Página principal SPA
│   ├── css/
│   │   └── styles.css          # Estilos (Dark theme)
│   └── js/
│       ├── app.js              # Inicialización
│       ├── router.js           # Navegación SPA
│       ├── ui.js               # Renderizado de interfaz
│       ├── services.js         # Lógica de negocio
│       └── supabaseClient.js   # Conexión a Supabase
├── data/
│   └── datos-ejemplo.json      # Datos de ejemplo
├── package.json                # Dependencias
├── vercel.json                # Configuración Vercel
└── README.md                  # Este archivo
```

## ⚙️ Configuración de Supabase

### Paso 1: Las tablas ya están creadas ✅
Las 5 tablas del IFN ya están creadas en tu proyecto Supabase:
- `conglomerados`
- `brigadas`
- `muestras`
- `conteos`
- `inspecciones`

### Paso 2: Configurar credenciales (SEGURIDAD)

#### 🔐 Opción A: Desarrollo Local

1. Copia el archivo de ejemplo:
   ```
   cp public/config.example.js public/config.js
   ```

2. Edita `public/config.js` y agrega tus credenciales:
   ```javascript
   window.__ENV__ = {
       VITE_SUPABASE_URL: 'https://tu-proyecto.supabase.co',
       VITE_SUPABASE_ANON_KEY: 'tu-anon-key-aqui'
   };
   ```

3. **IMPORTANT**: Añade `config.js` a tu `.gitignore`:
   ```
   public/config.js
   ```

#### 🔐 Opción B: Producción (Vercel)

1. Ve a [vercel.com](https://vercel.com) → tu proyecto → **Settings** → **Environment Variables**

2. Agrega las siguientes variables:
   | Variable | Valor |
   |----------|-------|
   | `VITE_SUPABASE_URL` | Tu Project URL de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Tu anon key de Supabase |

3. Vercel las inyectará automáticamente al hacer deploy

#### ⚠️ IMPORTANTE: Seguridad

- **NUNCA** expongas la `service_role key` en el frontend
- La `anon key` es segura para el cliente (solo permite operaciones públicas)
- Las variables de entorno se cargan desde `window.__ENV__`

## 🚀 Despliegue en Vercel

### Opción 1: Desde GitHub

1. Subir el proyecto a GitHub
2. Ir a [vercel.com](https://vercel.com) e importar el repositorio
3. Vercel detectará automáticamente la configuración

### Opción 2: Desde CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

## 📖 Uso de la Aplicación

1. **Dashboard**: Ver estadísticas generales y distribución por región
2. **Registrar**: Agregar nuevos registros (conglomerados, brigadas, muestras, conteos, inspecciones)
3. **Consultar**: Buscar con filtros avanzados y ver detalles
4. **Exportar**: Descargar datos en formato CSV o JSON
5. **Datos de ejemplo**: Cargar datos de demostración con el botón en el sidebar

## 📊 Características

- ✅ Interfaz moderna (Dark theme)
- ✅ Sidebar navegación
- ✅ Diseño responsive
- ✅ Validaciones de datos
- ✅ Notificaciones toast
- ✅ Exportación CSV/JSON
- ✅ Gestión completa de CRUD

## 📝 Notas

- El proyecto usa arquitectura de 3 capas (Presentation, Business, Data)
- La persistencia de datos está en Supabase (cumple requisito académico de bases de datos)
- Los datos de ejemplo se cargan desde el botón en el sidebar

---

**Desarrollado para el curso de Programación I - Universidad**