-- Runs once, when the local data volume is empty. Local and CI only: on Neon the
-- human creates the application role with SQL and a strong password.

-- The application's role (DATABASE_URL). It owns no table and can't bypass
-- Row-Level Security; the owner role (POSTGRES_USER) only runs migrations.
CREATE ROLE xtrakto_app WITH LOGIN PASSWORD 'xtrakto_app'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- A separate database for integration tests, so they never touch development data.
CREATE DATABASE xtrakto_test OWNER xtrakto;
