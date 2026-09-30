# VecinoMarket — Backend

Backend en Django + Django REST Framework + PostgreSQL para la plataforma
multi-tenant de gestión de emprendimientos locales VecinoMarket.

## Arquitectura de roles

- **ADMIN**: administrador de la plataforma. Revisa y aprueba/rechaza las
  solicitudes de cuenta de empresa (CU01).
- **EMPRESA**: dueño del tenant. Se autoregistra como comprador y luego
  solicita convertirse en empresa; al aprobarse la solicitud se crea su
  `Empresa` y su rol cambia a `EMPRESA`. Crea a sus empleados.
- **EMPLEADO**: creado por la empresa, con permisos granulares por módulo
  (`EmpleadoPermiso`).
- **COMPRADOR**: se autoregistra, no pertenece a ningún tenant.

Multi-tenancy por fila (shared schema): todo modelo de negocio hereda de
`apps.core.models.TenantModel`, que agrega un FK obligatorio a `Empresa`.

El diseño físico completo (todas las tablas y su relación con los casos de
uso) está en el documento del proyecto y se dejó también como referencia en
[`basedatos/02_diseno_fisico_referencia.sql`](basedatos/02_diseno_fisico_referencia.sql).
Se implementó 1:1 como modelos de Django repartidos por módulo (ver
"Estructura de apps" abajo).

## Puesta en marcha local

Cada persona del equipo crea su **propio** entorno virtual y su **propia**
base de datos local — `.venv/` y `.env` están en `.gitignore` a propósito
(no se comparten por git: `.venv` es específico de tu SO, y `.env` guarda
contraseñas). Las migraciones sí están commiteadas, así que no hace falta
generarlas de nuevo, solo aplicarlas.

```bash
python -m venv .venv
# Windows:            .venv\Scripts\activate
# Mac/Linux:          source .venv/bin/activate

pip install -r requirements/dev.txt

cp .env.example .env
# edita .env con las credenciales de TU base de datos local (ver abajo)

python manage.py migrate
python manage.py crear_superadmin --email admin@vecinomarket.com --password TU_PASSWORD
python manage.py poblar_datos   # datos de prueba: empresas, productos, pedidos, etc.

python manage.py runserver
```

`poblar_datos` es seguro correrlo varias veces (no duplica datos) y crea ~13
empresas con productos/sucursales, 8 compradores, pedidos en distintos
estados, valoraciones, chats, notificaciones, etc. Todos los usuarios de
prueba usan la contraseña `VecinoTest1234!` (o la que pases con `--password`).
Ejemplos de login: `panaderia-dona-ana@vecinomarket.com` (empresa),
`empleado1.panaderia-dona-ana@vecinomarket.com` (empleado),
`comprador1@vecinomarket.com` (comprador).

> Solo si en el futuro agregas o cambias modelos: `python manage.py makemigrations`
> antes de `migrate`, y commitea los archivos de migración generados.

## Base de datos

Requiere PostgreSQL con la extensión **PostGIS** (se usa para geolocalizar
empresas, sucursales y direcciones). Guía completa, paso a paso, para
levantar tu base local (instalación de PostGIS por SO, script de creación
y variables de entorno de Windows): **[`basedatos/README.md`](basedatos/README.md)**.

El script [`basedatos/01_crear_base_datos.sql`](basedatos/01_crear_base_datos.sql)
crea el rol, la base y habilita las extensiones — es lo único que se
ejecuta a mano. El diseño físico completo del documento del proyecto queda
como referencia en [`basedatos/02_diseno_fisico_referencia.sql`](basedatos/02_diseno_fisico_referencia.sql),
pero la base real se genera con `manage.py migrate` a partir de los
modelos de Django (fuente de verdad).

## Endpoints principales (`/api/usuarios/`)

| Método | Ruta                                              | Quién       | Descripción                              |
|--------|---------------------------------------------------|-------------|-------------------------------------------|
| POST   | `auth/login/`                                     | Todos       | Login, devuelve JWT con rol y empresa      |
| POST   | `auth/refresh/`                                   | Todos       | Refresca el access token                   |
| GET    | `auth/perfil/`                                    | Autenticado | Datos del usuario actual                   |
| POST   | `compradores/registro/`                           | Público     | Autoregistro de comprador                  |
| POST   | `solicitudes-empresa/`                            | Autenticado | Solicita convertirse en empresa (CU01)     |
| GET    | `solicitudes-empresa/lista/`                      | Admin       | Lista solicitudes pendientes               |
| POST   | `solicitudes-empresa/<id>/aprobar/`               | Admin       | Aprueba y crea la `Empresa`                |
| POST   | `solicitudes-empresa/<id>/rechazar/`              | Admin       | Rechaza la solicitud                       |
| POST   | `empleados/`                                      | Empresa     | Crea empleado en su tenant                 |
| GET    | `empleados/lista/`                                | Empresa     | Lista empleados del tenant                 |
| POST   | `empleados/<id>/desactivar/`                      | Empresa     | Desactiva empleado y revoca sesión         |
| POST   | `empleados/<id>/reactivar/`                       | Empresa     | Reactiva empleado                          |

## Funciones y triggers de PostgreSQL

Además de las tablas, la base tiene lógica en PL/pgSQL (migración
[`apps/core/migrations/0001_funciones_y_triggers.py`](apps/core/migrations/0001_funciones_y_triggers.py)):

**Funciones:**
- `fn_empresas_cercanas(lon, lat, radio_km)` — empresas activas dentro de un radio, usando el índice GIST de PostGIS. `SELECT * FROM fn_empresas_cercanas(-68.15, -16.50, 5);`
- `fn_calcular_comision(empresa_id, monto)` — comisión según el `porcentaje_comision` del plan de la empresa.
- `fn_generar_numero_pedido()` — siguiente número de pedido correlativo (`VM-100001`, ...), respaldado por la secuencia `seq_numero_pedido`.

**Triggers:**
- `trg_auditoria_empresa` / `trg_auditoria_pedido` — cualquier INSERT/UPDATE/DELETE sobre `empresa` o `pedido` queda registrado en `log_auditoria` (CU22), incluso si se edita directo por SQL.
- `trg_stock_actualiza_estado_producto` — al cambiar el stock en `inventario_sucursal`, recalcula el stock total del producto y lo marca `AGOTADO`/`ACTIVO` automáticamente.
- `trg_pedido_comision` — cuando un pedido pasa a `ENTREGADO`, crea su fila en `comision_venta` automáticamente (CU26).
- `trg_touch_empresa` / `trg_touch_producto` — refrescan `actualizado_en` en cada UPDATE (red de seguridad para ediciones que no pasen por Django).

Se revierten con `python manage.py migrate core zero`.

## Estructura de apps

Cada app corresponde a un paquete del documento de alcance del proyecto:

- `core` — modelos base, middleware de tenant, utilidades compartidas.
- `usuarios` — Paquete 1: usuarios y seguridad.
- `catalogo` — Paquete 2: catálogo y productos.
- `inventario`, `pedidos` — Paquete 3: inventario, pedidos y ventas.
- `comunicacion`, `promociones` — Paquete 4: comunicación, marketing y live commerce.
- `reportes`, `auditoria` — Paquete 5: reportes, IA y auditoría.
- `notificaciones`, `suscripciones`, `facturacion` — módulos transversales.

## Siguientes pasos

Los modelos de todos los módulos ya están creados y migrados. Falta:

1. Serializers/views/urls para `catalogo`, `inventario`, `pedidos`,
   `promociones`, `comunicacion`, `reportes`, `notificaciones`,
   `suscripciones` y `facturacion` (por ahora solo `usuarios` tiene API).
2. Conectar cada `urls.py` de app en `config/urls.py` a medida que se creen.
3. CRUD de `RolBase`/`RolBasePermiso` (CU24) para que el admin gestione los
   roles base de la plataforma.
