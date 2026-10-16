/* ============================================================================
   Datos iniciales del Sistema de Incidencias APPB (PostgreSQL)

   Se ejecuta UNA vez, después de BD_Completa.sql, en una base nueva.
   Es seguro volver a ejecutarlo: solo inserta lo que falta.

   ANTES DE EJECUTAR: cambia la contraseña del administrador inicial en la
   línea marcada con  >>>  más abajo. El script se niega a correr si la dejas
   como está. La contraseña se guarda cifrada con BCrypt (igual que el sistema).
   ============================================================================ */

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    -- >>> Cambia esta contraseña antes de ejecutar (mínimo 6 caracteres) <<<
    v_password_admin TEXT := 'CAMBIAR_ESTA_CLAVE';
BEGIN
    IF v_password_admin = 'CAMBIAR_ESTA_CLAVE' OR length(v_password_admin) < 6 THEN
        RAISE EXCEPTION 'Cambia la contraseña del administrador inicial (v_password_admin) antes de ejecutar este script.';
    END IF;

    -- Estados: el orden importa, la app móvil espera En Proceso = 2 y Resuelto/Cerrado >= 3
    INSERT INTO estados (nombre)
    SELECT v.nombre FROM (VALUES (1, 'Pendiente'), (2, 'En Proceso'), (3, 'Resuelto'), (4, 'Cerrado')) AS v(orden, nombre)
    WHERE NOT EXISTS (SELECT 1 FROM estados e WHERE e.nombre = v.nombre)
    ORDER BY v.orden;

    -- Prioridades: los nombres coinciden con los tiempos de SLA del Bot (Alta 4 h, Media 24 h, Baja 72 h)
    INSERT INTO prioridades (nombre)
    SELECT v.nombre FROM (VALUES (1, 'Baja'), (2, 'Media'), (3, 'Alta')) AS v(orden, nombre)
    WHERE NOT EXISTS (SELECT 1 FROM prioridades p WHERE p.nombre = v.nombre)
    ORDER BY v.orden;

    -- Un área para poder registrar incidencias desde el primer día; las demás se crean desde el sistema
    INSERT INTO areas (nombrearea)
    SELECT 'Tecnologías de la Información'
    WHERE NOT EXISTS (SELECT 1 FROM areas);

    -- Administrador inicial (usuario: admin). Solo se crea si todavía no hay ningún administrador.
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE rol = 'Administrador') THEN
        INSERT INTO usuarios (nombre, apellido, correo, usuario, password, rol, estado)
        VALUES ('Administrador', 'Sistema', 'admin@appb.gob.ec', 'admin',
                crypt(v_password_admin, gen_salt('bf', 10)), 'Administrador', TRUE);
        RAISE NOTICE 'Administrador inicial creado: usuario "admin". Cambia su correo desde el sistema.';
    ELSE
        RAISE NOTICE 'Ya existe un administrador: no se creó otro.';
    END IF;
END
$$;
