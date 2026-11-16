**Índice de trazabilidad C4 — VecinoMarket. Revisión del código local: 7 de octubre de 2026.**

Los cuatro títulos conservan los niveles de los diagramas adjuntos. Cada `##` identifica un elemento; `FRONTEND` incluye web y móvil cuando existe implementación. Los enlaces son relativos a esta carpeta y apuntan a líneas del código revisado, por ejemplo `[serializers.py](../../Backend/apps/comunicacion/serializers.py#L41-48)`. Los rangos son inclusivos; deberán actualizarse si cambia el código. Algunos visores locales abren el archivo pero no interpretan el fragmento de línea; el número queda explícito en el destino del enlace.

**Alcance:** se indexa el código real, sin convertir los nombres conceptuales del dibujo en clases inexistentes. Las referencias a migraciones indican dónde se define el esquema; este documento no ejecuta migraciones ni modifica datos. Las credenciales y los valores de `.env` se omiten.

**Criterio de correspondencia:** se sigue lo representado en los diagramas y se enlaza únicamente su implementación congruente en el código actual de este PC. Los nombres conceptuales se acompañan de sus equivalentes concretos. La configuración de proveedores se referencia en los archivos presentes en el proyecto; no se evalúa un servidor remoto.

**Cómo seguir un flujo:** interfaz → cliente HTTP/WS → ruta → permisos/vista → ORM o SQL → serializer/respuesta → estado/renderizado del cliente. En las vistas que heredan `ListAPIView`, `ListCreateAPIView` o `RetrieveAPIView`, DRF construye la respuesta mediante sus métodos heredados: el repositorio declara `serializer_class`, `queryset`/`get_queryset()` y, cuando corresponde, `pagination_class`. No hay un `return Response(...)` local para esos casos; se señalan la declaración que activa ese retorno, los campos del serializer y la recepción en el cliente. Un `return` de Python al helper llamador, un `RETURN` SQL y una respuesta HTTP son pasos diferentes y se identifican como tales.

**Navegación:** [Contexto](#contexto), [Contenedores](#contenedores), [Componentes](#componentes), [Código](#codigo).

<a id="contexto"></a>

# DIAGRAMA DE CONTEXTO

**Elementos de este diagrama:**

- [Comprador](#c1-comprador)
- [Empresa — dueño del tenant](#c1-empresa)
- [Empleado](#c1-empleado)
- [Super administrador](#c1-superadmin)
- [Administrador de soporte](#c1-soporte)
- [VecinoMarket — sistema SaaS multiempresa](#c1-sistema)
- [Base de datos PostgreSQL + PostGIS](#c1-db)
- [PayPal](#c1-paypal)
- [Google Identity / Google Auth API](#c1-google)
- [Gmail API](#c1-gmail)
- [Cloudinary](#c1-cloudinary)
- [Hugging Face](#c1-hf)
- [OpenStreetMap](#c1-osm)
- [Render — configuración de despliegue del backend](#c1-render)
- [Vercel — configuración de despliegue del frontend](#c1-vercel)
- [Relaciones HTTPS y WebSockets](#c1-transporte)

## Breve Descripción

Cinco roles interactúan con VecinoMarket, un marketplace web y móvil para varias empresas. Los clientes utilizan la API para catálogo, compras y administración; la web incorpora señalización WebSocket para live commerce. PostgreSQL/PostGIS persiste los datos y las integraciones externas aportan identidad, pagos, correo, multimedia, clasificación y mapas.

<a id="c1-comprador"></a>

## Comprador

Persona que explora productos de distintas empresas, compra, elige entrega y conversa con el vendedor.

### FRONTEND

- Web: rutas de catálogo, carrito, checkout y compras: [App.jsx](../../Frontend/frontend_web/src/App.jsx#L91-95), [App.jsx](../../Frontend/frontend_web/src/App.jsx#L117-125). Peticiones y adaptación de productos: [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L14-54); recepción del detalle: [ProductDetail.jsx](../../Frontend/frontend_web/src/pages/ProductDetail.jsx#L37-42).
- Compra: construye `items` y `entregas` en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L88-100), envía pago y confirmación en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L144-178), recibe números de pedido y los muestra en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L181-195).
- Chat: solicita conversación y usa el `id` retornado para navegar: [ProductDetail.jsx](../../Frontend/frontend_web/src/pages/ProductDetail.jsx#L44-58). Mensajes, polling, envío y visualización: [ChatThread.jsx](../../Frontend/frontend_web/src/components/chat/ChatThread.jsx#L14-79).
- Móvil: consulta categorías/productos y convierte JSON a objetos: [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L6-19); crea y confirma checkout: [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L33-86).

### BACKEND

- Identifica el rol `COMPRADOR`: [models.py](../../Backend/apps/usuarios/models.py#L10-15); autoriza acciones del comprador en [permissions.py](../../Backend/apps/usuarios/permissions.py#L47-54).
- Catálogo público: consulta con stock agregado en [views.py](../../Backend/apps/catalogo/views.py#L37-83) y devuelve campos mediante [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71).
- Checkout obtiene al comprador autenticado, consulta productos y valida cantidades: [views.py](../../Backend/apps/pedidos/views.py#L525-545); persistencia y descuento de stock: [views.py](../../Backend/apps/pedidos/views.py#L552-603); respuesta de inicio: [views.py](../../Backend/apps/pedidos/views.py#L640-646); confirmación y respuesta final: [views.py](../../Backend/apps/pedidos/views.py#L657-703).
- Conversación: asegura comprador y empresa, crea/reutiliza y responde con serializer: [views.py](../../Backend/apps/comunicacion/views.py#L64-77). El perfil retorna rol, empresa, plan y permisos: [views.py](../../Backend/apps/usuarios/views.py#L530-544); campos y cálculo de permisos: [serializers.py](../../Backend/apps/usuarios/serializers.py#L198-242). La web recibe ese JSON y actualiza `usuario`: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L34-40); Flutter hace lo mismo y avisa a sus widgets: [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L39-46).

### BASE DE DATOS (si corresponde)

- Identidad y direcciones separadas: [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74), [Comprador — models.py](../../Backend/apps/usuarios/models.py#L236-248), [Direccion — models.py](../../Backend/apps/usuarios/models.py#L251-265); tablas `usuarios_usuario`, `usuarios_comprador`, `usuarios_direccion`: [Comprador — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L77-92), [Direccion — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L93-112).
- Compra: `pedidos_ordencompra`, `pedidos_pedido`, `pedidos_pedidoitem` y `pedidos_pago`: [OrdenCompra — models.py](../../Backend/apps/pedidos/models.py#L40-72), [Pedido — models.py](../../Backend/apps/pedidos/models.py#L105-151), [PedidoItem — models.py](../../Backend/apps/pedidos/models.py#L154-169), [Pago — models.py](../../Backend/apps/pedidos/models.py#L75-102).
- Conversación y mensajes: [ChatConversacion — models.py](../../Backend/apps/comunicacion/models.py#L18-35), [ChatMensaje — models.py](../../Backend/apps/comunicacion/models.py#L38-62).

### ENVÍO Y RETORNO DE DATOS

1. Web/móvil → API: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L165-178) y [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L37-80); rutas receptoras: [urls.py](../../Backend/apps/pedidos/urls.py#L51-53).
2. API → base: crea orden y pedidos/ítems en [views.py](../../Backend/apps/pedidos/views.py#L553-590); verifica/descuenta stock en [views.py](../../Backend/apps/pedidos/views.py#L460-474).
3. API → cliente: inicio devuelve IDs y enlace PayPal en [views.py](../../Backend/apps/pedidos/views.py#L640-646); confirmación devuelve `aprobado` y `numeros_pedido` en [views.py](../../Backend/apps/pedidos/views.py#L699-703). Web los guarda y renderiza en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L181-195); móvil consume el resultado y retorna éxito a la pantalla anterior en [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L103-120).

### CORRESPONDENCIA CON EL DIAGRAMA

El catálogo usa AllowAny; las compras requieren el rol COMPRADOR. La relación WebSocket se indexa en el flujo web de live commerce.

<a id="c1-empresa"></a>

## Empresa — dueño del tenant

Dueño del negocio que autogestiona los datos asociados a su empresa y adquiere un plan del SaaS.

### FRONTEND

- Menú condicionado por empresa, permisos y plan: [AccountMenu.jsx](../../Frontend/frontend_web/src/components/layout/AccountMenu.jsx#L29-100); rutas de autogestión: [App.jsx](../../Frontend/frontend_web/src/App.jsx#L148-154).
- Productos: consulta y recibe la lista en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L49-75), crea/edita y recarga en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L126-148); imágenes: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L167-202).
- Empleados/permisos: [MisEmpleados.jsx](../../Frontend/frontend_web/src/pages/empresa/MisEmpleados.jsx#L30-40), [MisEmpleados.jsx](../../Frontend/frontend_web/src/pages/empresa/MisEmpleados.jsx#L54-90). Suscripción: consulta, respuesta y pago en [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L29-41), [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L73-96).
- Móvil: el perfil contiene empresa/rol mediante [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L39-46).

### BACKEND

- Rol `EMPRESA` y resolución del tenant: [models.py](../../Backend/apps/usuarios/models.py#L10-15), [models.py](../../Backend/apps/usuarios/models.py#L67-74); acceso exclusivo del dueño: [permissions.py](../../Backend/apps/usuarios/permissions.py#L26-31).
- Consulta/creación de productos fuerzan la empresa del usuario: [views.py](../../Backend/apps/catalogo/views.py#L250-280); edición verifica empresa y devuelve producto actualizado: [views.py](../../Backend/apps/catalogo/views.py#L292-298).
- Empleados: la creación/listado se restringen a la propia empresa en [views.py](../../Backend/apps/usuarios/views.py#L332-353). Plan: lectura retorna datos en [views.py](../../Backend/apps/suscripciones/views.py#L143-151); mejora captura pago y actualiza empresa/suscripción/factura en [views.py](../../Backend/apps/suscripciones/views.py#L204-259).

### BASE DE DATOS (si corresponde)

- `usuarios_empresa`: dueño `OneToOne`, NIT, slug, ubicación y FK al plan: [models.py](../../Backend/apps/usuarios/models.py#L166-190); creación del esquema: [Empresa — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L113-137).
- Productos y sucursales usan FK `empresa`: [models.py](../../Backend/apps/core/models.py#L25-38), [Producto — models.py](../../Backend/apps/catalogo/models.py#L22-57), [Sucursal — models.py](../../Backend/apps/inventario/models.py#L7-23). Personal y permisos: [Empleado — models.py](../../Backend/apps/usuarios/models.py#L200-218), [EmpleadoPermiso — models.py](../../Backend/apps/usuarios/models.py#L221-233).
- Planes, vigencia y facturación: [Plan — models.py](../../Backend/apps/suscripciones/models.py#L6-49), [Suscripcion — models.py](../../Backend/apps/suscripciones/models.py#L52-75), [Factura — models.py](../../Backend/apps/facturacion/models.py#L6-36).

### ENVÍO Y RETORNO DE DATOS

1. Crear producto: web envía en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L130-145) → ruta [urls.py](../../Backend/apps/catalogo/urls.py#L40-45) → vista fija `empresa` al guardar en [views.py](../../Backend/apps/catalogo/views.py#L277-280).
2. DRF serializa el alta con `ProductoEmpresaSerializer`: [views.py](../../Backend/apps/catalogo/views.py#L255-258), [serializers.py](../../Backend/apps/catalogo/serializers.py#L98-114). Web recibe el nuevo objeto en `setEditando(data)` y recarga la lista: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L144-148).
3. Mejorar plan: web envía `plan_id` y luego `paypal_order_id`: [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L73-85). Backend responde primero con el ID de PayPal en [views.py](../../Backend/apps/suscripciones/views.py#L183-194) y luego con plan/vencimiento en [views.py](../../Backend/apps/suscripciones/views.py#L257-259); web relee y actualiza estado en [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L29-38).

### CORRESPONDENCIA CON EL DIAGRAMA

Empresa es el equivalente de tenant; sus productos, personal, pedidos y suscripciones se relacionan mediante claves foráneas. Para inventario se referencia la API de empresa y la interfaz administrativa que sí existen en el código.

<a id="c1-empleado"></a>

## Empleado

Usuario vinculado a una empresa cuyo acceso operativo depende de permisos asignados por el dueño.

### FRONTEND

- La web comparte el panel de empresa y muestra acciones por códigos de permiso: [roles.js](../../Frontend/frontend_web/src/utils/roles.js#L15-16), [roles.js](../../Frontend/frontend_web/src/utils/roles.js#L30-36), [AccountMenu.jsx](../../Frontend/frontend_web/src/components/layout/AccountMenu.jsx#L29-84).
- Pedidos: consulta/recepción en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L40-51); PATCH de estado y reemplazo del objeto recibido en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L64-80).
- Móvil recibe el perfil con el mismo servicio de autenticación: [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L39-46).

### BACKEND

- `get_empresa()` obtiene la empresa a través de Empleado: [models.py](../../Backend/apps/usuarios/models.py#L67-74). `TienePermisoEmpleado` admite al dueño o consulta `empleado.permisos` por código: [permissions.py](../../Backend/apps/usuarios/permissions.py#L57-76).
- Catálogo exige `gestionar_productos`: [views.py](../../Backend/apps/catalogo/views.py#L250-261); pedidos exige `gestionar_pedidos` y filtra empresa: [views.py](../../Backend/apps/pedidos/views.py#L275-286); inventario exige `gestionar_inventario` y filtra sucursal de empresa: [views.py](../../Backend/apps/inventario/views.py#L151-172).
- El serializer devuelve los códigos de permiso al frontend: [serializers.py](../../Backend/apps/usuarios/serializers.py#L236-242). Actualización de pedido comprueba pertenencia y retorna serializer: [views.py](../../Backend/apps/pedidos/views.py#L296-305).

### BASE DE DATOS (si corresponde)

- `usuarios_empleado` enlaza usuario y empresa; `usuarios_empleadopermiso` enlaza empleado y permiso: [Empleado — models.py](../../Backend/apps/usuarios/models.py#L200-218), [EmpleadoPermiso — models.py](../../Backend/apps/usuarios/models.py#L221-233), [Permiso — models.py](../../Backend/apps/usuarios/models.py#L77-88); esquema en [Empleado — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L138-154), [EmpleadoPermiso — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L155-166).
- El producto puede guardar el empleado creador: [models.py](../../Backend/apps/catalogo/models.py#L31-33); pedidos e inventarios pertenecen a empresas/sucursales: [models.py](../../Backend/apps/pedidos/models.py#L118-129), [models.py](../../Backend/apps/inventario/models.py#L26-36).

### ENVÍO Y RETORNO DE DATOS

1. El perfil retorna rol, empresa, plan y permisos: [views.py](../../Backend/apps/usuarios/views.py#L530-544); campos y cálculo de permisos: [serializers.py](../../Backend/apps/usuarios/serializers.py#L198-242). La web recibe ese JSON y actualiza `usuario`: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L34-40); Flutter hace lo mismo y avisa a sus widgets: [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L39-46).
2. PATCH web de pedido: [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L64-80) → [urls.py](../../Backend/apps/pedidos/urls.py#L34-36) → control y modificación en [views.py](../../Backend/apps/pedidos/views.py#L296-305), [views.py](../../Backend/apps/pedidos/views.py#L209-232) → JSON definido en [serializers.py](../../Backend/apps/pedidos/serializers.py#L45-74) → web sustituye el pedido con `data` en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L66-67).

### CORRESPONDENCIA CON EL DIAGRAMA

El empleado comparte pantallas de autogestión de empresa; los códigos de permiso devueltos por el perfil determinan las opciones visibles y se verifican nuevamente en el backend.

<a id="c1-superadmin"></a>

## Super administrador

Administrador con facultades exclusivas sobre roles, planes, backups, notificaciones y bitácora, además de las funciones comunes del personal de plataforma.

### FRONTEND

- Identificación por rol y catálogo de navegación: [roles.js](../../Frontend/frontend_web/src/utils/roles.js#L4-10), [adminMenu.js](../../Frontend/frontend_web/src/config/adminMenu.js#L5-40). Roles: solicitud/recepción y edición de permisos: [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L16-33), [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L60-66).
- Backup: petición y descarga de blob: [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L52-72); restauración y mensaje recibido: [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L76-96). Bitácora envía llave y recibe resultados: [Bitacora.jsx](../../Frontend/frontend_web/src/pages/Bitacora.jsx#L87-108).
- Móvil tiene consultas administrativas: [admin_service.dart](../../Mobile/vecinomarket_app/lib/services/admin_service.dart#L6-33). Su consulta de bitácora no añade `X-Developer-Key`, por lo que ese método no cumple por sí solo todos los requisitos de la API.

### BACKEND

- `SUPERADMIN` se distingue de `ADMIN`: [models.py](../../Backend/apps/usuarios/models.py#L10-15), [permissions.py](../../Backend/apps/usuarios/permissions.py#L14-23). Roles y permisos de rol: [views.py](../../Backend/apps/usuarios/views.py#L927-966).
- Backup/restore solo SuperAdmin y respuesta descargable/JSON: [views.py](../../Backend/apps/core/views.py#L20-80). Bitácora exige SuperAdmin y llave: [views.py](../../Backend/apps/auditoria/views.py#L17-37), [permissions.py](../../Backend/apps/auditoria/permissions.py#L13-15).
- Dashboard global calcula y retorna ventas, comisiones y tops: [views.py](../../Backend/apps/reportes/views.py#L218-286); notificaciones administrativas: [views.py](../../Backend/apps/notificaciones/views.py#L64-94).

### BASE DE DATOS (si corresponde)

- Rol persistido en `usuarios_usuario`: [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74); migración que añade el quinto rol: [0003_rol_superadmin.py](../../Backend/apps/usuarios/migrations/0003_rol_superadmin.py#L24-39).
- Roles/permisos: [RolBase — models.py](../../Backend/apps/usuarios/models.py#L91-101), [RolBasePermiso — models.py](../../Backend/apps/usuarios/models.py#L104-114); auditoría/backups: [LogAuditoria — models.py](../../Backend/apps/auditoria/models.py#L6-29), [BackupLog — models.py](../../Backend/apps/core/models.py#L43-57); planes/suscripciones: [Plan — models.py](../../Backend/apps/suscripciones/models.py#L6-49), [Suscripcion — models.py](../../Backend/apps/suscripciones/models.py#L52-75).

### ENVÍO Y RETORNO DE DATOS

1. Roles: petición web [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L63-66) → rutas [urls.py](../../Backend/apps/usuarios/urls.py#L101-105) → inserta/quita relación y retorna rol en [views.py](../../Backend/apps/usuarios/views.py#L955-966) → formato [serializers.py](../../Backend/apps/usuarios/serializers.py#L547-558) → `setRoles` en [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L66).
2. Backup: web solicita blob en [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L57-67) → backend genera JSON, guarda registro/archivo y retorna `HttpResponse` con nombre en cabecera: [views.py](../../Backend/apps/core/views.py#L26-41) → web crea enlace de descarga en [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L58-65).

### CORRESPONDENCIA CON EL DIAGRAMA

SUPERADMIN es un valor de Usuario. La lectura de bitácora requiere, además, la cabecera X-Developer-Key.

<a id="c1-soporte"></a>

## Administrador de soporte

Personal de plataforma con rol ADMIN que atiende cuentas y solicitudes de empresas y consulta información de operación.

### FRONTEND

- `esStaff` incluye ADMIN; la pantalla de usuarios controla acceso, solicita la lista y recibe resultados: [roles.js](../../Frontend/frontend_web/src/utils/roles.js#L4-6), [Usuarios.jsx](../../Frontend/frontend_web/src/pages/admin/Usuarios.jsx#L56-82).
- Empresas/solicitudes: carga, aprobación y rechazo desde [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L101-137), [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L155-189). Móvil: lista usuarios/empresas y ejecuta bloqueo/suspensión en [admin_service.dart](../../Mobile/vecinomarket_app/lib/services/admin_service.dart#L13-33).

### BACKEND

- `EsAdmin` permite ADMIN o SUPERADMIN: [permissions.py](../../Backend/apps/usuarios/permissions.py#L4-11); consulta de usuarios y JSON vía serializer: [views.py](../../Backend/apps/usuarios/views.py#L608-630), [serializers.py](../../Backend/apps/usuarios/serializers.py#L198-210).
- Solicitudes: consulta en [views.py](../../Backend/apps/usuarios/views.py#L288-295) y decisión/respuesta en [views.py](../../Backend/apps/usuarios/views.py#L298-329); edición de usuarios devuelve perfil y bloquea edición de SuperAdmin por soporte: [views.py](../../Backend/apps/usuarios/views.py#L633-653).
- Reportes comunes del personal: [views.py](../../Backend/apps/reportes/views.py#L279-286). Las acciones exclusivas se distinguen con `EsSuperAdmin`: [permissions.py](../../Backend/apps/usuarios/permissions.py#L14-23).

### BASE DE DATOS (si corresponde)

- Usuarios, solicitudes y empresas: [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74), [SolicitudEmpresa — models.py](../../Backend/apps/usuarios/models.py#L117-155), [Empresa — models.py](../../Backend/apps/usuarios/models.py#L158-197). Aprobar crea Empresa, cambia rol y persiste decisión: [serializers.py](../../Backend/apps/usuarios/serializers.py#L88-105).
- La trazabilidad de la decisión se guarda en `auditoria_logauditoria`: helper [views.py](../../Backend/apps/usuarios/views.py#L67-76), modelo [LogAuditoria — models.py](../../Backend/apps/auditoria/models.py#L6-29).

### ENVÍO Y RETORNO DE DATOS

1. Web → backend: aprobación con `slug` en [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L155-171) → ruta [urls.py](../../Backend/apps/usuarios/urls.py#L64-66) → validación y guardado en [views.py](../../Backend/apps/usuarios/views.py#L301-309), [serializers.py](../../Backend/apps/usuarios/serializers.py#L88-103).
2. Backend retorna `id` y `slug` en [views.py](../../Backend/apps/usuarios/views.py#L312); la web espera el éxito del POST y retira la solicitud del estado local en [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L165-167). No utiliza esos campos del cuerpo de respuesta; la consulta general de empresas y recepción de su lista se realiza en [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L104-116).

### CORRESPONDENCIA CON EL DIAGRAMA

El actor Administrador de soporte se corresponde con Usuario.rol = ADMIN y las vistas protegidas por EsAdmin.

<a id="c1-sistema"></a>

## VecinoMarket — sistema SaaS multiempresa

Límite del sistema que agrupa clientes web/móvil, backend y persistencia compartida de distintos negocios.

### FRONTEND

- Web monta autenticación, carrito, catálogo y notificaciones: [main.jsx](../../Frontend/frontend_web/src/main.jsx#L13-31); rutas públicas y de administración en [App.jsx](../../Frontend/frontend_web/src/App.jsx#L89-157). Móvil monta AuthService/CartService y HomeScreen en [main.dart](../../Mobile/vecinomarket_app/lib/main.dart#L17-22), [main.dart](../../Mobile/vecinomarket_app/lib/main.dart#L79-81).

### BACKEND

- Módulos habilitados: [base.py](../../Backend/config/settings/base.py#L46-58); familias de API en [urls.py](../../Backend/config/urls.py#L8-20). Empresa del usuario: [models.py](../../Backend/apps/usuarios/models.py#L67-74); FK del tenant: [models.py](../../Backend/apps/core/models.py#L25-38).

### BASE DE DATOS (si corresponde)

- Mismo esquema con claves foráneas: [Empresa — models.py](../../Backend/apps/usuarios/models.py#L158-197), [Producto — models.py](../../Backend/apps/catalogo/models.py#L22-57), [Pedido — models.py](../../Backend/apps/pedidos/models.py#L105-151). Fijación/filtrado por empresa se aplica expresamente en [views.py](../../Backend/apps/catalogo/views.py#L260-280).

### ENVÍO Y RETORNO DE DATOS

1. Petición central web/móvil y JWT: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-20), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L33-95) → router [urls.py](../../Backend/config/urls.py#L8-20) → ejemplo ORM y serializer [views.py](../../Backend/apps/catalogo/views.py#L37-83), [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71) → recepción web/móvil [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L48-54), [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L17-19).

### CORRESPONDENCIA CON EL DIAGRAMA

La pertenencia empresarial se comprueba mediante get_empresa() y los filtros de las vistas citadas; del_tenant() proporciona el filtro explícito del manager.

<a id="c1-db"></a>

## Base de datos PostgreSQL + PostGIS

Persistencia relacional compartida de usuarios, empresas, productos, inventario, compras, comunicación y administración; PostGIS guarda puntos geográficos.

### FRONTEND

- Web y móvil acceden mediante API, no mediante SQL: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-20), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L33-44), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L68-95).

### BACKEND

- Django lee `DATABASE_URL` y configura el motor PostGIS: [base.py](../../Backend/config/settings/base.py#L94-100). Aislamiento compartido por FK/manager: [models.py](../../Backend/apps/core/models.py#L15-38); ejemplo de filtro real en [views.py](../../Backend/apps/catalogo/views.py#L260-280).
- Ejemplo de ida y retorno SQL: `SELECT fn_ajustar_stock` y `fetchone()[0]` en [views.py](../../Backend/apps/inventario/views.py#L205-219); ejemplo de ORM y serialización de producto: [views.py](../../Backend/apps/catalogo/views.py#L37-43), [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71).

### BASE DE DATOS (si corresponde)

- PostGIS se habilita antes de los modelos geográficos: [0000_postgis_extension.py](../../Backend/apps/core/migrations/0000_postgis_extension.py#L17-21). Creación de la BD local y permisos del rol: [01_crear_base_datos.sql](../../Backend/basedatos/01_crear_base_datos.sql#L9-27).
- Tablas/fuentes de esquema: usuarios y empresa [Usuario — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L50-76), [Empresa — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L113-137); catálogo [Producto — 0001_initial.py](../../Backend/apps/catalogo/migrations/0001_initial.py#L58-77); inventario [InventarioSucursal — 0001_initial.py](../../Backend/apps/inventario/migrations/0001_initial.py#L35-48); pedidos/ítems [Pedido — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L84-101), [PedidoItem — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L102-114).
- `id` utiliza `BigAutoField`: [base.py](../../Backend/config/settings/base.py#L154), [0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L51-54). Funciones/trigger de stock: [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L13-51).

### ENVÍO Y RETORNO DE DATOS

1. Cliente pide productos en [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L43-49) → vista consulta y agrega stock en [views.py](../../Backend/apps/catalogo/views.py#L37-77) → serializer define JSON en [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71) → adaptador web retorna objetos en [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L14-35), [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L48-49).
2. Actualización SQL: backend ejecuta función en [views.py](../../Backend/apps/inventario/views.py#L209-211) → PostgreSQL actualiza y retorna cantidad en [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L18-31) → backend relee registro y responde JSON en [views.py](../../Backend/apps/inventario/views.py#L215-219).

### CORRESPONDENCIA CON EL DIAGRAMA

La relación congruente con PostgreSQL/Supabase es DATABASE_URL y el motor PostGIS. El puerto lo determina esa URL (5432 en el ejemplo). Los modelos y migraciones referenciados describen las tablas implementadas.

<a id="c1-paypal"></a>

## PayPal

Servicio externo para aprobar/capturar pagos y guardar tokens de cuentas en Vault; también se usa para adquirir o mejorar planes.

### FRONTEND

- Web carga SDK según sandbox/live: [paypal.js](../../Frontend/frontend_web/src/utils/paypal.js#L17-39); crea sesión y procesa callback `onApprove`: [PayPalCheckoutButton.jsx](../../Frontend/frontend_web/src/components/pagos/PayPalCheckoutButton.jsx#L35-59), [PayPalCheckoutButton.jsx](../../Frontend/frontend_web/src/components/pagos/PayPalCheckoutButton.jsx#L75-80).
- Web solicita orden y captura a su backend: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L164-178); móvil envía `plataforma: movil`: [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L33-45), carga enlace en WebView y observa retorno: [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L50-95).

### BACKEND

- Wrapper REST obtiene token OAuth, llama API y retorna JSON al llamador: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L35-72). Órdenes/captura: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L125-154); Vault: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L75-122).
- Checkout llama al wrapper y retorna IDs/enlace al cliente: [views.py](../../Backend/apps/pedidos/views.py#L618-646). Captura recibe resultado PayPal, persiste estados/pago y retorna confirmación: [views.py](../../Backend/apps/pedidos/views.py#L666-703).
- Planes usan los mismos cobros: [views.py](../../Backend/apps/suscripciones/views.py#L183-194), [views.py](../../Backend/apps/suscripciones/views.py#L214-259); selección del host REST: [base.py](../../Backend/config/settings/base.py#L282-286).

### BASE DE DATOS (si corresponde)

- Orden/pago local y referencia de pasarela: [models.py](../../Backend/apps/pedidos/models.py#L54-68), [models.py](../../Backend/apps/pedidos/models.py#L86-98); tablas [OrdenCompra — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L53-68), [Pago — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L69-83).
- Al mejorar plan se actualizan Suscripcion y Empresa y se crea Factura: [views.py](../../Backend/apps/suscripciones/views.py#L228-249). Los métodos guardados del comprador se consultan en Vault de PayPal, no en una tabla local de números de tarjeta.

### ENVÍO Y RETORNO DE DATOS

1. Web obtiene `paypal_order_id` de [views.py](../../Backend/apps/pedidos/views.py#L640-646) en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L165-171) y lo entrega a la sesión SDK: [PayPalCheckoutButton.jsx](../../Frontend/frontend_web/src/components/pagos/PayPalCheckoutButton.jsx#L80).
2. Al aprobar, web llama confirmación: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L174-178) → backend captura: [views.py](../../Backend/apps/pedidos/views.py#L666-679) → wrapper retorna JSON PayPal desde [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L65-72).
3. Backend registra pago y retorna `aprobado`: [views.py](../../Backend/apps/pedidos/views.py#L681-703) → web renderiza números: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L181-195); móvil confirma y retorna éxito a su pantalla: [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L103-120).

### CORRESPONDENCIA CON EL DIAGRAMA

Se indexa el flujo de aprobación PayPal que existe en ambos clientes: popup web y pantalla de pago móvil. La adquisición de planes utiliza el mismo wrapper de órdenes/captura y registra la vigencia local.

<a id="c1-google"></a>

## Google Identity / Google Auth API

Proveedor de identidad que entrega un ID token; VecinoMarket lo verifica y emite sus propios JWT.

### FRONTEND

- Web carga GIS y recibe `respuesta.credential` mediante callback: [GoogleSignInButton.jsx](../../Frontend/frontend_web/src/components/auth/GoogleSignInButton.jsx#L6-19), [GoogleSignInButton.jsx](../../Frontend/frontend_web/src/components/auth/GoogleSignInButton.jsx#L32-46); envía token y recibe perfil/tokens: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L51-57).
- Móvil usa google_sign_in, extrae ID token, lo envía y recibe JWT/perfil: [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L70-84).

### BACKEND

- Ruta social: [urls.py](../../Backend/apps/usuarios/urls.py#L53). Verificación de firma/audiencia y correo verificado: [serializers.py](../../Backend/apps/usuarios/serializers.py#L586-597); búsqueda/alta de comprador y retorno al llamador: [serializers.py](../../Backend/apps/usuarios/serializers.py#L599-616).
- La vista consume el usuario retornado y responde con `refresh`, `access`, `nuevo`: [views.py](../../Backend/apps/usuarios/views.py#L150-167). El perfil posterior retorna UsuarioSerializer: [views.py](../../Backend/apps/usuarios/views.py#L533-534).

### BASE DE DATOS (si corresponde)

- Si el email no existe se crean Usuario y Comprador: [serializers.py](../../Backend/apps/usuarios/serializers.py#L602-613), [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74), [Comprador — models.py](../../Backend/apps/usuarios/models.py#L236-248). Login/registro social escribe LogAuditoria en [views.py](../../Backend/apps/usuarios/views.py#L160-161). No hay una base de Google copiada dentro del proyecto.

### ENVÍO Y RETORNO DE DATOS

1. Google → frontend: callback GIS en [GoogleSignInButton.jsx](../../Frontend/frontend_web/src/components/auth/GoogleSignInButton.jsx#L35-38) o token nativo en [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L71-76) → POST de credential en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L52), [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L81).
2. Backend verifica y obtiene usuario: [serializers.py](../../Backend/apps/usuarios/serializers.py#L586-616) → emite JWT en [views.py](../../Backend/apps/usuarios/views.py#L158-167) → clientes guardan tokens, piden perfil y actualizan estado en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L53-57), [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L82-84).

### CORRESPONDENCIA CON EL DIAGRAMA

Este proveedor no sustituye los permisos locales. El rol y la empresa se leen de Usuario/Empresa/Empleado después de validar la identidad.

<a id="c1-gmail"></a>

## Gmail API

Backend de correo Django para enviar credenciales de empresa y enlaces de recuperación mediante HTTPS/OAuth2 cuando está configurado.

### FRONTEND

- Web ofrece recuperación en las rutas [App.jsx](../../Frontend/frontend_web/src/App.jsx#L98-99). El envío al endpoint y el mensaje de resultado se implementan en [ForgotPassword.jsx](../../Frontend/frontend_web/src/pages/ForgotPassword.jsx#L12-24); la confirmación en [ResetPassword.jsx](../../Frontend/frontend_web/src/pages/ResetPassword.jsx#L33-50). La web no contacta directamente Gmail ni recibe su respuesta HTTP.

### BACKEND

- Selección Gmail/SMTP/consola por variables: [base.py](../../Backend/config/settings/base.py#L222-237). Gmail intercambia refresh token por access token y lo devuelve al backend de correo: [gmail_email_backend.py](../../Backend/apps/core/gmail_email_backend.py#L22-39).
- Envío de MIME codificado al endpoint de Gmail y manejo de error: [gmail_email_backend.py](../../Backend/apps/core/gmail_email_backend.py#L57-71); retorno interno del número de mensajes enviados: [gmail_email_backend.py](../../Backend/apps/core/gmail_email_backend.py#L46-55).
- Credenciales de empresa: `send_mail` y retorno del servicio en [services.py](../../Backend/apps/usuarios/services.py#L90-111); reset genera enlace/envía en [serializers.py](../../Backend/apps/usuarios/serializers.py#L375-410); vista retorna mensaje HTTP en [views.py](../../Backend/apps/usuarios/views.py#L558-568).

### BASE DE DATOS (si corresponde)

- Se consulta la identidad y correo de recuperación de Usuario: [models.py](../../Backend/apps/usuarios/models.py#L22-31), [serializers.py](../../Backend/apps/usuarios/serializers.py#L384-410). No hay una tabla local que almacene la bandeja de Gmail ni el contenido de todos los correos enviados.

### ENVÍO Y RETORNO DE DATOS

1. Frontend → API de reset: [ForgotPassword.jsx](../../Frontend/frontend_web/src/pages/ForgotPassword.jsx#L17-18) → rutas [urls.py](../../Backend/apps/usuarios/urls.py#L58-59) → serializer consulta usuario y envía correo: [serializers.py](../../Backend/apps/usuarios/serializers.py#L384-410).
2. Gmail → backend: su respuesta se valida en [gmail_email_backend.py](../../Backend/apps/core/gmail_email_backend.py#L64-71); `send_messages()` retorna un contador en [gmail_email_backend.py](../../Backend/apps/core/gmail_email_backend.py#L46-55). El cliente recibe el mensaje propio de la vista en [views.py](../../Backend/apps/usuarios/views.py#L563-568), no el JSON crudo de Gmail.

### CORRESPONDENCIA CON EL DIAGRAMA

La integración representada se corresponde con GmailApiBackend. Su selección depende de las variables GMAIL_API_*; base.py también declara las alternativas SMTP y consola.

<a id="c1-cloudinary"></a>

## Cloudinary

Almacenamiento externo de archivos: imágenes de productos, QR, comprobantes, multimedia de chat, grabaciones y respaldos.

### FRONTEND

- Web sube FormData y recibe el objeto imagen: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L178-190); usa URLs de la API en [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L27-30). Chat envía archivo y renderiza imagen/audio/video de la URL retornada: [ChatThread.jsx](../../Frontend/frontend_web/src/components/chat/ChatThread.jsx#L48-79).
- Móvil hace multipart sin conocer la API secret de Cloudinary: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L155-180); extrae las URLs del JSON de productos: [producto.dart](../../Mobile/vecinomarket_app/lib/models/producto.dart#L39-58).

### BACKEND

- Credenciales por variables y elección del storage: [base.py](../../Backend/config/settings/base.py#L135-152). Upload de producto con verificación de tenant y respuesta: [views.py](../../Backend/apps/catalogo/views.py#L324-335); URL efectiva serializada en [serializers.py](../../Backend/apps/catalogo/serializers.py#L39-56).
- Chat tiene storage multimedia: [models.py](../../Backend/apps/comunicacion/models.py#L8-15), [storage.py](../../Backend/apps/comunicacion/storage.py#L1-10); guarda mensaje y archivo en [views.py](../../Backend/apps/comunicacion/views.py#L127-133), retorna URL mediante [serializers.py](../../Backend/apps/comunicacion/serializers.py#L31-38).
- QR: [models.py](../../Backend/apps/facturacion/models.py#L67-104); grabación: [views.py](../../Backend/apps/promociones/views.py#L315-351); respaldo usa RawMediaCloudinaryStorage: [models.py](../../Backend/apps/core/models.py#L41-51), [views.py](../../Backend/apps/core/views.py#L35-41).

### BASE DE DATOS (si corresponde)

- `catalogo_productoimagen` almacena nombre/ruta de archivo o URL externa y orden, no los bytes: [models.py](../../Backend/apps/catalogo/models.py#L60-79), [ProductoImagen — 0001_initial.py](../../Backend/apps/catalogo/migrations/0001_initial.py#L15-27).
- Referencias a chat, QR y backups: [ChatMensaje — models.py](../../Backend/apps/comunicacion/models.py#L38-62), [MetodoPago — models.py](../../Backend/apps/facturacion/models.py#L67-107), [BackupLog — models.py](../../Backend/apps/core/models.py#L43-57). Los bytes remotos son responsabilidad del storage; PostgreSQL conserva las referencias.

### ENVÍO Y RETORNO DE DATOS

1. Web archivo → backend en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L184-189) → `ProductoImagen.objects.create(archivo=...)` en [views.py](../../Backend/apps/catalogo/views.py#L326-334) → el `ImageField` y STORAGES suben/resuelven el archivo: [models.py](../../Backend/apps/catalogo/models.py#L65-79), [base.py](../../Backend/config/settings/base.py#L145-150).
2. Storage URL → serializer: [serializers.py](../../Backend/apps/catalogo/serializers.py#L48-56) → HTTP 201 con id/url/orden en [views.py](../../Backend/apps/catalogo/views.py#L335) → frontend incorpora `data` en `imagenes`: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L190).

### CORRESPONDENCIA CON EL DIAGRAMA

No existe subida directa desde los clientes con las credenciales secretas. El almacenamiento de imágenes cae a disco si faltan las variables indicadas; BackupLog declara su storage de Cloudinary explícitamente. Un respaldo JSON de Django guarda referencias a multimedia, no copia automáticamente los bytes de todas las imágenes.

<a id="c1-hf"></a>

## Hugging Face

Servicio de clasificación de imagen usado para sugerir una categoría existente del catálogo; la decisión de aplicar la sugerencia queda en la interfaz.

### FRONTEND

- Web POST de sugerencia y recepción en estado: [SugerenciaCategoriaIA.jsx](../../Frontend/frontend_web/src/components/admin/SugerenciaCategoriaIA.jsx#L10-21); muestra categoría/confianza y entrega el ID a `onAplicar`: [SugerenciaCategoriaIA.jsx](../../Frontend/frontend_web/src/components/admin/SugerenciaCategoriaIA.jsx#L43-60). La interfaz de sugerencias indexada corresponde a la web.

### BACKEND

- Descarga la imagen y llama a inferencia con bytes: [ia.py](../../Backend/apps/catalogo/ia.py#L89-125); mapea etiquetas a categorías y retorna resultado interno: [ia.py](../../Backend/apps/catalogo/ia.py#L144-172).
- La vista obtiene imagen/categorías, llama helper, registra log y responde JSON: [views.py](../../Backend/apps/catalogo/views.py#L388-424). Autogestión exige permiso, plan y pertenencia del producto: [views.py](../../Backend/apps/catalogo/views.py#L441-453).

### BASE DE DATOS (si corresponde)

- Consulta Categoria y ProductoImagen en [views.py](../../Backend/apps/catalogo/views.py#L389-399); guarda `catalogo_categorizacionialog` en [views.py](../../Backend/apps/catalogo/views.py#L409-410), modelo [CategorizacionIALog — models.py](../../Backend/apps/catalogo/models.py#L82-97). La sugerencia no cambia la FK categoria del producto de forma automática.

### ENVÍO Y RETORNO DE DATOS

1. Web solicita en [SugerenciaCategoriaIA.jsx](../../Frontend/frontend_web/src/components/admin/SugerenciaCategoriaIA.jsx#L15-16) → rutas [urls.py](../../Backend/apps/catalogo/urls.py#L45-48) → helper llama HF en [ia.py](../../Backend/apps/catalogo/ia.py#L107-125).
2. HF devuelve etiquetas → helper devuelve categoría/confianza en [ia.py](../../Backend/apps/catalogo/ia.py#L165-172) → vista transforma y retorna JSON en [views.py](../../Backend/apps/catalogo/views.py#L416-424) → web muestra y permite aplicar en [SugerenciaCategoriaIA.jsx](../../Frontend/frontend_web/src/components/admin/SugerenciaCategoriaIA.jsx#L43-55).

### CORRESPONDENCIA CON EL DIAGRAMA

La responsabilidad congruente con Hugging Face es la clasificación de imágenes y sugerencia de categoría.

<a id="c1-osm"></a>

## OpenStreetMap

Proveedor de mapas para elegir coordenadas de entrega; la ubicación elegida se persiste como punto PostGIS.

### FRONTEND

- Web solicita teselas HTTPS desde TileLayer y recibe clics del selector: [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L248-255), [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L1-38). Envía `lat` y `lon` en [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L106-118); recibe lista en [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L47-56).
- Móvil carga teselas OSM en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L412) y recibe coordenadas del mapa en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L372-386). Consulta Nominatim y usa el JSON para completar la dirección en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L517-540); envía las coordenadas en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L559-577) y recibe las direcciones guardadas en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L27-38).

### BACKEND

- No hace de proxy para las teselas OSM. Recibe coordenadas mediante DireccionSerializer, crea/actualiza un Point y serializa latitud/longitud: [serializers.py](../../Backend/apps/usuarios/serializers.py#L619-654). Rutas: [urls.py](../../Backend/apps/usuarios/urls.py#L107-109); listado/creación con comprador autenticado: [views.py](../../Backend/apps/usuarios/views.py#L969-984).

### BASE DE DATOS (si corresponde)

- `usuarios_direccion.ubicacion` es PointField geográfico SRID 4326: [models.py](../../Backend/apps/usuarios/models.py#L251-258); migración del campo y FK a comprador: [Direccion — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L93-112); extensión [0000_postgis_extension.py](../../Backend/apps/core/migrations/0000_postgis_extension.py#L17-21).

### ENVÍO Y RETORNO DE DATOS

1. OSM → navegador: `TileLayer` solicita las teselas en [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L250-253); esa respuesta es una imagen del mapa, no un JSON generado por Django.
2. Selección → backend: payload lat/lon en [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L110-115) → Point `(lon, lat)` guardado en [serializers.py](../../Backend/apps/usuarios/serializers.py#L643-654).
3. Lectura → frontend: queryset de direcciones propias en [views.py](../../Backend/apps/usuarios/views.py#L978-979) y campos en [serializers.py](../../Backend/apps/usuarios/serializers.py#L630-641) → web recibe/guarda lista en [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L49-56); móvil hace lo mismo en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L33-37).

### CORRESPONDENCIA CON EL DIAGRAMA

OSM no es la base de datos de las direcciones personales: provee cartografía; el proyecto persiste las coordenadas en PostgreSQL/PostGIS.

<a id="c1-render"></a>

## Render — configuración de despliegue del backend

Proveedor de nube indicado en las imágenes; el repositorio contiene una receta de despliegue Docker para el backend.

### FRONTEND

- Web elige backend mediante `VITE_API_URL`: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-5); el valor por defecto es local. Móvil configura la base de API mediante API_URL: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L12-16). No hay una llamada de negocio a la API administrativa de Render.

### BACKEND

- Servicio Docker, variables y modo sandbox: [render.yaml](../../Backend/render.yaml#L7-33), [render.yaml](../../Backend/render.yaml#L71-77); imagen y comando inicial: [Dockerfile](../../Backend/Dockerfile#L1-31). Arranque ejecuta migraciones/collectstatic y Daphne: [start.sh](../../Backend/start.sh#L4-10).
- Settings de producción agregan hostname Render y configuran proxy/TLS: [prod.py](../../Backend/config/settings/prod.py#L8-28); ASGI enruta HTTP y WS: [asgi.py](../../Backend/config/asgi.py#L19-22).

### BASE DE DATOS (si corresponde)

- El blueprint declara conexión PostgreSQL: [render.yaml](../../Backend/render.yaml#L1-5), [render.yaml](../../Backend/render.yaml#L14-17). La conexión del backend la decide DATABASE_URL en [base.py](../../Backend/config/settings/base.py#L94-100).

### ENVÍO Y RETORNO DE DATOS

1. En esta receta, Docker → start.sh → Daphne: [Dockerfile](../../Backend/Dockerfile#L23-31), [start.sh](../../Backend/start.sh#L4-10); Daphne entrega HTTP/WS a ASGI: [asgi.py](../../Backend/config/asgi.py#L19-22).
2. Las respuestas al cliente siguen los handlers REST/WS (por ejemplo [views.py](../../Backend/apps/pedidos/views.py#L640-646), [consumers.py](../../Backend/apps/promociones/consumers.py#L111-114)); Render no agrega un retorno de negocio definido en el repositorio.

### CORRESPONDENCIA CON EL DIAGRAMA

La correspondencia se limita a Dockerfile, start.sh, render.yaml y settings de producción presentes en el código.

<a id="c1-vercel"></a>

## Vercel — configuración de despliegue del frontend

Proveedor indicado para servir la SPA React; la configuración local contiene las reescrituras de rutas.

### FRONTEND

- Reescribe rutas a index.html: [vercel.json](../../Frontend/frontend_web/vercel.json#L1-8); compilación Vite y dependencias React: [package.json](../../Frontend/frontend_web/package.json#L6-21); plugins: [vite.config.js](../../Frontend/frontend_web/vite.config.js#L1-8). Montaje de SPA/providers: [main.jsx](../../Frontend/frontend_web/src/main.jsx#L13-31).
- La URL backend se incorpora por `VITE_API_URL` en [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-5); rutas del cliente: [App.jsx](../../Frontend/frontend_web/src/App.jsx#L89-102).

### BACKEND

- El backend admite orígenes y proxy HTTPS mediante [prod.py](../../Backend/config/settings/prod.py#L14-28); FRONTEND_URL arma enlaces de correo en [base.py](../../Backend/config/settings/base.py#L241-243). No existe un módulo Python de negocio que invoque Vercel.

### BASE DE DATOS (si corresponde)

- No hay tabla Vercel. La SPA consulta los datos por el backend; el proveedor de alojamiento está fuera del esquema relacional.

### ENVÍO Y RETORNO DE DATOS

1. Navegador solicita ruta → regla SPA de [vercel.json](../../Frontend/frontend_web/vercel.json#L2-6) → React monta [main.jsx](../../Frontend/frontend_web/src/main.jsx#L13-31) → cliente consulta API [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L38-54) → respuesta JSON se adapta en [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L14-35).

### CORRESPONDENCIA CON EL DIAGRAMA

La correspondencia con Vercel está en vercel.json y el build estático Vite del frontend.

<a id="c1-transporte"></a>

## Relaciones HTTPS y WebSockets

Las líneas del diagrama representan transportes distintos: REST para datos; WebSocket para señalización de sesiones de video.

### FRONTEND

- HTTP web: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-20); móvil HTTPS por defecto: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L12-16). Construcción ws/wss desde URL API: [liveSignaling.js](../../Frontend/frontend_web/src/utils/liveSignaling.js#L4-14); conexión viewer y recepción: [LiveViewer.jsx](../../Frontend/frontend_web/src/pages/LiveViewer.jsx#L50-103); broadcaster: [TransmitirLive.jsx](../../Frontend/frontend_web/src/pages/empresa/TransmitirLive.jsx#L55-118).
- Chat usa GET cada 2 segundos: [ChatThread.jsx](../../Frontend/frontend_web/src/components/chat/ChatThread.jsx#L5-24); notificaciones usan polling cada 30 segundos: [NotificacionesContext.jsx](../../Frontend/frontend_web/src/context/NotificacionesContext.jsx#L6-29).

### BACKEND

- HTTP y WS se separan en ASGI: [asgi.py](../../Backend/config/asgi.py#L19-22); ruta WS: [routing.py](../../Backend/apps/promociones/routing.py#L5-7). Consumer acepta conexión, recibe/reenvía payload y lo devuelve al socket destino en [consumers.py](../../Backend/apps/promociones/consumers.py#L47-71), [consumers.py](../../Backend/apps/promociones/consumers.py#L93-114); autenticación del emisor en [consumers.py](../../Backend/apps/promociones/consumers.py#L126-150).

### BASE DE DATOS (si corresponde)

- Metadata de live y comentarios persistidos: [LiveCommerceSesion — models.py](../../Backend/apps/promociones/models.py#L66-102), [ComentarioLive — models.py](../../Backend/apps/promociones/models.py#L115-132). Los payloads de señalización se retransmiten por Channels en memoria: [base.py](../../Backend/config/settings/base.py#L159-167), [consumers.py](../../Backend/apps/promociones/consumers.py#L103-114); no existe tabla para cada paquete ICE/SDP.

### ENVÍO Y RETORNO DE DATOS

1. WebSocket recibe JSON en `receive()` y reenvía al canal `to`: [consumers.py](../../Backend/apps/promociones/consumers.py#L93-109); `live_relay()` envía JSON al frontend en [consumers.py](../../Backend/apps/promociones/consumers.py#L111-114); viewer procesa `offer`/ICE en [LiveViewer.jsx](../../Frontend/frontend_web/src/pages/LiveViewer.jsx#L53-103).

### CORRESPONDENCIA CON EL DIAGRAMA

La relación WebSocket se indexa en live commerce. El video web viaja por WebRTC entre peers; el WebSocket transporta la señalización de esa sesión.

<a id="contenedores"></a>

# DIAGRAMA DE CONTENEDORES

**Elementos de este diagrama:**

- [Comprador](#c2-comprador)
- [Empresa — dueño del tenant](#c2-empresa)
- [Empleado](#c2-empleado)
- [Super administrador](#c2-superadmin)
- [Administrador de soporte](#c2-soporte)
- [Aplicación web — React + Vite](#c2-web)
- [Aplicación móvil — Flutter](#c2-mobile)
- [Backend API — Django REST Framework + Channels](#c2-backend)
- [Base de datos PostgreSQL + PostGIS](#c2-db)
- [PayPal](#c2-paypal)
- [Google Identity / Google Auth API](#c2-google)
- [Gmail API](#c2-gmail)
- [Cloudinary](#c2-cloudinary)
- [Hugging Face](#c2-hf)
- [OpenStreetMap](#c2-osm)
- [Render — configuración de despliegue del backend](#c2-render)
- [Vercel — configuración de despliegue del frontend](#c2-vercel)
- [VecinoMarket — límite del sistema](#c2-limite)

## Breve Descripción

El nivel 2 distribuye VecinoMarket en Aplicación Web, Aplicación Móvil, Backend API y Base de datos. Los cinco actores se conectan a sus interfaces; el backend concentra persistencia y servicios externos. Los proveedores de mapas, identidad, pagos y alojamiento se indexan mediante sus archivos de integración/configuración.

<a id="c2-comprador"></a>

## Comprador

Persona que explora productos de distintas empresas, compra, elige entrega y conversa con el vendedor. [Trazabilidad funcional completa](#c1-comprador).

### FRONTEND

- Web: rutas de catálogo, carrito, checkout y compras: [App.jsx](../../Frontend/frontend_web/src/App.jsx#L91-95), [App.jsx](../../Frontend/frontend_web/src/App.jsx#L117-125). Peticiones y adaptación de productos: [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L14-54); recepción del detalle: [ProductDetail.jsx](../../Frontend/frontend_web/src/pages/ProductDetail.jsx#L37-42).
- Compra: construye `items` y `entregas` en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L88-100), envía pago y confirmación en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L144-178), recibe números de pedido y los muestra en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L181-195).

### BACKEND

- Identifica el rol `COMPRADOR`: [models.py](../../Backend/apps/usuarios/models.py#L10-15); autoriza acciones del comprador en [permissions.py](../../Backend/apps/usuarios/permissions.py#L47-54).
- Catálogo público: consulta con stock agregado en [views.py](../../Backend/apps/catalogo/views.py#L37-83) y devuelve campos mediante [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71).

### BASE DE DATOS (si corresponde)

- Identidad y direcciones separadas: [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74), [Comprador — models.py](../../Backend/apps/usuarios/models.py#L236-248), [Direccion — models.py](../../Backend/apps/usuarios/models.py#L251-265); tablas `usuarios_usuario`, `usuarios_comprador`, `usuarios_direccion`: [Comprador — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L77-92), [Direccion — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L93-112).

### ENVÍO Y RETORNO DE DATOS

1. API → cliente: inicio devuelve IDs y enlace PayPal en [views.py](../../Backend/apps/pedidos/views.py#L640-646); confirmación devuelve `aprobado` y `numeros_pedido` en [views.py](../../Backend/apps/pedidos/views.py#L699-703). Web los guarda y renderiza en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L181-195); móvil consume el resultado y retorna éxito a la pantalla anterior en [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L103-120).

<a id="c2-empresa"></a>

## Empresa — dueño del tenant

Dueño del negocio que autogestiona los datos asociados a su empresa y adquiere un plan del SaaS. [Trazabilidad funcional completa](#c1-empresa).

### FRONTEND

- Menú condicionado por empresa, permisos y plan: [AccountMenu.jsx](../../Frontend/frontend_web/src/components/layout/AccountMenu.jsx#L29-100); rutas de autogestión: [App.jsx](../../Frontend/frontend_web/src/App.jsx#L148-154).
- Productos: consulta y recibe la lista en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L49-75), crea/edita y recarga en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L126-148); imágenes: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L167-202).

### BACKEND

- Rol `EMPRESA` y resolución del tenant: [models.py](../../Backend/apps/usuarios/models.py#L10-15), [models.py](../../Backend/apps/usuarios/models.py#L67-74); acceso exclusivo del dueño: [permissions.py](../../Backend/apps/usuarios/permissions.py#L26-31).
- Consulta/creación de productos fuerzan la empresa del usuario: [views.py](../../Backend/apps/catalogo/views.py#L250-280); edición verifica empresa y devuelve producto actualizado: [views.py](../../Backend/apps/catalogo/views.py#L292-298).

### BASE DE DATOS (si corresponde)

- `usuarios_empresa`: dueño `OneToOne`, NIT, slug, ubicación y FK al plan: [models.py](../../Backend/apps/usuarios/models.py#L166-190); creación del esquema: [Empresa — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L113-137).

### ENVÍO Y RETORNO DE DATOS

1. Mejorar plan: web envía `plan_id` y luego `paypal_order_id`: [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L73-85). Backend responde primero con el ID de PayPal en [views.py](../../Backend/apps/suscripciones/views.py#L183-194) y luego con plan/vencimiento en [views.py](../../Backend/apps/suscripciones/views.py#L257-259); web relee y actualiza estado en [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L29-38).

<a id="c2-empleado"></a>

## Empleado

Usuario vinculado a una empresa cuyo acceso operativo depende de permisos asignados por el dueño. [Trazabilidad funcional completa](#c1-empleado).

### FRONTEND

- La web comparte el panel de empresa y muestra acciones por códigos de permiso: [roles.js](../../Frontend/frontend_web/src/utils/roles.js#L15-16), [roles.js](../../Frontend/frontend_web/src/utils/roles.js#L30-36), [AccountMenu.jsx](../../Frontend/frontend_web/src/components/layout/AccountMenu.jsx#L29-84).
- Pedidos: consulta/recepción en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L40-51); PATCH de estado y reemplazo del objeto recibido en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L64-80).

### BACKEND

- `get_empresa()` obtiene la empresa a través de Empleado: [models.py](../../Backend/apps/usuarios/models.py#L67-74). `TienePermisoEmpleado` admite al dueño o consulta `empleado.permisos` por código: [permissions.py](../../Backend/apps/usuarios/permissions.py#L57-76).
- Catálogo exige `gestionar_productos`: [views.py](../../Backend/apps/catalogo/views.py#L250-261); pedidos exige `gestionar_pedidos` y filtra empresa: [views.py](../../Backend/apps/pedidos/views.py#L275-286); inventario exige `gestionar_inventario` y filtra sucursal de empresa: [views.py](../../Backend/apps/inventario/views.py#L151-172).

### BASE DE DATOS (si corresponde)

- `usuarios_empleado` enlaza usuario y empresa; `usuarios_empleadopermiso` enlaza empleado y permiso: [Empleado — models.py](../../Backend/apps/usuarios/models.py#L200-218), [EmpleadoPermiso — models.py](../../Backend/apps/usuarios/models.py#L221-233), [Permiso — models.py](../../Backend/apps/usuarios/models.py#L77-88); esquema en [Empleado — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L138-154), [EmpleadoPermiso — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L155-166).

### ENVÍO Y RETORNO DE DATOS

1. PATCH web de pedido: [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L64-80) → [urls.py](../../Backend/apps/pedidos/urls.py#L34-36) → control y modificación en [views.py](../../Backend/apps/pedidos/views.py#L296-305), [views.py](../../Backend/apps/pedidos/views.py#L209-232) → JSON definido en [serializers.py](../../Backend/apps/pedidos/serializers.py#L45-74) → web sustituye el pedido con `data` en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L66-67).

<a id="c2-superadmin"></a>

## Super administrador

Administrador con facultades exclusivas sobre roles, planes, backups, notificaciones y bitácora, además de las funciones comunes del personal de plataforma. [Trazabilidad funcional completa](#c1-superadmin).

### FRONTEND

- Identificación por rol y catálogo de navegación: [roles.js](../../Frontend/frontend_web/src/utils/roles.js#L4-10), [adminMenu.js](../../Frontend/frontend_web/src/config/adminMenu.js#L5-40). Roles: solicitud/recepción y edición de permisos: [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L16-33), [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L60-66).
- Backup: petición y descarga de blob: [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L52-72); restauración y mensaje recibido: [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L76-96). Bitácora envía llave y recibe resultados: [Bitacora.jsx](../../Frontend/frontend_web/src/pages/Bitacora.jsx#L87-108).

### BACKEND

- `SUPERADMIN` se distingue de `ADMIN`: [models.py](../../Backend/apps/usuarios/models.py#L10-15), [permissions.py](../../Backend/apps/usuarios/permissions.py#L14-23). Roles y permisos de rol: [views.py](../../Backend/apps/usuarios/views.py#L927-966).
- Backup/restore solo SuperAdmin y respuesta descargable/JSON: [views.py](../../Backend/apps/core/views.py#L20-80). Bitácora exige SuperAdmin y llave: [views.py](../../Backend/apps/auditoria/views.py#L17-37), [permissions.py](../../Backend/apps/auditoria/permissions.py#L13-15).

### BASE DE DATOS (si corresponde)

- Rol persistido en `usuarios_usuario`: [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74); migración que añade el quinto rol: [0003_rol_superadmin.py](../../Backend/apps/usuarios/migrations/0003_rol_superadmin.py#L24-39).

### ENVÍO Y RETORNO DE DATOS

1. Backup: web solicita blob en [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L57-67) → backend genera JSON, guarda registro/archivo y retorna `HttpResponse` con nombre en cabecera: [views.py](../../Backend/apps/core/views.py#L26-41) → web crea enlace de descarga en [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L58-65).

<a id="c2-soporte"></a>

## Administrador de soporte

Personal de plataforma con rol ADMIN que atiende cuentas y solicitudes de empresas y consulta información de operación. [Trazabilidad funcional completa](#c1-soporte).

### FRONTEND

- `esStaff` incluye ADMIN; la pantalla de usuarios controla acceso, solicita la lista y recibe resultados: [roles.js](../../Frontend/frontend_web/src/utils/roles.js#L4-6), [Usuarios.jsx](../../Frontend/frontend_web/src/pages/admin/Usuarios.jsx#L56-82).
- Empresas/solicitudes: carga, aprobación y rechazo desde [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L101-137), [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L155-189). Móvil: lista usuarios/empresas y ejecuta bloqueo/suspensión en [admin_service.dart](../../Mobile/vecinomarket_app/lib/services/admin_service.dart#L13-33).

### BACKEND

- `EsAdmin` permite ADMIN o SUPERADMIN: [permissions.py](../../Backend/apps/usuarios/permissions.py#L4-11); consulta de usuarios y JSON vía serializer: [views.py](../../Backend/apps/usuarios/views.py#L608-630), [serializers.py](../../Backend/apps/usuarios/serializers.py#L198-210).
- Solicitudes: consulta en [views.py](../../Backend/apps/usuarios/views.py#L288-295) y decisión/respuesta en [views.py](../../Backend/apps/usuarios/views.py#L298-329); edición de usuarios devuelve perfil y bloquea edición de SuperAdmin por soporte: [views.py](../../Backend/apps/usuarios/views.py#L633-653).

### BASE DE DATOS (si corresponde)

- Usuarios, solicitudes y empresas: [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74), [SolicitudEmpresa — models.py](../../Backend/apps/usuarios/models.py#L117-155), [Empresa — models.py](../../Backend/apps/usuarios/models.py#L158-197). Aprobar crea Empresa, cambia rol y persiste decisión: [serializers.py](../../Backend/apps/usuarios/serializers.py#L88-105).

### ENVÍO Y RETORNO DE DATOS

1. Backend retorna `id` y `slug` en [views.py](../../Backend/apps/usuarios/views.py#L312); la web espera el éxito del POST y retira la solicitud del estado local en [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L165-167). No utiliza esos campos del cuerpo de respuesta; la consulta general de empresas y recepción de su lista se realiza en [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L104-116).

<a id="c2-web"></a>

## Aplicación web — React + Vite

Cliente SPA que reúne catálogo público, compras, autogestión empresarial y administración de plataforma.

### FRONTEND

- Punto de entrada/proveedores: [main.jsx](../../Frontend/frontend_web/src/main.jsx#L13-31); rutas: [App.jsx](../../Frontend/frontend_web/src/App.jsx#L89-157); paquetes y build: [package.json](../../Frontend/frontend_web/package.json#L6-21).
- Axios elige baseURL y adjunta JWT: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-20); intercepta respuestas, refresca token y reintenta la petición: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L39-70). El perfil/estado autenticado se mantiene en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L10-19), [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L34-40).
- WebSocket/WebRTC viewer: [liveSignaling.js](../../Frontend/frontend_web/src/utils/liveSignaling.js#L11-14), [LiveViewer.jsx](../../Frontend/frontend_web/src/pages/LiveViewer.jsx#L50-103); el stream recibido se asigna al video en [LiveViewer.jsx](../../Frontend/frontend_web/src/pages/LiveViewer.jsx#L27-28).

### BACKEND

- HTTP se entrega a Django por ASGI: [asgi.py](../../Backend/config/asgi.py#L19-21); URLs REST: [urls.py](../../Backend/config/urls.py#L8-20); autenticación JWT/permiso inicial: [base.py](../../Backend/config/settings/base.py#L172-178).
- Ejemplo de respuesta REST explícita al web: [views.py](../../Backend/apps/usuarios/views.py#L533-544); WS retorna payload en [consumers.py](../../Backend/apps/promociones/consumers.py#L111-114).

### BASE DE DATOS (si corresponde)

- No hay una segunda BD de negocio en React. Perfil/catálogo/pedidos vienen de [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74), [Producto — models.py](../../Backend/apps/catalogo/models.py#L22-57), [Pedido — models.py](../../Backend/apps/pedidos/models.py#L105-151). Tokens de sesión se guardan en localStorage: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L35-39).

### ENVÍO Y RETORNO DE DATOS

1. Web GET perfil en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L13-14) → ruta [urls.py](../../Backend/apps/usuarios/urls.py#L56) → Response de perfil [views.py](../../Backend/apps/usuarios/views.py#L533-534) → campos [serializers.py](../../Backend/apps/usuarios/serializers.py#L198-242) → setUsuario en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L14).
2. Web GET catálogo [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L43-49) → queryset/serializer [views.py](../../Backend/apps/catalogo/views.py#L54-77), [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71) → adaptador recibe `results` y retorna array: [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L48-49).

<a id="c2-mobile"></a>

## Aplicación móvil — Flutter

Cliente Android con catálogo, carrito, checkout, chat, perfil y pantallas administrativas básicas; consume la misma API Django.

### FRONTEND

- Arranque/providers y pantalla inicial: [main.dart](../../Mobile/vecinomarket_app/lib/main.dart#L8-22), [main.dart](../../Mobile/vecinomarket_app/lib/main.dart#L79-81). API_URL, secure storage y JWT: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L12-39); GET/POST y procesamiento JSON: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L68-95), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L183-194).
- Productos/categorías: [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L6-19); parseo Producto.fromJson: [producto.dart](../../Mobile/vecinomarket_app/lib/models/producto.dart#L39-59); FutureBuilder toma `snapshot.data` y dibuja catálogo: [home_screen.dart](../../Mobile/vecinomarket_app/lib/screens/home_screen.dart#L204-248).
- Compras: [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L33-86); chat: [chat_service.dart](../../Mobile/vecinomarket_app/lib/services/chat_service.dart#L5-39); administración: [admin_service.dart](../../Mobile/vecinomarket_app/lib/services/admin_service.dart#L13-33); lives/comentarios por API: [live_commerce_screen.dart](../../Mobile/vecinomarket_app/lib/screens/live_commerce_screen.dart#L25-36), [live_commerce_screen.dart](../../Mobile/vecinomarket_app/lib/screens/live_commerce_screen.dart#L309-343).

### BACKEND

- API compartida: catálogo [urls.py](../../Backend/apps/catalogo/urls.py#L22-24), autenticación/perfil [urls.py](../../Backend/apps/usuarios/urls.py#L52-59), checkout [urls.py](../../Backend/apps/pedidos/urls.py#L51-53), chat [urls.py](../../Backend/apps/comunicacion/urls.py#L19-26).
- Backend distingue `plataforma == movil` para URLs de retorno PayPal y devuelve enlace: [views.py](../../Backend/apps/pedidos/views.py#L621-646); captura devuelve resultado común: [views.py](../../Backend/apps/pedidos/views.py#L699-703).

### BASE DE DATOS (si corresponde)

- Comparte tablas del backend, no crea una base de pedidos independiente: [OrdenCompra — models.py](../../Backend/apps/pedidos/models.py#L40-72), [Pedido — models.py](../../Backend/apps/pedidos/models.py#L105-151), [Comprador — models.py](../../Backend/apps/usuarios/models.py#L236-248). SecureStorage conserva tokens en [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L18-30); estos no sustituyen la persistencia relacional del negocio.

### ENVÍO Y RETORNO DE DATOS

1. ApiClient envía GET y decodifica: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L68-76), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L183-186) → CatalogoService toma `results` y retorna List<Producto>: [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L17-19) → FutureBuilder recibe objetos en [home_screen.dart](../../Mobile/vecinomarket_app/lib/screens/home_screen.dart#L204-248).
2. Pago móvil recibe `enlace_aprobacion_paypal` de [views.py](../../Backend/apps/pedidos/views.py#L637-646); WebView lo carga en [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L84), detecta retorno en [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L65-95), confirma contra API y retorna éxito a la pantalla previa en [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L103-120).

### CORRESPONDENCIA CON EL DIAGRAMA

Para live commerce se indexa lo implementado por Flutter: listado y comentarios REST. El flujo WebSocket/WebRTC del diagrama se corresponde con el cliente web. Para PayPal se referencia la pantalla móvil real de aprobación/retorno.

<a id="c2-backend"></a>

## Backend API — Django REST Framework + Channels

Contenedor Python que valida identidad/permisos, enruta operaciones y conecta lógica de negocio con base de datos e integraciones.

### FRONTEND

- Web envía JSON/FormData y token con Axios: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-20); móvil con ApiClient: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L33-95), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L155-180).
- Retorno al cliente: estado de perfil en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L34-40) y [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L39-46); JSON de catálogo en [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L48-54) y [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L17-19).

### BACKEND

- Apps, middleware y motor: [base.py](../../Backend/config/settings/base.py#L46-100); autenticación JWT: [base.py](../../Backend/config/settings/base.py#L172-198); router REST [urls.py](../../Backend/config/urls.py#L8-20) y router ASGI [asgi.py](../../Backend/config/asgi.py#L19-22).
- Ejemplo de lógica transaccional: checkout [views.py](../../Backend/apps/pedidos/views.py#L525-603); serialización de pedidos: [serializers.py](../../Backend/apps/pedidos/serializers.py#L37-74); cliente PayPal [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L57-72).
- Señalización Channels: [routing.py](../../Backend/apps/promociones/routing.py#L5-7), [consumers.py](../../Backend/apps/promociones/consumers.py#L47-114); arranque Daphne en [start.sh](../../Backend/start.sh#L7-10).

### BASE DE DATOS (si corresponde)

- Conexión Django/PostGIS: [base.py](../../Backend/config/settings/base.py#L94-100). Modelo base y tenant: [models.py](../../Backend/apps/core/models.py#L4-38). Consulta SQL con retorno al backend: [views.py](../../Backend/apps/reportes/views.py#L209-215); función: [0005_dashboard_funciones.py](../../Backend/apps/reportes/migrations/0005_dashboard_funciones.py#L11-30).

### ENVÍO Y RETORNO DE DATOS

1. Router HTTP dirige compras a `apps.pedidos.urls` en [urls.py](../../Backend/config/urls.py#L15) y allí a checkout en [urls.py](../../Backend/apps/pedidos/urls.py#L52-53) → vista recibe request en [views.py](../../Backend/apps/pedidos/views.py#L500-520).
2. Tras ORM/PayPal, backend responde JSON de inicio en [views.py](../../Backend/apps/pedidos/views.py#L640-646) o resultado final en [views.py](../../Backend/apps/pedidos/views.py#L699-703) → los clientes lo consumen en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L165-178), [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L37-80).

<a id="c2-db"></a>

## Base de datos PostgreSQL + PostGIS

Persistencia relacional compartida de usuarios, empresas, productos, inventario, compras, comunicación y administración; PostGIS guarda puntos geográficos. [Detalle de la integración](#c1-db).

### FRONTEND

- Web y móvil acceden mediante API, no mediante SQL: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-20), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L33-44), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L68-95).

### BACKEND

- Django lee `DATABASE_URL` y configura el motor PostGIS: [base.py](../../Backend/config/settings/base.py#L94-100). Aislamiento compartido por FK/manager: [models.py](../../Backend/apps/core/models.py#L15-38); ejemplo de filtro real en [views.py](../../Backend/apps/catalogo/views.py#L260-280).
- Ejemplo de ida y retorno SQL: `SELECT fn_ajustar_stock` y `fetchone()[0]` en [views.py](../../Backend/apps/inventario/views.py#L205-219); ejemplo de ORM y serialización de producto: [views.py](../../Backend/apps/catalogo/views.py#L37-43), [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71).

### BASE DE DATOS (si corresponde)

- PostGIS se habilita antes de los modelos geográficos: [0000_postgis_extension.py](../../Backend/apps/core/migrations/0000_postgis_extension.py#L17-21). Creación de la BD local y permisos del rol: [01_crear_base_datos.sql](../../Backend/basedatos/01_crear_base_datos.sql#L9-27).
- Tablas/fuentes de esquema: usuarios y empresa [Usuario — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L50-76), [Empresa — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L113-137); catálogo [Producto — 0001_initial.py](../../Backend/apps/catalogo/migrations/0001_initial.py#L58-77); inventario [InventarioSucursal — 0001_initial.py](../../Backend/apps/inventario/migrations/0001_initial.py#L35-48); pedidos/ítems [Pedido — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L84-101), [PedidoItem — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L102-114).
- `id` utiliza `BigAutoField`: [base.py](../../Backend/config/settings/base.py#L154), [0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L51-54). Funciones/trigger de stock: [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L13-51).

### ENVÍO Y RETORNO DE DATOS

1. Actualización SQL: backend ejecuta función en [views.py](../../Backend/apps/inventario/views.py#L209-211) → PostgreSQL actualiza y retorna cantidad en [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L18-31) → backend relee registro y responde JSON en [views.py](../../Backend/apps/inventario/views.py#L215-219).

### CORRESPONDENCIA CON EL DIAGRAMA

La relación congruente con PostgreSQL/Supabase es DATABASE_URL y el motor PostGIS. El puerto lo determina esa URL (5432 en el ejemplo). Los modelos y migraciones referenciados describen las tablas implementadas.

<a id="c2-paypal"></a>

## PayPal

Servicio externo para aprobar/capturar pagos y guardar tokens de cuentas en Vault; también se usa para adquirir o mejorar planes. [Detalle de la integración](#c1-paypal).

### FRONTEND

- Web carga SDK según sandbox/live: [paypal.js](../../Frontend/frontend_web/src/utils/paypal.js#L17-39); crea sesión y procesa callback `onApprove`: [PayPalCheckoutButton.jsx](../../Frontend/frontend_web/src/components/pagos/PayPalCheckoutButton.jsx#L35-59), [PayPalCheckoutButton.jsx](../../Frontend/frontend_web/src/components/pagos/PayPalCheckoutButton.jsx#L75-80).
- Web solicita orden y captura a su backend: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L164-178); móvil envía `plataforma: movil`: [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L33-45), carga enlace en WebView y observa retorno: [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L50-95).

### BACKEND

- Wrapper REST obtiene token OAuth, llama API y retorna JSON al llamador: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L35-72). Órdenes/captura: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L125-154); Vault: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L75-122).
- Checkout llama al wrapper y retorna IDs/enlace al cliente: [views.py](../../Backend/apps/pedidos/views.py#L618-646). Captura recibe resultado PayPal, persiste estados/pago y retorna confirmación: [views.py](../../Backend/apps/pedidos/views.py#L666-703).
- Planes usan los mismos cobros: [views.py](../../Backend/apps/suscripciones/views.py#L183-194), [views.py](../../Backend/apps/suscripciones/views.py#L214-259); selección del host REST: [base.py](../../Backend/config/settings/base.py#L282-286).

### BASE DE DATOS (si corresponde)

- Orden/pago local y referencia de pasarela: [models.py](../../Backend/apps/pedidos/models.py#L54-68), [models.py](../../Backend/apps/pedidos/models.py#L86-98); tablas [OrdenCompra — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L53-68), [Pago — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L69-83).
- Al mejorar plan se actualizan Suscripcion y Empresa y se crea Factura: [views.py](../../Backend/apps/suscripciones/views.py#L228-249). Los métodos guardados del comprador se consultan en Vault de PayPal, no en una tabla local de números de tarjeta.

### ENVÍO Y RETORNO DE DATOS

1. Backend registra pago y retorna `aprobado`: [views.py](../../Backend/apps/pedidos/views.py#L681-703) → web renderiza números: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L181-195); móvil confirma y retorna éxito a su pantalla: [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L103-120).

### CORRESPONDENCIA CON EL DIAGRAMA

Se indexa el flujo de aprobación PayPal que existe en ambos clientes: popup web y pantalla de pago móvil. La adquisición de planes utiliza el mismo wrapper de órdenes/captura y registra la vigencia local.

<a id="c2-google"></a>

## Google Identity / Google Auth API

Proveedor de identidad que entrega un ID token; VecinoMarket lo verifica y emite sus propios JWT. [Detalle de la integración](#c1-google).

### FRONTEND

- Web carga GIS y recibe `respuesta.credential` mediante callback: [GoogleSignInButton.jsx](../../Frontend/frontend_web/src/components/auth/GoogleSignInButton.jsx#L6-19), [GoogleSignInButton.jsx](../../Frontend/frontend_web/src/components/auth/GoogleSignInButton.jsx#L32-46); envía token y recibe perfil/tokens: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L51-57).
- Móvil usa google_sign_in, extrae ID token, lo envía y recibe JWT/perfil: [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L70-84).

### BACKEND

- Ruta social: [urls.py](../../Backend/apps/usuarios/urls.py#L53). Verificación de firma/audiencia y correo verificado: [serializers.py](../../Backend/apps/usuarios/serializers.py#L586-597); búsqueda/alta de comprador y retorno al llamador: [serializers.py](../../Backend/apps/usuarios/serializers.py#L599-616).
- La vista consume el usuario retornado y responde con `refresh`, `access`, `nuevo`: [views.py](../../Backend/apps/usuarios/views.py#L150-167). El perfil posterior retorna UsuarioSerializer: [views.py](../../Backend/apps/usuarios/views.py#L533-534).

### BASE DE DATOS (si corresponde)

- Si el email no existe se crean Usuario y Comprador: [serializers.py](../../Backend/apps/usuarios/serializers.py#L602-613), [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74), [Comprador — models.py](../../Backend/apps/usuarios/models.py#L236-248). Login/registro social escribe LogAuditoria en [views.py](../../Backend/apps/usuarios/views.py#L160-161). No hay una base de Google copiada dentro del proyecto.

### ENVÍO Y RETORNO DE DATOS

1. Backend verifica y obtiene usuario: [serializers.py](../../Backend/apps/usuarios/serializers.py#L586-616) → emite JWT en [views.py](../../Backend/apps/usuarios/views.py#L158-167) → clientes guardan tokens, piden perfil y actualizan estado en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L53-57), [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L82-84).

### CORRESPONDENCIA CON EL DIAGRAMA

Este proveedor no sustituye los permisos locales. El rol y la empresa se leen de Usuario/Empresa/Empleado después de validar la identidad.

<a id="c2-gmail"></a>

## Gmail API

Backend de correo Django para enviar credenciales de empresa y enlaces de recuperación mediante HTTPS/OAuth2 cuando está configurado. [Detalle de la integración](#c1-gmail).

### FRONTEND

- Web ofrece recuperación en las rutas [App.jsx](../../Frontend/frontend_web/src/App.jsx#L98-99). El envío al endpoint y el mensaje de resultado se implementan en [ForgotPassword.jsx](../../Frontend/frontend_web/src/pages/ForgotPassword.jsx#L12-24); la confirmación en [ResetPassword.jsx](../../Frontend/frontend_web/src/pages/ResetPassword.jsx#L33-50). La web no contacta directamente Gmail ni recibe su respuesta HTTP.

### BACKEND

- Selección Gmail/SMTP/consola por variables: [base.py](../../Backend/config/settings/base.py#L222-237). Gmail intercambia refresh token por access token y lo devuelve al backend de correo: [gmail_email_backend.py](../../Backend/apps/core/gmail_email_backend.py#L22-39).
- Envío de MIME codificado al endpoint de Gmail y manejo de error: [gmail_email_backend.py](../../Backend/apps/core/gmail_email_backend.py#L57-71); retorno interno del número de mensajes enviados: [gmail_email_backend.py](../../Backend/apps/core/gmail_email_backend.py#L46-55).
- Credenciales de empresa: `send_mail` y retorno del servicio en [services.py](../../Backend/apps/usuarios/services.py#L90-111); reset genera enlace/envía en [serializers.py](../../Backend/apps/usuarios/serializers.py#L375-410); vista retorna mensaje HTTP en [views.py](../../Backend/apps/usuarios/views.py#L558-568).

### BASE DE DATOS (si corresponde)

- Se consulta la identidad y correo de recuperación de Usuario: [models.py](../../Backend/apps/usuarios/models.py#L22-31), [serializers.py](../../Backend/apps/usuarios/serializers.py#L384-410). No hay una tabla local que almacene la bandeja de Gmail ni el contenido de todos los correos enviados.

### ENVÍO Y RETORNO DE DATOS

1. Gmail → backend: su respuesta se valida en [gmail_email_backend.py](../../Backend/apps/core/gmail_email_backend.py#L64-71); `send_messages()` retorna un contador en [gmail_email_backend.py](../../Backend/apps/core/gmail_email_backend.py#L46-55). El cliente recibe el mensaje propio de la vista en [views.py](../../Backend/apps/usuarios/views.py#L563-568), no el JSON crudo de Gmail.

### CORRESPONDENCIA CON EL DIAGRAMA

La integración representada se corresponde con GmailApiBackend. Su selección depende de las variables GMAIL_API_*; base.py también declara las alternativas SMTP y consola.

<a id="c2-cloudinary"></a>

## Cloudinary

Almacenamiento externo de archivos: imágenes de productos, QR, comprobantes, multimedia de chat, grabaciones y respaldos. [Detalle de la integración](#c1-cloudinary).

### FRONTEND

- Web sube FormData y recibe el objeto imagen: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L178-190); usa URLs de la API en [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L27-30). Chat envía archivo y renderiza imagen/audio/video de la URL retornada: [ChatThread.jsx](../../Frontend/frontend_web/src/components/chat/ChatThread.jsx#L48-79).
- Móvil hace multipart sin conocer la API secret de Cloudinary: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L155-180); extrae las URLs del JSON de productos: [producto.dart](../../Mobile/vecinomarket_app/lib/models/producto.dart#L39-58).

### BACKEND

- Credenciales por variables y elección del storage: [base.py](../../Backend/config/settings/base.py#L135-152). Upload de producto con verificación de tenant y respuesta: [views.py](../../Backend/apps/catalogo/views.py#L324-335); URL efectiva serializada en [serializers.py](../../Backend/apps/catalogo/serializers.py#L39-56).
- Chat tiene storage multimedia: [models.py](../../Backend/apps/comunicacion/models.py#L8-15), [storage.py](../../Backend/apps/comunicacion/storage.py#L1-10); guarda mensaje y archivo en [views.py](../../Backend/apps/comunicacion/views.py#L127-133), retorna URL mediante [serializers.py](../../Backend/apps/comunicacion/serializers.py#L31-38).
- QR: [models.py](../../Backend/apps/facturacion/models.py#L67-104); grabación: [views.py](../../Backend/apps/promociones/views.py#L315-351); respaldo usa RawMediaCloudinaryStorage: [models.py](../../Backend/apps/core/models.py#L41-51), [views.py](../../Backend/apps/core/views.py#L35-41).

### BASE DE DATOS (si corresponde)

- `catalogo_productoimagen` almacena nombre/ruta de archivo o URL externa y orden, no los bytes: [models.py](../../Backend/apps/catalogo/models.py#L60-79), [ProductoImagen — 0001_initial.py](../../Backend/apps/catalogo/migrations/0001_initial.py#L15-27).
- Referencias a chat, QR y backups: [ChatMensaje — models.py](../../Backend/apps/comunicacion/models.py#L38-62), [MetodoPago — models.py](../../Backend/apps/facturacion/models.py#L67-107), [BackupLog — models.py](../../Backend/apps/core/models.py#L43-57). Los bytes remotos son responsabilidad del storage; PostgreSQL conserva las referencias.

### ENVÍO Y RETORNO DE DATOS

1. Storage URL → serializer: [serializers.py](../../Backend/apps/catalogo/serializers.py#L48-56) → HTTP 201 con id/url/orden en [views.py](../../Backend/apps/catalogo/views.py#L335) → frontend incorpora `data` en `imagenes`: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L190).

### CORRESPONDENCIA CON EL DIAGRAMA

No existe subida directa desde los clientes con las credenciales secretas. El almacenamiento de imágenes cae a disco si faltan las variables indicadas; BackupLog declara su storage de Cloudinary explícitamente. Un respaldo JSON de Django guarda referencias a multimedia, no copia automáticamente los bytes de todas las imágenes.

<a id="c2-hf"></a>

## Hugging Face

Servicio de clasificación de imagen usado para sugerir una categoría existente del catálogo; la decisión de aplicar la sugerencia queda en la interfaz. [Detalle de la integración](#c1-hf).

### FRONTEND

- Web POST de sugerencia y recepción en estado: [SugerenciaCategoriaIA.jsx](../../Frontend/frontend_web/src/components/admin/SugerenciaCategoriaIA.jsx#L10-21); muestra categoría/confianza y entrega el ID a `onAplicar`: [SugerenciaCategoriaIA.jsx](../../Frontend/frontend_web/src/components/admin/SugerenciaCategoriaIA.jsx#L43-60). La interfaz de sugerencias indexada corresponde a la web.

### BACKEND

- Descarga la imagen y llama a inferencia con bytes: [ia.py](../../Backend/apps/catalogo/ia.py#L89-125); mapea etiquetas a categorías y retorna resultado interno: [ia.py](../../Backend/apps/catalogo/ia.py#L144-172).
- La vista obtiene imagen/categorías, llama helper, registra log y responde JSON: [views.py](../../Backend/apps/catalogo/views.py#L388-424). Autogestión exige permiso, plan y pertenencia del producto: [views.py](../../Backend/apps/catalogo/views.py#L441-453).

### BASE DE DATOS (si corresponde)

- Consulta Categoria y ProductoImagen en [views.py](../../Backend/apps/catalogo/views.py#L389-399); guarda `catalogo_categorizacionialog` en [views.py](../../Backend/apps/catalogo/views.py#L409-410), modelo [CategorizacionIALog — models.py](../../Backend/apps/catalogo/models.py#L82-97). La sugerencia no cambia la FK categoria del producto de forma automática.

### ENVÍO Y RETORNO DE DATOS

1. HF devuelve etiquetas → helper devuelve categoría/confianza en [ia.py](../../Backend/apps/catalogo/ia.py#L165-172) → vista transforma y retorna JSON en [views.py](../../Backend/apps/catalogo/views.py#L416-424) → web muestra y permite aplicar en [SugerenciaCategoriaIA.jsx](../../Frontend/frontend_web/src/components/admin/SugerenciaCategoriaIA.jsx#L43-55).

### CORRESPONDENCIA CON EL DIAGRAMA

La responsabilidad congruente con Hugging Face es la clasificación de imágenes y sugerencia de categoría.

<a id="c2-osm"></a>

## OpenStreetMap

Proveedor de mapas para elegir coordenadas de entrega; la ubicación elegida se persiste como punto PostGIS. [Detalle de la integración](#c1-osm).

### FRONTEND

- Web solicita teselas HTTPS desde TileLayer y recibe clics del selector: [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L248-255), [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L1-38). Envía `lat` y `lon` en [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L106-118); recibe lista en [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L47-56).
- Móvil carga teselas OSM en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L412) y recibe coordenadas del mapa en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L372-386). Consulta Nominatim y usa el JSON para completar la dirección en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L517-540); envía las coordenadas en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L559-577) y recibe las direcciones guardadas en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L27-38).

### BACKEND

- No hace de proxy para las teselas OSM. Recibe coordenadas mediante DireccionSerializer, crea/actualiza un Point y serializa latitud/longitud: [serializers.py](../../Backend/apps/usuarios/serializers.py#L619-654). Rutas: [urls.py](../../Backend/apps/usuarios/urls.py#L107-109); listado/creación con comprador autenticado: [views.py](../../Backend/apps/usuarios/views.py#L969-984).

### BASE DE DATOS (si corresponde)

- `usuarios_direccion.ubicacion` es PointField geográfico SRID 4326: [models.py](../../Backend/apps/usuarios/models.py#L251-258); migración del campo y FK a comprador: [Direccion — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L93-112); extensión [0000_postgis_extension.py](../../Backend/apps/core/migrations/0000_postgis_extension.py#L17-21).

### ENVÍO Y RETORNO DE DATOS

1. Lectura → frontend: queryset de direcciones propias en [views.py](../../Backend/apps/usuarios/views.py#L978-979) y campos en [serializers.py](../../Backend/apps/usuarios/serializers.py#L630-641) → web recibe/guarda lista en [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L49-56); móvil hace lo mismo en [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L33-37).

### CORRESPONDENCIA CON EL DIAGRAMA

OSM no es la base de datos de las direcciones personales: provee cartografía; el proyecto persiste las coordenadas en PostgreSQL/PostGIS.

<a id="c2-render"></a>

## Render — configuración de despliegue del backend

Proveedor de nube indicado en las imágenes; el repositorio contiene una receta de despliegue Docker para el backend. [Detalle de la integración](#c1-render).

### FRONTEND

- Web elige backend mediante `VITE_API_URL`: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-5); el valor por defecto es local. Móvil configura la base de API mediante API_URL: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L12-16). No hay una llamada de negocio a la API administrativa de Render.

### BACKEND

- Servicio Docker, variables y modo sandbox: [render.yaml](../../Backend/render.yaml#L7-33), [render.yaml](../../Backend/render.yaml#L71-77); imagen y comando inicial: [Dockerfile](../../Backend/Dockerfile#L1-31). Arranque ejecuta migraciones/collectstatic y Daphne: [start.sh](../../Backend/start.sh#L4-10).
- Settings de producción agregan hostname Render y configuran proxy/TLS: [prod.py](../../Backend/config/settings/prod.py#L8-28); ASGI enruta HTTP y WS: [asgi.py](../../Backend/config/asgi.py#L19-22).

### BASE DE DATOS (si corresponde)

- El blueprint declara conexión PostgreSQL: [render.yaml](../../Backend/render.yaml#L1-5), [render.yaml](../../Backend/render.yaml#L14-17). La conexión del backend la decide DATABASE_URL en [base.py](../../Backend/config/settings/base.py#L94-100).

### ENVÍO Y RETORNO DE DATOS

1. Las respuestas al cliente siguen los handlers REST/WS (por ejemplo [views.py](../../Backend/apps/pedidos/views.py#L640-646), [consumers.py](../../Backend/apps/promociones/consumers.py#L111-114)); Render no agrega un retorno de negocio definido en el repositorio.

### CORRESPONDENCIA CON EL DIAGRAMA

La correspondencia se limita a Dockerfile, start.sh, render.yaml y settings de producción presentes en el código.

<a id="c2-vercel"></a>

## Vercel — configuración de despliegue del frontend

Proveedor indicado para servir la SPA React; la configuración local contiene las reescrituras de rutas. [Detalle de la integración](#c1-vercel).

### FRONTEND

- Reescribe rutas a index.html: [vercel.json](../../Frontend/frontend_web/vercel.json#L1-8); compilación Vite y dependencias React: [package.json](../../Frontend/frontend_web/package.json#L6-21); plugins: [vite.config.js](../../Frontend/frontend_web/vite.config.js#L1-8). Montaje de SPA/providers: [main.jsx](../../Frontend/frontend_web/src/main.jsx#L13-31).
- La URL backend se incorpora por `VITE_API_URL` en [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-5); rutas del cliente: [App.jsx](../../Frontend/frontend_web/src/App.jsx#L89-102).

### BACKEND

- El backend admite orígenes y proxy HTTPS mediante [prod.py](../../Backend/config/settings/prod.py#L14-28); FRONTEND_URL arma enlaces de correo en [base.py](../../Backend/config/settings/base.py#L241-243). No existe un módulo Python de negocio que invoque Vercel.

### BASE DE DATOS (si corresponde)

- No hay tabla Vercel. La SPA consulta los datos por el backend; el proveedor de alojamiento está fuera del esquema relacional.

### ENVÍO Y RETORNO DE DATOS

1. Navegador solicita ruta → regla SPA de [vercel.json](../../Frontend/frontend_web/vercel.json#L2-6) → React monta [main.jsx](../../Frontend/frontend_web/src/main.jsx#L13-31) → cliente consulta API [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L38-54) → respuesta JSON se adapta en [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L14-35).

### CORRESPONDENCIA CON EL DIAGRAMA

La correspondencia con Vercel está en vercel.json y el build estático Vite del frontend.

<a id="c2-limite"></a>

## VecinoMarket — límite del sistema

El rectángulo del diagrama agrupa clientes, API y persistencia como partes del mismo producto.

### FRONTEND

- Web [main.jsx](../../Frontend/frontend_web/src/main.jsx#L13-31) y móvil [main.dart](../../Mobile/vecinomarket_app/lib/main.dart#L8-22) son dos clientes de las mismas rutas: [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L38-54), [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L6-19).

### BACKEND

- Backend concentra familias de funciones en [urls.py](../../Backend/config/urls.py#L8-20) y habilita todos los módulos de negocio en [base.py](../../Backend/config/settings/base.py#L46-58).

### BASE DE DATOS (si corresponde)

- Una conexión `default`: [base.py](../../Backend/config/settings/base.py#L94-100); relaciones por empresa: [models.py](../../Backend/apps/core/models.py#L25-38), [models.py](../../Backend/apps/pedidos/models.py#L118-129).

### ENVÍO Y RETORNO DE DATOS

1. Dos clientes → mismo catálogo: [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L48-49), [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L17-19) → vista/serializer [views.py](../../Backend/apps/catalogo/views.py#L54-77), [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71) → cada cliente transforma el JSON a su representación.

<a id="componentes"></a>

# DIAGRAMA DE COMPONENTES

**Elementos de este diagrama:**

- [React Web App](#c3-react)
- [Flutter Mobile App](#c3-flutter)
- [BD Principal](#c3-bd-principal)
- [Google Auth API](#c3-google-auth)
- [PayPal API](#c3-paypal-api)
- [Django Backend Application](#c3-backend)
- [Auth Middleware — autenticación y contexto de usuario](#c3-auth)
- [URL Dispatcher](#c3-router)
- [inventario/views.py](#c3-inventario)
- [pedidos/views.py](#c3-pedidos)
- [comunicacion/views.py](#c3-comunicacion)
- [reportes/views.py](#c3-reportes)
- [suscripciones/views.py](#c3-suscripciones)
- [paypal_client.py](#c3-paypal-client)
- [notificaciones/models.py](#c3-notificaciones)
- [tenant_db.py — acceso a datos del tenant](#c3-tenant)
- [Component — componente externo sin nombre específico](#c3-externo)

## Breve Descripción

El nivel 3 descompone el backend en autenticación, dispatcher de rutas, módulos operativos, cliente de pagos, notificaciones y acceso a datos por empresa. Las cajas se vinculan a sus vistas, permisos, serializers, modelos y llamadas de los clientes.

<a id="c3-react"></a>

## React Web App

Cliente SPA que reúne catálogo público, compras, autogestión empresarial y administración de plataforma.

### FRONTEND

- Punto de entrada/proveedores: [main.jsx](../../Frontend/frontend_web/src/main.jsx#L13-31); rutas: [App.jsx](../../Frontend/frontend_web/src/App.jsx#L89-157); paquetes y build: [package.json](../../Frontend/frontend_web/package.json#L6-21).
- Axios elige baseURL y adjunta JWT: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-20); intercepta respuestas, refresca token y reintenta la petición: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L39-70). El perfil/estado autenticado se mantiene en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L10-19), [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L34-40).

### BACKEND

- HTTP se entrega a Django por ASGI: [asgi.py](../../Backend/config/asgi.py#L19-21); URLs REST: [urls.py](../../Backend/config/urls.py#L8-20); autenticación JWT/permiso inicial: [base.py](../../Backend/config/settings/base.py#L172-178).
- Ejemplo de respuesta REST explícita al web: [views.py](../../Backend/apps/usuarios/views.py#L533-544); WS retorna payload en [consumers.py](../../Backend/apps/promociones/consumers.py#L111-114).

### BASE DE DATOS (si corresponde)

- No hay una segunda BD de negocio en React. Perfil/catálogo/pedidos vienen de [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74), [Producto — models.py](../../Backend/apps/catalogo/models.py#L22-57), [Pedido — models.py](../../Backend/apps/pedidos/models.py#L105-151). Tokens de sesión se guardan en localStorage: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L35-39).

### ENVÍO Y RETORNO DE DATOS

1. Web GET catálogo [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L43-49) → queryset/serializer [views.py](../../Backend/apps/catalogo/views.py#L54-77), [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71) → adaptador recibe `results` y retorna array: [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L48-49).

<a id="c3-flutter"></a>

## Flutter Mobile App

Cliente Android con catálogo, carrito, checkout, chat, perfil y pantallas administrativas básicas; consume la misma API Django.

### FRONTEND

- Arranque/providers y pantalla inicial: [main.dart](../../Mobile/vecinomarket_app/lib/main.dart#L8-22), [main.dart](../../Mobile/vecinomarket_app/lib/main.dart#L79-81). API_URL, secure storage y JWT: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L12-39); GET/POST y procesamiento JSON: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L68-95), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L183-194).
- Productos/categorías: [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L6-19); parseo Producto.fromJson: [producto.dart](../../Mobile/vecinomarket_app/lib/models/producto.dart#L39-59); FutureBuilder toma `snapshot.data` y dibuja catálogo: [home_screen.dart](../../Mobile/vecinomarket_app/lib/screens/home_screen.dart#L204-248).

### BACKEND

- API compartida: catálogo [urls.py](../../Backend/apps/catalogo/urls.py#L22-24), autenticación/perfil [urls.py](../../Backend/apps/usuarios/urls.py#L52-59), checkout [urls.py](../../Backend/apps/pedidos/urls.py#L51-53), chat [urls.py](../../Backend/apps/comunicacion/urls.py#L19-26).
- Backend distingue `plataforma == movil` para URLs de retorno PayPal y devuelve enlace: [views.py](../../Backend/apps/pedidos/views.py#L621-646); captura devuelve resultado común: [views.py](../../Backend/apps/pedidos/views.py#L699-703).

### BASE DE DATOS (si corresponde)

- Comparte tablas del backend, no crea una base de pedidos independiente: [OrdenCompra — models.py](../../Backend/apps/pedidos/models.py#L40-72), [Pedido — models.py](../../Backend/apps/pedidos/models.py#L105-151), [Comprador — models.py](../../Backend/apps/usuarios/models.py#L236-248). SecureStorage conserva tokens en [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L18-30); estos no sustituyen la persistencia relacional del negocio.

### ENVÍO Y RETORNO DE DATOS

1. Pago móvil recibe `enlace_aprobacion_paypal` de [views.py](../../Backend/apps/pedidos/views.py#L637-646); WebView lo carga en [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L84), detecta retorno en [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L65-95), confirma contra API y retorna éxito a la pantalla previa en [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L103-120).

<a id="c3-bd-principal"></a>

## BD Principal

Persistencia relacional compartida de usuarios, empresas, productos, inventario, compras, comunicación y administración; PostGIS guarda puntos geográficos.

### FRONTEND

- Web y móvil acceden mediante API, no mediante SQL: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-20), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L33-44), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L68-95).

### BACKEND

- Django lee `DATABASE_URL` y configura el motor PostGIS: [base.py](../../Backend/config/settings/base.py#L94-100). Aislamiento compartido por FK/manager: [models.py](../../Backend/apps/core/models.py#L15-38); ejemplo de filtro real en [views.py](../../Backend/apps/catalogo/views.py#L260-280).
- Ejemplo de ida y retorno SQL: `SELECT fn_ajustar_stock` y `fetchone()[0]` en [views.py](../../Backend/apps/inventario/views.py#L205-219); ejemplo de ORM y serialización de producto: [views.py](../../Backend/apps/catalogo/views.py#L37-43), [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71).

### BASE DE DATOS (si corresponde)

- PostGIS se habilita antes de los modelos geográficos: [0000_postgis_extension.py](../../Backend/apps/core/migrations/0000_postgis_extension.py#L17-21). Creación de la BD local y permisos del rol: [01_crear_base_datos.sql](../../Backend/basedatos/01_crear_base_datos.sql#L9-27).
- Tablas/fuentes de esquema: usuarios y empresa [Usuario — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L50-76), [Empresa — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L113-137); catálogo [Producto — 0001_initial.py](../../Backend/apps/catalogo/migrations/0001_initial.py#L58-77); inventario [InventarioSucursal — 0001_initial.py](../../Backend/apps/inventario/migrations/0001_initial.py#L35-48); pedidos/ítems [Pedido — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L84-101), [PedidoItem — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L102-114).

### ENVÍO Y RETORNO DE DATOS

1. Actualización SQL: backend ejecuta función en [views.py](../../Backend/apps/inventario/views.py#L209-211) → PostgreSQL actualiza y retorna cantidad en [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L18-31) → backend relee registro y responde JSON en [views.py](../../Backend/apps/inventario/views.py#L215-219).

<a id="c3-google-auth"></a>

## Google Auth API

Proveedor de identidad que entrega un ID token; VecinoMarket lo verifica y emite sus propios JWT.

### FRONTEND

- Web carga GIS y recibe `respuesta.credential` mediante callback: [GoogleSignInButton.jsx](../../Frontend/frontend_web/src/components/auth/GoogleSignInButton.jsx#L6-19), [GoogleSignInButton.jsx](../../Frontend/frontend_web/src/components/auth/GoogleSignInButton.jsx#L32-46); envía token y recibe perfil/tokens: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L51-57).
- Móvil usa google_sign_in, extrae ID token, lo envía y recibe JWT/perfil: [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L70-84).

### BACKEND

- Ruta social: [urls.py](../../Backend/apps/usuarios/urls.py#L53). Verificación de firma/audiencia y correo verificado: [serializers.py](../../Backend/apps/usuarios/serializers.py#L586-597); búsqueda/alta de comprador y retorno al llamador: [serializers.py](../../Backend/apps/usuarios/serializers.py#L599-616).
- La vista consume el usuario retornado y responde con `refresh`, `access`, `nuevo`: [views.py](../../Backend/apps/usuarios/views.py#L150-167). El perfil posterior retorna UsuarioSerializer: [views.py](../../Backend/apps/usuarios/views.py#L533-534).

### BASE DE DATOS (si corresponde)

- Si el email no existe se crean Usuario y Comprador: [serializers.py](../../Backend/apps/usuarios/serializers.py#L602-613), [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74), [Comprador — models.py](../../Backend/apps/usuarios/models.py#L236-248). Login/registro social escribe LogAuditoria en [views.py](../../Backend/apps/usuarios/views.py#L160-161). No hay una base de Google copiada dentro del proyecto.

### ENVÍO Y RETORNO DE DATOS

1. Backend verifica y obtiene usuario: [serializers.py](../../Backend/apps/usuarios/serializers.py#L586-616) → emite JWT en [views.py](../../Backend/apps/usuarios/views.py#L158-167) → clientes guardan tokens, piden perfil y actualizan estado en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L53-57), [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L82-84).

<a id="c3-paypal-api"></a>

## PayPal API

Servicio externo para aprobar/capturar pagos y guardar tokens de cuentas en Vault; también se usa para adquirir o mejorar planes.

### FRONTEND

- Web carga SDK según sandbox/live: [paypal.js](../../Frontend/frontend_web/src/utils/paypal.js#L17-39); crea sesión y procesa callback `onApprove`: [PayPalCheckoutButton.jsx](../../Frontend/frontend_web/src/components/pagos/PayPalCheckoutButton.jsx#L35-59), [PayPalCheckoutButton.jsx](../../Frontend/frontend_web/src/components/pagos/PayPalCheckoutButton.jsx#L75-80).
- Web solicita orden y captura a su backend: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L164-178); móvil envía `plataforma: movil`: [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L33-45), carga enlace en WebView y observa retorno: [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L50-95).

### BACKEND

- Wrapper REST obtiene token OAuth, llama API y retorna JSON al llamador: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L35-72). Órdenes/captura: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L125-154); Vault: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L75-122).
- Checkout llama al wrapper y retorna IDs/enlace al cliente: [views.py](../../Backend/apps/pedidos/views.py#L618-646). Captura recibe resultado PayPal, persiste estados/pago y retorna confirmación: [views.py](../../Backend/apps/pedidos/views.py#L666-703).

### BASE DE DATOS (si corresponde)

- Orden/pago local y referencia de pasarela: [models.py](../../Backend/apps/pedidos/models.py#L54-68), [models.py](../../Backend/apps/pedidos/models.py#L86-98); tablas [OrdenCompra — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L53-68), [Pago — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L69-83).
- Al mejorar plan se actualizan Suscripcion y Empresa y se crea Factura: [views.py](../../Backend/apps/suscripciones/views.py#L228-249). Los métodos guardados del comprador se consultan en Vault de PayPal, no en una tabla local de números de tarjeta.

### ENVÍO Y RETORNO DE DATOS

1. Backend registra pago y retorna `aprobado`: [views.py](../../Backend/apps/pedidos/views.py#L681-703) → web renderiza números: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L181-195); móvil confirma y retorna éxito a su pantalla: [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L103-120).

<a id="c3-backend"></a>

## Django Backend Application

Límite que contiene los componentes internos mostrados en el nivel 3.

### FRONTEND

- Web envía JSON/FormData y token con Axios: [axios.js](../../Frontend/frontend_web/src/api/axios.js#L3-20); móvil con ApiClient: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L33-95), [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L155-180).

### BACKEND

- Apps, middleware y motor: [base.py](../../Backend/config/settings/base.py#L46-100); autenticación JWT: [base.py](../../Backend/config/settings/base.py#L172-198); router REST [urls.py](../../Backend/config/urls.py#L8-20) y router ASGI [asgi.py](../../Backend/config/asgi.py#L19-22).
- Ejemplo de lógica transaccional: checkout [views.py](../../Backend/apps/pedidos/views.py#L525-603); serialización de pedidos: [serializers.py](../../Backend/apps/pedidos/serializers.py#L37-74); cliente PayPal [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L57-72).

### BASE DE DATOS (si corresponde)

- Conexión Django/PostGIS: [base.py](../../Backend/config/settings/base.py#L94-100). Modelo base y tenant: [models.py](../../Backend/apps/core/models.py#L4-38). Consulta SQL con retorno al backend: [views.py](../../Backend/apps/reportes/views.py#L209-215); función: [0005_dashboard_funciones.py](../../Backend/apps/reportes/migrations/0005_dashboard_funciones.py#L11-30).

### ENVÍO Y RETORNO DE DATOS

1. Router HTTP dirige compras a `apps.pedidos.urls` en [urls.py](../../Backend/config/urls.py#L15) y allí a checkout en [urls.py](../../Backend/apps/pedidos/urls.py#L52-53) → vista recibe request en [views.py](../../Backend/apps/pedidos/views.py#L500-520).
2. Tras ORM/PayPal, backend responde JSON de inicio en [views.py](../../Backend/apps/pedidos/views.py#L640-646) o resultado final en [views.py](../../Backend/apps/pedidos/views.py#L699-703) → los clientes lo consumen en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L165-178), [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L37-80).

<a id="c3-auth"></a>

## Auth Middleware — autenticación y contexto de usuario

La caja de autenticación se corresponde con JWTAuthentication de DRF, los permisos de las vistas y el middleware de contexto empresarial.

### FRONTEND

- Web adjunta Bearer JWT en [axios.js](../../Frontend/frontend_web/src/api/axios.js#L7-11); móvil en [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L33-39). Ingreso/retorno de tokens y perfil: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L34-40), [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L39-46).
- Token social llega al backend por [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L51-57), [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L70-84).

### BACKEND

- Cadena de middleware y autenticación HTTP de Django: [base.py](../../Backend/config/settings/base.py#L61-71); JWT de DRF/permiso por defecto: [base.py](../../Backend/config/settings/base.py#L172-178). TenantContextMiddleware asigna `request.tenant` y retorna al siguiente handler: [middleware.py](../../Backend/apps/core/middleware.py#L12-19).
- Identidad Google se verifica en [serializers.py](../../Backend/apps/usuarios/serializers.py#L586-597) y la vista responde tokens en [views.py](../../Backend/apps/usuarios/views.py#L150-167). Empresa/permisos operativos se resuelven con [models.py](../../Backend/apps/usuarios/models.py#L67-74), [permissions.py](../../Backend/apps/usuarios/permissions.py#L57-76).

### BASE DE DATOS (si corresponde)

- El usuario y rol están persistidos en [Usuario — models.py](../../Backend/apps/usuarios/models.py#L9-74); la empresa del empleado en [Empleado — models.py](../../Backend/apps/usuarios/models.py#L200-218). Los permisos se consultan en EmpleadoPermiso: [permissions.py](../../Backend/apps/usuarios/permissions.py#L72-75); la migración de identidad incluye password/rol/email en [0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L51-67).

### ENVÍO Y RETORNO DE DATOS

1. El perfil retorna rol, empresa, plan y permisos: [views.py](../../Backend/apps/usuarios/views.py#L530-544); campos y cálculo de permisos: [serializers.py](../../Backend/apps/usuarios/serializers.py#L198-242). La web recibe ese JSON y actualiza `usuario`: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L34-40); Flutter hace lo mismo y avisa a sus widgets: [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L39-46).
2. Para endpoints de empresa, se toma `request.user.get_empresa()` y se aplica el filtro antes de responder: [views.py](../../Backend/apps/catalogo/views.py#L260-280). La validación JWT de las APIs se realiza en DRF; los filtros empresariales citados usan el usuario autenticado directamente.

### CORRESPONDENCIA CON EL DIAGRAMA

Auth Middleware es un nombre arquitectónico, no una clase Python con ese nombre literal. Se indexan los puntos efectivos de autenticación y autorización del proyecto.

<a id="c3-router"></a>

## URL Dispatcher

Enrutamiento de peticiones hacia los módulos de negocio y del canal WebSocket hacia el consumer.

### FRONTEND

- Web usa rutas relativas a la base API: [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L38-54); móvil también: [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L6-19). Las rutas de interfaz son React Router en [App.jsx](../../Frontend/frontend_web/src/App.jsx#L89-157) y se distinguen de las rutas API del servidor.

### BACKEND

- `ROOT_URLCONF` selecciona config.urls: [base.py](../../Backend/config/settings/base.py#L73); familias /api/... en [urls.py](../../Backend/config/urls.py#L8-20).
- URLs internas: inventario [urls.py](../../Backend/apps/inventario/urls.py#L15-29), pedidos [urls.py](../../Backend/apps/pedidos/urls.py#L22-53), comunicación [urls.py](../../Backend/apps/comunicacion/urls.py#L18-43), suscripciones [urls.py](../../Backend/apps/suscripciones/urls.py#L15-28), reportes [urls.py](../../Backend/apps/reportes/urls.py#L26-59).
- ASGI y ruta WS: [asgi.py](../../Backend/config/asgi.py#L19-22), [routing.py](../../Backend/apps/promociones/routing.py#L5-7).

### BASE DE DATOS (si corresponde)

- El dispatcher no tiene tabla ni ejecuta SELECT/INSERT por sí mismo; selecciona una vista/consumer que consulta los modelos.

### ENVÍO Y RETORNO DE DATOS

1. Ejemplo: GET móvil `catalogo/productos/` en [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L17) → prefijo [urls.py](../../Backend/config/urls.py#L11) → path de productos [urls.py](../../Backend/apps/catalogo/urls.py#L23) → ListaProductosView [views.py](../../Backend/apps/catalogo/views.py#L54-77) → serializer [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71) → retorna al móvil y se transforma en [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L18-19).

### CORRESPONDENCIA CON EL DIAGRAMA

El router no transforma el resultado de negocio; las vistas/serializers producen la respuesta que vuelve por el mismo transporte.

<a id="c3-inventario"></a>

## inventario/views.py

Componente que lista sucursales/stock, modifica mínimos y aplica ajustes de cantidad mediante función SQL.

### FRONTEND

- Interfaz administrativa: pide lista y recibe stock en [InventarioEmpresas.jsx](../../Frontend/frontend_web/src/pages/admin/InventarioEmpresas.jsx#L43-44); PATCH de mínimo y reemplazo del objeto en [InventarioEmpresas.jsx](../../Frontend/frontend_web/src/pages/admin/InventarioEmpresas.jsx#L78-79); ajuste por delta y retorno en [InventarioEmpresas.jsx](../../Frontend/frontend_web/src/pages/admin/InventarioEmpresas.jsx#L90-96).
- Móvil comprador consulta sucursales para entrega y convierte JSON: [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L9-15).

### BACKEND

- Rutas admin/empresa/publico: [urls.py](../../Backend/apps/inventario/urls.py#L15-29); consultas de admin [views.py](../../Backend/apps/inventario/views.py#L62-85) y ajuste/respuesta [views.py](../../Backend/apps/inventario/views.py#L110-131).
- Empresa/empleado: permiso `gestionar_inventario`, filtro tenant y queryset: [views.py](../../Backend/apps/inventario/views.py#L151-172); UPDATE mínimo/Response en [views.py](../../Backend/apps/inventario/views.py#L181-188); SQL/cantidad/Response en [views.py](../../Backend/apps/inventario/views.py#L197-219).
- Campos de retorno y cálculo `stock_bajo`: [serializers.py](../../Backend/apps/inventario/serializers.py#L14-31).

### BASE DE DATOS (si corresponde)

- Tablas `inventario_sucursal` y `inventario_inventariosucursal`: [Sucursal — models.py](../../Backend/apps/inventario/models.py#L7-23), [InventarioSucursal — models.py](../../Backend/apps/inventario/models.py#L26-39); migraciones [Sucursal — 0001_initial.py](../../Backend/apps/inventario/migrations/0001_initial.py#L17-34), [InventarioSucursal — 0001_initial.py](../../Backend/apps/inventario/migrations/0001_initial.py#L35-48).
- SQL ajusta cantidad y retorna nuevo valor: [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L13-33); triggers registran cambios/refrescan timestamp: [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L37-51).

### ENVÍO Y RETORNO DE DATOS

1. Frontend envía `delta` en [InventarioEmpresas.jsx](../../Frontend/frontend_web/src/pages/admin/InventarioEmpresas.jsx#L95) → ruta [urls.py](../../Backend/apps/inventario/urls.py#L23) → vista ejecuta SELECT y obtiene `fetchone()[0]` en [views.py](../../Backend/apps/inventario/views.py#L119-123).
2. SQL `RETURN v_nueva` en [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L31) → backend relee ORM y retorna serializer en [views.py](../../Backend/apps/inventario/views.py#L127-131) → interfaz sustituye registro con `data`: [InventarioEmpresas.jsx](../../Frontend/frontend_web/src/pages/admin/InventarioEmpresas.jsx#L96).

<a id="c3-pedidos"></a>

## pedidos/views.py

Componente de carrito, checkout multiempresa, pedidos, pagos y entregas.

### FRONTEND

- Carrito web obtiene/restaura y sincroniza items: [CartContext.jsx](../../Frontend/frontend_web/src/context/CartContext.jsx#L41-70); checkout: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L88-100), [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L144-195).
- Panel empresa lee pedidos y recibe objetos actualizados: [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L40-80); móvil crea/confirma y parsea historial: [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L33-86).

### BACKEND

- Rutas: [urls.py](../../Backend/apps/pedidos/urls.py#L22-53); carrito GET/POST y retornos: [views.py](../../Backend/apps/pedidos/views.py#L95-168).
- Consulta de stock y reserva con bloqueo: [views.py](../../Backend/apps/pedidos/views.py#L460-474); creación por empresa y cálculo: [views.py](../../Backend/apps/pedidos/views.py#L525-603).
- PayPal/retorno de IDs: [views.py](../../Backend/apps/pedidos/views.py#L618-646); captura, persistencia y retorno final: [views.py](../../Backend/apps/pedidos/views.py#L657-703); querysets de pedidos propios y edición: [views.py](../../Backend/apps/pedidos/views.py#L275-312); JSON de detalle: [serializers.py](../../Backend/apps/pedidos/serializers.py#L37-74).

### BASE DE DATOS (si corresponde)

- Modelos relacionales: [Carrito — models.py](../../Backend/apps/pedidos/models.py#L6-20), [CarritoItem — models.py](../../Backend/apps/pedidos/models.py#L23-37), [OrdenCompra — models.py](../../Backend/apps/pedidos/models.py#L40-72), [Pedido — models.py](../../Backend/apps/pedidos/models.py#L105-151), [PedidoItem — models.py](../../Backend/apps/pedidos/models.py#L154-169), [Pago — models.py](../../Backend/apps/pedidos/models.py#L75-102), [Entrega — models.py](../../Backend/apps/pedidos/models.py#L172-189).
- Número de pedido SQL: [0001_funciones_y_triggers.py](../../Backend/apps/core/migrations/0001_funciones_y_triggers.py#L129-135); consulta y retorno del número a Python: [views.py](../../Backend/apps/pedidos/views.py#L454-457); stock real se guarda en [models.py](../../Backend/apps/inventario/models.py#L26-36).

### ENVÍO Y RETORNO DE DATOS

1. API → base: crea orden y pedidos/ítems en [views.py](../../Backend/apps/pedidos/views.py#L553-590); verifica/descuenta stock en [views.py](../../Backend/apps/pedidos/views.py#L460-474).
2. API → cliente: inicio devuelve IDs y enlace PayPal en [views.py](../../Backend/apps/pedidos/views.py#L640-646); confirmación devuelve `aprobado` y `numeros_pedido` en [views.py](../../Backend/apps/pedidos/views.py#L699-703). Web los guarda y renderiza en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L181-195); móvil consume el resultado y retorna éxito a la pantalla anterior en [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L103-120).

### CORRESPONDENCIA CON EL DIAGRAMA

La verificación de stock dibujada entre pedidos e inventario se concreta con acceso a InventarioSucursal; no requiere una llamada HTTP desde pedidos/views.py a inventario/views.py.

<a id="c3-comunicacion"></a>

## comunicacion/views.py

Componente de conversaciones, mensajes multimedia y preguntas/respuestas del chatbot por empresa.

### FRONTEND

- Web comprador inicia conversación en [ProductDetail.jsx](../../Frontend/frontend_web/src/pages/ProductDetail.jsx#L55-58); empresa lee sus conversaciones en [MiChat.jsx](../../Frontend/frontend_web/src/pages/empresa/MiChat.jsx#L20-54). Mensajes y retorno/renderizado: [ChatThread.jsx](../../Frontend/frontend_web/src/components/chat/ChatThread.jsx#L14-79).
- Móvil servicios de conversación/mensajes y retorno de maps: [chat_service.dart](../../Mobile/vecinomarket_app/lib/services/chat_service.dart#L5-39); pregunta de chatbot y extracción de respuesta en [chat_service.dart](../../Mobile/vecinomarket_app/lib/services/chat_service.dart#L63-72).

### BACKEND

- Rutas REST: [urls.py](../../Backend/apps/comunicacion/urls.py#L19-43); pertenencia de conversación [views.py](../../Backend/apps/comunicacion/views.py#L41-50).
- Alta/reutilización y respuesta de conversación: [views.py](../../Backend/apps/comunicacion/views.py#L69-77); listado de empresa [views.py](../../Backend/apps/comunicacion/views.py#L80-95); permisos, leído, persistencia de emisor/archivo: [views.py](../../Backend/apps/comunicacion/views.py#L98-133).
- Serializer de mensajes y URLs: [serializers.py](../../Backend/apps/comunicacion/serializers.py#L6-38); JSON de conversación (incluye último mensaje/no leídos): [serializers.py](../../Backend/apps/comunicacion/serializers.py#L41-78); chatbot persiste interacción y retorna respuesta: [views.py](../../Backend/apps/comunicacion/views.py#L376-404).

### BASE DE DATOS (si corresponde)

- Tablas [ChatConversacion — models.py](../../Backend/apps/comunicacion/models.py#L18-35), [ChatMensaje — models.py](../../Backend/apps/comunicacion/models.py#L38-62), [ChatbotFAQ — models.py](../../Backend/apps/comunicacion/models.py#L65-84), [ChatbotInteraccion — models.py](../../Backend/apps/comunicacion/models.py#L87-103); las FK aseguran relación comprador/empresa y conversación/emisor.
- Multimedia se referencia por FileField/storage en [models.py](../../Backend/apps/comunicacion/models.py#L45-54); creación de tablas de conversación/mensaje en [ChatConversacion — 0001_initial.py](../../Backend/apps/comunicacion/migrations/0001_initial.py#L27-40), [ChatMensaje — 0001_initial.py](../../Backend/apps/comunicacion/migrations/0001_initial.py#L41-55).

### ENVÍO Y RETORNO DE DATOS

1. Enviar texto: web POST en [ChatThread.jsx](../../Frontend/frontend_web/src/components/chat/ChatThread.jsx#L32-40) o móvil en [chat_service.dart](../../Mobile/vecinomarket_app/lib/services/chat_service.dart#L33-39) → ruta [urls.py](../../Backend/apps/comunicacion/urls.py#L26) → permiso/pertenencia [views.py](../../Backend/apps/comunicacion/views.py#L109-119) → serializer.save con emisor y conversación [views.py](../../Backend/apps/comunicacion/views.py#L127-133).
2. DRF genera respuesta usando ChatMensajeSerializer declarado en [views.py](../../Backend/apps/comunicacion/views.py#L103-105), campos/URL en [serializers.py](../../Backend/apps/comunicacion/serializers.py#L11-38). Web no utiliza el cuerpo del POST: vuelve a hacer GET en [ChatThread.jsx](../../Frontend/frontend_web/src/components/chat/ChatThread.jsx#L37-39); recibe/renderiza mensajes en [ChatThread.jsx](../../Frontend/frontend_web/src/components/chat/ChatThread.jsx#L17), [ChatThread.jsx](../../Frontend/frontend_web/src/components/chat/ChatThread.jsx#L69-79). Móvil sí retorna el map del POST en [chat_service.dart](../../Mobile/vecinomarket_app/lib/services/chat_service.dart#L39).

### CORRESPONDENCIA CON EL DIAGRAMA

Se indexa la comunicación que existe: REST y polling para chat, storage para multimedia y registro de auditoría. Las notificaciones persistidas se describen en su componente específico.

<a id="c3-reportes"></a>

## reportes/views.py

Componente de valoraciones, dashboards, rankings y reportes dinámicos/exportaciones.

### FRONTEND

- Dashboard empresa pide datos y los guarda en [DashboardEmpresa.jsx](../../Frontend/frontend_web/src/pages/empresa/DashboardEmpresa.jsx#L30-38); global en [DashboardAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/DashboardAdmin.jsx#L151-158). Interfaz común de reportes carga catálogo y tabla: [ReportesDinamicosBase.jsx](../../Frontend/frontend_web/src/components/reportes/ReportesDinamicosBase.jsx#L101-112), [ReportesDinamicosBase.jsx](../../Frontend/frontend_web/src/components/reportes/ReportesDinamicosBase.jsx#L148-185).
- Valoraciones: web consulta pedidos/reseñas, recibe y crea/edita en [MisResenas.jsx](../../Frontend/frontend_web/src/pages/MisResenas.jsx#L49-57), [MisResenas.jsx](../../Frontend/frontend_web/src/pages/MisResenas.jsx#L88-98); móvil usa pantalla de reseñas en [buyer_reviews_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_reviews_screen.dart#L33-66).

### BACKEND

- Rutas dashboard y reportes: [urls.py](../../Backend/apps/reportes/urls.py#L43-59); empresa consulta y responde [views.py](../../Backend/apps/reportes/views.py#L289-358), admin [views.py](../../Backend/apps/reportes/views.py#L218-286).
- Reportes dinámicos validan permisos/dataset y retornan JSON o archivo: [views.py](../../Backend/apps/reportes/views.py#L523-581), [views.py](../../Backend/apps/reportes/views.py#L594-627); generación filtra ORM por tenant, fechas y columnas: [reportes_dinamicos.py](../../Backend/apps/reportes/reportes_dinamicos.py#L154-188).
- HTTP de descarga y retorno de exportación/email: [exportadores.py](../../Backend/apps/core/exportadores.py#L55-82); valoración propia se crea y retorna en [views.py](../../Backend/apps/reportes/views.py#L48-64).

### BASE DE DATOS (si corresponde)

- Valoracion, Pedido, PedidoItem, OrdenCompra y ComisionVenta alimentan los reportes: [Valoracion — models.py](../../Backend/apps/reportes/models.py#L6-26), [PedidoItem — models.py](../../Backend/apps/pedidos/models.py#L154-169), [ComisionVenta — models.py](../../Backend/apps/facturacion/models.py#L110-127); consultas JOIN/agrupación en [views.py](../../Backend/apps/reportes/views.py#L226-263).
- SQL con retorno de promedio/cantidad: [0003_valoracion_funciones_y_triggers.py](../../Backend/apps/reportes/migrations/0003_valoracion_funciones_y_triggers.py#L12-22); ventas por día: [0005_dashboard_funciones.py](../../Backend/apps/reportes/migrations/0005_dashboard_funciones.py#L11-30).

### ENVÍO Y RETORNO DE DATOS

1. Frontend pide tabla en [ReportesDinamicosBase.jsx](../../Frontend/frontend_web/src/components/reportes/ReportesDinamicosBase.jsx#L148-161) → vista construye filtros y llama generador en [views.py](../../Backend/apps/reportes/views.py#L563-572) → generador consulta y retorna `(headers, filas)` en [reportes_dinamicos.py](../../Backend/apps/reportes/reportes_dinamicos.py#L166-188) → vista HTTP retorna JSON en [views.py](../../Backend/apps/reportes/views.py#L573-574) → frontend `setTablaDatos(res.data)` en [ReportesDinamicosBase.jsx](../../Frontend/frontend_web/src/components/reportes/ReportesDinamicosBase.jsx#L160-161).
2. Para archivo: vista retorna exportador en [views.py](../../Backend/apps/reportes/views.py#L576-581) → HttpResponse con bytes/nombre en [exportadores.py](../../Backend/apps/core/exportadores.py#L55-60) → frontend recibe blob y descarga en [ReportesDinamicosBase.jsx](../../Frontend/frontend_web/src/components/reportes/ReportesDinamicosBase.jsx#L175-195).

### CORRESPONDENCIA CON EL DIAGRAMA

Los reportes se calculan a partir de tablas operativas; no se requiere una tabla Valoracion_Reporte para producir los rankings.

<a id="c3-suscripciones"></a>

## suscripciones/views.py

Componente de planes y vigencia empresarial con adquisición/mejora/cancelación de plan.

### FRONTEND

- Web consulta plan/vencimiento y recibe estado en [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L29-41); mejora/captura/cancelación y nueva lectura en [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L73-96). La autogestión de suscripciones se indexa en la web.

### BACKEND

- Rutas: [urls.py](../../Backend/apps/suscripciones/urls.py#L15-28); lectura y Response [views.py](../../Backend/apps/suscripciones/views.py#L143-151); alta/edición de planes [views.py](../../Backend/apps/suscripciones/views.py#L40-82).
- Checkout llama wrapper PayPal, guarda plan pendiente en cache y retorna orden: [views.py](../../Backend/apps/suscripciones/views.py#L165-194); confirmación verifica empresa/pago, escribe datos y retorna plan/vencimiento: [views.py](../../Backend/apps/suscripciones/views.py#L204-259).
- Vencimiento administrativo: [views.py](../../Backend/apps/suscripciones/views.py#L124-134); cancelación: [views.py](../../Backend/apps/suscripciones/views.py#L262-329).

### BASE DE DATOS (si corresponde)

- Tablas `suscripciones_plan` y `suscripciones_suscripcion`: [Plan — models.py](../../Backend/apps/suscripciones/models.py#L6-49), [Suscripcion — models.py](../../Backend/apps/suscripciones/models.py#L52-75); migraciones [Plan — 0001_initial.py](../../Backend/apps/suscripciones/migrations/0001_initial.py#L14-33), [Suscripcion — 0001_initial.py](../../Backend/apps/suscripciones/migrations/0001_initial.py#L34-50).
- Empresa.plan se actualiza y Factura se registra al capturar pago: [views.py](../../Backend/apps/suscripciones/views.py#L228-249), [Factura — models.py](../../Backend/apps/facturacion/models.py#L6-36).

### ENVÍO Y RETORNO DE DATOS

1. Mejorar plan: web envía `plan_id` y luego `paypal_order_id`: [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L73-85). Backend responde primero con el ID de PayPal en [views.py](../../Backend/apps/suscripciones/views.py#L183-194) y luego con plan/vencimiento en [views.py](../../Backend/apps/suscripciones/views.py#L257-259); web relee y actualiza estado en [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L29-38).

<a id="c3-paypal-client"></a>

## paypal_client.py

Wrapper interno de las REST API Orders v2 y Vault v3; sus funciones devuelven el resultado externo al módulo llamador.

### FRONTEND

- Web carga SDK según sandbox/live: [paypal.js](../../Frontend/frontend_web/src/utils/paypal.js#L17-39); crea sesión y procesa callback `onApprove`: [PayPalCheckoutButton.jsx](../../Frontend/frontend_web/src/components/pagos/PayPalCheckoutButton.jsx#L35-59), [PayPalCheckoutButton.jsx](../../Frontend/frontend_web/src/components/pagos/PayPalCheckoutButton.jsx#L75-80).
- Web solicita orden y captura a su backend: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L164-178); móvil envía `plataforma: movil`: [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L33-45), carga enlace en WebView y observa retorno: [paypal_webview_screen.dart](../../Mobile/vecinomarket_app/lib/screens/paypal_webview_screen.dart#L50-95).

### BACKEND

- Token OAuth cacheado: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L35-54); `_request()` envía, valida error y retorna JSON: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L57-72).
- Crear/capturar orden: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L125-154); tokens Vault: [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L75-122); llamadores de pedidos [views.py](../../Backend/apps/pedidos/views.py#L621-628), [views.py](../../Backend/apps/pedidos/views.py#L666-667) y suscripciones [views.py](../../Backend/apps/suscripciones/views.py#L183-194).

### BASE DE DATOS (si corresponde)

- Orden/pago local y referencia de pasarela: [models.py](../../Backend/apps/pedidos/models.py#L54-68), [models.py](../../Backend/apps/pedidos/models.py#L86-98); tablas [OrdenCompra — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L53-68), [Pago — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L69-83).
- Al mejorar plan se actualizan Suscripcion y Empresa y se crea Factura: [views.py](../../Backend/apps/suscripciones/views.py#L228-249). Los métodos guardados del comprador se consultan en Vault de PayPal, no en una tabla local de números de tarjeta.

### ENVÍO Y RETORNO DE DATOS

1. Vista llama `crear_orden` en [views.py](../../Backend/apps/pedidos/views.py#L621-628) → wrapper arma payload y retorna `_request` en [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L138-148) → `_request` retorna JSON externo en [paypal_client.py](../../Backend/apps/pagos/paypal_client.py#L72) → vista extrae ID/links y devuelve HTTP en [views.py](../../Backend/apps/pedidos/views.py#L637-646) → frontend almacena IDs en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L169-171).

### CORRESPONDENCIA CON EL DIAGRAMA

El wrapper no produce directamente la respuesta HTTP de VecinoMarket ni escribe las tablas de pago: esas tareas se ven en las vistas llamadoras.

<a id="c3-notificaciones"></a>

## notificaciones/models.py

Persistencia de avisos por usuario y API para listar, marcar leídos, eliminar y enviar avisos administrativos.

### FRONTEND

- Provider web consulta, recibe y hace polling: [NotificacionesContext.jsx](../../Frontend/frontend_web/src/context/NotificacionesContext.jsx#L6-29); marca leído y actualiza estado local: [NotificacionesContext.jsx](../../Frontend/frontend_web/src/context/NotificacionesContext.jsx#L32-40). Panel administrativo envía y recibe resultado en [NotificacionesAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/NotificacionesAdmin.jsx#L27-53).
- Dashboard móvil consulta notificaciones junto a los datos del comprador: [buyer_dashboard_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_dashboard_screen.dart#L35-65).

### BACKEND

- Modelo de aviso: [models.py](../../Backend/apps/notificaciones/models.py#L6-17); vista lista solo usuario autenticado en [views.py](../../Backend/apps/notificaciones/views.py#L28-40); JSON de campos: [serializers.py](../../Backend/apps/notificaciones/serializers.py#L6-10).
- Leído/retorno: [views.py](../../Backend/apps/notificaciones/views.py#L43-61); envío individual/masivo y respuesta de destinatarios: [views.py](../../Backend/apps/notificaciones/views.py#L64-94); aviso de vencimiento desde login: [views.py](../../Backend/apps/usuarios/views.py#L79-105), [views.py](../../Backend/apps/usuarios/views.py#L120-122).

### BASE DE DATOS (si corresponde)

- Tabla `notificaciones_notificacion`, FK usuario, mensaje/enlace/leído e índice: [Notificacion — models.py](../../Backend/apps/notificaciones/models.py#L6-20), [Notificacion — 0001_initial.py](../../Backend/apps/notificaciones/migrations/0001_initial.py#L14-31). El envío masivo ejecuta INSERT/SELECT mediante función definida en [0003_funciones_y_triggers.py](../../Backend/apps/notificaciones/migrations/0003_funciones_y_triggers.py#L1-50).

### ENVÍO Y RETORNO DE DATOS

1. Envío administrativo: frontend POST [NotificacionesAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/NotificacionesAdmin.jsx#L40-53) → vista valida y crea o llama SQL en [views.py](../../Backend/apps/notificaciones/views.py#L71-90) → retorna `{destinatarios: total}` en [views.py](../../Backend/apps/notificaciones/views.py#L94).
2. Destinatario consulta [NotificacionesContext.jsx](../../Frontend/frontend_web/src/context/NotificacionesContext.jsx#L18-19) → queryset [views.py](../../Backend/apps/notificaciones/views.py#L35-40) y serializer [serializers.py](../../Backend/apps/notificaciones/serializers.py#L6-10) → `setNotificaciones(res.data)` en [NotificacionesContext.jsx](../../Frontend/frontend_web/src/context/NotificacionesContext.jsx#L19).

### CORRESPONDENCIA CON EL DIAGRAMA

La correspondencia se basa en los avisos persistidos y emisores identificados en el código, sin atribuir al modelo métodos de envío propios.

<a id="c3-tenant"></a>

## tenant_db.py — acceso a datos del tenant

La responsabilidad dibujada de aislamiento/consulta por empresa se implementa en los modelos compartidos y filtros de las vistas.

### FRONTEND

- Frontend recibe `empresa_id`, `empresa_slug`, plan y permisos del perfil en [serializers.py](../../Backend/apps/usuarios/serializers.py#L198-242); web lo guarda en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L38-40) y consulta los recursos propios con `mis-productos`/`mis-pedidos`: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L51-56), [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L42-44).

### BACKEND

- Equivalentes concretos: `TenantQuerySet.del_tenant`, `TenantManager`, `TenantModel` en [models.py](../../Backend/apps/core/models.py#L15-38); `Usuario.get_empresa` en [models.py](../../Backend/apps/usuarios/models.py#L67-74); contexto en [middleware.py](../../Backend/apps/core/middleware.py#L12-19).
- Filtros efectivos de cada componente: productos [views.py](../../Backend/apps/catalogo/views.py#L260-280); pedidos [views.py](../../Backend/apps/pedidos/views.py#L284-305); inventario [views.py](../../Backend/apps/inventario/views.py#L159-188); chat [views.py](../../Backend/apps/comunicacion/views.py#L92-95); reportes [views.py](../../Backend/apps/reportes/views.py#L563-574), [reportes_dinamicos.py](../../Backend/apps/reportes/reportes_dinamicos.py#L166-168).

### BASE DE DATOS (si corresponde)

- Conexión compartida `default`: [base.py](../../Backend/config/settings/base.py#L94-100). FK empresa heredada de TenantModel: [models.py](../../Backend/apps/core/models.py#L31-38); Pedido tiene FK expresa: [models.py](../../Backend/apps/pedidos/models.py#L118-129). Índice por empresa en productos/pedidos: [models.py](../../Backend/apps/catalogo/models.py#L41-47), [models.py](../../Backend/apps/pedidos/models.py#L135-138).

### ENVÍO Y RETORNO DE DATOS

1. Usuario autenticado → empresa en [models.py](../../Backend/apps/usuarios/models.py#L67-74) → queryset filtrado en [views.py](../../Backend/apps/catalogo/views.py#L260-275) → DRF serializa con [views.py](../../Backend/apps/catalogo/views.py#L257-258), [serializers.py](../../Backend/apps/catalogo/serializers.py#L108-114) → web recibe únicamente esa lista en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L54-56).

### CORRESPONDENCIA CON EL DIAGRAMA

tenant_db.py es la etiqueta conceptual del dibujo; sus equivalentes concretos son TenantModel, get_empresa() y los filtros empresariales de las vistas enlazadas.

<a id="c3-externo"></a>

## Component — componente externo sin nombre específico

La caja externa rotulada Component se indexa por las responsabilidades congruentes que muestra: subida de multimedia y datos/configuración empresarial.

### FRONTEND

- Subida multimedia desde frontend al backend: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L184-190), [ChatThread.jsx](../../Frontend/frontend_web/src/components/chat/ChatThread.jsx#L48-58); móvil multipart: [api_client.dart](../../Mobile/vecinomarket_app/lib/services/api_client.dart#L155-180).

### BACKEND

- Storage externo configurado por variables: [base.py](../../Backend/config/settings/base.py#L135-152); almacenamiento de chat [models.py](../../Backend/apps/comunicacion/models.py#L8-15), [storage.py](../../Backend/apps/comunicacion/storage.py#L1-10); producto/retorno de URL [views.py](../../Backend/apps/catalogo/views.py#L324-335), [serializers.py](../../Backend/apps/catalogo/serializers.py#L48-56).
- Datos de empresa se consultan con el usuario autenticado en [models.py](../../Backend/apps/usuarios/models.py#L67-74); las credenciales externas se leen de configuración, no de los campos de Empresa: [base.py](../../Backend/config/settings/base.py#L135-139), [base.py](../../Backend/config/settings/base.py#L222-224).

### BASE DE DATOS (si corresponde)

- Archivos referenciados en ProductoImagen y ChatMensaje: [models.py](../../Backend/apps/catalogo/models.py#L60-79), [models.py](../../Backend/apps/comunicacion/models.py#L45-54); datos de empresa: [models.py](../../Backend/apps/usuarios/models.py#L166-190).

### ENVÍO Y RETORNO DE DATOS

1. Web archivo → backend en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L184-189) → `ProductoImagen.objects.create(archivo=...)` en [views.py](../../Backend/apps/catalogo/views.py#L326-334) → el `ImageField` y STORAGES suben/resuelven el archivo: [models.py](../../Backend/apps/catalogo/models.py#L65-79), [base.py](../../Backend/config/settings/base.py#L145-150).
2. Storage URL → serializer: [serializers.py](../../Backend/apps/catalogo/serializers.py#L48-56) → HTTP 201 con id/url/orden en [views.py](../../Backend/apps/catalogo/views.py#L335) → frontend incorpora `data` en `imagenes`: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L190).

### CORRESPONDENCIA CON EL DIAGRAMA

El dibujo no identifica inequívocamente un servicio con el nombre Component. Se referencian las responsabilidades visibles sin asignarle una clase o API inexistente; el almacenamiento multimedia concreto es Cloudinary.

<a id="codigo"></a>

# DIAGRAMA DE CÓDIGO

**Elementos de este diagrama:**

- [Cliente](#c4-cliente)
- [Pedido](#c4-pedido)
- [Detalle_Pedido](#c4-detalle-pedido)
- [Producto](#c4-producto)
- [Categoria](#c4-categoria)
- [Movimiento_Inventario](#c4-movimiento)
- [Tenant (Empresa)](#c4-tenant)
- [Usuario](#c4-usuario)
- [Rol](#c4-rol)
- [Backup_Sistema](#c4-backup)
- [Log_Auditoria](#c4-log)
- [Valoracion_Reporte](#c4-valoracion)

## Breve Descripción

El nivel 4 agrupa entidades y operaciones de gestión comercial, catálogo/inventario, administración SaaS y auditoría/reportes. Cada elemento se vincula con sus campos, relaciones y operaciones congruentes. Las operaciones del dibujo se realizan en vistas, serializers, servicios y funciones SQL; no todas son métodos de la clase Django. Los identificadores persistidos se definen en las migraciones enlazadas y el tipo automático se configura en [base.py](../../Backend/config/settings/base.py#L154). Las fechas/activo heredados se encuentran en [models.py](../../Backend/apps/core/models.py#L4-12).

<a id="c4-cliente"></a>

## Cliente

Gestión Comercial y Pedidos. La identidad del cliente se representa mediante Usuario y su perfil Comprador; las direcciones de entrega son registros Direccion asociados.

### FRONTEND

- Registro web envía datos, recibe tokens y usuario, y actualiza la sesión: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L43-48). Editar identidad envía PATCH y guarda el perfil retornado: [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L74-77).
- Direcciones: consulta/recepción [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L47-56); construcción del payload y POST/PATCH [MisDirecciones.jsx](../../Frontend/frontend_web/src/pages/MisDirecciones.jsx#L106-118). Móvil: registro/recepción [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L49-65), actualización de perfil [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L87-93) y direcciones [buyer_addresses_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_addresses_screen.dart#L559-577).

### BACKEND

- Campos `nombre`, `apellido`, `telefono` y `email`: [models.py](../../Backend/apps/usuarios/models.py#L22-36). Perfil Comprador → Usuario: [models.py](../../Backend/apps/usuarios/models.py#L236-248); dirección textual y punto: [models.py](../../Backend/apps/usuarios/models.py#L251-258).
- `registrarCliente()` → RegistroCompradorSerializer valida campos y crea Usuario/Comprador en [serializers.py](../../Backend/apps/usuarios/serializers.py#L149-169); la vista genera JWT y retorna HTTP 201 en [views.py](../../Backend/apps/usuarios/views.py#L515-527).
- `actualizarCliente()` → PerfilView guarda identidad y retorna UsuarioSerializer en [views.py](../../Backend/apps/usuarios/views.py#L536-544); campos editables [serializers.py](../../Backend/apps/usuarios/serializers.py#L245-250). Dirección: conversión Point/retorno al llamador [serializers.py](../../Backend/apps/usuarios/serializers.py#L643-654).
- `listarClientes()` → ListaUsuariosView admite filtro `rol=COMPRADOR`, búsqueda y estado: [views.py](../../Backend/apps/usuarios/views.py#L608-630); serializer/JSON de identidad [serializers.py](../../Backend/apps/usuarios/serializers.py#L198-210); frontend administrativo recibe la lista en [Usuarios.jsx](../../Frontend/frontend_web/src/pages/admin/Usuarios.jsx#L56-63).

### BASE DE DATOS (si corresponde)

- Tablas `usuarios_usuario`, `usuarios_comprador` y `usuarios_direccion`: [Usuario — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L50-76), [Comprador — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L77-92), [Direccion — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L93-112). Comprador.usuario es OneToOne; Direccion.comprador es FK.
- Escritura de Usuario con contraseña almacenada mediante hash: manager `set_password`/save [managers.py](../../Backend/apps/usuarios/managers.py#L7-14); creación del perfil Comprador [serializers.py](../../Backend/apps/usuarios/serializers.py#L161-169); guardado de coordenadas SRID 4326 [serializers.py](../../Backend/apps/usuarios/serializers.py#L643-647).

### ENVÍO Y RETORNO DE DATOS

1. Registro: web POST [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L43-44) → ruta [urls.py](../../Backend/apps/usuarios/urls.py#L83) → serializer.save [views.py](../../Backend/apps/usuarios/views.py#L516-518) → Usuario/Comprador en [serializers.py](../../Backend/apps/usuarios/serializers.py#L161-169) → Response con `access`, `refresh`, `usuario` en [views.py](../../Backend/apps/usuarios/views.py#L523-527) → cliente guarda esos valores en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L45-48) y [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L63-65).
2. Actualizar: cliente PATCH [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L74-75) → serializer.save/Response [views.py](../../Backend/apps/usuarios/views.py#L540-544) → `setUsuario(data)` y retorno al formulario en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L76-77).

<a id="c4-pedido"></a>

## Pedido

Gestión Comercial y Pedidos. Pedido registra la venta operativa de una empresa; OrdenCompra reúne el pago y monto global de una compra que puede contener varios pedidos.

### FRONTEND

- Checkout arma cantidades y entregas en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L88-100), inicia/confirma pago en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L164-178) y recibe/muestra números en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L181-195). Móvil envía items/entregas y devuelve JSON al widget: [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L33-45).
- Empresa lista y recibe pedidos en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L40-51); selector incluye CANCELADO en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L8-14) y PATCH/actualización local en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L64-80).

### BACKEND

- `numeroPedido` → `numero_pedido`; `estado`, empresa y subtotal → campos de Pedido [models.py](../../Backend/apps/pedidos/models.py#L118-130). `fecha` → `creado_en` expuesto en [serializers.py](../../Backend/apps/pedidos/serializers.py#L57); `montoTotal` → OrdenCompra.monto_total en [models.py](../../Backend/apps/pedidos/models.py#L54-57); subtotal por empresa en Pedido.
- `generarPedido()` → valida producto/cantidad/stock, agrupa por empresa y calcula total en [views.py](../../Backend/apps/pedidos/views.py#L529-545); crea OrdenCompra y Pedido en transacción en [views.py](../../Backend/apps/pedidos/views.py#L553-582). Numeración: helper devuelve resultado SQL en [views.py](../../Backend/apps/pedidos/views.py#L454-457).
- `aprobarPedido()` → confirmación de pago valida PayPal y marca PAGADO/CONFIRMADO en [views.py](../../Backend/apps/pedidos/views.py#L666-696); retorno final [views.py](../../Backend/apps/pedidos/views.py#L699-703). Confirmación administrativa/QR mediante estado_pago y estado: [views.py](../../Backend/apps/pedidos/views.py#L220-232).
- `calcularTotal()` → precio/cantidad agrupados y suma global [views.py](../../Backend/apps/pedidos/views.py#L538-545), subtotal del pedido [views.py](../../Backend/apps/pedidos/views.py#L577-582). `cancelarPedido()` → PATCH con estado CANCELADO validado y guardado por [views.py](../../Backend/apps/pedidos/views.py#L213-218); respuesta del pedido actualizado en [views.py](../../Backend/apps/pedidos/views.py#L296-305). Esta operación cambia el estado; no implica por sí sola reembolso.

### BASE DE DATOS (si corresponde)

- Tablas `pedidos_pedido`, `pedidos_ordencompra` y `pedidos_pago`: [Pedido — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L84-101), [OrdenCompra — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L53-68), [Pago — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L69-83). FKs y restricciones de importe/estado: [models.py](../../Backend/apps/pedidos/models.py#L118-148); OrdenCompra conecta al Comprador en [models.py](../../Backend/apps/pedidos/models.py#L54).
- Secuencia y función `fn_generar_numero_pedido` retornan el identificador comercial: [0001_funciones_y_triggers.py](../../Backend/apps/core/migrations/0001_funciones_y_triggers.py#L129-135); ejecución/fetchone [views.py](../../Backend/apps/pedidos/views.py#L454-457). Descuento de inventario bloquea filas y guarda cantidad: [views.py](../../Backend/apps/pedidos/views.py#L466-474), [views.py](../../Backend/apps/pedidos/views.py#L592).

### ENVÍO Y RETORNO DE DATOS

1. Crear: payload cliente [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L88-100) → POST [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L165-171) → ruta [urls.py](../../Backend/apps/pedidos/urls.py#L52) → escritura [views.py](../../Backend/apps/pedidos/views.py#L553-592) → JSON de orden y enlace [views.py](../../Backend/apps/pedidos/views.py#L640-646) → frontend retiene ambos IDs en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L169-171).
2. Confirmar: API captura PayPal y persiste en [views.py](../../Backend/apps/pedidos/views.py#L666-694) → Response `aprobado`, `orden_compra_id`, `numeros_pedido` en [views.py](../../Backend/apps/pedidos/views.py#L699-703) → frontend recibe resultado en [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L175-195).
3. Modificar estado: PATCH frontend [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L64-67) → filtro empresa/guardado/Response [views.py](../../Backend/apps/pedidos/views.py#L296-305) → `setPedidos` sustituye la fila usando el JSON recibido en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L67).

<a id="c4-detalle-pedido"></a>

## Detalle_Pedido

Gestión Comercial y Pedidos. El equivalente concreto es PedidoItem: cada fila conecta un pedido con un producto y conserva la cantidad, precio unitario y subtotal de la compra.

### FRONTEND

- El cliente envía producto/cantidad, no impone el precio final: [Checkout.jsx](../../Frontend/frontend_web/src/pages/Checkout.jsx#L88-100), [pedido_service.dart](../../Mobile/vecinomarket_app/lib/services/pedido_service.dart#L37-44). Empresa renderiza `p.items`, cantidad/nombre y subtotal recibido en [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L219-229).

### BACKEND

- Campos del detalle y FKs: [models.py](../../Backend/apps/pedidos/models.py#L154-169); campos serializados [serializers.py](../../Backend/apps/pedidos/serializers.py#L37-42) y anidación read_only en PedidoSerializer [serializers.py](../../Backend/apps/pedidos/serializers.py#L58-67).
- `calcularSubtotal()` → backend obtiene precio actual/descuento en [views.py](../../Backend/apps/pedidos/views.py#L538-540) y guarda `subtotal=cantidad*precio` por cada item en [views.py](../../Backend/apps/pedidos/views.py#L584-590). Lectura: el queryset carga los items y productos con `prefetch_related('items__producto')` en [views.py](../../Backend/apps/pedidos/views.py#L177-182); el listado propio lo filtra por empresa en [views.py](../../Backend/apps/pedidos/views.py#L284-286). Se indexa la creación y lectura del detalle persistido; los cambios del carrito previos al checkout pertenecen al carrito.

### BASE DE DATOS (si corresponde)

- Tabla `pedidos_pedidoitem` y definición de id/relaciones/campos: [PedidoItem — 0001_initial.py](../../Backend/apps/pedidos/migrations/0001_initial.py#L102-114). PedidoItem.pedido y PedidoItem.producto son FKs, y `cantidad > 0` es restricción: [models.py](../../Backend/apps/pedidos/models.py#L155-167).
- Escritura conjunta con el pedido mediante bulk_create: [views.py](../../Backend/apps/pedidos/views.py#L578-590). El nombre de producto se obtiene de la relación en serializer, no de otra columna en detalle: [serializers.py](../../Backend/apps/pedidos/serializers.py#L38).

### ENVÍO Y RETORNO DE DATOS

1. Items del payload → validación precio/stock [views.py](../../Backend/apps/pedidos/views.py#L529-540) → cálculo y INSERT de PedidoItem [views.py](../../Backend/apps/pedidos/views.py#L584-590).
2. GET pedidos desde web [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L42-44) → vista/serializer [views.py](../../Backend/apps/pedidos/views.py#L275-286), [serializers.py](../../Backend/apps/pedidos/serializers.py#L37-67) → respuesta DRF con lista `items` → recepción [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L44) y renderizado del detalle [MisPedidos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx#L219-229).

<a id="c4-producto"></a>

## Producto

Gestión de Catálogo e Inventario. Producto pertenece a una empresa y categoría; precio/estado son propios, mientras que el stock actual proviene del inventario por sucursal.

### FRONTEND

- Web transforma producto/stock/imágenes del JSON en [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L14-35) y retorna el detalle al componente en [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L52-54); componente lo guarda en [ProductDetail.jsx](../../Frontend/frontend_web/src/pages/ProductDetail.jsx#L37-42). Flutter convierte JSON a Producto en [producto.dart](../../Mobile/vecinomarket_app/lib/models/producto.dart#L39-59).
- Empresa crea/edita nombre, SKU, precio, categoría y estado mediante POST/PATCH: [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L126-148); recibe productos en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L49-63); carga foto y usa las URLs retornadas en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L178-195).
- Ajuste de stock en interfaz administrativa: [InventarioEmpresas.jsx](../../Frontend/frontend_web/src/pages/admin/InventarioEmpresas.jsx#L91-99).

### BACKEND

- Campos congruentes `nombre`, `sku`, `precio`, `estado`, categoría y empresa: [models.py](../../Backend/apps/catalogo/models.py#L22-39), [models.py](../../Backend/apps/core/models.py#L25-38). `stockActual` → anotación `stock=Coalesce(Sum('inventarios__cantidad_disponible'), 0)` en [views.py](../../Backend/apps/catalogo/views.py#L37-43) y campo de respuesta en [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71).
- `registrarProducto()` → ListCreateAPIView propia valida y asigna empresa en [views.py](../../Backend/apps/catalogo/views.py#L250-280); serializer de campos editables [serializers.py](../../Backend/apps/catalogo/serializers.py#L98-120). Editar y devolver producto: [views.py](../../Backend/apps/catalogo/views.py#L292-298).
- `actualizarStock()` → ajuste delta mediante SQL y Response inventario: [views.py](../../Backend/apps/inventario/views.py#L197-219). `verificarDisponibilidad()` → `_stock_disponible` devuelve agregado [views.py](../../Backend/apps/pedidos/views.py#L460-463) y checkout rechaza cantidad que lo supera en [views.py](../../Backend/apps/pedidos/views.py#L529-538). La consulta de detalle se implementa en [views.py](../../Backend/apps/catalogo/views.py#L80-83).

### BASE DE DATOS (si corresponde)

- Tabla `catalogo_producto`, FK categoría/empresa, índices por empresa/categoría y restricciones de precios: [Producto — 0001_initial.py](../../Backend/apps/catalogo/migrations/0001_initial.py#L58-77), [models.py](../../Backend/apps/catalogo/models.py#L28-54); FK empresa incorporada por [models.py](../../Backend/apps/core/models.py#L31-33). Fotos: tabla `catalogo_productoimagen` [ProductoImagen — 0001_initial.py](../../Backend/apps/catalogo/migrations/0001_initial.py#L15-27), campos archivo/url/orden [models.py](../../Backend/apps/catalogo/models.py#L60-79).
- Stock físico: `inventario_inventariosucursal` [InventarioSucursal — 0001_initial.py](../../Backend/apps/inventario/migrations/0001_initial.py#L35-48); producto/sucursal/cantidad [models.py](../../Backend/apps/inventario/models.py#L26-39). Función de ajuste actualiza y devuelve cantidad [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L13-33); trigger agrega stock y actualiza estado de producto [0001_funciones_y_triggers.py](../../Backend/apps/core/migrations/0001_funciones_y_triggers.py#L145-172).

### ENVÍO Y RETORNO DE DATOS

1. Registro: web POST [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L130-148) → ruta [urls.py](../../Backend/apps/catalogo/urls.py#L41) → ListCreateAPIView/serializer.save(empresa) [views.py](../../Backend/apps/catalogo/views.py#L250-280) → respuesta DRF con producto serializado [serializers.py](../../Backend/apps/catalogo/serializers.py#L108-114) → frontend vuelve a consultar lista en [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L148), [MisProductos.jsx](../../Frontend/frontend_web/src/pages/empresa/MisProductos.jsx#L51-56).
2. Detalle: GET web [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L52-54) → RetrieveAPIView [views.py](../../Backend/apps/catalogo/views.py#L80-83) → queryset con stock [views.py](../../Backend/apps/catalogo/views.py#L37-43) → serializer [serializers.py](../../Backend/apps/catalogo/serializers.py#L59-71) → adapter y retorno cliente [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L14-35), [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L54) → estado del componente [ProductDetail.jsx](../../Frontend/frontend_web/src/pages/ProductDetail.jsx#L39).

<a id="c4-categoria"></a>

## Categoria

Gestión de Catálogo e Inventario. Clasifica productos mediante nombre, descripción, jerarquía e icono; la disponibilidad pública usa el atributo activo heredado.

### FRONTEND

- Panel web consulta/recibe catálogo en [Categorias.jsx](../../Frontend/frontend_web/src/pages/admin/Categorias.jsx#L30-37) y crea/actualiza en [Categorias.jsx](../../Frontend/frontend_web/src/pages/admin/Categorias.jsx#L63-85). Catálogo público convierte respuesta a categorías en [catalogo.js](../../Frontend/frontend_web/src/api/catalogo.js#L38-40); móvil consulta y retorna lista en [catalogo_service.dart](../../Mobile/vecinomarket_app/lib/services/catalogo_service.dart#L6-8).

### BACKEND

- Campos `nombre`, `descripcion`, categoria_padre e icono: [models.py](../../Backend/apps/catalogo/models.py#L6-19); `estado` conceptual se expresa mediante `activo` de BaseModel [models.py](../../Backend/apps/core/models.py#L4-12).
- `registrarCategoria()`/`listarCategorias()` administrativas → queryset/serializer y serializer.save en [views.py](../../Backend/apps/catalogo/views.py#L98-109); campos/contador de productos [serializers.py](../../Backend/apps/catalogo/serializers.py#L14-30). Lista pública filtra activo en [views.py](../../Backend/apps/catalogo/views.py#L46-51) y usa [serializers.py](../../Backend/apps/catalogo/serializers.py#L8-11).
- `actualizarCategoria()` → PATCH valida, guarda, audita y retorna serializer.data en [views.py](../../Backend/apps/catalogo/views.py#L118-124); rutas [urls.py](../../Backend/apps/catalogo/urls.py#L22), [urls.py](../../Backend/apps/catalogo/urls.py#L27-29).

### BASE DE DATOS (si corresponde)

- Tabla `catalogo_categoria` y campos heredados: [Categoria — 0001_initial.py](../../Backend/apps/catalogo/migrations/0001_initial.py#L28-44). Relación padre/hija: [models.py](../../Backend/apps/catalogo/models.py#L9-11); FK del producto con SET_NULL [models.py](../../Backend/apps/catalogo/models.py#L28-30). Conteo de productos en serializer mediante SQL [serializers.py](../../Backend/apps/catalogo/serializers.py#L23-30).

### ENVÍO Y RETORNO DE DATOS

1. Web POST/PATCH [Categorias.jsx](../../Frontend/frontend_web/src/pages/admin/Categorias.jsx#L73-82) → rutas [urls.py](../../Backend/apps/catalogo/urls.py#L27-29) → serializer.save creación [views.py](../../Backend/apps/catalogo/views.py#L107-109) o edición [views.py](../../Backend/apps/catalogo/views.py#L118-124) → respuesta DRF/Response con campos [serializers.py](../../Backend/apps/catalogo/serializers.py#L14-30) → frontend recarga lista en [Categorias.jsx](../../Frontend/frontend_web/src/pages/admin/Categorias.jsx#L73-85), [Categorias.jsx](../../Frontend/frontend_web/src/pages/admin/Categorias.jsx#L32-37).

<a id="c4-movimiento"></a>

## Movimiento_Inventario

Gestión de Catálogo e Inventario. La operación congruente de movimiento se realiza como ajuste delta de InventarioSucursal y registro de auditoría de AJUSTAR_STOCK.

### FRONTEND

- Inventario web envía `{delta: cambio}` y recibe inventario actualizado en [InventarioEmpresas.jsx](../../Frontend/frontend_web/src/pages/admin/InventarioEmpresas.jsx#L91-99); lista inicial se recibe en [InventarioEmpresas.jsx](../../Frontend/frontend_web/src/pages/admin/InventarioEmpresas.jsx#L41-49).
- La trazabilidad se consulta en la bitácora mediante parámetros de filtro y recepción de resultados: [Bitacora.jsx](../../Frontend/frontend_web/src/pages/Bitacora.jsx#L87-108).

### BACKEND

- `registrarMovimiento()` → vista administrativa toma `delta`, ejecuta función SQL, refresca registro, guarda auditoría y responde en [views.py](../../Backend/apps/inventario/views.py#L110-131). La variante propia filtra empresa y permisos: [views.py](../../Backend/apps/inventario/views.py#L191-219).
- Datos congruentes: cantidad resultante en InventarioSucursal [models.py](../../Backend/apps/inventario/models.py#L26-31); producto/delta/nueva_cantidad en detalle del log [views.py](../../Backend/apps/inventario/views.py#L216-218); fecha heredada del log [models.py](../../Backend/apps/core/models.py#L4-8). Consulta de trazabilidad por acción: [views.py](../../Backend/apps/auditoria/views.py#L26-37).

### BASE DE DATOS (si corresponde)

- Persistencia de cantidad: [InventarioSucursal — 0001_initial.py](../../Backend/apps/inventario/migrations/0001_initial.py#L35-48), [models.py](../../Backend/apps/inventario/models.py#L26-39). Función `fn_ajustar_stock` actualiza fila, rechaza negativos y retorna nueva cantidad en [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L13-33).
- Registro del evento en `auditoria_logauditoria`: [LogAuditoria — 0001_initial.py](../../Backend/apps/auditoria/migrations/0001_initial.py#L14-32); campos usuario/acción/detalle/IP [models.py](../../Backend/apps/auditoria/models.py#L9-17); escritura concreta del ajuste [views.py](../../Backend/apps/inventario/views.py#L216-218). Estas dos tablas son el soporte de las operaciones congruentes de la caja conceptual.

### ENVÍO Y RETORNO DE DATOS

1. Ajuste administrativo: POST cliente [InventarioEmpresas.jsx](../../Frontend/frontend_web/src/pages/admin/InventarioEmpresas.jsx#L95-96) → ruta [urls.py](../../Backend/apps/inventario/urls.py#L23) → SELECT fn_ajustar_stock/fetchone [views.py](../../Backend/apps/inventario/views.py#L119-123) → RETURN SQL cantidad [0003_funciones_y_triggers.py](../../Backend/apps/inventario/migrations/0003_funciones_y_triggers.py#L18-31) → refresh/log [views.py](../../Backend/apps/inventario/views.py#L127-130) → Response serializer [views.py](../../Backend/apps/inventario/views.py#L131) → cliente sustituye fila usando `data` [InventarioEmpresas.jsx](../../Frontend/frontend_web/src/pages/admin/InventarioEmpresas.jsx#L96).
2. Consulta del evento: GET bitácora [Bitacora.jsx](../../Frontend/frontend_web/src/pages/Bitacora.jsx#L90-97) → queryset filtrado por acción [views.py](../../Backend/apps/auditoria/views.py#L26-37) → serializer/retorno DRF [serializers.py](../../Backend/apps/auditoria/serializers.py#L6-17) → `setResultados` en [Bitacora.jsx](../../Frontend/frontend_web/src/pages/Bitacora.jsx#L95-97).

<a id="c4-tenant"></a>

## Tenant (Empresa)

Administración SaaS Multi-Tenant. Empresa es el tenant concreto: conecta dueño, identidad comercial, slug, ubicación, plan y recursos filtrados por empresa.

### FRONTEND

- Creación administrativa de empresa: [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L274-298). Dueño consulta/recibe datos en [MiPerfilEmpresa.jsx](../../Frontend/frontend_web/src/pages/empresa/MiPerfilEmpresa.jsx#L19-24); PATCH y recepción del perfil actualizado en [MiPerfilEmpresa.jsx](../../Frontend/frontend_web/src/pages/empresa/MiPerfilEmpresa.jsx#L50-63).
- Plan/vigencia se reciben en [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L29-41); web y móvil obtienen empresa/plan a través del perfil autenticado [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L38-40), [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L43-46).

### BACKEND

- `nombreEmpresa` → `razon_social`, `ruc` → `nit`, identificación pública → `slug`, `planSaaS` → FK `plan`: [models.py](../../Backend/apps/usuarios/models.py#L166-182). `slug` identifica la empresa en las rutas del proyecto.
- `registrarTenant()` → vista valida/selecciona plan y llama servicio [views.py](../../Backend/apps/usuarios/views.py#L800-825); servicio crea dueño, Empresa, Suscripcion y Factura y retorna tupla al llamador en [services.py](../../Backend/apps/usuarios/services.py#L49-111). Aprobación de solicitud también crea Empresa y retorna objeto [serializers.py](../../Backend/apps/usuarios/serializers.py#L88-105).
- `validarSuscripcion()` → consulta última suscripción y retorna plan/fechas/estado [views.py](../../Backend/apps/suscripciones/views.py#L143-151); permisos para funciones de plan [permissions.py](../../Backend/apps/usuarios/permissions.py#L79-110); actualización de vencidos desde función SQL [views.py](../../Backend/apps/suscripciones/views.py#L124-134).
- `actualizarTenant()` → PATCH de perfil empresarial con guardado/auditoría/Response [views.py](../../Backend/apps/usuarios/views.py#L857-863). Aislamiento de recursos: Usuario.get_empresa devuelve Empresa [models.py](../../Backend/apps/usuarios/models.py#L67-74) y queryset filtra empresa en [views.py](../../Backend/apps/catalogo/views.py#L260-275).

### BASE DE DATOS (si corresponde)

- Tabla `usuarios_empresa`: [Empresa — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L113-137); FK dueño/plan [models.py](../../Backend/apps/usuarios/models.py#L166-181). Tablas vinculadas de plan/vigencia: [Plan — 0001_initial.py](../../Backend/apps/suscripciones/migrations/0001_initial.py#L14-33), [Suscripcion — 0001_initial.py](../../Backend/apps/suscripciones/migrations/0001_initial.py#L34-50); fechas con hora según modificación [0007_alter_suscripcion_fecha_inicio_and_more.py](../../Backend/apps/suscripciones/migrations/0007_alter_suscripcion_fecha_inicio_and_more.py#L12-22).
- Vencimiento SQL compara `fecha_vencimiento < now()`, actualiza estado y retorna número de filas: [0008_fn_expirar_suscripciones_por_hora.py](../../Backend/apps/suscripciones/migrations/0008_fn_expirar_suscripciones_por_hora.py#L11-22). TenantModel incorpora la FK común empresa a los recursos en [models.py](../../Backend/apps/core/models.py#L25-38).

### ENVÍO Y RETORNO DE DATOS

1. Crear: POST interfaz [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L285-295) → ruta [urls.py](../../Backend/apps/usuarios/urls.py#L94) → servicio crea registros [services.py](../../Backend/apps/usuarios/services.py#L55-88) y retorna al llamador [services.py](../../Backend/apps/usuarios/services.py#L111) → vista devuelve EmpresaAdminSerializer [views.py](../../Backend/apps/usuarios/views.py#L820-825) → interfaz refleja éxito/recarga en [EmpresasAdmin.jsx](../../Frontend/frontend_web/src/pages/admin/EmpresasAdmin.jsx#L285-298).
2. Editar: PATCH interfaz [MiPerfilEmpresa.jsx](../../Frontend/frontend_web/src/pages/empresa/MiPerfilEmpresa.jsx#L56-58) → vista guarda/retorna [views.py](../../Backend/apps/usuarios/views.py#L857-863) → cliente reemplaza form con `data` [MiPerfilEmpresa.jsx](../../Frontend/frontend_web/src/pages/empresa/MiPerfilEmpresa.jsx#L57).
3. Vigencia: GET web [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L29-38) → consulta/Response [views.py](../../Backend/apps/suscripciones/views.py#L143-151) → `setSub` de la interfaz [MiSuscripcion.jsx](../../Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx#L38).

<a id="c4-usuario"></a>

## Usuario

Administración SaaS Multi-Tenant. Usuario contiene la identidad de acceso, rol y banderas administrativas; es el modelo de autenticación de Django y la fuente del perfil web/móvil.

### FRONTEND

- Inicio de sesión y recepción/guardado JWT/perfil web [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L34-40); móvil [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L39-46). Cierre web envía refresh y elimina sesión local [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L60-72); cierre móvil elimina tokens y notifica el estado [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L103-107).
- Cambiar contraseña web: payload y resultado de éxito [Profile.jsx](../../Frontend/frontend_web/src/pages/Profile.jsx#L54-79); móvil envía POST [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L96-100).

### BACKEND

- Campos `nombre`, `email`, `isStaff`→`is_staff`, rol y actividad: [models.py](../../Backend/apps/usuarios/models.py#L9-36). `password` procede de AbstractBaseUser; manager aplica `set_password` antes de save y retorna usuario en [managers.py](../../Backend/apps/usuarios/managers.py#L7-14). Modelo de autenticación configurado en [base.py](../../Backend/config/settings/base.py#L102).
- `iniciarSesion()` → LoginView llama método heredado JWT, audita y retorna su respuesta en [views.py](../../Backend/apps/usuarios/views.py#L108-123); perfil retorna UsuarioSerializer [views.py](../../Backend/apps/usuarios/views.py#L533-534) con campos/empresa/permisos [serializers.py](../../Backend/apps/usuarios/serializers.py#L198-242).
- `cerrarSesion()` → LogoutView recibe refresh, lo añade a blacklist, audita y responde [views.py](../../Backend/apps/usuarios/views.py#L126-141); ruta [urls.py](../../Backend/apps/usuarios/urls.py#L55). `cambiarPassword()` → serializer verifica contraseña actual y guarda hash de la nueva [serializers.py](../../Backend/apps/usuarios/serializers.py#L358-372); vista devuelve confirmación [views.py](../../Backend/apps/usuarios/views.py#L550-555).

### BASE DE DATOS (si corresponde)

- Tabla `usuarios_usuario`, id/password/email/rol/is_staff y campos heredados: [Usuario — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L50-76); catálogo de cinco roles actualizado en [0003_rol_superadmin.py](../../Backend/apps/usuarios/migrations/0003_rol_superadmin.py#L25-39).
- Escritura de password: [serializers.py](../../Backend/apps/usuarios/serializers.py#L369-372); relación empresarial según propietario o empleado [models.py](../../Backend/apps/usuarios/models.py#L67-74). Blacklist se habilita con app [base.py](../../Backend/config/settings/base.py#L37-45) y se escribe mediante `RefreshToken.blacklist()` [views.py](../../Backend/apps/usuarios/views.py#L130-137); sus migraciones pertenecen al paquete SimpleJWT.

### ENVÍO Y RETORNO DE DATOS

1. Login POST [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L35) → ruta [urls.py](../../Backend/apps/usuarios/urls.py#L52) → super().post genera tokens y LoginView retorna respuesta en [views.py](../../Backend/apps/usuarios/views.py#L114-123) → cliente guarda tokens [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L36-37) y solicita perfil en [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L38) → Response perfil [views.py](../../Backend/apps/usuarios/views.py#L533-534) → `setUsuario`/return [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L39-40).
2. Password: POST interfaz [Profile.jsx](../../Frontend/frontend_web/src/pages/Profile.jsx#L64-70) → ruta [urls.py](../../Backend/apps/usuarios/urls.py#L57) → serializer.save valida/guarda/retorna usuario al llamador [serializers.py](../../Backend/apps/usuarios/serializers.py#L358-372) → vista retorna JSON `detail` [views.py](../../Backend/apps/usuarios/views.py#L553-555) → interfaz muestra éxito y limpia formulario [Profile.jsx](../../Frontend/frontend_web/src/pages/Profile.jsx#L68-79).
3. Logout web: POST refresh [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L62-65) → blacklist/Response [views.py](../../Backend/apps/usuarios/views.py#L130-141) → limpieza local [AuthContext.jsx](../../Frontend/frontend_web/src/context/AuthContext.jsx#L68-71). En móvil el flujo indexado termina localmente en [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L103-107).

<a id="c4-rol"></a>

## Rol

Administración SaaS Multi-Tenant. El rol de acceso principal es Usuario.Rol; el catálogo administrable se representa por RolBase y sus permisos relacionados.

### FRONTEND

- Web carga roles/permisos y guarda ambas respuestas [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L16-24); crear rol POST/recarga [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L35-48), asignar/quitar permiso y usar rol retornado [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L60-66).
- La interfaz consulta el perfil para determinar rol y permisos en [roles.js](../../Frontend/frontend_web/src/utils/roles.js#L4-36); móvil recibe el perfil con rol en [auth_service.dart](../../Mobile/vecinomarket_app/lib/services/auth_service.dart#L43-46).

### BACKEND

- Campos: RolBase.nombre [models.py](../../Backend/apps/usuarios/models.py#L91-101); códigos/descripciones están en Permiso [models.py](../../Backend/apps/usuarios/models.py#L77-88); vínculo rol–permiso [models.py](../../Backend/apps/usuarios/models.py#L104-114). Los cinco roles de identidad están declarados en [models.py](../../Backend/apps/usuarios/models.py#L10-15).
- `crearRol()`/`listarRoles()` → ListCreateAPIView y guardado [views.py](../../Backend/apps/usuarios/views.py#L927-937); RolBaseSerializer devuelve id/nombre/permisos y construye la lista relacionada [serializers.py](../../Backend/apps/usuarios/serializers.py#L547-558).
- La modificación congruente del rol administrable es su conjunto de permisos: POST/DELETE persisten y retornan rol actualizado en [views.py](../../Backend/apps/usuarios/views.py#L955-966). `verificarPermiso()` → autorización del backend para dueño/empleado y búsqueda del código de permiso [permissions.py](../../Backend/apps/usuarios/permissions.py#L57-76); roles administrativos [permissions.py](../../Backend/apps/usuarios/permissions.py#L4-23).

### BASE DE DATOS (si corresponde)

- Tablas `usuarios_rolbase`, `usuarios_permiso`, `usuarios_rolbasepermiso`: [RolBase — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L36-49), [Permiso — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L21-35), [RolBasePermiso — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L167-178). Unión con unique_together evita duplicados [models.py](../../Backend/apps/usuarios/models.py#L104-114).
- Permisos efectivos del empleado se relacionan mediante `usuarios_empleadopermiso`: [EmpleadoPermiso — 0001_initial.py](../../Backend/apps/usuarios/migrations/0001_initial.py#L155-166), [models.py](../../Backend/apps/usuarios/models.py#L221-233). Operación get_or_create/delete del permiso de rol [views.py](../../Backend/apps/usuarios/views.py#L958-966).

### ENVÍO Y RETORNO DE DATOS

1. Lista: frontend GET [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L16-20) → ruta [urls.py](../../Backend/apps/usuarios/urls.py#L103) → queryset/serializer de ListCreateAPIView [views.py](../../Backend/apps/usuarios/views.py#L927-933) → serializer obtiene permisos [serializers.py](../../Backend/apps/usuarios/serializers.py#L557-558) → cliente guarda `rolesRes.data` en [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L19).
2. Asignación: frontend POST o DELETE [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L60-65) → ruta [urls.py](../../Backend/apps/usuarios/urls.py#L105) → escritura y Response con rol [views.py](../../Backend/apps/usuarios/views.py#L955-966) → cliente actualiza fila con la respuesta en [RolesBase.jsx](../../Frontend/frontend_web/src/pages/admin/RolesBase.jsx#L66).

<a id="c4-backup"></a>

## Backup_Sistema

Auditoría, Backups y Reportes. BackupLog registra el tipo y archivo del respaldo; los servicios de backup y las vistas ejecutan, restauran y descargan contenido JSON.

### FRONTEND

- Web carga historial [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L28-34), solicita backup como blob y usa nombre de cabecera para descargarlo [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L52-72). Restauración envía archivo multipart y recibe confirmación en [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L76-96).

### BACKEND

- Campos congruentes: tipo y archivo en BackupLog [models.py](../../Backend/apps/core/models.py#L43-57); `fechaCreacion` → `creado_en` heredado [models.py](../../Backend/apps/core/models.py#L4-8). Nombre/ubicación proceden del archivo y su storage [models.py](../../Backend/apps/core/models.py#L51), [base.py](../../Backend/config/settings/base.py#L141-152); historial serializa campos con [serializers.py](../../Backend/apps/core/serializers.py#L4-7).
- `ejecutarBackup()` → helper dumpdata y retorno JSON al llamador [backup.py](../../Backend/apps/core/backup.py#L27-37); vista registra auditoría, guarda archivo y retorna descarga [views.py](../../Backend/apps/core/views.py#L26-41). Generación automática por comando [generar_backup_diario.py](../../Backend/apps/core/management/commands/generar_backup_diario.py#L7-22).
- `restaurarBackup()` → vista lee archivo y llama helper [views.py](../../Backend/apps/core/views.py#L65-80); helper prepara archivo temporal y usa loaddata [backup.py](../../Backend/apps/core/backup.py#L40-49). `descargarBackup()` → HttpResponse JSON, Content-Disposition y return [views.py](../../Backend/apps/core/views.py#L39-41).

### BASE DE DATOS (si corresponde)

- Tabla `core_backuplog`: [BackupLog — 0002_initial.py](../../Backend/apps/core/migrations/0002_initial.py#L15-28); almacenamiento raw de archivo según [0003_alter_backuplog_archivo.py](../../Backend/apps/core/migrations/0003_alter_backuplog_archivo.py#L14-18). Guardar registro/archivo [views.py](../../Backend/apps/core/views.py#L36-37); auditoría del backup/restore [views.py](../../Backend/apps/core/views.py#L30-33), [views.py](../../Backend/apps/core/views.py#L75-79).
- dumpdata selecciona los datos de las apps conforme exclusiones del helper [backup.py](../../Backend/apps/core/backup.py#L21-37); loaddata restaura registros por PK [backup.py](../../Backend/apps/core/backup.py#L40-49). Los archivos multimedia externos se representan por sus referencias serializadas en el JSON.

### ENVÍO Y RETORNO DE DATOS

1. Generar/descargar: GET cliente con responseType blob [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L57) → vista llama helper [views.py](../../Backend/apps/core/views.py#L27) → helper retorna JSON [backup.py](../../Backend/apps/core/backup.py#L37) → vista guarda archivo y retorna HttpResponse [views.py](../../Backend/apps/core/views.py#L36-41) → cliente recibe blob/cabecera y dispara descarga [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L58-67).
2. Restaurar: archivo multipart [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L87-91) → request.FILES/helper [views.py](../../Backend/apps/core/views.py#L66-71) → loaddata [backup.py](../../Backend/apps/core/backup.py#L40-49) → Response confirmación [views.py](../../Backend/apps/core/views.py#L80) → frontend muestra `data.detail` [Backup.jsx](../../Frontend/frontend_web/src/pages/admin/Backup.jsx#L92).

<a id="c4-log"></a>

## Log_Auditoria

Auditoría, Backups y Reportes. El equivalente es LogAuditoria: registra usuario, acción, entidad, detalle, IP, user agent y fechas para consulta de la bitácora.

### FRONTEND

- Bitácora web envía filtros y X-Developer-Key y recibe página/total en [Bitacora.jsx](../../Frontend/frontend_web/src/pages/Bitacora.jsx#L87-108). Móvil tiene consulta HTTP de bitácora [admin_service.dart](../../Mobile/vecinomarket_app/lib/services/admin_service.dart#L6-10); la autorización de esa consulta se resuelve en los permisos del backend.

### BACKEND

- Campos `usuario`, `accion`, `ipAddress`→`ip_origen`, entidad/detalle y user_agent: [models.py](../../Backend/apps/auditoria/models.py#L6-29); `fechaHora` → `creado_en` [models.py](../../Backend/apps/core/models.py#L4-8).
- `registrarEvento()` → helper de usuarios construye LogAuditoria con usuario/IP y finaliza sin respuesta HTTP propia [views.py](../../Backend/apps/usuarios/views.py#L67-76); ejemplos de invocación login/perfil [views.py](../../Backend/apps/usuarios/views.py#L118), [views.py](../../Backend/apps/usuarios/views.py#L543). Ajustes de stock registran evento en [views.py](../../Backend/apps/inventario/views.py#L216-218).
- `consultarLogs()` → BitacoraView exige SuperAdmin y llave, aplica filtros/orden y devuelve queryset a DRF [views.py](../../Backend/apps/auditoria/views.py#L17-37); serializer expone campos con nombre/email de usuario [serializers.py](../../Backend/apps/auditoria/serializers.py#L6-17). Se indexa la consulta HTTP de bitácora presente en el proyecto.

### BASE DE DATOS (si corresponde)

- Tabla `auditoria_logauditoria`, FK usuario y campos: [LogAuditoria — 0001_initial.py](../../Backend/apps/auditoria/migrations/0001_initial.py#L14-32); índices para acción/fecha/entidad [models.py](../../Backend/apps/auditoria/models.py#L20-29).
- Auditoría SQL genérica: INSERT del trigger en [0001_funciones_y_triggers.py](../../Backend/apps/core/migrations/0001_funciones_y_triggers.py#L23-46) y enlaces a tablas en [0001_funciones_y_triggers.py](../../Backend/apps/core/migrations/0001_funciones_y_triggers.py#L207-227). El script SQL del repositorio incluye variante con user_agent y retorno OLD/NEW: [update_trigger.sql](../../Backend/update_trigger.sql#L18-30). Cambio de rol tiene trigger específico INSERT/RETURN NEW [0002_funciones_y_triggers.py](../../Backend/apps/usuarios/migrations/0002_funciones_y_triggers.py#L21-39).

### ENVÍO Y RETORNO DE DATOS

1. Evento: LoginView invoca `_log` [views.py](../../Backend/apps/usuarios/views.py#L118) → helper persiste fila [views.py](../../Backend/apps/usuarios/views.py#L67-76) → no envía ese log a la interfaz de login; la respuesta de login se retorna por separado en [views.py](../../Backend/apps/usuarios/views.py#L123).
2. Consulta: GET con filtros/cabecera [Bitacora.jsx](../../Frontend/frontend_web/src/pages/Bitacora.jsx#L90-93) → permisos/queryset [views.py](../../Backend/apps/auditoria/views.py#L22-37) → LogAuditoriaSerializer [serializers.py](../../Backend/apps/auditoria/serializers.py#L6-17) y paginación DRF → cliente guarda `res.data.results`/`count` en [Bitacora.jsx](../../Frontend/frontend_web/src/pages/Bitacora.jsx#L95-97).

<a id="c4-valoracion"></a>

## Valoracion_Reporte

Auditoría, Backups y Reportes. Valoracion registra la reseña de un pedido entregado; las vistas y funciones SQL del módulo reportes calculan promedios y clasificaciones agregadas.

### FRONTEND

- Comprador web recibe compras/valoraciones en [MisResenas.jsx](../../Frontend/frontend_web/src/pages/MisResenas.jsx#L48-60); envía calificación/comentario/pedido y recarga datos tras éxito en [MisResenas.jsx](../../Frontend/frontend_web/src/pages/MisResenas.jsx#L87-103). Móvil presenta reseñas a partir de consultas en [buyer_reviews_screen.dart](../../Mobile/vecinomarket_app/lib/screens/buyer/buyer_reviews_screen.dart#L33-66).
- Promedios por empresa: web consulta y recibe en [Reputacion.jsx](../../Frontend/frontend_web/src/pages/admin/Reputacion.jsx#L30-40). Dashboard empresa recibe agregados en [DashboardEmpresa.jsx](../../Frontend/frontend_web/src/pages/empresa/DashboardEmpresa.jsx#L28-37); previsualización y exportación de reportes dinámicos [ReportesDinamicosBase.jsx](../../Frontend/frontend_web/src/components/reportes/ReportesDinamicosBase.jsx#L148-195).

### BACKEND

- `puntuacion` → `calificacion`, `comentario`, Pedido/Comprador/Empresa → Valoracion [models.py](../../Backend/apps/reportes/models.py#L6-26); `fecha` → `creado_en` serializado en [serializers.py](../../Backend/apps/reportes/serializers.py#L17-20).
- `registrarValoracion()` → vista verifica comprador, entrega y unicidad, guarda y retorna reseña [views.py](../../Backend/apps/reportes/views.py#L48-64). Editar guarda y responde serializer [views.py](../../Backend/apps/reportes/views.py#L67-78); campos JSON [serializers.py](../../Backend/apps/reportes/serializers.py#L6-25).
- `calcularPromedio()` → consulta AVG/COUNT, fetchall, armado de resultados y Response [views.py](../../Backend/apps/reportes/views.py#L117-135); dashboard propio llama fn_resumen_valoraciones_empresa y obtiene fila [views.py](../../Backend/apps/reportes/views.py#L311-313).
- `generarReporteTop()` → consultas de empresas y productos con sumas/ORDER BY/LIMIT [views.py](../../Backend/apps/reportes/views.py#L240-263); retorna diccionario del dashboard al llamador [views.py](../../Backend/apps/reportes/views.py#L265-276) y Response HTTP en [views.py](../../Backend/apps/reportes/views.py#L284-286). Top de productos por empresa y retorno al dashboard [views.py](../../Backend/apps/reportes/views.py#L316-358).

### BASE DE DATOS (si corresponde)

- Tabla `reportes_valoracion` con OneToOne a Pedido, FK comprador/empresa y restricción de 1 a 5: [Valoracion — 0001_initial.py](../../Backend/apps/reportes/migrations/0001_initial.py#L26-40), [models.py](../../Backend/apps/reportes/models.py#L9-24). Persistencia al crear desde pedido autenticado [views.py](../../Backend/apps/reportes/views.py#L52-64).
- `fn_resumen_valoraciones_empresa` ejecuta AVG/COUNT y RETURN QUERY, devuelve tabla al cursor Python [0003_valoracion_funciones_y_triggers.py](../../Backend/apps/reportes/migrations/0003_valoracion_funciones_y_triggers.py#L12-22), [views.py](../../Backend/apps/reportes/views.py#L311-313). Top usa tablas de empresa/producto/pedido/item/orden pagada en [views.py](../../Backend/apps/reportes/views.py#L240-263). Los resultados de reporte se calculan al consultar.

### ENVÍO Y RETORNO DE DATOS

1. Reseña: POST/PATCH interfaz [MisResenas.jsx](../../Frontend/frontend_web/src/pages/MisResenas.jsx#L92-98) → vista valida/guarda [views.py](../../Backend/apps/reportes/views.py#L48-64), [views.py](../../Backend/apps/reportes/views.py#L72-78) → Response de reseña [views.py](../../Backend/apps/reportes/views.py#L64), [views.py](../../Backend/apps/reportes/views.py#L78) → web no usa directamente su cuerpo; llama `cargar()` y obtiene nueva lista [MisResenas.jsx](../../Frontend/frontend_web/src/pages/MisResenas.jsx#L98), [MisResenas.jsx](../../Frontend/frontend_web/src/pages/MisResenas.jsx#L50-56).
2. Promedio: frontend GET [Reputacion.jsx](../../Frontend/frontend_web/src/pages/admin/Reputacion.jsx#L33-35) → SQL AVG/COUNT y fetchall [views.py](../../Backend/apps/reportes/views.py#L117-124) → Response resultados [views.py](../../Backend/apps/reportes/views.py#L127-135) → estado de empresas recibe lista [Reputacion.jsx](../../Frontend/frontend_web/src/pages/admin/Reputacion.jsx#L35).
3. Dashboard propio: GET cliente [DashboardEmpresa.jsx](../../Frontend/frontend_web/src/pages/empresa/DashboardEmpresa.jsx#L32-33) → vista invoca helper y devuelve Response [views.py](../../Backend/apps/reportes/views.py#L356-358) → helper calcula top/promedio y devuelve dict [views.py](../../Backend/apps/reportes/views.py#L311-345) → cliente guarda `res.data` [DashboardEmpresa.jsx](../../Frontend/frontend_web/src/pages/empresa/DashboardEmpresa.jsx#L33).
