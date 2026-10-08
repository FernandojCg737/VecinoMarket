# 📋 README SPRINT 1 - Ubicación de Casos de Uso

## 🎯 Descripción General
Este documento detalla la ubicación exacta (carpeta y línea) de cada caso de uso implementado en el Sprint 1 del proyecto VecinoMarket.

---

## **CU04: Gestionar Reputación y Valoraciones**

### 📂 Backend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Backend/apps/reportes/models.py` | 7 | Modelo `Valoracion` para reputación |
| `Backend/apps/reportes/serializers.py` | 7 | Serializador `ValoracionSerializer` |
| `Backend/apps/reportes/views.py` | 31-62 | Vista `ListaCrearMisValoracionesView` (comprador) |
| `Backend/apps/reportes/views.py` | 62-97 | Vista editar/eliminar valoración |
| `Backend/apps/reportes/views.py` | 82-120 | Vista empresa ve valoraciones recibidas |
| `Backend/apps/reportes/views.py` | 99-130 | Vista admin ve ponderación global |
| `Backend/apps/reportes/views.py` | 133-180 | Vista admin ve comentarios |
| `Backend/apps/reportes/urls.py` | 22-29 | Rutas API (POST/GET/DELETE) |
| `Backend/apps/reportes/migrations/0003_valoracion_funciones_y_triggers.py` | 4 | Función SQL y triggers de auditoría |

### 🎨 Frontend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Frontend/frontend_web/src/pages/admin/Reputacion.jsx` | 143 | Panel admin - Reputación de empresas |
| `Frontend/frontend_web/src/pages/empresa/MiReputacion.jsx` | 71 | Panel empresa - Mi reputación |
| `Frontend/frontend_web/src/pages/MisResenas.jsx` | 126 | Panel comprador - Mis reseñas |

---

## **CU05: Buscar y Explorar Catálogo de Productos**

### 📂 Backend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Backend/apps/catalogo/views.py` | 317-340 | Vista resumen catálogo por empresa |
| `Backend/apps/catalogo/migrations/0006_resumen_catalogo.py` | 4 | Función SQL `fn_resumen_catalogo_empresa` |
| `Backend/apps/catalogo/urls.py` | 37-40 | Endpoint GET catálogo por empresa |

### 🎨 Frontend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Frontend/frontend_web/src/pages/admin/CatalogosEmpresas.jsx` | 247-250 | Búsqueda y exploración catálogo admin |
| `Frontend/frontend_web/src/pages/admin/CatalogosEmpresas.jsx` | 493-496 | Buscador de empresa |

---

## **CU06: Gestionar Categorías de Productos**

### 📂 Backend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Backend/apps/catalogo/models.py` | 63 | Modelo `Categoria` |
| `Backend/apps/catalogo/serializers.py` | 15-73 | `CategoriaAdminSerializer` - CRUD |
| `Backend/apps/catalogo/views.py` | 88-102 | `ListaCategoriasAdminView` - GET todas |
| `Backend/apps/catalogo/views.py` | 102-122 | `CrearCategoriaAdminView` - POST |
| `Backend/apps/catalogo/views.py` | 122-135 | `EditarEliminarCategoriaView` - PUT/DELETE |
| `Backend/apps/catalogo/views.py` | 135-150 | `ProductosCategorizaView` - Productos por categoría |
| `Backend/apps/catalogo/urls.py` | 26-28 | Rutas admin (SuperAdmin/Admin soporte) |
| `Backend/apps/catalogo/migrations/0003_funciones_y_triggers.py` | 4-12 | Triggers de conteo de productos |

### 🎨 Frontend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Frontend/frontend_web/src/pages/admin/Categorias.jsx` | 136 | Panel admin - Crear, editar, eliminar categorías |

---

## **CU07: Gestionar Productos**

### 📂 Backend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Backend/apps/catalogo/models.py` | 30-82 | Modelo `Producto` (SKU, precio, estado, etc.) |
| `Backend/apps/catalogo/models.py` | 83 | Modelo `ProductoImagen` |
| `Backend/apps/catalogo/serializers.py` | 75-97 | `ProductoAdminSerializer` - CRUD admin |
| `Backend/apps/catalogo/serializers.py` | 99-140 | `ProductoEmpresaSerializer` - CRUD empresa |
| `Backend/apps/catalogo/serializers.py` | 141-160 | `ProductoImagenSerializer` |
| `Backend/apps/catalogo/views.py` | 150-185 | `ListaProductosAdminView` - Ver todos |
| `Backend/apps/catalogo/views.py` | 185-205 | `EditarEliminarProductoAdminView` - PUT/DELETE |
| `Backend/apps/catalogo/views.py` | 206-230 | `SubirImagenProductoAdminView` - Upload imagen |
| `Backend/apps/catalogo/views.py` | 232-265 | `ListaCrearProductosEmpresaView` - GET/POST empresa |
| `Backend/apps/catalogo/views.py` | 265-290 | `EditarEliminarProductoEmpresaView` - PUT/DELETE empresa |
| `Backend/apps/catalogo/views.py` | 290-315 | `GestionarImagenProductoEmpresaView` - Subir/quitar imagen |
| `Backend/apps/catalogo/urls.py` | 31-35 | Rutas admin |
| `Backend/apps/catalogo/urls.py` | 40-44 | Rutas empresa |
| `Backend/config/settings/base.py` | 122 | Config Cloudinary para imágenes |
| `Backend/.env` | 18 | Variable `CLOUDINARY_CLOUD_NAME` |

### 🎨 Frontend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Frontend/frontend_web/src/pages/admin/Productos.jsx` | 214-217 | Panel admin - CRUD productos todas empresas |
| `Frontend/frontend_web/src/pages/empresa/MisProductos.jsx` | 225 | Panel empresa - Publicar y administrar productos |
| `Frontend/frontend_web/src/config/adminMenu.js` | 54 | Opción menú admin |

---

## **CU08: Categorizar Producto mediante Visión Artificial**

### 📂 Backend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Backend/apps/catalogo/ia.py` | 1+ | Módulo IA - CLIP de Replicate (comparación de imagen y categorías) |
| `Backend/apps/catalogo/models.py` | 83+ | Modelo `CategorizacionIALog` (trazabilidad) |
| `Backend/apps/catalogo/views.py` | 401-415 | `SugerenciaCategoriaIAView` - POST con imagen |
| `Backend/apps/catalogo/urls.py` | 47 | Endpoint `/sugerir-categoria/` |
| `Backend/config/settings/base.py` | — | Configuración `REPLICATE_API_TOKEN` |
| `Backend/.env.example` | — | Ejemplo de variable `REPLICATE_API_TOKEN` (el token real va en `.env` o Render) |

### 🎨 Frontend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Frontend/frontend_web/src/components/admin/SugerenciaCategoriaIA.jsx` | 29 | Componente "Sugerir categoría con IA" |
| `Frontend/frontend_web/src/config/adminMenu.js` | 60-64 | Opción menú: Botón IA en editar producto (CU07) |
| `Frontend/frontend_web/src/pages/admin/CatalogosEmpresas.jsx` | 250 | Integración con catálogo por empresa |

---

## **CU09: Gestionar Empleados y Permisos**

### 📂 Backend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Backend/apps/usuarios/models.py` | 196-215 | Modelo `Empleado` de empresa |
| `Backend/apps/usuarios/models.py` | 217-255 | Modelo `Permiso` - Asignación granular |
| `Backend/apps/usuarios/serializers.py` | 499+ | `EmpleadoAdminSerializer` - SuperAdmin ve todos |
| `Backend/apps/usuarios/views.py` | 327-387 | `CrearEmpleadoEmpresaView` - Empresa crea empleados |
| `Backend/apps/usuarios/views.py` | 388-411 | `GestionarPermisosEmpleadoView` - Asignar/quitar permisos |
| `Backend/apps/usuarios/views.py` | 412-490 | `ListaCrearEmpleadosAdminView` - SuperAdmin CRUD |
| `Backend/apps/usuarios/views.py` | 480+ | `GestionarPermisosEmpleadoAdminView` - SuperAdmin permisos |
| `Backend/apps/usuarios/urls.py` | 77-79 | Rutas API empleados y permisos |
| `Backend/basedatos/02_diseno_fisico_referencia.sql` | 99-111 | Tablas SQL empleado y permiso |

### 🎨 Frontend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Frontend/frontend_web/src/pages/admin/Empleados.jsx` | 99 | Panel admin - Empleados todas empresas |
| `Frontend/frontend_web/src/pages/empresa/MisEmpleados.jsx` | 108 | Panel empresa - Alta de empleados y permisos |
| `Frontend/frontend_web/src/config/adminMenu.js` | 29 | Opción menú admin |

---

## **CU22: Consultar Logs de Auditoría del Sistema**

### 📂 Backend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Backend/apps/auditoria/models.py` | 7+ | Modelo `LogAuditoria` - Registro inmutable |
| `Backend/apps/auditoria/views.py` | 17+ | `BitacoraAdminView` - Solo SUPERADMIN |
| `Backend/apps/usuarios/views.py` | 108 | Registra login exitoso |
| `Backend/apps/usuarios/views.py` | 125 | Registra logout |
| `Backend/apps/usuarios/views.py` | 142+ | Registra login con Google |
| `Backend/apps/core/migrations/0001_funciones_y_triggers.py` | 16 | Función `fn_auditoria_generica` |
| `Backend/apps/core/middleware.py` | - | Middleware que captura acciones |
| `Backend/basedatos/02_diseno_fisico_referencia.sql` | 428+ | Triggers SQL de auditoría |
| `Backend/README.md` | 104 | Documentación triggers |

### 🎨 Frontend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Frontend/frontend_web/src/pages/Bitacora.jsx` | 57 | Panel bitácora - Ingresos, salidas, acciones críticas |
| `Frontend/frontend_web/src/pages/Auth.jsx` | 57 | Redirección SUPERADMIN a bitácora al login |
| `Frontend/frontend_web/src/config/adminMenu.js` | 121 | Opción menú admin |

### 📱 Mobile
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Mobile/vecinomarket_app/lib/screens/admin/bitacora_screen.dart` | 36 | Pantalla bitácora Flutter |
| `Mobile/vecinomarket_app/lib/screens/profile_screen.dart` | 198 | Acceso a bitácora en perfil |

---

## **CU28: Gestionar Copias de Seguridad y Restauración del Sistema**

### 📂 Backend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Backend/apps/core/backup.py` | 27-50 | Funciones `generar_backup_json` y `restaurar_backup_json` |
| `Backend/apps/core/views.py` | 16-58 | Vistas `BackupView` (GET) y `RestoreView` (POST) |
| `Backend/apps/core/urls.py` | 9-11 | Rutas API `/api/core/backup/` y `/api/core/restore/` |
| `Backend/apps/auditoria/models.py` | - | Auditoría automática de `BACKUP_SISTEMA` y `RESTORE_SISTEMA` |

### 🎨 Frontend
| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Frontend/frontend_web/src/pages/admin/Backup.jsx` | 74 | Panel SuperAdmin - Descargar y restaurar backup JSON |
| `Frontend/frontend_web/src/config/adminMenu.js` | 211 | Opción menú admin P5 - CU28 |

---

## 📊 Resumen de Estructura

### Carpetas Backend Principales
```
Backend/
├── apps/
│   ├── reportes/       → CU04 (Valoraciones)
│   ├── catalogo/       → CU05, CU06, CU07, CU08
│   ├── usuarios/       → CU09, CU22
│   ├── auditoria/      → CU22
│   └── core/           → CU22 (triggers y funciones)
├── config/
│   └── settings/       → Config Cloudinary (CU07), Replicate CLIP (CU08)
└── basedatos/
    └── *.sql           → Diseño DB y triggers
```

### Carpetas Frontend Principales
```
Frontend/frontend_web/src/
├── pages/
│   ├── admin/          → Paneles admin (CU04-09, CU22)
│   ├── empresa/        → Paneles empresa (CU04, CU07, CU09)
│   ├── Bitacora.jsx    → CU22
│   └── Auth.jsx        → CU22
├── components/
│   ├── admin/          → Componente IA (CU08)
│   └── auth/           → Componentes autenticación
└── config/
    └── adminMenu.js    → Menú con referencias a todos los CUs
```

### Carpetas Mobile
```
Mobile/vecinomarket_app/lib/
├── screens/
│   ├── admin/
│   │   └── bitacora_screen.dart → CU22
│   └── profile_screen.dart      → CU22
└── services/
    ├── api_client.dart          → Integración API
    └── auth_service.dart        → CU22 (login/logout)
```

---

## 🔑 Variables de Configuración Requeridas

### `.env` Backend
- `RECAPTCHA_SECRET_KEY` - Para verificación de CAPTCHA (desactivado actualmente)
- `CLOUDINARY_CLOUD_NAME` - Para CU07 (imágenes de productos)
- `CLOUDINARY_API_KEY` - Para CU07
- `CLOUDINARY_API_SECRET` - Para CU07
- `REPLICATE_API_TOKEN` - Para CU08 (CLIP de Replicate; solo backend)

### `.env` Frontend
- `VITE_RECAPTCHA_SITE_KEY` - Para CAPTCHA (desactivado actualmente)
- `VITE_GOOGLE_CLIENT_ID` - Para login con Google
- `VITE_PAYPAL_CLIENT_ID` - Para pagos

---

## ✅ Verificación de Implementación

### Tests Recomendados
- [ ] CU04: Crear, editar, eliminar reseña de comprador
- [ ] CU04: Admin ve ponderación global por empresa
- [ ] CU05: Explorar catálogo de empresa específica
- [ ] CU06: CRUD de categorías (admin)
- [ ] CU07: Subir producto con imagen (empresa)
- [ ] CU07: Editar/eliminar producto (empresa)
- [ ] CU08: Sugerir categoría con IA desde imagen
- [ ] CU09: Crear empleado y asignar permisos
- [ ] CU09: SuperAdmin ve/modifica empleados
- [ ] CU22: Verificar logs de login/logout
- [ ] CU22: Verificar auditoría de cambios en tablas

---

**Última actualización:** 2026-09-08  
**Proyecto:** VecinoMarket - SISTEMAS DE INFORMACIÓN II
