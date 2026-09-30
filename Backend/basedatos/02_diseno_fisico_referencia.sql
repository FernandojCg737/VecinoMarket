-- =====================================================================
-- VecinoMarket — Diseño físico de referencia
--
-- Este es el diseño físico oficial del proyecto (documento de alcance,
-- CU01-CU27). Se dejó aquí como DOCUMENTACIÓN/referencia de las tablas,
-- relaciones y CHECKs originales.
--
-- NO se ejecuta directamente para crear la base: la fuente de verdad real
-- son los modelos de Django en apps/*/models.py y sus migraciones
-- (apps/*/migrations/). Para crear la base de datos usa 01_crear_base_datos.sql
-- y luego `python manage.py migrate`.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- MODULO 1: USUARIOS, ROLES Y CUENTAS
-- =====================================================================

CREATE TABLE usuario (
    id                  BIGSERIAL PRIMARY KEY,
    email               VARCHAR(150) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    apellido            VARCHAR(100),
    telefono            VARCHAR(20),
    rol                 VARCHAR(20) NOT NULL CHECK (rol IN ('ADMIN','EMPRESA','EMPLEADO','COMPRADOR')),
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO','BLOQUEADO')),
    fecha_registro      TIMESTAMP NOT NULL DEFAULT now(),
    ultimo_login        TIMESTAMP
);

-- CU24: roles base definidos por el administrador y su catalogo de permisos
CREATE TABLE permiso (
    id                  SERIAL PRIMARY KEY,
    codigo              VARCHAR(50) NOT NULL UNIQUE,   -- ej: gestionar_productos, gestionar_chat
    descripcion         VARCHAR(200) NOT NULL
);

CREATE TABLE rol_base (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE rol_base_permiso (
    rol_base_id         INTEGER NOT NULL REFERENCES rol_base(id) ON DELETE CASCADE,
    permiso_id          INTEGER NOT NULL REFERENCES permiso(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_base_id, permiso_id)
);

-- CU20: catalogo de planes que vende el administrador
CREATE TABLE plan (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(50) NOT NULL,
    precio_mensual      NUMERIC(10,2) NOT NULL CHECK (precio_mensual >= 0),
    limite_productos    INTEGER,                        -- NULL = ilimitado
    incluye_live_commerce BOOLEAN NOT NULL DEFAULT false,
    incluye_ia          BOOLEAN NOT NULL DEFAULT false,
    porcentaje_comision NUMERIC(5,2) NOT NULL DEFAULT 0, -- % adicional por venta
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO'))
);

-- CU01: solicitud de cuenta de empresa (previa a la aprobacion del admin)
CREATE TABLE solicitud_empresa (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_solicitante_id BIGINT NOT NULL REFERENCES usuario(id),
    razon_social        VARCHAR(150) NOT NULL,
    nit                 VARCHAR(30) NOT NULL,
    documento_url       VARCHAR(255),
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA')),
    revisado_por_admin_id BIGINT REFERENCES usuario(id),
    motivo_rechazo      VARCHAR(255),
    fecha_solicitud     TIMESTAMP NOT NULL DEFAULT now(),
    fecha_revision      TIMESTAMP
);

-- CU01 + CU25: la empresa (tenant) ya aprobada
CREATE TABLE empresa (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_dueno_id    BIGINT NOT NULL UNIQUE REFERENCES usuario(id),
    solicitud_id        BIGINT REFERENCES solicitud_empresa(id),
    razon_social        VARCHAR(150) NOT NULL,
    nit                 VARCHAR(30) NOT NULL,
    slug                VARCHAR(80) NOT NULL UNIQUE,     -- usado en la URL de la vitrina
    logo_url            VARCHAR(255),
    color_marca         VARCHAR(7),                      -- hex, ej: #D85A30
    descripcion         VARCHAR(500),
    ubicacion           GEOGRAPHY(Point,4326),
    departamento        VARCHAR(60),
    ciudad              VARCHAR(60),
    plan_id             INTEGER REFERENCES plan(id),
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','SUSPENDIDA','CANCELADA')),
    fecha_registro      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_empresa_ubicacion ON empresa USING GIST (ubicacion);

-- CU09: empleados de una empresa
CREATE TABLE empleado (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_id          BIGINT NOT NULL UNIQUE REFERENCES usuario(id),
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    cargo               VARCHAR(60),
    fecha_ingreso        TIMESTAMP NOT NULL DEFAULT now(),
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO'))
);

CREATE INDEX idx_empleado_empresa ON empleado(empresa_id);

-- CU09: permisos especificos que la empresa asigna a cada empleado
CREATE TABLE empleado_permiso (
    empleado_id         BIGINT NOT NULL REFERENCES empleado(id) ON DELETE CASCADE,
    permiso_id          INTEGER NOT NULL REFERENCES permiso(id) ON DELETE CASCADE,
    PRIMARY KEY (empleado_id, permiso_id)
);

-- CU03: comprador (rol global, no pertenece a ninguna empresa)
CREATE TABLE comprador (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_id          BIGINT NOT NULL UNIQUE REFERENCES usuario(id),
    ubicacion_default   GEOGRAPHY(Point,4326),
    departamento        VARCHAR(60)
);

CREATE TABLE direccion (
    id                  BIGSERIAL PRIMARY KEY,
    comprador_id        BIGINT NOT NULL REFERENCES comprador(id) ON DELETE CASCADE,
    alias               VARCHAR(50),                     -- "Casa", "Oficina"
    direccion_texto     VARCHAR(255) NOT NULL,
    ubicacion           GEOGRAPHY(Point,4326) NOT NULL,
    departamento        VARCHAR(60),
    ciudad              VARCHAR(60),
    es_predeterminada   BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_direccion_ubicacion ON direccion USING GIST (ubicacion);

-- =====================================================================
-- MODULO 2: SUSCRIPCIONES, FACTURACION Y COMISIONES (CU20, CU26, CU27)
-- =====================================================================

CREATE TABLE suscripcion (
    id                  BIGSERIAL PRIMARY KEY,
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    plan_id             INTEGER NOT NULL REFERENCES plan(id),
    fecha_inicio        DATE NOT NULL,
    fecha_vencimiento   DATE NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','VENCIDA','SUSPENDIDA','CANCELADA')),
    renovacion_automatica BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_suscripcion_empresa ON suscripcion(empresa_id);
CREATE INDEX idx_suscripcion_vencimiento ON suscripcion(fecha_vencimiento);

CREATE TABLE factura (
    id                  BIGSERIAL PRIMARY KEY,
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id),
    suscripcion_id      BIGINT REFERENCES suscripcion(id),
    tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('SUSCRIPCION','COMISION')),
    monto               NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
    periodo_desde       DATE,
    periodo_hasta       DATE,
    estado_pago         VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_pago IN ('PENDIENTE','PAGADA','VENCIDA')),
    fecha_emision       TIMESTAMP NOT NULL DEFAULT now(),
    fecha_pago          TIMESTAMP
);

CREATE INDEX idx_factura_empresa ON factura(empresa_id);

CREATE TABLE referido (
    id                  BIGSERIAL PRIMARY KEY,
    empresa_referente_id BIGINT NOT NULL REFERENCES empresa(id),
    empresa_referida_id BIGINT NOT NULL REFERENCES empresa(id),
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','CONFIRMADO')),
    beneficio_aplicado  VARCHAR(100),
    fecha               TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (empresa_referente_id <> empresa_referida_id)
);

-- =====================================================================
-- MODULO 3: CATALOGO, INVENTARIO Y SUCURSALES (CU06, CU07, CU08, CU10)
-- =====================================================================

CREATE TABLE categoria (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(80) NOT NULL,
    descripcion         VARCHAR(255),
    categoria_padre_id  INTEGER REFERENCES categoria(id),
    icono               VARCHAR(50)
);

CREATE TABLE sucursal (
    id                  BIGSERIAL PRIMARY KEY,
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    nombre              VARCHAR(100) NOT NULL,
    direccion_texto     VARCHAR(255),
    ubicacion           GEOGRAPHY(Point,4326),
    telefono            VARCHAR(20),
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','INACTIVA'))
);

CREATE INDEX idx_sucursal_ubicacion ON sucursal USING GIST (ubicacion);

CREATE TABLE producto (
    id                  BIGSERIAL PRIMARY KEY,
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    categoria_id        INTEGER REFERENCES categoria(id),
    creado_por_empleado_id BIGINT REFERENCES empleado(id),
    nombre              VARCHAR(150) NOT NULL,
    descripcion         TEXT,
    sku                 VARCHAR(50),
    precio              NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    precio_descuento    NUMERIC(10,2) CHECK (precio_descuento >= 0),
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO','AGOTADO')),
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT now(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_producto_empresa ON producto(empresa_id);
CREATE INDEX idx_producto_categoria ON producto(categoria_id);

CREATE TABLE producto_imagen (
    id                  BIGSERIAL PRIMARY KEY,
    producto_id         BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    url                 VARCHAR(255) NOT NULL,
    orden               SMALLINT NOT NULL DEFAULT 1
);

-- CU08: sugerencia de categoria por vision artificial (trazabilidad del modelo IA)
CREATE TABLE categorizacion_ia_log (
    id                  BIGSERIAL PRIMARY KEY,
    producto_id         BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    categoria_sugerida_id INTEGER REFERENCES categoria(id),
    confianza           NUMERIC(5,2),
    fecha               TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE inventario_sucursal (
    id                  BIGSERIAL PRIMARY KEY,
    producto_id         BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    sucursal_id         BIGINT NOT NULL REFERENCES sucursal(id) ON DELETE CASCADE,
    cantidad_disponible INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
    stock_minimo        INTEGER NOT NULL DEFAULT 0,
    actualizado_en       TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (producto_id, sucursal_id)
);

-- =====================================================================
-- MODULO 4: PROMOCIONES Y LIVE COMMERCE (CU16, CU17)
-- =====================================================================

CREATE TABLE promocion (
    id                  BIGSERIAL PRIMARY KEY,
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    nombre              VARCHAR(100) NOT NULL,
    tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('PORCENTAJE','MONTO_FIJO')),
    valor               NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    fecha_inicio        TIMESTAMP NOT NULL,
    fecha_fin           TIMESTAMP NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','FINALIZADA','CANCELADA')),
    CHECK (fecha_fin > fecha_inicio)
);

CREATE TABLE promocion_producto (
    promocion_id        BIGINT NOT NULL REFERENCES promocion(id) ON DELETE CASCADE,
    producto_id         BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    PRIMARY KEY (promocion_id, producto_id)
);

CREATE TABLE live_commerce_sesion (
    id                  BIGSERIAL PRIMARY KEY,
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    titulo              VARCHAR(150) NOT NULL,
    url_stream          VARCHAR(255),
    estado              VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN ('PROGRAMADA','EN_VIVO','FINALIZADA')),
    fecha_inicio        TIMESTAMP,
    fecha_fin           TIMESTAMP
);

CREATE TABLE live_commerce_producto (
    sesion_id           BIGINT NOT NULL REFERENCES live_commerce_sesion(id) ON DELETE CASCADE,
    producto_id         BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    PRIMARY KEY (sesion_id, producto_id)
);

-- =====================================================================
-- MODULO 5: CARRITO, PEDIDOS, PAGOS Y ENTREGA (CU11, CU12, CU13)
-- =====================================================================

CREATE TABLE carrito (
    id                  BIGSERIAL PRIMARY KEY,
    comprador_id        BIGINT NOT NULL REFERENCES comprador(id) ON DELETE CASCADE,
    estado              VARCHAR(20) NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO','CONVERTIDO','ABANDONADO')),
    creado_en           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE carrito_item (
    id                  BIGSERIAL PRIMARY KEY,
    carrito_id          BIGINT NOT NULL REFERENCES carrito(id) ON DELETE CASCADE,
    producto_id         BIGINT NOT NULL REFERENCES producto(id),
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario     NUMERIC(10,2) NOT NULL
);

-- Una orden agrupa el checkout; se divide en un pedido por cada empresa involucrada
CREATE TABLE orden_compra (
    id                  BIGSERIAL PRIMARY KEY,
    comprador_id        BIGINT NOT NULL REFERENCES comprador(id),
    monto_total         NUMERIC(10,2) NOT NULL CHECK (monto_total >= 0),
    metodo_pago         VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('TARJETA','QR')),
    estado_pago         VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_pago IN ('PENDIENTE','PAGADO','FALLIDO','REEMBOLSADO')),
    fecha               TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE pago (
    id                  BIGSERIAL PRIMARY KEY,
    orden_compra_id     BIGINT NOT NULL REFERENCES orden_compra(id) ON DELETE CASCADE,
    monto               NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
    metodo              VARCHAR(20) NOT NULL CHECK (metodo IN ('TARJETA','QR')),
    referencia_pasarela VARCHAR(100),
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','APROBADO','RECHAZADO')),
    fecha_pago          TIMESTAMP
);

CREATE TABLE pedido (
    id                  BIGSERIAL PRIMARY KEY,
    orden_compra_id     BIGINT NOT NULL REFERENCES orden_compra(id) ON DELETE CASCADE,
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id),
    numero_pedido       VARCHAR(30) NOT NULL UNIQUE,
    subtotal            NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    comision_monto      NUMERIC(10,2) NOT NULL DEFAULT 0,
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                         CHECK (estado IN ('PENDIENTE','CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO','CANCELADO')),
    modalidad_entrega   VARCHAR(20) NOT NULL CHECK (modalidad_entrega IN ('RECOJO_TIENDA','ENVIO_DOMICILIO')),
    sucursal_recojo_id  BIGINT REFERENCES sucursal(id),
    direccion_envio_id  BIGINT REFERENCES direccion(id),
    fecha_pedido        TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (
        (modalidad_entrega = 'RECOJO_TIENDA' AND sucursal_recojo_id IS NOT NULL) OR
        (modalidad_entrega = 'ENVIO_DOMICILIO' AND direccion_envio_id IS NOT NULL)
    )
);

CREATE INDEX idx_pedido_empresa ON pedido(empresa_id);
CREATE INDEX idx_pedido_orden ON pedido(orden_compra_id);

CREATE TABLE pedido_item (
    id                  BIGSERIAL PRIMARY KEY,
    pedido_id           BIGINT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    producto_id         BIGINT NOT NULL REFERENCES producto(id),
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario     NUMERIC(10,2) NOT NULL,
    subtotal            NUMERIC(10,2) NOT NULL
);

CREATE TABLE entrega (
    id                  BIGSERIAL PRIMARY KEY,
    pedido_id           BIGINT NOT NULL UNIQUE REFERENCES pedido(id) ON DELETE CASCADE,
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                         CHECK (estado IN ('PENDIENTE','EN_CAMINO','ENTREGADA','CANCELADA')),
    fecha_estimada      DATE,
    fecha_entregada     TIMESTAMP
);

-- CU26 (comision): registro detallado por venta, ligado a la factura de comision
CREATE TABLE comision_venta (
    id                  BIGSERIAL PRIMARY KEY,
    pedido_id           BIGINT NOT NULL REFERENCES pedido(id),
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id),
    monto_venta         NUMERIC(10,2) NOT NULL,
    porcentaje_aplicado NUMERIC(5,2) NOT NULL,
    monto_comision      NUMERIC(10,2) NOT NULL,
    factura_id          BIGINT REFERENCES factura(id)
);

-- =====================================================================
-- MODULO 6: REPUTACION, CHAT, CHATBOT E IA (CU04, CU14, CU15, CU21)
-- =====================================================================

CREATE TABLE valoracion (
    id                  BIGSERIAL PRIMARY KEY,
    pedido_id           BIGINT NOT NULL REFERENCES pedido(id),
    comprador_id        BIGINT NOT NULL REFERENCES comprador(id),
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id),
    calificacion        SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario          VARCHAR(500),
    fecha               TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (pedido_id)
);

CREATE TABLE chat_conversacion (
    id                  BIGSERIAL PRIMARY KEY,
    comprador_id        BIGINT NOT NULL REFERENCES comprador(id),
    empresa_id          BIGINT NOT NULL REFERENCES empresa(id),
    empleado_asignado_id BIGINT REFERENCES empleado(id),
    estado              VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA','CERRADA')),
    creado_en           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE chat_mensaje (
    id                  BIGSERIAL PRIMARY KEY,
    conversacion_id     BIGINT NOT NULL REFERENCES chat_conversacion(id) ON DELETE CASCADE,
    emisor_usuario_id   BIGINT NOT NULL REFERENCES usuario(id),
    contenido           TEXT NOT NULL,
    tipo                VARCHAR(20) NOT NULL DEFAULT 'TEXTO' CHECK (tipo IN ('TEXTO','IMAGEN')),
    fecha_envio         TIMESTAMP NOT NULL DEFAULT now(),
    leido               BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE chatbot_interaccion (
    id                  BIGSERIAL PRIMARY KEY,
    comprador_id        BIGINT REFERENCES comprador(id),
    pregunta             TEXT NOT NULL,
    respuesta            TEXT,
    fecha               TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE recomendacion_ia (
    id                  BIGSERIAL PRIMARY KEY,
    comprador_id        BIGINT NOT NULL REFERENCES comprador(id) ON DELETE CASCADE,
    producto_id         BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    score               NUMERIC(5,4) NOT NULL,
    fecha_generada       TIMESTAMP NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULO 7: NOTIFICACIONES Y AUDITORIA (CU22, CU23)
-- =====================================================================

CREATE TABLE notificacion (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_id          BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    tipo                VARCHAR(40) NOT NULL,   -- ej: PEDIDO_ENVIADO, PLAN_POR_VENCER, MENSAJE_NUEVO
    titulo              VARCHAR(120) NOT NULL,
    mensaje             VARCHAR(255) NOT NULL,
    enlace              VARCHAR(255),
    leido               BOOLEAN NOT NULL DEFAULT false,
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificacion_usuario ON notificacion(usuario_id, leido);

CREATE TABLE log_auditoria (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_id          BIGINT REFERENCES usuario(id),
    accion              VARCHAR(100) NOT NULL,   -- ej: APROBAR_EMPRESA, CAMBIAR_PERMISO
    entidad_afectada    VARCHAR(50),
    entidad_id          BIGINT,
    detalle             JSONB,
    ip_origen           VARCHAR(45),
    fecha               TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_usuario ON log_auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha ON log_auditoria(fecha);
