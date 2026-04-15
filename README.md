<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

<div align="center">
  <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200&h=200" width="100" />
  <h1>Swappy ♻️</h1>
  <p><b>Mercado Peer-to-Peer de Alquiler de Objetos (P2P Rental Marketplace)</b></p>
</div>

---

## 📖 Descripción del Proyecto
**Swappy** es una plataforma moderna al estilo Wallapop, pero focalizada en **alquiler de corto plazo** (rentals). Los usuarios pueden poner a disposición del público artículos que no usan a diario (herramientas, cámaras, material de camping, etc.) y ganar dinero, o bien alquilar lo que necesitan por una fracción de su precio original.

La plataforma está diseñada con un enfoque **Mobile-First**, animaciones fluidas (Framer Motion) y un sistema backend totalmente integrado (Supabase).

## ✨ Funcionalidades Principales

*   🔒 **Autenticación (Supabase Auth)**: Registro y acceso seguro. Vistas protegidas para usuarios no registrados.
*   📦 **Catálogo Dinámico**: Exploración libre del feed con sistema de filtrado por categorías.
*   📅 **Flujo de Peticiones de Alquiler**: Solicitud de fechas, aprobación/rechazo desde el chat.
*   ✅ **Cierre de Alquiler (CU14)**: Botón "Finalizar" que marca el alquiler como completado y reactiva el objeto.
*   ⭐ **Calificación de 3 Factores (CU15/CU16/CU17)**: Al finalizar, se califican el objeto, el propietario y el arrendatario.
*   💬 **Mensajería estilo Wallapop**: Chat a pantalla completa con solicitudes de alquiler incrustadas en el hilo.
*   👤 **Gestión de Perfil**: Panel con anuncios, historial de alquileres y solicitudes recibidas.
*   ☁️ **Subida de Imágenes**: Integrado con Supabase Storage.

## 🛠️ Tecnologías Empleadas

### Frontend
*   **React 19** (Vite)
*   **TypeScript**
*   **TailwindCSS v4**
*   **Framer Motion** (`motion/react`)
*   **Lucide React**

### Backend (BaaS)
*   **Supabase Database** (PostgreSQL + RLS Policies)
*   **Supabase Auth**
*   **Supabase Storage** (Buckets: `FotosPerfil`, `FotosProductos`, `item-images`)

## 🗄️ Base de Datos — Setup

Ejecuta los scripts en Supabase Dashboard → SQL Editor en este orden:

```
1. supabase/schema.sql      → Tablas base: profiles, items, rentals, messages
2. supabase/schema_v2.sql   → Añade: reviews, user_reviews, bucket item-images
3. supabase/seed.sql        → Datos de ejemplo (opcional)
```

> **Importante:** `schema_v2.sql` añade la tabla `user_reviews` necesaria para el sistema de calificación de 3 factores. Sin ejecutarla, el botón "Valorar" dará error.

## 🚀 Instalación y Despliegue Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/jrl0045/Swappy.git
cd Swappy
```

### 2. Variables de Entorno
```env
VITE_SUPABASE_URL=tu_url_de_proyecto
VITE_SUPABASE_ANON_KEY=tu_clave_anon_publica
```

### 3. Instalar y lanzar
```bash
npm install
npm run dev
```

---

> Proyecto TFG — DAM 2025-2026. Construido por Jose, Gildardo, Javier y Estanislao. 🌱
