/* ============================================================================
   Separación de permisos de base de datos — Sistema de Incidencias APPB

   Problema que resuelve: la cadena de conexión de la app de escritorio está en
   el App.config de cada PC. Con el usuario appb_app, cualquiera que la copie
   puede abrir pgAdmin y leer o modificar cualquier tabla directamente.

   Después de este script:
   - appb_escritorio (PC de los usuarios): SOLO puede ejecutar las funciones
     sp_*. No puede leer ni modificar tablas directamente.
   - appb_app (API Node y Bot, en el servidor): sigue con acceso a tablas,
     pero ya no puede modificar ni borrar la auditoría. En pg_hba.conf debe
     quedar permitido solo desde 127.0.0.1.
   - La tabla auditoria queda de solo inserción para los dos usuarios.

   Límite conocido: quien tenga la cadena de appb_escritorio todavía puede
   llamar a las funciones sp_* por fuera de la app (por ejemplo cambiar un rol
   con sp_usuarios_modificar). Cerrar eso del todo requiere que el escritorio
   hable con la API en vez de con la base (etapa posterior del plan).

   Cómo ejecutarlo: como usuario postgres (dueño de las funciones), en la base
   dbincidencias. Antes, cambia la contraseña marcada con  >>>  abajo.
   Se puede volver a ejecutar sin problema.
   ============================================================================ */

DO $$
DECLARE
    -- >>> Contraseña del nuevo usuario de la app de escritorio <<<
    v_password_escritorio TEXT := 'CAMBIAR_ESTA_CLAVE';
    f RECORD;
BEGIN
    IF v_password_escritorio = 'CAMBIAR_ESTA_CLAVE' OR length(v_password_escritorio) < 8 THEN
        RAISE EXCEPTION 'Cambia la contraseña de appb_escritorio (mínimo 8 caracteres) antes de ejecutar este script.';
    END IF;

    -- 1. Usuario de la app de escritorio
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appb_escritorio') THEN
        EXECUTE format('CREATE ROLE appb_escritorio LOGIN PASSWORD %L', v_password_escritorio);
        RAISE NOTICE 'Usuario appb_escritorio creado.';
    ELSE
        EXECUTE format('ALTER ROLE appb_escritorio LOGIN PASSWORD %L', v_password_escritorio);
        RAISE NOTICE 'Usuario appb_escritorio ya existía: se actualizó su contraseña.';
    END IF;

    EXECUTE 'GRANT CONNECT ON DATABASE ' || quote_ident(current_database()) || ' TO appb_escritorio';
    GRANT USAGE ON SCHEMA public TO appb_escritorio;
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM appb_escritorio;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM appb_escritorio;

    -- 2. Las funciones sp_* pasan a ejecutarse con los permisos de su dueño,
    --    así quien las llama no necesita acceso a las tablas.
    --    search_path fijo: evita que alguien las desvíe con objetos propios.
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

    -- 3. appb_app (servidor): auditoría de solo inserción y lectura
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appb_app') THEN
        REVOKE UPDATE, DELETE, TRUNCATE ON auditoria FROM appb_app;
        RAISE NOTICE 'appb_app ya no puede modificar ni borrar la auditoría.';
    ELSE
        RAISE NOTICE 'No existe el usuario appb_app: créalo con el bloque de permisos de BD_Completa.sql y vuelve a ejecutar este script.';
    END IF;
END
$$;

/* ----------------------------------------------------------------------------
   Después de ejecutarlo:

   1. pg_hba.conf (C:\Program Files\PostgreSQL\18\data\) — reemplaza la línea
      de appb_app por estas dos y ejecuta  SELECT pg_reload_conf();
         host    dbincidencias   appb_app          127.0.0.1/32       scram-sha-256
         host    dbincidencias   appb_escritorio   131.150.25.0/24    scram-sha-256

   2. App.config de Presentación (cada PC):  Username=appb_escritorio;Password=...
      .env de la API y Bot.exe.config:        se quedan con appb_app y Host=127.0.0.1
   ---------------------------------------------------------------------------- */
