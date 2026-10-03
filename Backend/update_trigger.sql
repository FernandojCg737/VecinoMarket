CREATE OR REPLACE FUNCTION fn_auditoria_generica()
RETURNS TRIGGER AS $$
DECLARE
    v_entidad_id BIGINT;
    v_detalle JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_entidad_id := OLD.id;
        v_detalle := jsonb_build_object('antes', row_to_json(OLD));
    ELSIF TG_OP = 'UPDATE' THEN
        v_entidad_id := NEW.id;
        v_detalle := jsonb_build_object('antes', row_to_json(OLD), 'despues', row_to_json(NEW));
    ELSE
        v_entidad_id := NEW.id;
        v_detalle := jsonb_build_object('despues', row_to_json(NEW));
    END IF;

    INSERT INTO auditoria_logauditoria (
        usuario_id, accion, entidad_afectada, entidad_id, detalle, 
        ip_origen, user_agent, creado_en, actualizado_en, activo
    )
    VALUES (
        NULL, TG_TABLE_NAME || '_' || TG_OP, TG_TABLE_NAME, v_entidad_id, v_detalle, 
        NULL, '', now(), now(), true
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
