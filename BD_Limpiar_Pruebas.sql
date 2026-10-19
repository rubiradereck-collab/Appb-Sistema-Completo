/* ============================================================================
   Limpieza de datos de prueba — Sistema de Incidencias APPB

   Úsalo UNA vez, justo antes de abrir el sistema a los usuarios reales, para
   que el Informe final y las estadísticas empiecen desde cero.

   BORRA:
     - Todas las incidencias (y sus mensajes de Telegram, calificaciones y fechas)
     - El registro de envíos de guías
     - La línea base
     - La auditoría
   La numeración de tickets vuelve a empezar en Solicitud-00001.

   CONSERVA:
     - Usuarios (con su área, rol y Telegram vinculado), áreas, estados,
       prioridades, tipos de incidencia y guías.
   A los usuarios se les quitan los bloqueos por intentos fallidos y las
   contraseñas temporales de recuperación pendientes.

   ANTES DE EJECUTAR:
     1. Haz un respaldo:
        "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -Fc --create -f C:\Respaldos\APPB\antes_limpieza.dump dbincidencias
     2. Detén el Bot y la API (services.msc).
     3. Cambia la línea marcada con >>> a 'SI, BORRAR'.
   Ejecútalo como postgres en la base dbincidencias.
   ============================================================================ */

DO $$
DECLARE
    -- >>> Escribe exactamente: SI, BORRAR <<<
    v_confirmacion TEXT := 'NO';

    v_incidencias INT;
    v_envios      INT;
    v_auditoria   INT;
    v_mes_anterior DATE := (date_trunc('month', LOCALTIMESTAMP) - INTERVAL '1 month')::date;
BEGIN
    IF v_confirmacion <> 'SI, BORRAR' THEN
        RAISE EXCEPTION 'No se borró nada. Haz un respaldo y cambia v_confirmacion a ''SI, BORRAR'' para continuar.';
    END IF;

    SELECT COUNT(*) INTO v_incidencias FROM incidencias;
    SELECT COUNT(*) INTO v_envios FROM guiasenvios;
    SELECT COUNT(*) INTO v_auditoria FROM auditoria;

    TRUNCATE TABLE telegrammensajes, incidencias, guiasenviosdetalle, guiasenvios, lineabase, auditoria
        RESTART IDENTITY;

    UPDATE usuarios
    SET intentosfallidos = 0,
        bloqueadohasta = NULL,
        passwordtemporal = NULL,
        passwordtemporalexpira = NULL,
        passwordtemporalsolicitada = NULL;

    -- Que el Bot no envíe un reporte mensual vacío del mes anterior al arranque
    INSERT INTO reportesmensualesenviados (anio, mes)
    VALUES (EXTRACT(YEAR FROM v_mes_anterior)::int, EXTRACT(MONTH FROM v_mes_anterior)::int)
    ON CONFLICT (anio, mes) DO NOTHING;

    -- Primer registro de la nueva auditoría
    INSERT INTO auditoria (idusuario, nombreusuario, accion, entidad, entidadid, detalle)
    VALUES (NULL, 'postgres (script)', 'Limpiar datos de prueba', 'Sistema', NULL,
            format('Inicio de operación real. Se borraron %s incidencias, %s envíos de guías y %s registros de auditoría de prueba.',
                   v_incidencias, v_envios, v_auditoria));

    RAISE NOTICE 'Listo: % incidencias, % envíos de guías y % registros de auditoría borrados.', v_incidencias, v_envios, v_auditoria;
END
$$;

-- Comprobación
SELECT 'Incidencias' AS tabla, COUNT(*)::text AS registros FROM incidencias
UNION ALL SELECT 'Envíos de guías', COUNT(*)::text FROM guiasenvios
UNION ALL SELECT 'Línea base', COUNT(*)::text FROM lineabase
UNION ALL SELECT 'Auditoría', COUNT(*)::text FROM auditoria
UNION ALL SELECT 'Usuarios (se conservan)', COUNT(*)::text FROM usuarios
UNION ALL SELECT 'Guías (se conservan)', COUNT(*)::text FROM guias
UNION ALL SELECT 'Tipos de incidencia (se conservan)', COUNT(*)::text FROM tiposincidencia;
