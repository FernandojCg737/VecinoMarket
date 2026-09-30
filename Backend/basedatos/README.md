# Base de datos — VecinoMarket

Guía rápida para que cada persona del equipo levante su propia base de
datos local y corra las migraciones tras hacer `git pull`.

## 1. Instala PostgreSQL + PostGIS

- **Windows**: PostgreSQL (postgresql.org) + bundle de PostGIS para tu
  versión desde https://postgis.net/windows_downloads/
- **Mac**: `brew install postgresql postgis`
- **Linux (Debian/Ubuntu)**: `sudo apt install postgresql postgresql-16-postgis-3`

## 2. Crea tu base de datos local

Edita la contraseña en [`01_crear_base_datos.sql`](01_crear_base_datos.sql)
y ejecútalo como superusuario:

```bash
psql -U postgres -h localhost -f basedatos/01_crear_base_datos.sql
```

(o copia/pega su contenido en pgAdmin / Azure Data Studio / tu cliente
preferido, contra la conexión de tu superusuario `postgres`).

## 3. Configura tu `.env`

```bash
cp .env.example .env
```

Y edita `DATABASE_URL` con el usuario/contraseña que usaste en el paso 2:

```
DATABASE_URL=postgres://vecinomarket:TU_PASSWORD_LOCAL@localhost:5432/vecinomarket
```

## 4. Corre las migraciones

Las migraciones ya están commiteadas en `apps/*/migrations/`, así que
**no** hace falta `makemigrations`, solo aplicarlas contra tu base vacía:

```bash
python -m venv .venv
# Windows:    .venv\Scripts\activate
# Mac/Linux:  source .venv/bin/activate

pip install -r requirements/dev.txt
python manage.py migrate
python manage.py crear_superadmin --email admin@vecinomarket.com --password TU_PASSWORD
python manage.py poblar_datos
```

`poblar_datos` llena la base con datos de prueba (empresas, productos,
pedidos, compradores, etc.) para poder probar la app sin cargar todo a
mano. Es seguro correrlo de nuevo — no duplica datos. Todos los usuarios
que crea usan la contraseña `VecinoTest1234!` (cambiable con `--password`).

## Archivos de esta carpeta

- **`01_crear_base_datos.sql`** — crea el rol, la base `vecinomarket` y
  habilita las extensiones `postgis` y `uuid-ossp`. Es lo único que hay
  que ejecutar a mano; úsalo cada vez que levantes el proyecto en una
  máquina nueva.
- **`02_diseno_fisico_referencia.sql`** — el diseño físico completo del
  documento del proyecto (todas las tablas, CU01-CU27). Es solo
  **documentación/referencia**: la base real se crea con `manage.py
  migrate`, que lee los modelos de Django en `apps/*/models.py` (la
  fuente de verdad). Si cambias un modelo, corre `makemigrations` y
  commitea la migración generada — no edites este archivo para eso.
