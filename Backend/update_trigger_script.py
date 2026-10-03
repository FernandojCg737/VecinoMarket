from django.db import connection, transaction

sql = '''
CREATE OR REPLACE FUNCTION fn_auditoria_generica()
RETURNS trigger AS $$
DECLARE
    v_usuario_id integer;
    v_entidad_id integer;
    v_detalle jsonb;
    v_ip_origen varchar;
    v_user_agent varchar;
BEGIN
    -- Intentar obtener las variables de sesión
    BEGIN
        v_usuario_id := current_setting('audit.user_id', true)::integer;
    EXCEPTION WHEN OTHERS THEN
        v_usuario_id := NULL;
    END;

    BEGIN
        v_ip_origen := current_setting('audit.ip_origen', true);
    EXCEPTION WHEN OTHERS THEN
        v_ip_origen := NULL;
    END;

    -- Obtener user_agent
    BEGIN
        v_user_agent := current_setting('audit.user_agent', true);
    EXCEPTION WHEN OTHERS THEN
        v_user_agent := 'Sistema (Restauracion)';
    END;

    -- Asegurar que nunca sea null si se borró la sesión y no la seteó la excepción
    IF v_user_agent IS NULL THEN
        v_user_agent := 'Sistema (Restauracion)';
    END IF;

    -- Obtener el ID según el tipo de operación
    IF TG_OP = 'DELETE' THEN
        v_entidad_id := OLD.id;
        v_detalle := jsonb_build_object('estado_previo', row_to_json(OLD));
    ELSIF TG_OP = 'UPDATE' THEN
        v_entidad_id := NEW.id;
        v_detalle := jsonb_build_object(
            'antes', row_to_json(OLD),
            'despues', row_to_json(NEW)
        );
    ELSE
        v_entidad_id := NEW.id;
        v_detalle := jsonb_build_object('nuevo_estado', row_to_json(NEW));
    END IF;

    -- Insertar el registro de auditoría con la columna user_agent y casteo a inet
    INSERT INTO auditoria_logauditoria (
        usuario_id,
        accion,
        entidad_afectada,
        entidad_id,
        detalle,
        ip_origen,
        user_agent,
        creado_en,
        actualizado_en,
        activo
    ) VALUES (
        v_usuario_id,
        TG_TABLE_NAME || '_' || TG_OP,
        TG_TABLE_NAME,
        v_entidad_id,
        v_detalle,
        NULLIF(v_ip_origen, '')::inet,
        v_user_agent,
        now(),
        now(),
        true
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
'''

try:
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(sql)
    print('TRIGGER ACTUALIZADO Y COMMIT EXITO EN LA BD')
except Exception as e:
    print('ERROR AL ACTUALIZAR EL TRIGGER:', e)
