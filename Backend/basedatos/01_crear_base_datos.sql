-- =====================================================================
-- VecinoMarket — creación de la base de datos local
-- Ejecutar como superusuario, ej: psql -U postgres -h localhost -f 01_crear_base_datos.sql
--
-- Cambia 'TU_PASSWORD_LOCAL' por una contraseña propia y úsala luego en
-- DATABASE_URL dentro de tu archivo .env (ver ../.env.example).
-- =====================================================================

DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'vecinomarket') THEN
      CREATE ROLE vecinomarket WITH LOGIN PASSWORD 'TU_PASSWORD_LOCAL';
   END IF;
END
$$;

SELECT 'CREATE DATABASE vecinomarket OWNER vecinomarket'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vecinomarket')\gexec

GRANT ALL PRIVILEGES ON DATABASE vecinomarket TO vecinomarket;

\c vecinomarket

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

GRANT ALL ON SCHEMA public TO vecinomarket;
