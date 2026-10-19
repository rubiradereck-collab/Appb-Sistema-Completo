/* ============================================================================
   Etapa 4 — Sistema de Incidencias APPB (PostgreSQL)

   Qué agrega:
   1. Recuperación de contraseña segura: la clave temporal se guarda APARTE
      (passwordtemporal) con vencimiento de 30 minutos. La contraseña actual
      sigue funcionando hasta que la persona entra con la temporal, así nadie
      puede dejar a otro sin acceso pidiendo recuperaciones con su correo.
      Entre una solicitud y otra deben pasar 5 minutos.
   2. Anular incidencias: "Eliminar" ahora las pasa al estado Anulado (quedan
      en el historial y en el informe). El borrado definitivo queda solo para
      el administrador y se pide de forma explícita.
   3. Un ticket Resuelto, Cerrado o Anulado ya no se puede "Aceptar" desde un
      botón viejo de Telegram.

   Cómo ejecutarlo: como usuario postgres, en dbincidencias, después de
   BD_Etapa3.sql. Haz un respaldo antes. Se puede volver a ejecutar.

   Instalación nueva: BD_Completa.sql -> BD_Etapa2.sql -> BD_Etapa3.sql
                      -> BD_Etapa4.sql -> BD_Datos_Iniciales.sql
                      -> BD_Seguridad_Roles.sql
   ============================================================================ */

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.lineabase') IS NULL THEN
        RAISE EXCEPTION 'Primero ejecuta BD_Etapa3.sql.';
    END IF;
END
$$;

/* ----------------------------------------------------------------------------
   1. Contraseña temporal
   ---------------------------------------------------------------------------- */

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS passwordtemporal           VARCHAR(255) NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS passwordtemporalexpira     TIMESTAMP    NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS passwordtemporalsolicitada TIMESTAMP    NULL;

-- Guarda una clave temporal (ya cifrada con BCrypt). Devuelve:
--   1 = guardada
--   0 = ya se pidió una hace menos de p_esperaminutos (no se cambia nada)
CREATE OR REPLACE FUNCTION sp_usuarios_solicitartemporal(
    p_idusuario INT, p_hash VARCHAR, p_validezminutos INT DEFAULT 30, p_esperaminutos INT DEFAULT 5)
RETURNS INT LANGUAGE plpgsql AS $$
BEGIN
    UPDATE usuarios
    SET passwordtemporal           = p_hash,
        passwordtemporalexpira     = LOCALTIMESTAMP + make_interval(mins => p_validezminutos),
        passwordtemporalsolicitada = LOCALTIMESTAMP
    WHERE idusuario = p_idusuario
      AND estado = TRUE
      AND (passwordtemporalsolicitada IS NULL
           OR passwordtemporalsolicitada <= LOCALTIMESTAMP - make_interval(mins => p_esperaminutos));
    IF FOUND THEN
        RETURN 1;
    END IF;
    RETURN 0;
END
$$;

-- Clave temporal vigente (sin filas si no hay o ya venció)
CREATE OR REPLACE FUNCTION sp_usuarios_obtenertemporal(p_idusuario INT)
RETURNS TABLE (passwordtemporal VARCHAR)
LANGUAGE sql STABLE AS $$
    SELECT u.passwordtemporal
    FROM usuarios u
    WHERE u.idusuario = p_idusuario
      AND u.passwordtemporal IS NOT NULL
      AND u.passwordtemporalexpira > LOCALTIMESTAMP;
$$;

-- La persona entró con la clave temporal: pasa a ser su contraseña
CREATE OR REPLACE FUNCTION sp_usuarios_usartemporal(p_idusuario INT)
RETURNS INT LANGUAGE plpgsql AS $$
BEGIN
    UPDATE usuarios
    SET password               = passwordtemporal,
        passwordtemporal       = NULL,
        passwordtemporalexpira = NULL,
        intentosfallidos       = 0,
        bloqueadohasta         = NULL
    WHERE idusuario = p_idusuario
      AND passwordtemporal IS NOT NULL
      AND passwordtemporalexpira > LOCALTIMESTAMP;
    IF FOUND THEN
        RETURN 1;
    END IF;
    RETURN 0;
END
$$;

/* ----------------------------------------------------------------------------
   2. Anular incidencias
   ---------------------------------------------------------------------------- */

-- Devuelve 1 = anulada, 0 = no existe o ya estaba anulada
CREATE OR REPLACE FUNCTION sp_incidencias_anular(p_idincidencia INT, p_motivo TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
    v_anulado INT;
BEGIN
    SELECT e.idestado INTO v_anulado FROM estados e WHERE e.nombre = 'Anulado';
    IF v_anulado IS NULL THEN
        RAISE EXCEPTION 'No existe el estado Anulado. Ejecuta BD_Etapa2.sql.';
    END IF;

    UPDATE incidencias
    SET idestado      = v_anulado,
        observaciones = CASE
            WHEN COALESCE(btrim(observaciones), '') = '' THEN '[Anulado] ' || COALESCE(NULLIF(btrim(p_motivo), ''), 'Sin motivo')
            ELSE observaciones || E'\n[Anulado] ' || COALESCE(NULLIF(btrim(p_motivo), ''), 'Sin motivo')
        END
    WHERE idincidencia = p_idincidencia
      AND idestado <> v_anulado;

    IF FOUND THEN
        RETURN 1;
    END IF;
    RETURN 0;
END
$$;

/* ----------------------------------------------------------------------------
   3. "Aceptar" desde Telegram solo para tickets abiertos
   ---------------------------------------------------------------------------- */

CREATE OR REPLACE FUNCTION sp_incidencias_asignartecnicotelegram(
    p_idincidencia INT, p_idtecnico INT, p_idestadoenproceso INT)
RETURNS INT LANGUAGE plpgsql AS $$
BEGIN
    -- El WHERE hace la verificación y la asignación en un solo paso atómico
    UPDATE incidencias
    SET idtecnicoasignado = p_idtecnico,
        idestado          = p_idestadoenproceso
    WHERE incidencias.idincidencia = p_idincidencia
      AND (incidencias.idtecnicoasignado IS NULL OR incidencias.idtecnicoasignado = 0)
      AND incidencias.idestado IN (SELECT e.idestado FROM estados e WHERE e.nombre IN ('Pendiente', 'En Proceso'));

    IF FOUND THEN
        RETURN 1;
    END IF;
    RETURN 0;
END
$$;

/* ----------------------------------------------------------------------------
   4. Permisos (igual que en las etapas anteriores)
   ---------------------------------------------------------------------------- */

DO $$
DECLARE
    f RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appb_escritorio') THEN
        FOR f IN
            SELECT p.oid::regprocedure AS firma
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname LIKE 'sp\_%'
        LOOP
            EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER SET search_path = public, pg_temp', f.firma);
            EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.firma);
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO appb_escritorio', f.firma);
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appb_app') THEN
                EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO appb_app', f.firma);
            END IF;
        END LOOP;
        RAISE NOTICE 'Permisos de appb_escritorio aplicados a las funciones nuevas.';
    END IF;
END
$$;

COMMIT;

SELECT 'Etapa 4 aplicada' AS resultado,
       (SELECT COUNT(*) FROM incidencias i JOIN estados e ON e.idestado = i.idestado WHERE e.nombre = 'Anulado') AS tickets_anulados;
