-- =====================================================================
-- ESQUEMA REAL Y EXACTO EXTRAÍDO DIRECTAMENTE DE SUPABASE
-- PostgreSQL 17.11 (AWS São Paulo)
-- Total de tablas en el esquema public: 56
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- -------------------------------------------------------------
-- Tabla: auditoria_logauditoria
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria_logauditoria (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    accion                         VARCHAR(100)       NOT NULL,
    entidad_afectada               VARCHAR(50)        NOT NULL,
    entidad_id                     BIGINT             NULL,
    detalle                        JSONB              NOT NULL,
    ip_origen                      INET               NULL,
    usuario_id                     BIGINT             NULL,
    user_agent                     TEXT               NULL DEFAULT ''::text,
    CONSTRAINT auditoria_logauditoria_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: auth_group
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_group (
    id                             INTEGER            NOT NULL,
    name                           VARCHAR(150)       NOT NULL,
    CONSTRAINT auth_group_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: auth_group_permissions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_group_permissions (
    id                             BIGINT             NOT NULL,
    group_id                       INTEGER            NOT NULL,
    permission_id                  INTEGER            NOT NULL,
    CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: auth_permission
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_permission (
    id                             INTEGER            NOT NULL,
    name                           VARCHAR(255)       NOT NULL,
    content_type_id                INTEGER            NOT NULL,
    codename                       VARCHAR(100)       NOT NULL,
    CONSTRAINT auth_permission_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: catalogo_categoria
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_categoria (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    nombre                         VARCHAR(80)        NOT NULL,
    descripcion                    VARCHAR(255)       NOT NULL,
    icono                          VARCHAR(50)        NOT NULL,
    categoria_padre_id             BIGINT             NULL,
    CONSTRAINT catalogo_categoria_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: catalogo_categorizacionialog
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_categorizacionialog (
    id                             BIGINT             NOT NULL,
    confianza                      NUMERIC            NULL,
    fecha                          TIMESTAMPTZ        NOT NULL,
    categoria_sugerida_id          BIGINT             NULL,
    producto_id                    BIGINT             NOT NULL,
    CONSTRAINT catalogo_categorizacionialog_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: catalogo_producto
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_producto (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    nombre                         VARCHAR(150)       NOT NULL,
    descripcion                    TEXT               NOT NULL,
    sku                            VARCHAR(50)        NOT NULL,
    precio                         NUMERIC            NOT NULL,
    precio_descuento               NUMERIC            NULL,
    estado                         VARCHAR(20)        NOT NULL,
    categoria_id                   BIGINT             NULL,
    creado_por_empleado_id         BIGINT             NULL,
    empresa_id                     BIGINT             NOT NULL,
    CONSTRAINT catalogo_producto_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: catalogo_productoimagen
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_productoimagen (
    id                             BIGINT             NOT NULL,
    url                            VARCHAR(255)       NOT NULL,
    orden                          SMALLINT           NOT NULL,
    producto_id                    BIGINT             NOT NULL,
    archivo                        VARCHAR(100)       NULL,
    CONSTRAINT catalogo_productoimagen_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: comunicacion_chatbotfaq
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comunicacion_chatbotfaq (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    palabras_clave                 VARCHAR(255)       NOT NULL,
    pregunta_ejemplo               VARCHAR(200)       NOT NULL,
    respuesta                      TEXT               NOT NULL,
    empresa_id                     BIGINT             NOT NULL,
    CONSTRAINT comunicacion_chatbotfaq_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: comunicacion_chatbotinteraccion
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comunicacion_chatbotinteraccion (
    id                             BIGINT             NOT NULL,
    pregunta                       TEXT               NOT NULL,
    respuesta                      TEXT               NOT NULL,
    fecha                          TIMESTAMPTZ        NOT NULL,
    comprador_id                   BIGINT             NULL,
    empresa_id                     BIGINT             NULL,
    CONSTRAINT comunicacion_chatbotinteraccion_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: comunicacion_chatconversacion
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comunicacion_chatconversacion (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    comprador_id                   BIGINT             NOT NULL,
    empleado_asignado_id           BIGINT             NULL,
    empresa_id                     BIGINT             NOT NULL,
    CONSTRAINT comunicacion_chatconversacion_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: comunicacion_chatmensaje
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comunicacion_chatmensaje (
    id                             BIGINT             NOT NULL,
    contenido                      TEXT               NOT NULL,
    tipo                           VARCHAR(20)        NOT NULL,
    fecha_envio                    TIMESTAMPTZ        NOT NULL,
    leido                          BOOLEAN            NOT NULL,
    conversacion_id                BIGINT             NOT NULL,
    emisor_usuario_id              BIGINT             NOT NULL,
    archivo                        VARCHAR(100)       NULL,
    CONSTRAINT comunicacion_chatmensaje_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: core_backuplog
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core_backuplog (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    tipo                           VARCHAR(20)        NOT NULL,
    archivo                        VARCHAR(100)       NOT NULL,
    CONSTRAINT core_backuplog_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: core_configuracionsistema
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core_configuracionsistema (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    hora_backup                    TIME               NOT NULL,
    CONSTRAINT core_configuracionsistema_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: django_admin_log
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS django_admin_log (
    id                             INTEGER            NOT NULL,
    action_time                    TIMESTAMPTZ        NOT NULL,
    object_id                      TEXT               NULL,
    object_repr                    VARCHAR(200)       NOT NULL,
    action_flag                    SMALLINT           NOT NULL,
    change_message                 TEXT               NOT NULL,
    content_type_id                INTEGER            NULL,
    user_id                        BIGINT             NOT NULL,
    CONSTRAINT django_admin_log_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: django_content_type
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS django_content_type (
    id                             INTEGER            NOT NULL,
    app_label                      VARCHAR(100)       NOT NULL,
    model                          VARCHAR(100)       NOT NULL,
    CONSTRAINT django_content_type_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: django_migrations
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS django_migrations (
    id                             BIGINT             NOT NULL,
    app                            VARCHAR(255)       NOT NULL,
    name                           VARCHAR(255)       NOT NULL,
    applied                        TIMESTAMPTZ        NOT NULL,
    CONSTRAINT django_migrations_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: django_session
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS django_session (
    session_key                    VARCHAR(40)        NOT NULL,
    session_data                   TEXT               NOT NULL,
    expire_date                    TIMESTAMPTZ        NOT NULL,
    CONSTRAINT django_session_pkey PRIMARY KEY (session_key)
);

-- -------------------------------------------------------------
-- Tabla: facturacion_comisionventa
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturacion_comisionventa (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    monto_venta                    NUMERIC            NOT NULL,
    porcentaje_aplicado            NUMERIC            NOT NULL,
    monto_comision                 NUMERIC            NOT NULL,
    empresa_id                     BIGINT             NOT NULL,
    pedido_id                      BIGINT             NOT NULL,
    factura_id                     BIGINT             NULL,
    CONSTRAINT facturacion_comisionventa_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: facturacion_factura
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturacion_factura (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    tipo                           VARCHAR(20)        NOT NULL,
    monto                          NUMERIC            NOT NULL,
    periodo_desde                  DATE               NULL,
    periodo_hasta                  DATE               NULL,
    estado_pago                    VARCHAR(20)        NOT NULL,
    fecha_pago                     TIMESTAMPTZ        NULL,
    empresa_id                     BIGINT             NOT NULL,
    suscripcion_id                 BIGINT             NULL,
    CONSTRAINT facturacion_factura_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: facturacion_metodopago
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturacion_metodopago (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    tipo                           VARCHAR(20)        NOT NULL,
    nombre                         VARCHAR(100)       NOT NULL,
    banco                          VARCHAR(100)       NOT NULL,
    numero_cuenta                  VARCHAR(50)        NOT NULL,
    titular                        VARCHAR(150)       NOT NULL,
    imagen_qr                      VARCHAR(100)       NULL,
    proveedor_pasarela             VARCHAR(100)       NOT NULL,
    referencia_pasarela            VARCHAR(150)       NOT NULL,
    predeterminado                 BOOLEAN            NOT NULL,
    empresa_id                     BIGINT             NOT NULL,
    CONSTRAINT facturacion_metodopago_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: facturacion_referido
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturacion_referido (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    beneficio_aplicado             VARCHAR(100)       NOT NULL,
    empresa_referente_id           BIGINT             NOT NULL,
    empresa_referida_id            BIGINT             NOT NULL,
    CONSTRAINT facturacion_referido_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: inventario_inventariosucursal
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventario_inventariosucursal (
    id                             BIGINT             NOT NULL,
    cantidad_disponible            INTEGER            NOT NULL,
    stock_minimo                   INTEGER            NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    producto_id                    BIGINT             NOT NULL,
    sucursal_id                    BIGINT             NOT NULL,
    CONSTRAINT inventario_inventariosucursal_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: inventario_sucursal
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventario_sucursal (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    nombre                         VARCHAR(100)       NOT NULL,
    direccion_texto                VARCHAR(255)       NOT NULL,
    ubicacion                      GEOGRAPHY          NULL,
    telefono                       VARCHAR(20)        NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    empresa_id                     BIGINT             NOT NULL,
    CONSTRAINT inventario_sucursal_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: notificaciones_notificacion
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones_notificacion (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    tipo                           VARCHAR(40)        NOT NULL,
    titulo                         VARCHAR(120)       NOT NULL,
    mensaje                        VARCHAR(255)       NOT NULL,
    enlace                         VARCHAR(255)       NOT NULL,
    leido                          BOOLEAN            NOT NULL,
    usuario_id                     BIGINT             NOT NULL,
    CONSTRAINT notificaciones_notificacion_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: pedidos_carrito
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos_carrito (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    comprador_id                   BIGINT             NOT NULL,
    CONSTRAINT pedidos_carrito_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: pedidos_carritoitem
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos_carritoitem (
    id                             BIGINT             NOT NULL,
    cantidad                       INTEGER            NOT NULL,
    precio_unitario                NUMERIC            NOT NULL,
    carrito_id                     BIGINT             NOT NULL,
    producto_id                    BIGINT             NOT NULL,
    CONSTRAINT pedidos_carritoitem_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: pedidos_entrega
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos_entrega (
    id                             BIGINT             NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    fecha_estimada                 DATE               NULL,
    fecha_entregada                TIMESTAMPTZ        NULL,
    pedido_id                      BIGINT             NOT NULL,
    CONSTRAINT pedidos_entrega_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: pedidos_ordencompra
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos_ordencompra (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    monto_total                    NUMERIC            NOT NULL,
    metodo_pago                    VARCHAR(20)        NOT NULL,
    estado_pago                    VARCHAR(20)        NOT NULL,
    comprador_id                   BIGINT             NOT NULL,
    comprobante                    VARCHAR(100)       NULL,
    CONSTRAINT pedidos_ordencompra_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: pedidos_pago
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos_pago (
    id                             BIGINT             NOT NULL,
    monto                          NUMERIC            NOT NULL,
    metodo                         VARCHAR(20)        NOT NULL,
    referencia_pasarela            VARCHAR(100)       NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    fecha_pago                     TIMESTAMPTZ        NULL,
    orden_compra_id                BIGINT             NOT NULL,
    comprobante                    VARCHAR(100)       NULL,
    CONSTRAINT pedidos_pago_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: pedidos_pedido
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos_pedido (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    numero_pedido                  VARCHAR(30)        NOT NULL,
    subtotal                       NUMERIC            NOT NULL,
    comision_monto                 NUMERIC            NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    modalidad_entrega              VARCHAR(20)        NOT NULL,
    direccion_envio_id             BIGINT             NULL,
    empresa_id                     BIGINT             NOT NULL,
    orden_compra_id                BIGINT             NOT NULL,
    sucursal_recojo_id             BIGINT             NULL,
    CONSTRAINT pedidos_pedido_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: pedidos_pedidoitem
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos_pedidoitem (
    id                             BIGINT             NOT NULL,
    cantidad                       INTEGER            NOT NULL,
    precio_unitario                NUMERIC            NOT NULL,
    subtotal                       NUMERIC            NOT NULL,
    pedido_id                      BIGINT             NOT NULL,
    producto_id                    BIGINT             NOT NULL,
    CONSTRAINT pedidos_pedidoitem_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: promociones_comentariolive
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promociones_comentariolive (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    texto                          VARCHAR(280)       NOT NULL,
    sesion_id                      BIGINT             NOT NULL,
    usuario_id                     BIGINT             NOT NULL,
    CONSTRAINT promociones_comentariolive_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: promociones_livecommerceproducto
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promociones_livecommerceproducto (
    id                             BIGINT             NOT NULL,
    producto_id                    BIGINT             NOT NULL,
    sesion_id                      BIGINT             NOT NULL,
    CONSTRAINT promociones_livecommerceproducto_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: promociones_livecommercesesion
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promociones_livecommercesesion (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    titulo                         VARCHAR(150)       NOT NULL,
    url_stream                     VARCHAR(255)       NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    fecha_inicio                   TIMESTAMPTZ        NULL,
    fecha_fin                      TIMESTAMPTZ        NULL,
    empresa_id                     BIGINT             NOT NULL,
    grabacion                      VARCHAR(100)       NULL,
    pausado_desde                  TIMESTAMPTZ        NULL,
    CONSTRAINT promociones_livecommercesesion_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: promociones_promocion
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promociones_promocion (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    nombre                         VARCHAR(100)       NOT NULL,
    tipo                           VARCHAR(20)        NOT NULL,
    valor                          NUMERIC            NOT NULL,
    fecha_inicio                   TIMESTAMPTZ        NOT NULL,
    fecha_fin                      TIMESTAMPTZ        NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    empresa_id                     BIGINT             NOT NULL,
    CONSTRAINT promociones_promocion_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: promociones_promocionproducto
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promociones_promocionproducto (
    id                             BIGINT             NOT NULL,
    producto_id                    BIGINT             NOT NULL,
    promocion_id                   BIGINT             NOT NULL,
    CONSTRAINT promociones_promocionproducto_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: reportes_recomendacionia
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes_recomendacionia (
    id                             BIGINT             NOT NULL,
    score                          NUMERIC            NOT NULL,
    fecha_generada                 TIMESTAMPTZ        NOT NULL,
    comprador_id                   BIGINT             NOT NULL,
    producto_id                    BIGINT             NOT NULL,
    CONSTRAINT reportes_recomendacionia_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: reportes_valoracion
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes_valoracion (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    calificacion                   SMALLINT           NOT NULL,
    comentario                     VARCHAR(500)       NOT NULL,
    comprador_id                   BIGINT             NOT NULL,
    empresa_id                     BIGINT             NOT NULL,
    pedido_id                      BIGINT             NOT NULL,
    CONSTRAINT reportes_valoracion_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: spatial_ref_sys
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_ref_sys (
    srid                           INTEGER            NOT NULL,
    auth_name                      VARCHAR(256)       NULL,
    auth_srid                      INTEGER            NULL,
    srtext                         VARCHAR(2048)      NULL,
    proj4text                      VARCHAR(2048)      NULL,
    CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);

-- -------------------------------------------------------------
-- Tabla: suscripciones_plan
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suscripciones_plan (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    nombre                         VARCHAR(50)        NOT NULL,
    precio_mensual                 NUMERIC            NOT NULL,
    limite_productos               INTEGER            NULL,
    incluye_live_commerce          BOOLEAN            NOT NULL,
    incluye_ia                     BOOLEAN            NOT NULL,
    porcentaje_comision            NUMERIC            NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    codigo                         VARCHAR(20)        NULL,
    duracion_dias                  INTEGER            NOT NULL,
    CONSTRAINT suscripciones_plan_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: suscripciones_suscripcion
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suscripciones_suscripcion (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    fecha_inicio                   TIMESTAMPTZ        NOT NULL,
    fecha_vencimiento              TIMESTAMPTZ        NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    renovacion_automatica          BOOLEAN            NOT NULL,
    empresa_id                     BIGINT             NOT NULL,
    plan_id                        BIGINT             NOT NULL,
    CONSTRAINT suscripciones_suscripcion_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: token_blacklist_blacklistedtoken
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS token_blacklist_blacklistedtoken (
    id                             BIGINT             NOT NULL,
    blacklisted_at                 TIMESTAMPTZ        NOT NULL,
    token_id                       BIGINT             NOT NULL,
    CONSTRAINT token_blacklist_blacklistedtoken_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: token_blacklist_outstandingtoken
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS token_blacklist_outstandingtoken (
    id                             BIGINT             NOT NULL,
    token                          TEXT               NOT NULL,
    created_at                     TIMESTAMPTZ        NULL,
    expires_at                     TIMESTAMPTZ        NOT NULL,
    user_id                        BIGINT             NULL,
    jti                            VARCHAR(255)       NOT NULL,
    CONSTRAINT token_blacklist_outstandingtoken_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_comprador
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_comprador (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    ubicacion_default              GEOGRAPHY          NULL,
    departamento                   VARCHAR(60)        NOT NULL,
    usuario_id                     BIGINT             NOT NULL,
    CONSTRAINT usuarios_comprador_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_direccion
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_direccion (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    alias                          VARCHAR(50)        NOT NULL,
    direccion_texto                VARCHAR(255)       NOT NULL,
    ubicacion                      GEOGRAPHY          NOT NULL,
    departamento                   VARCHAR(60)        NOT NULL,
    ciudad                         VARCHAR(60)        NOT NULL,
    es_predeterminada              BOOLEAN            NOT NULL,
    comprador_id                   BIGINT             NOT NULL,
    CONSTRAINT usuarios_direccion_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_empleado
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_empleado (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    cargo                          VARCHAR(60)        NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    usuario_id                     BIGINT             NOT NULL,
    empresa_id                     BIGINT             NOT NULL,
    CONSTRAINT usuarios_empleado_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_empleadopermiso
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_empleadopermiso (
    id                             BIGINT             NOT NULL,
    empleado_id                    BIGINT             NOT NULL,
    permiso_id                     BIGINT             NOT NULL,
    CONSTRAINT usuarios_empleadopermiso_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_empresa
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_empresa (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    razon_social                   VARCHAR(150)       NOT NULL,
    nit                            VARCHAR(30)        NOT NULL,
    slug                           VARCHAR(80)        NOT NULL,
    logo_url                       VARCHAR(255)       NOT NULL,
    color_marca                    VARCHAR(7)         NOT NULL,
    descripcion                    VARCHAR(500)       NOT NULL,
    ubicacion                      GEOGRAPHY          NULL,
    departamento                   VARCHAR(60)        NOT NULL,
    ciudad                         VARCHAR(60)        NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    plan_id                        BIGINT             NULL,
    usuario_dueno_id               BIGINT             NOT NULL,
    solicitud_id                   BIGINT             NULL,
    referida_por_id                BIGINT             NULL,
    bloqueo_live_hasta             TIMESTAMPTZ        NULL,
    CONSTRAINT usuarios_empresa_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_permiso
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_permiso (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    codigo                         VARCHAR(50)        NOT NULL,
    descripcion                    VARCHAR(200)       NOT NULL,
    CONSTRAINT usuarios_permiso_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_rolbase
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_rolbase (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    nombre                         VARCHAR(50)        NOT NULL,
    CONSTRAINT usuarios_rolbase_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_rolbasepermiso
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_rolbasepermiso (
    id                             BIGINT             NOT NULL,
    permiso_id                     BIGINT             NOT NULL,
    rol_base_id                    BIGINT             NOT NULL,
    CONSTRAINT usuarios_rolbasepermiso_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_solicitudempresa
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_solicitudempresa (
    id                             BIGINT             NOT NULL,
    creado_en                      TIMESTAMPTZ        NOT NULL,
    actualizado_en                 TIMESTAMPTZ        NOT NULL,
    activo                         BOOLEAN            NOT NULL,
    razon_social                   VARCHAR(150)       NOT NULL,
    nit                            VARCHAR(30)        NOT NULL,
    documento_url                  VARCHAR(255)       NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    motivo_rechazo                 VARCHAR(255)       NOT NULL,
    fecha_revision                 TIMESTAMPTZ        NULL,
    revisado_por_admin_id          BIGINT             NULL,
    usuario_solicitante_id         BIGINT             NOT NULL,
    codigo_referido                VARCHAR(80)        NOT NULL,
    paypal_order_id                VARCHAR(50)        NOT NULL,
    plan_id                        BIGINT             NULL,
    CONSTRAINT usuarios_solicitudempresa_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_usuario
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_usuario (
    id                             BIGINT             NOT NULL,
    password                       VARCHAR(128)       NOT NULL,
    last_login                     TIMESTAMPTZ        NULL,
    is_superuser                   BOOLEAN            NOT NULL,
    email                          VARCHAR(150)       NOT NULL,
    nombre                         VARCHAR(100)       NOT NULL,
    apellido                       VARCHAR(100)       NOT NULL,
    telefono                       VARCHAR(20)        NOT NULL,
    rol                            VARCHAR(20)        NOT NULL,
    estado                         VARCHAR(20)        NOT NULL,
    fecha_registro                 TIMESTAMPTZ        NOT NULL,
    is_active                      BOOLEAN            NOT NULL,
    is_staff                       BOOLEAN            NOT NULL,
    correo_recuperacion            VARCHAR(150)       NOT NULL,
    CONSTRAINT usuarios_usuario_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_usuario_groups
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_usuario_groups (
    id                             BIGINT             NOT NULL,
    usuario_id                     BIGINT             NOT NULL,
    group_id                       INTEGER            NOT NULL,
    CONSTRAINT usuarios_usuario_groups_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Tabla: usuarios_usuario_user_permissions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_usuario_user_permissions (
    id                             BIGINT             NOT NULL,
    usuario_id                     BIGINT             NOT NULL,
    permission_id                  INTEGER            NOT NULL,
    CONSTRAINT usuarios_usuario_user_permissions_pkey PRIMARY KEY (id)
);


-- =====================================================================
-- CLAVES FORÁNEAS (RELACIONES) EN SUPABASE
-- =====================================================================

ALTER TABLE auditoria_logauditoria ADD CONSTRAINT auditoria_logauditor_usuario_id_35a70949_fk_usuarios_ FOREIGN KEY (usuario_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE auth_group_permissions ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES auth_group (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE auth_group_permissions ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES auth_permission (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE auth_permission ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES django_content_type (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE catalogo_categoria ADD CONSTRAINT catalogo_categoria_categoria_padre_id_914f4e8a_fk_catalogo_ FOREIGN KEY (categoria_padre_id) REFERENCES catalogo_categoria (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE catalogo_categorizacionialog ADD CONSTRAINT catalogo_categorizac_categoria_sugerida_i_17a77e0d_fk_catalogo_ FOREIGN KEY (categoria_sugerida_id) REFERENCES catalogo_categoria (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE catalogo_categorizacionialog ADD CONSTRAINT catalogo_categorizac_producto_id_839f09ac_fk_catalogo_ FOREIGN KEY (producto_id) REFERENCES catalogo_producto (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE catalogo_producto ADD CONSTRAINT catalogo_producto_categoria_id_19eecf17_fk_catalogo_ FOREIGN KEY (categoria_id) REFERENCES catalogo_categoria (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE catalogo_producto ADD CONSTRAINT catalogo_producto_creado_por_empleado__c23185be_fk_usuarios_ FOREIGN KEY (creado_por_empleado_id) REFERENCES usuarios_empleado (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE catalogo_producto ADD CONSTRAINT catalogo_producto_empresa_id_5dc372ce_fk_usuarios_empresa_id FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE catalogo_productoimagen ADD CONSTRAINT catalogo_productoima_producto_id_b83cd07c_fk_catalogo_ FOREIGN KEY (producto_id) REFERENCES catalogo_producto (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE comunicacion_chatbotfaq ADD CONSTRAINT comunicacion_chatbot_empresa_id_76f23a38_fk_usuarios_ FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE comunicacion_chatbotinteraccion ADD CONSTRAINT comunicacion_chatbot_comprador_id_5712d276_fk_usuarios_ FOREIGN KEY (comprador_id) REFERENCES usuarios_comprador (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE comunicacion_chatbotinteraccion ADD CONSTRAINT comunicacion_chatbot_empresa_id_5abf9b87_fk_usuarios_ FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE comunicacion_chatconversacion ADD CONSTRAINT comunicacion_chatcon_comprador_id_7b20d92d_fk_usuarios_ FOREIGN KEY (comprador_id) REFERENCES usuarios_comprador (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE comunicacion_chatconversacion ADD CONSTRAINT comunicacion_chatcon_empleado_asignado_id_aaccc0a2_fk_usuarios_ FOREIGN KEY (empleado_asignado_id) REFERENCES usuarios_empleado (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE comunicacion_chatconversacion ADD CONSTRAINT comunicacion_chatcon_empresa_id_e5109c6a_fk_usuarios_ FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE comunicacion_chatmensaje ADD CONSTRAINT comunicacion_chatmen_conversacion_id_48da6469_fk_comunicac FOREIGN KEY (conversacion_id) REFERENCES comunicacion_chatconversacion (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE comunicacion_chatmensaje ADD CONSTRAINT comunicacion_chatmen_emisor_usuario_id_88e30b0a_fk_usuarios_ FOREIGN KEY (emisor_usuario_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE django_admin_log ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES django_content_type (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE django_admin_log ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_usuarios_usuario_id FOREIGN KEY (user_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE facturacion_comisionventa ADD CONSTRAINT facturacion_comision_empresa_id_4e5d6c46_fk_usuarios_ FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE facturacion_comisionventa ADD CONSTRAINT facturacion_comision_factura_id_8fdd85ac_fk_facturaci FOREIGN KEY (factura_id) REFERENCES facturacion_factura (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE facturacion_comisionventa ADD CONSTRAINT facturacion_comision_pedido_id_bc087196_fk_pedidos_p FOREIGN KEY (pedido_id) REFERENCES pedidos_pedido (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE facturacion_factura ADD CONSTRAINT facturacion_factura_empresa_id_f4582b4b_fk_usuarios_empresa_id FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE facturacion_factura ADD CONSTRAINT facturacion_factura_suscripcion_id_dbd87737_fk_suscripci FOREIGN KEY (suscripcion_id) REFERENCES suscripciones_suscripcion (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE facturacion_metodopago ADD CONSTRAINT facturacion_metodopa_empresa_id_1003e5d2_fk_usuarios_ FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE facturacion_referido ADD CONSTRAINT facturacion_referido_empresa_referente_id_8696ed11_fk_usuarios_ FOREIGN KEY (empresa_referente_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE facturacion_referido ADD CONSTRAINT facturacion_referido_empresa_referida_id_175a46c2_fk_usuarios_ FOREIGN KEY (empresa_referida_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE inventario_inventariosucursal ADD CONSTRAINT inventario_inventari_producto_id_abee65d6_fk_catalogo_ FOREIGN KEY (producto_id) REFERENCES catalogo_producto (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE inventario_inventariosucursal ADD CONSTRAINT inventario_inventari_sucursal_id_3b94fea9_fk_inventari FOREIGN KEY (sucursal_id) REFERENCES inventario_sucursal (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE inventario_sucursal ADD CONSTRAINT inventario_sucursal_empresa_id_bfa3b35e_fk_usuarios_empresa_id FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE notificaciones_notificacion ADD CONSTRAINT notificaciones_notif_usuario_id_4bc090a3_fk_usuarios_ FOREIGN KEY (usuario_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_carrito ADD CONSTRAINT pedidos_carrito_comprador_id_fe524720_fk_usuarios_comprador_id FOREIGN KEY (comprador_id) REFERENCES usuarios_comprador (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_carritoitem ADD CONSTRAINT pedidos_carritoitem_carrito_id_e2fd3d94_fk_pedidos_carrito_id FOREIGN KEY (carrito_id) REFERENCES pedidos_carrito (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_carritoitem ADD CONSTRAINT pedidos_carritoitem_producto_id_333b3143_fk_catalogo_ FOREIGN KEY (producto_id) REFERENCES catalogo_producto (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_entrega ADD CONSTRAINT pedidos_entrega_pedido_id_a420b060_fk_pedidos_pedido_id FOREIGN KEY (pedido_id) REFERENCES pedidos_pedido (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_ordencompra ADD CONSTRAINT pedidos_ordencompra_comprador_id_4f241c4e_fk_usuarios_ FOREIGN KEY (comprador_id) REFERENCES usuarios_comprador (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_pago ADD CONSTRAINT pedidos_pago_orden_compra_id_98d90a7e_fk_pedidos_ordencompra_id FOREIGN KEY (orden_compra_id) REFERENCES pedidos_ordencompra (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_pedido ADD CONSTRAINT pedidos_pedido_direccion_envio_id_2b419ad4_fk_usuarios_ FOREIGN KEY (direccion_envio_id) REFERENCES usuarios_direccion (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_pedido ADD CONSTRAINT pedidos_pedido_empresa_id_88ea251a_fk_usuarios_empresa_id FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_pedido ADD CONSTRAINT pedidos_pedido_orden_compra_id_607d3129_fk_pedidos_o FOREIGN KEY (orden_compra_id) REFERENCES pedidos_ordencompra (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_pedido ADD CONSTRAINT pedidos_pedido_sucursal_recojo_id_6a54ce3b_fk_inventari FOREIGN KEY (sucursal_recojo_id) REFERENCES inventario_sucursal (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_pedidoitem ADD CONSTRAINT pedidos_pedidoitem_pedido_id_fb991d04_fk_pedidos_pedido_id FOREIGN KEY (pedido_id) REFERENCES pedidos_pedido (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE pedidos_pedidoitem ADD CONSTRAINT pedidos_pedidoitem_producto_id_4beac801_fk_catalogo_producto_id FOREIGN KEY (producto_id) REFERENCES catalogo_producto (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE promociones_comentariolive ADD CONSTRAINT promociones_comentar_sesion_id_4badddbd_fk_promocion FOREIGN KEY (sesion_id) REFERENCES promociones_livecommercesesion (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE promociones_comentariolive ADD CONSTRAINT promociones_comentar_usuario_id_f9c1579f_fk_usuarios_ FOREIGN KEY (usuario_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE promociones_livecommerceproducto ADD CONSTRAINT promociones_livecomm_producto_id_930f3094_fk_catalogo_ FOREIGN KEY (producto_id) REFERENCES catalogo_producto (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE promociones_livecommerceproducto ADD CONSTRAINT promociones_livecomm_sesion_id_66deb5a3_fk_promocion FOREIGN KEY (sesion_id) REFERENCES promociones_livecommercesesion (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE promociones_livecommercesesion ADD CONSTRAINT promociones_livecomm_empresa_id_b475342c_fk_usuarios_ FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE promociones_promocion ADD CONSTRAINT promociones_promocio_empresa_id_521f3a9f_fk_usuarios_ FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE promociones_promocionproducto ADD CONSTRAINT promociones_promocio_producto_id_b42fde74_fk_catalogo_ FOREIGN KEY (producto_id) REFERENCES catalogo_producto (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE promociones_promocionproducto ADD CONSTRAINT promociones_promocio_promocion_id_c6778e72_fk_promocion FOREIGN KEY (promocion_id) REFERENCES promociones_promocion (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE reportes_recomendacionia ADD CONSTRAINT reportes_recomendaci_comprador_id_94e6355a_fk_usuarios_ FOREIGN KEY (comprador_id) REFERENCES usuarios_comprador (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE reportes_recomendacionia ADD CONSTRAINT reportes_recomendaci_producto_id_795117b5_fk_catalogo_ FOREIGN KEY (producto_id) REFERENCES catalogo_producto (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE reportes_valoracion ADD CONSTRAINT reportes_valoracion_comprador_id_13bde11f_fk_usuarios_ FOREIGN KEY (comprador_id) REFERENCES usuarios_comprador (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE reportes_valoracion ADD CONSTRAINT reportes_valoracion_empresa_id_1fe89985_fk_usuarios_empresa_id FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE reportes_valoracion ADD CONSTRAINT reportes_valoracion_pedido_id_5193cdf4_fk_pedidos_pedido_id FOREIGN KEY (pedido_id) REFERENCES pedidos_pedido (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE suscripciones_suscripcion ADD CONSTRAINT suscripciones_suscri_empresa_id_171924f7_fk_usuarios_ FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE suscripciones_suscripcion ADD CONSTRAINT suscripciones_suscri_plan_id_38dba44f_fk_suscripci FOREIGN KEY (plan_id) REFERENCES suscripciones_plan (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE token_blacklist_blacklistedtoken ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk FOREIGN KEY (token_id) REFERENCES token_blacklist_outstandingtoken (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE token_blacklist_outstandingtoken ADD CONSTRAINT token_blacklist_outs_user_id_83bc629a_fk_usuarios_ FOREIGN KEY (user_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_comprador ADD CONSTRAINT usuarios_comprador_usuario_id_807bd2dc_fk_usuarios_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_direccion ADD CONSTRAINT usuarios_direccion_comprador_id_2f2b1d46_fk_usuarios_ FOREIGN KEY (comprador_id) REFERENCES usuarios_comprador (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_empleado ADD CONSTRAINT usuarios_empleado_empresa_id_b8362132_fk_usuarios_empresa_id FOREIGN KEY (empresa_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_empleado ADD CONSTRAINT usuarios_empleado_usuario_id_a41bce3f_fk_usuarios_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_empleadopermiso ADD CONSTRAINT usuarios_empleadoper_empleado_id_4159a9d7_fk_usuarios_ FOREIGN KEY (empleado_id) REFERENCES usuarios_empleado (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_empleadopermiso ADD CONSTRAINT usuarios_empleadoper_permiso_id_fd9f255f_fk_usuarios_ FOREIGN KEY (permiso_id) REFERENCES usuarios_permiso (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_empresa ADD CONSTRAINT usuarios_empresa_plan_id_9f0e6af5_fk_suscripciones_plan_id FOREIGN KEY (plan_id) REFERENCES suscripciones_plan (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_empresa ADD CONSTRAINT usuarios_empresa_referida_por_id_887bce16_fk_usuarios_ FOREIGN KEY (referida_por_id) REFERENCES usuarios_empresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_empresa ADD CONSTRAINT usuarios_empresa_solicitud_id_cf5c6961_fk_usuarios_ FOREIGN KEY (solicitud_id) REFERENCES usuarios_solicitudempresa (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_empresa ADD CONSTRAINT usuarios_empresa_usuario_dueno_id_75979bf2_fk_usuarios_ FOREIGN KEY (usuario_dueno_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_rolbasepermiso ADD CONSTRAINT usuarios_rolbaseperm_permiso_id_461844e3_fk_usuarios_ FOREIGN KEY (permiso_id) REFERENCES usuarios_permiso (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_rolbasepermiso ADD CONSTRAINT usuarios_rolbaseperm_rol_base_id_636a172b_fk_usuarios_ FOREIGN KEY (rol_base_id) REFERENCES usuarios_rolbase (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_solicitudempresa ADD CONSTRAINT usuarios_solicitudem_plan_id_6143973d_fk_suscripci FOREIGN KEY (plan_id) REFERENCES suscripciones_plan (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_solicitudempresa ADD CONSTRAINT usuarios_solicitudem_revisado_por_admin_i_42f0c613_fk_usuarios_ FOREIGN KEY (revisado_por_admin_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_solicitudempresa ADD CONSTRAINT usuarios_solicitudem_usuario_solicitante__230637f3_fk_usuarios_ FOREIGN KEY (usuario_solicitante_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_usuario_groups ADD CONSTRAINT usuarios_usuario_groups_group_id_e77f6dcf_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES auth_group (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_usuario_groups ADD CONSTRAINT usuarios_usuario_gro_usuario_id_7a34077f_fk_usuarios_ FOREIGN KEY (usuario_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_usuario_user_permissions ADD CONSTRAINT usuarios_usuario_use_permission_id_4e5c0f2f_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES auth_permission (id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE usuarios_usuario_user_permissions ADD CONSTRAINT usuarios_usuario_use_usuario_id_60aeea80_fk_usuarios_ FOREIGN KEY (usuario_id) REFERENCES usuarios_usuario (id) ON UPDATE NO ACTION ON DELETE NO ACTION;