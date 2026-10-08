# 🛒 VecinoMarket

> **Plataforma web y móvil multicategoría para la gestión de emprendimientos locales con catálogo, inventarios, pedidos, live commerce, promociones, suscripciones SaaS, inteligencia artificial y reportes dinámicos.**

---

## 🌟 Descripción General

**VecinoMarket** es un ecosistema de comercio electrónico multi-tenant diseñado para empoderar a emprendimientos locales, microempresas y comercios barriales. La plataforma permite a las empresas gestionar catálogos, sucursales, inventarios físicos, pedidos y entregas en tiempo real, transmisiones de **Live Commerce**, promociones exclusivas, herramientas impulsadas por **Inteligencia Artificial** (categorización automática y chatbots conversacionales), así como **reportes interactivos con comandos y síntesis de voz**.

---

## 🏗️ Arquitectura y Tecnologías

### 🔹 Backend
- **Framework**: Django 5.x + Django REST Framework (DRF)
- **Base de Datos**: PostgreSQL 16 con extensión espacial **PostGIS** (GeoDjango)
- **Nube y Datos**: [Supabase](https://supabase.com/) (PostgreSQL en la nube sincronizado)
- **WebSockets / Async**: Django Channels + Daphne (Chat interno, Carritos en tiempo real, Notificaciones, Señalización WebRTC)
- **Autenticación**: JWT (`djangorestframework-simplejwt`), OAuth2 Google Login, recuperación segura de contraseñas
- **Inteligencia Artificial**: CLIP en Replicate (visión computacional para sugerencia de categorías) y Chatbot FAQ con búsqueda semántica. [Configuración y pruebas de CLIP](Documentacion/REPLICATE_CLIP.md).
- **Almacenamiento Multimedia**: Cloudinary API
- **Pagos**: Integración con pasarela PayPal Sandbox (checkout directo y tarjetas guardadas)

### 🔹 Frontend Web
- **Framework**: React 18 + Vite
- **Diseño & UI**: TailwindCSS + Vanilla CSS, Lucide Icons, diseño responsive y accesible
- **Estado & Datos**: Context API (AuthContext, CartContext), Axios con interceptores de tokens JWT
- **Voz & Accesibilidad**: Web Speech API (`SpeechRecognition` y `SpeechSynthesis` para comandos y respuestas por voz en reportes)
- **Live Streaming**: WebRTC (transmisión en vivo y visualización interactiva para compradores con chat y fijación de productos en pantalla)

### 🔹 Mobile
- **Framework**: Flutter (Dart) para Android / iOS

### 🔹 DevOps & Contenedores
- **Docker & Docker Compose**: Configuración multiservicio integrada (`vecinomarket_db`, `vecinomarket_backend`, `vecinomarket_frontend`)

---

## 👥 Modelo Multi-Tenant y Roles de Usuario

La plataforma utiliza una arquitectura **Shared Schema con filtrado por Tenant** (`TenantModel`):

| Rol | Descripción | Capacidades Principales |
|---|---|---|
| 👑 **SuperAdmin / Admin** | Administrador global de la plataforma | Gestión y aprobación de empresas (CU01), planes SaaS (CU20), auditoría/bitácora (CU22), respaldo BD (CU23), roles base (CU24), moderación de lives (CU17), reportes globales con voz (CU18, CU19). |
| 🏢 **Empresa (Tenant)** | Propietario del negocio local | Catálogo de productos (CU07), sucursales e inventario (CU09), promociones (CU14), suscripción SaaS (CU20), gestión de empleados (CU02), Live Commerce (CU15), chatbot IA (CU13), reporte dinámico con voz (CU19). |
| 🧑‍💼 **Empleado** | Personal del negocio con permisos asignados | Acceso modular configurable según matriz granular de permisos (`gestionar_pedidos`, `gestionar_inventario`, `gestionar_promociones`, `gestionar_catalogo`, etc.). |
| 🛍️ **Comprador** | Cliente final local | Exploración multicategoría con geolocalización (CU05, CU26), carrito en tiempo real (CU10), checkout y pedidos (CU11), seguimiento de entregas (CU12), chat en vivo (CU13), visualización de lives y compras directas (CU16), valoraciones y reseñas (CU04). |

---

## 💎 Modelo SaaS de Suscripciones

El acceso a las funcionalidades avanzadas está regulado mediante planes de suscripción configurables por el administrador:

| Plan | Duración | Límite Productos | Comisión | Inteligencia Artificial | Live Commerce |
|---|---|---|---|---|---|
| **Prueba** | 15 días | 10 productos | 8% | ❌ | ❌ |
| **Básico** | 30 días | 100 productos | 5% | ✅ Chatbot & Clasificación | ❌ |
| **Premium** | 30 días | Ilimitado | 3% | ✅ Chatbot & Clasificación | ✅ Transmisión en Vivo |

---

## 📁 Estructura del Repositorio

```text
VecinoMarket/
├── Backend/                    # Código fuente del servidor Django
│   ├── apps/
│   │   ├── auditoria/          # CU22: Bitácora de eventos y logs
│   │   ├── catalogo/           # CU05, CU06, CU07, CU08: Categorías, productos, IA
│   │   ├── comunicacion/       # CU13: Chat interno tiempo real y FAQ chatbot
│   │   ├── core/               # Modelos base, comandos de datos, respaldos (CU23)
│   │   ├── facturacion/        # CU21: Facturas y cálculo de comisiones
│   │   ├── inventario/         # CU09: Sucursales y control de stock
│   │   ├── notificaciones/     # Notificaciones del sistema
│   │   ├── pedidos/            # CU10, CU11, CU12: Carritos, checkout, pedidos y entregas
│   │   ├── promociones/        # CU14, CU15, CU16, CU17: Promociones, Live commerce
│   │   ├── reportes/           # CU04, CU18, CU19: Reputación, analíticas y reportes con voz
│   │   ├── suscripciones/      # CU20: Planes SaaS y suscripciones
│   │   └── usuarios/           # CU01, CU02, CU03, CU24, CU25: Autenticación, tenants, empleados
│   └── config/                 # Configuración WSGI, ASGI, Channels y settings
│
├── Frontend/
│   └── frontend_web/           # Aplicación Web React + Vite
│       └── src/
│           ├── api/            # Clientes Axios y endpoints
│           ├── components/     # Componentes modulares (UI, Chat, Live, Reportes)
│           ├── context/        # Contextos globales (AuthContext, CartContext)
│           ├── pages/          # Vistas (Admin, Empresa, Comprador, Públicas)
│           └── utils/          # Roles, permisos y helpers
│
├── Mobile/                     # Aplicación Móvil en Flutter
├── Documentacion/              # Diagramas y especificación del sistema
│   ├── Diagramas/              # Modelado UML en Enterprise Architect (.eap)
│   │   ├── Diagramas de Analisis de Clases SPRINT 2/
│   │   ├── Diagramas de Comunicacion SPRINT 2/
│   │   ├── Diagramas de Navegacion/
│   │   └── Diagramas de Secuencia SPRINT 2/
│   └── PROY#14 -PLATAFORMA WEB Y MOVIL ... AVANCE.docx
│
├── docker-compose.yml          # Orquestación de contenedores
├── readmeSprint1.md            # Detalle y mapeo de código del Sprint 1
└── README.md                   # Documentación principal del proyecto
```

---

## 🚀 Puesta en Marcha Rápida (Docker)

La forma más rápida de ejecutar el ecosistema completo es mediante Docker Compose:

```bash
# 1. Clonar el repositorio
git clone https://github.com/FernandojCg737/VecinoMarket.git
cd VecinoMarket

# 2. Levantar los contenedores (Base de datos PostGIS, Backend y Frontend)
docker-compose up -d --build

# 3. Acceder a los servicios:
# - Frontend Web:    http://localhost:5173
# - Backend API:     http://localhost:8001/api/
# - Base de datos:   localhost:5434 (usuario: vecinomarket)
```

---

## 🧪 Usuarios y Credenciales Demo

Todas las cuentas de prueba predeterminadas utilizan la contraseña:
👉 **`VecinoTest1234!`**

| Rol / Tipo | Correo Electrónico | Notas |
|---|---|---|
| **SuperAdmin** | `admin@vecinomarket.com` | Acceso completo al panel administrativo |
| **Empresa (TechBo)** | `techbo-accesorios@vecinomarket.com` | Plan Básico (con IA, sin Live Commerce) |
| **Empresa (Doña Ana)** | `panaderia-dona-ana@vecinomarket.com` | Empresa del rubro gastronómico |
| **Empleado** | `empleado1.techbo-accesorios@vecinomarket.com` | Empleado con permisos delegados |
| **Comprador** | `comprador1@vecinomarket.com` | Cliente para pruebas de compra y carritos |

---

## 📖 Documentación de Sprints

- Para consultar el mapeo detallado de archivos y líneas de código del **Sprint 1 (CU01 al CU09)**, consulta [`readmeSprint1.md`](readmeSprint1.md).
- Los diagramas de clases, secuencia, comunicación y navegación correspondientes al **Sprint 2** se encuentran exportados en la carpeta [`Documentacion/Diagramas/`](Documentacion/Diagramas/).

---

## 👨‍💻 Autor

- **Fernando Calani** ([@FernandojCg737](https://github.com/FernandojCg737))
- Materia: **Sistemas de Información II**
