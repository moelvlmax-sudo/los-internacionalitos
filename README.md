# Los Internacionalitos — Periódico Digital Local (Full-Stack)

Plataforma periodística completa desarrollada con **Frontend en React + Vite + Tailwind CSS** y **Backend en Node.js + Express**, con persistencia híbrida en **MongoDB Atlas** y almacenamiento local de respaldo.

---

## 🚀 Requisitos Previos

- **Node.js** v18.0 o superior (se recomienda Node 20+ o 22+)
- **npm** v9 o superior (incluido con Node.js)
- Cuenta o cluster en **MongoDB Atlas** (gratuito M0 o dedicado)

---

## 📦 Puesta en Marcha Rápida (Solo necesitas tus ENVs)

### 1. Clonar o descomprimir el proyecto
Descomprime el archivo ZIP en una carpeta de tu preferencia y entra en el directorio:
```bash
cd los-internacionalitos
```

### 2. Configurar las Variables de Entorno (`.env`)
Copia el archivo de ejemplo para crear tu archivo `.env`:
```bash
cp .env.example .env
```

Abre `.env` en tu editor de código y coloca tus variables:
```env
# URI de conexión a tu cluster en MongoDB Atlas:
MONGODB_URI="mongodb+srv://<usuario>:<password>@cluster0.mongodb.net/los_internacionalitos?retryWrites=true&w=majority"

# Clave secreta para firmar los tokens JWT de autenticación:
JWT_SECRET="clave_secreta_super_segura_para_produccion_2026"

# (Opcional) Puerto si deseas usar uno diferente al default (3000):
PORT=3000
```

> **Nota sobre la base de datos:** Si dejas `MONGODB_URI` vacío durante las pruebas, el servidor funcionará automáticamente con almacenamiento local en `data/news.json`. Tan pronto pongas tu URI de MongoDB Atlas, se conectará a tu cluster automáticamente y sembrará las colecciones si están vacías.

### 3. Instalar Dependencias
```bash
npm install
```

### 4. Iniciar en Modo Desarrollo
```bash
npm run dev
```
Abre tu navegador en: **http://localhost:3000**

### 5. Compilar y Ejecutar en Modo Producción
```bash
npm run build
npm start
```

---

## 🔑 Cuenta de Superadministrador Inicial

El sistema incluye una única cuenta raíz con permisos totales de gestión:

| Rol | Correo | Contraseña | Capacidades |
| :--- | :--- | :--- | :--- |
| **Superadmin** | `moelvlmax@gmail.com` | `mediafire4w7` | CRUD total de noticias, galería en Base64, promover usuarios a Admin y revocar permisos |

> **Registro de nuevos lectores:** Cualquier visitante puede registrarse como Lector desde la web. Únicamente el Superadministrador puede promover usuarios a Administradores editoriales desde la pestaña *Gestión de Usuarios & Roles* en el panel de administración.

---

## 📸 Gestión de Fotografías en Base64 (Hash64)

- Al publicar o editar una noticia en el **Panel Admin**, al subir un archivo de imagen, este se comprime óptimamente y se transforma en un string **Base64 (Data URI)**.
- El string se guarda directamente en el documento de la base de datos MongoDB Atlas.
- La web reconstruye de forma reactiva la imagen en tiempo real para las tarjetas de portada, el modal de lectura y la galería de fotos.

---

## 🛠️ Estructura del Proyecto

```
├── package.json          # Dependencias y scripts de ejecución
├── package-lock.json     # Árbol de dependencias bloqueadas para despliegue determinista
├── tsconfig.json         # Configuración de TypeScript
├── vite.config.ts        # Configuración de Vite y plugins
├── server.ts             # Servidor Express, endpoints REST y middleware de Vite
├── server/
│   ├── db.ts             # Conexión resiliente a MongoDB Atlas y fallback local
│   └── initialData.ts    # Artículos y usuario superadmin semilla
├── src/
│   ├── App.tsx           # Shell principal de la aplicación React
│   ├── api.ts            # Cliente HTTP frontend para interactuar con la API
│   ├── types.ts          # Definiciones de TypeScript (Artículos, Usuarios, etc.)
│   ├── components/       # Componentes modulares de interfaz
│   │   ├── Header.tsx           # Cabecera periodística, barra de búsqueda y clima
│   │   ├── HeroSection.tsx      # Portada editorial de impacto
│   │   ├── NewsSection.tsx      # Catálogo de noticias con filtros y ordenamiento
│   │   ├── ArticleModal.tsx     # Lector inmersivo con galería y comentarios
│   │   ├── AdminPanelModal.tsx  # CRUD de noticias y gestión de usuarios/roles
│   │   ├── AuthModal.tsx        # Login y registro de usuarios
│   │   └── Footer.tsx           # Pie editorial e información institucional
│   └── utils/
│       └── imageUtils.ts        # Codificación a Base64 y optimización en Canvas
```

---

## ☁️ Despliegue Directo en Vercel (Sin instalar paquetes localmente)

El repositorio incluye el archivo **`package-lock.json`** generado para que plataformas cloud como **Vercel** o **Render** resuelvan e instalen automáticamente todas las dependencias en su entorno de compilación:

1. Sube o importa el repositorio en **Vercel**.
2. Vercel detectará el archivo `package-lock.json` y ejecutará la instalación exacta sin necesidad de que instales `node_modules` en tu máquina.
3. En la sección **Environment Variables** de tu proyecto en Vercel, agrega:
   - `MONGODB_URI`: la cadena de conexión de tu cluster en MongoDB Atlas.
   - `JWT_SECRET`: una clave secreta para los tokens de sesión.
4. El comando de compilación es `npm run build` y el directorio de salida para Vite es `dist`.
