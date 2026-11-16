-- =====================================================================
-- ESQUEMA ACTUAL COMPLETO DE BASE DE DATOS - VECINOMARKET
-- PostgreSQL 16 + Extensión Espacial PostGIS
-- Total de tablas operativas: 55
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabla: auditoria_logauditoria
CREATE TABLE auditoria_logauditoria (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
accion                         CHARACTER VARYING(100) NOT NULL,
entidad_afectada               CHARACTER VARYING(50) NOT NULL,
entidad_id                     BIGINT               NULL,
detalle                        JSONB                NOT NULL,
ip_origen                      INET                 NULL,
usuario_id                     BIGINT               NULL,
user_agent                     TEXT                 NULL
);

-- Tabla: auth_group
CREATE TABLE auth_group (
id                             INTEGER              NOT NULL,
name                           CHARACTER VARYING(150) NOT NULL
);

-- Tabla: auth_group_permissions
CREATE TABLE auth_group_permissions (
id                             BIGINT               NOT NULL,
group_id                       INTEGER              NOT NULL,
permission_id                  INTEGER              NOT NULL
);

-- Tabla: auth_permission
CREATE TABLE auth_permission (
id                             INTEGER              NOT NULL,
name                           CHARACTER VARYING(255) NOT NULL,
content_type_id                INTEGER              NOT NULL,
codename                       CHARACTER VARYING(100) NOT NULL
);

-- Tabla: catalogo_categoria
CREATE TABLE catalogo_categoria (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
nombre                         CHARACTER VARYING(80) NOT NULL,
descripcion                    CHARACTER VARYING(255) NOT NULL,
icono                          CHARACTER VARYING(50) NOT NULL,
categoria_padre_id             BIGINT               NULL
);

-- Tabla: catalogo_categorizacionialog
CREATE TABLE catalogo_categorizacionialog (
id                             BIGINT               NOT NULL,
confianza                      NUMERIC              NULL,
fecha                          TIMESTAMP WITH TIME ZONE NOT NULL,
categoria_sugerida_id          BIGINT               NULL,
producto_id                    BIGINT               NOT NULL
);

-- Tabla: catalogo_producto
CREATE TABLE catalogo_producto (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
nombre                         CHARACTER VARYING(150) NOT NULL,
descripcion                    TEXT                 NOT NULL,
sku                            CHARACTER VARYING(50) NOT NULL,
precio                         NUMERIC              NOT NULL,
precio_descuento               NUMERIC              NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
categoria_id                   BIGINT               NULL,
creado_por_empleado_id         BIGINT               NULL,
empresa_id                     BIGINT               NOT NULL
);

-- Tabla: catalogo_productoimagen
CREATE TABLE catalogo_productoimagen (
id                             BIGINT               NOT NULL,
url                            CHARACTER VARYING(255) NOT NULL,
orden                          SMALLINT             NOT NULL,
producto_id                    BIGINT               NOT NULL,
archivo                        CHARACTER VARYING(100) NULL
);

-- Tabla: comunicacion_chatbotfaq
CREATE TABLE comunicacion_chatbotfaq (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
palabras_clave                 CHARACTER VARYING(255) NOT NULL,
pregunta_ejemplo               CHARACTER VARYING(200) NOT NULL,
respuesta                      TEXT                 NOT NULL,
empresa_id                     BIGINT               NOT NULL
);

-- Tabla: comunicacion_chatbotinteraccion
CREATE TABLE comunicacion_chatbotinteraccion (
id                             BIGINT               NOT NULL,
pregunta                       TEXT                 NOT NULL,
respuesta                      TEXT                 NOT NULL,
fecha                          TIMESTAMP WITH TIME ZONE NOT NULL,
comprador_id                   BIGINT               NULL,
empresa_id                     BIGINT               NULL
);

-- Tabla: comunicacion_chatconversacion
CREATE TABLE comunicacion_chatconversacion (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
comprador_id                   BIGINT               NOT NULL,
empleado_asignado_id           BIGINT               NULL,
empresa_id                     BIGINT               NOT NULL
);

-- Tabla: comunicacion_chatmensaje
CREATE TABLE comunicacion_chatmensaje (
id                             BIGINT               NOT NULL,
contenido                      TEXT                 NOT NULL,
tipo                           CHARACTER VARYING(20) NOT NULL,
fecha_envio                    TIMESTAMP WITH TIME ZONE NOT NULL,
leido                          BOOLEAN              NOT NULL,
conversacion_id                BIGINT               NOT NULL,
emisor_usuario_id              BIGINT               NOT NULL,
archivo                        CHARACTER VARYING(100) NULL
);

-- Tabla: core_backuplog
CREATE TABLE core_backuplog (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
tipo                           CHARACTER VARYING(20) NOT NULL,
archivo                        CHARACTER VARYING(100) NOT NULL
);

-- Tabla: core_configuracionsistema
CREATE TABLE core_configuracionsistema (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
hora_backup                    TIME WITHOUT TIME ZONE NOT NULL
);

-- Tabla: django_admin_log
CREATE TABLE django_admin_log (
id                             INTEGER              NOT NULL,
action_time                    TIMESTAMP WITH TIME ZONE NOT NULL,
object_id                      TEXT                 NULL,
object_repr                    CHARACTER VARYING(200) NOT NULL,
action_flag                    SMALLINT             NOT NULL,
change_message                 TEXT                 NOT NULL,
content_type_id                INTEGER              NULL,
user_id                        BIGINT               NOT NULL
);

-- Tabla: django_content_type
CREATE TABLE django_content_type (
id                             INTEGER              NOT NULL,
app_label                      CHARACTER VARYING(100) NOT NULL,
model                          CHARACTER VARYING(100) NOT NULL
);

-- Tabla: django_migrations
CREATE TABLE django_migrations (
id                             BIGINT               NOT NULL,
app                            CHARACTER VARYING(255) NOT NULL,
name                           CHARACTER VARYING(255) NOT NULL,
applied                        TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Tabla: django_session
CREATE TABLE django_session (
session_key                    CHARACTER VARYING(40) NOT NULL,
session_data                   TEXT                 NOT NULL,
expire_date                    TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Tabla: facturacion_comisionventa
CREATE TABLE facturacion_comisionventa (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
monto_venta                    NUMERIC              NOT NULL,
porcentaje_aplicado            NUMERIC              NOT NULL,
monto_comision                 NUMERIC              NOT NULL,
empresa_id                     BIGINT               NOT NULL,
pedido_id                      BIGINT               NOT NULL,
factura_id                     BIGINT               NULL
);

-- Tabla: facturacion_factura
CREATE TABLE facturacion_factura (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
tipo                           CHARACTER VARYING(20) NOT NULL,
monto                          NUMERIC              NOT NULL,
periodo_desde                  DATE                 NULL,
periodo_hasta                  DATE                 NULL,
estado_pago                    CHARACTER VARYING(20) NOT NULL,
fecha_pago                     TIMESTAMP WITH TIME ZONE NULL,
empresa_id                     BIGINT               NOT NULL,
suscripcion_id                 BIGINT               NULL
);

-- Tabla: facturacion_metodopago
CREATE TABLE facturacion_metodopago (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
tipo                           CHARACTER VARYING(20) NOT NULL,
nombre                         CHARACTER VARYING(100) NOT NULL,
banco                          CHARACTER VARYING(100) NOT NULL,
numero_cuenta                  CHARACTER VARYING(50) NOT NULL,
titular                        CHARACTER VARYING(150) NOT NULL,
imagen_qr                      CHARACTER VARYING(100) NULL,
proveedor_pasarela             CHARACTER VARYING(100) NOT NULL,
referencia_pasarela            CHARACTER VARYING(150) NOT NULL,
predeterminado                 BOOLEAN              NOT NULL,
empresa_id                     BIGINT               NOT NULL
);

-- Tabla: facturacion_referido
CREATE TABLE facturacion_referido (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
beneficio_aplicado             CHARACTER VARYING(100) NOT NULL,
empresa_referente_id           BIGINT               NOT NULL,
empresa_referida_id            BIGINT               NOT NULL
);

-- Tabla: inventario_inventariosucursal
CREATE TABLE inventario_inventariosucursal (
id                             BIGINT               NOT NULL,
cantidad_disponible            INTEGER              NOT NULL,
stock_minimo                   INTEGER              NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
producto_id                    BIGINT               NOT NULL,
sucursal_id                    BIGINT               NOT NULL
);

-- Tabla: inventario_sucursal
CREATE TABLE inventario_sucursal (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
nombre                         CHARACTER VARYING(100) NOT NULL,
direccion_texto                CHARACTER VARYING(255) NOT NULL,
ubicacion                      USER-DEFINED         NULL,
telefono                       CHARACTER VARYING(20) NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
empresa_id                     BIGINT               NOT NULL
);

-- Tabla: notificaciones_notificacion
CREATE TABLE notificaciones_notificacion (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
tipo                           CHARACTER VARYING(40) NOT NULL,
titulo                         CHARACTER VARYING(120) NOT NULL,
mensaje                        CHARACTER VARYING(255) NOT NULL,
enlace                         CHARACTER VARYING(255) NOT NULL,
leido                          BOOLEAN              NOT NULL,
usuario_id                     BIGINT               NOT NULL
);

-- Tabla: pedidos_carrito
CREATE TABLE pedidos_carrito (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
comprador_id                   BIGINT               NOT NULL
);

-- Tabla: pedidos_carritoitem
CREATE TABLE pedidos_carritoitem (
id                             BIGINT               NOT NULL,
cantidad                       INTEGER              NOT NULL,
precio_unitario                NUMERIC              NOT NULL,
carrito_id                     BIGINT               NOT NULL,
producto_id                    BIGINT               NOT NULL
);

-- Tabla: pedidos_entrega
CREATE TABLE pedidos_entrega (
id                             BIGINT               NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
fecha_estimada                 DATE                 NULL,
fecha_entregada                TIMESTAMP WITH TIME ZONE NULL,
pedido_id                      BIGINT               NOT NULL
);

-- Tabla: pedidos_ordencompra
CREATE TABLE pedidos_ordencompra (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
monto_total                    NUMERIC              NOT NULL,
metodo_pago                    CHARACTER VARYING(20) NOT NULL,
estado_pago                    CHARACTER VARYING(20) NOT NULL,
comprador_id                   BIGINT               NOT NULL,
comprobante                    CHARACTER VARYING(100) NULL
);

-- Tabla: pedidos_pago
CREATE TABLE pedidos_pago (
id                             BIGINT               NOT NULL,
monto                          NUMERIC              NOT NULL,
metodo                         CHARACTER VARYING(20) NOT NULL,
referencia_pasarela            CHARACTER VARYING(100) NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
fecha_pago                     TIMESTAMP WITH TIME ZONE NULL,
orden_compra_id                BIGINT               NOT NULL,
comprobante                    CHARACTER VARYING(100) NULL
);

-- Tabla: pedidos_pedido
CREATE TABLE pedidos_pedido (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
numero_pedido                  CHARACTER VARYING(30) NOT NULL,
subtotal                       NUMERIC              NOT NULL,
comision_monto                 NUMERIC              NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
modalidad_entrega              CHARACTER VARYING(20) NOT NULL,
direccion_envio_id             BIGINT               NULL,
empresa_id                     BIGINT               NOT NULL,
orden_compra_id                BIGINT               NOT NULL,
sucursal_recojo_id             BIGINT               NULL
);

-- Tabla: pedidos_pedidoitem
CREATE TABLE pedidos_pedidoitem (
id                             BIGINT               NOT NULL,
cantidad                       INTEGER              NOT NULL,
precio_unitario                NUMERIC              NOT NULL,
subtotal                       NUMERIC              NOT NULL,
pedido_id                      BIGINT               NOT NULL,
producto_id                    BIGINT               NOT NULL
);

-- Tabla: promociones_comentariolive
CREATE TABLE promociones_comentariolive (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
texto                          CHARACTER VARYING(280) NOT NULL,
sesion_id                      BIGINT               NOT NULL,
usuario_id                     BIGINT               NOT NULL
);

-- Tabla: promociones_livecommerceproducto
CREATE TABLE promociones_livecommerceproducto (
id                             BIGINT               NOT NULL,
producto_id                    BIGINT               NOT NULL,
sesion_id                      BIGINT               NOT NULL
);

-- Tabla: promociones_livecommercesesion
CREATE TABLE promociones_livecommercesesion (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
titulo                         CHARACTER VARYING(150) NOT NULL,
url_stream                     CHARACTER VARYING(255) NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
fecha_inicio                   TIMESTAMP WITH TIME ZONE NULL,
fecha_fin                      TIMESTAMP WITH TIME ZONE NULL,
empresa_id                     BIGINT               NOT NULL,
grabacion                      CHARACTER VARYING(100) NULL,
pausado_desde                  TIMESTAMP WITH TIME ZONE NULL
);

-- Tabla: promociones_promocion
CREATE TABLE promociones_promocion (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
nombre                         CHARACTER VARYING(100) NOT NULL,
tipo                           CHARACTER VARYING(20) NOT NULL,
valor                          NUMERIC              NOT NULL,
fecha_inicio                   TIMESTAMP WITH TIME ZONE NOT NULL,
fecha_fin                      TIMESTAMP WITH TIME ZONE NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
empresa_id                     BIGINT               NOT NULL
);

-- Tabla: promociones_promocionproducto
CREATE TABLE promociones_promocionproducto (
id                             BIGINT               NOT NULL,
producto_id                    BIGINT               NOT NULL,
promocion_id                   BIGINT               NOT NULL
);

-- Tabla: reportes_recomendacionia
CREATE TABLE reportes_recomendacionia (
id                             BIGINT               NOT NULL,
score                          NUMERIC              NOT NULL,
fecha_generada                 TIMESTAMP WITH TIME ZONE NOT NULL,
comprador_id                   BIGINT               NOT NULL,
producto_id                    BIGINT               NOT NULL
);

-- Tabla: reportes_valoracion
CREATE TABLE reportes_valoracion (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
calificacion                   SMALLINT             NOT NULL,
comentario                     CHARACTER VARYING(500) NOT NULL,
comprador_id                   BIGINT               NOT NULL,
empresa_id                     BIGINT               NOT NULL,
pedido_id                      BIGINT               NOT NULL
);

-- Tabla: suscripciones_plan
CREATE TABLE suscripciones_plan (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
nombre                         CHARACTER VARYING(50) NOT NULL,
precio_mensual                 NUMERIC              NOT NULL,
limite_productos               INTEGER              NULL,
incluye_live_commerce          BOOLEAN              NOT NULL,
incluye_ia                     BOOLEAN              NOT NULL,
porcentaje_comision            NUMERIC              NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
codigo                         CHARACTER VARYING(20) NULL,
duracion_dias                  INTEGER              NOT NULL
);

-- Tabla: suscripciones_suscripcion
CREATE TABLE suscripciones_suscripcion (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
fecha_inicio                   TIMESTAMP WITH TIME ZONE NOT NULL,
fecha_vencimiento              TIMESTAMP WITH TIME ZONE NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
renovacion_automatica          BOOLEAN              NOT NULL,
empresa_id                     BIGINT               NOT NULL,
plan_id                        BIGINT               NOT NULL
);

-- Tabla: token_blacklist_blacklistedtoken
CREATE TABLE token_blacklist_blacklistedtoken (
id                             BIGINT               NOT NULL,
blacklisted_at                 TIMESTAMP WITH TIME ZONE NOT NULL,
token_id                       BIGINT               NOT NULL
);

-- Tabla: token_blacklist_outstandingtoken
CREATE TABLE token_blacklist_outstandingtoken (
id                             BIGINT               NOT NULL,
token                          TEXT                 NOT NULL,
created_at                     TIMESTAMP WITH TIME ZONE NULL,
expires_at                     TIMESTAMP WITH TIME ZONE NOT NULL,
user_id                        BIGINT               NULL,
jti                            CHARACTER VARYING(255) NOT NULL
);

-- Tabla: usuarios_comprador
CREATE TABLE usuarios_comprador (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
ubicacion_default              USER-DEFINED         NULL,
departamento                   CHARACTER VARYING(60) NOT NULL,
usuario_id                     BIGINT               NOT NULL
);

-- Tabla: usuarios_direccion
CREATE TABLE usuarios_direccion (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
alias                          CHARACTER VARYING(50) NOT NULL,
direccion_texto                CHARACTER VARYING(255) NOT NULL,
ubicacion                      USER-DEFINED         NOT NULL,
departamento                   CHARACTER VARYING(60) NOT NULL,
ciudad                         CHARACTER VARYING(60) NOT NULL,
es_predeterminada              BOOLEAN              NOT NULL,
comprador_id                   BIGINT               NOT NULL
);

-- Tabla: usuarios_empleado
CREATE TABLE usuarios_empleado (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
cargo                          CHARACTER VARYING(60) NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
usuario_id                     BIGINT               NOT NULL,
empresa_id                     BIGINT               NOT NULL
);

-- Tabla: usuarios_empleadopermiso
CREATE TABLE usuarios_empleadopermiso (
id                             BIGINT               NOT NULL,
empleado_id                    BIGINT               NOT NULL,
permiso_id                     BIGINT               NOT NULL
);

-- Tabla: usuarios_empresa
CREATE TABLE usuarios_empresa (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
razon_social                   CHARACTER VARYING(150) NOT NULL,
nit                            CHARACTER VARYING(30) NOT NULL,
slug                           CHARACTER VARYING(80) NOT NULL,
logo_url                       CHARACTER VARYING(255) NOT NULL,
color_marca                    CHARACTER VARYING(7) NOT NULL,
descripcion                    CHARACTER VARYING(500) NOT NULL,
ubicacion                      USER-DEFINED         NULL,
departamento                   CHARACTER VARYING(60) NOT NULL,
ciudad                         CHARACTER VARYING(60) NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
plan_id                        BIGINT               NULL,
usuario_dueno_id               BIGINT               NOT NULL,
solicitud_id                   BIGINT               NULL,
referida_por_id                BIGINT               NULL,
bloqueo_live_hasta             TIMESTAMP WITH TIME ZONE NULL
);

-- Tabla: usuarios_permiso
CREATE TABLE usuarios_permiso (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
codigo                         CHARACTER VARYING(50) NOT NULL,
descripcion                    CHARACTER VARYING(200) NOT NULL
);

-- Tabla: usuarios_rolbase
CREATE TABLE usuarios_rolbase (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
nombre                         CHARACTER VARYING(50) NOT NULL
);

-- Tabla: usuarios_rolbasepermiso
CREATE TABLE usuarios_rolbasepermiso (
id                             BIGINT               NOT NULL,
permiso_id                     BIGINT               NOT NULL,
rol_base_id                    BIGINT               NOT NULL
);

-- Tabla: usuarios_solicitudempresa
CREATE TABLE usuarios_solicitudempresa (
id                             BIGINT               NOT NULL,
creado_en                      TIMESTAMP WITH TIME ZONE NOT NULL,
actualizado_en                 TIMESTAMP WITH TIME ZONE NOT NULL,
activo                         BOOLEAN              NOT NULL,
razon_social                   CHARACTER VARYING(150) NOT NULL,
nit                            CHARACTER VARYING(30) NOT NULL,
documento_url                  CHARACTER VARYING(255) NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
motivo_rechazo                 CHARACTER VARYING(255) NOT NULL,
fecha_revision                 TIMESTAMP WITH TIME ZONE NULL,
revisado_por_admin_id          BIGINT               NULL,
usuario_solicitante_id         BIGINT               NOT NULL,
codigo_referido                CHARACTER VARYING(80) NOT NULL,
paypal_order_id                CHARACTER VARYING(50) NOT NULL,
plan_id                        BIGINT               NULL
);

-- Tabla: usuarios_usuario
CREATE TABLE usuarios_usuario (
id                             BIGINT               NOT NULL,
password                       CHARACTER VARYING(128) NOT NULL,
last_login                     TIMESTAMP WITH TIME ZONE NULL,
is_superuser                   BOOLEAN              NOT NULL,
email                          CHARACTER VARYING(150) NOT NULL,
nombre                         CHARACTER VARYING(100) NOT NULL,
apellido                       CHARACTER VARYING(100) NOT NULL,
telefono                       CHARACTER VARYING(20) NOT NULL,
rol                            CHARACTER VARYING(20) NOT NULL,
estado                         CHARACTER VARYING(20) NOT NULL,
fecha_registro                 TIMESTAMP WITH TIME ZONE NOT NULL,
is_active                      BOOLEAN              NOT NULL,
is_staff                       BOOLEAN              NOT NULL,
correo_recuperacion            CHARACTER VARYING(150) NOT NULL
);

-- Tabla: usuarios_usuario_groups
CREATE TABLE usuarios_usuario_groups (
id                             BIGINT               NOT NULL,
usuario_id                     BIGINT               NOT NULL,
group_id                       INTEGER              NOT NULL
);

-- Tabla: usuarios_usuario_user_permissions
CREATE TABLE usuarios_usuario_user_permissions (
id                             BIGINT               NOT NULL,
usuario_id                     BIGINT               NOT NULL,
permission_id                  INTEGER              NOT NULL
);
