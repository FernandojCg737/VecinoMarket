//!INC Local Scripts.EAConstants-JScript
/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * CASO DE USO: CU28 - Administrar Backup y Restore de Base de Datos
 * TAREAS: T062 (Módulo administrativo de Backup y Restore)
 * METODOLOGÍA: UML 2.5+ / Arquitectura Robusta de 3 Capas (BCE)
 * DESCRIPCIÓN: Script en JScript para Enterprise Architect (Sparx Systems).
 *              Genera automáticamente el Diagrama de Secuencia con Lifelines,
 *              Fragmentos combinados (ALT, OPT) y Mensajes síncronos/retornos.
 * ==============================================================================
 */

function crearDiagramaSecuenciaCU28() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== Iniciando generación Diagrama de Secuencia: CU28 ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar el script.", 0);
        return;
    }

    // 1. Crear el diagrama de secuencia
    var diagrams = currentPackage.Diagrams;
    var diag = diagrams.AddNew("CU28 - Administrar Backup y Restore", "Sequence");
    diag.Update();

    // 2. Definición de Elementos (Líneas de Vida - BCE)
    var elements = currentPackage.Elements;

    // Actor
    var actor = elements.AddNew("SuperAdmin", "Actor");
    actor.Update();

    // Boundary (Interfaz)
    var iuBackup = elements.AddNew("iuBack : IUBigDataBackup", "Sequence");
    iuBackup.Stereotype = "boundary";
    iuBackup.Update();

    // Control (Controladores)
    var ctrlBackup = elements.AddNew("ctrlBack : CtrlBackupRestore", "Sequence");
    ctrlBackup.Stereotype = "control";
    ctrlBackup.Update();

    // Entities / Sistemas
    var entBD = elements.AddNew("bd : MotorPostgreSQL", "Sequence");
    entBD.Stereotype = "entity";
    entBD.Update();

    var entAudit = elements.AddNew("bit : LogAuditoria", "Sequence");
    entAudit.Stereotype = "entity";
    entAudit.Update();

    // 3. Posicionamiento en el Diagrama
    function colocar(diagram, elem, left, right, top, bottom) {
        var dObjs = diagram.DiagramObjects;
        var obj = dObjs.AddNew("", "");
        obj.ElementID = elem.ElementID;
        obj.left = left;
        obj.right = right;
        obj.top = top;
        obj.bottom = bottom;
        obj.Update();
    }

    var startX = 60;
    var width = 140;

    colocar(diag, actor, startX, startX + 90, -30, -700);
    colocar(diag, iuBackup, startX + 160, startX + 160 + width, -30, -700);
    colocar(diag, ctrlBackup, startX + 370, startX + 370 + width, -30, -700);
    colocar(diag, entBD, startX + 580, startX + 580 + width, -30, -700);
    colocar(diag, entAudit, startX + 790, startX + 790 + width, -30, -700);

    // 4. Función de Registro de Mensajes
    function registrarMensaje(origen, destino, nombre, esRetorno) {
        var con = origen.Connectors.AddNew(nombre, "Sequence");
        con.SupplierID = destino.ElementID;
        if (esRetorno) {
            con.SubType = "Return";
            con.StyleEx = "LF_synch=0;LF_isReturn=1;";
        } else {
            con.SubType = "Call";
            con.StyleEx = "LF_synch=1;";
        }
        con.Update();
    }

    // --- FLUJO DE MENSAJES SÍNCRONOS Y RETORNOS ---
    // [ESCENARIO 1: Generar Copia de Seguridad (Backup)]
    registrarMensaje(actor, iuBackup, "1: solicitarDescargaBackup()", false);
    registrarMensaje(iuBackup, ctrlBackup, "2: GET /api/core/backup/ (tokenJWT)", false);

    // Validación y ejecución de dumpdata
    registrarMensaje(ctrlBackup, ctrlBackup, "3: validarPermisoEsSuperAdmin()", false);
    registrarMensaje(ctrlBackup, entBD, "4: generar_backup_json(exclude=apps_incompatibles)", false);
    registrarMensaje(entBD, ctrlBackup, "5: jsonDumpDataString (serializado)", true);

    // Registro en auditoría
    registrarMensaje(ctrlBackup, entAudit, "6: create(accion='BACKUP_SISTEMA', ip, user_agent)", false);
    registrarMensaje(entAudit, ctrlBackup, "7: logGuardado()", true);

    registrarMensaje(ctrlBackup, iuBackup, "8: 200 OK (Content-Disposition: attachment, jsonBlob)", true);
    registrarMensaje(iuBackup, actor, "9: descargarArchivo(vecinomarket_backup_fecha.json)", true);

    // [ESCENARIO 2: Restauración de Copia de Seguridad (Restore)]
    registrarMensaje(actor, iuBackup, "10: seleccionarArchivoYConfirmar(archivo_backup.json)", false);
    registrarMensaje(iuBackup, ctrlBackup, "11: POST /api/core/restore/ (FormData: archivo)", false);

    registrarMensaje(ctrlBackup, ctrlBackup, "12: validarPermisoEsSuperAdmin()", false);
    registrarMensaje(ctrlBackup, entBD, "13: restaurar_backup_json(loaddata temp.json)", false);
    registrarMensaje(entBD, ctrlBackup, "14: resultadoUpsertPK(exito / errorIntegridad)", true);

    // Registro en auditoría de Restore
    registrarMensaje(ctrlBackup, entAudit, "15: create(accion='RESTORE_SISTEMA', detalle=nombreArchivo)", false);
    registrarMensaje(entAudit, ctrlBackup, "16: logGuardado()", true);

    registrarMensaje(ctrlBackup, iuBackup, "17: 200 OK ('Respaldo restaurado correctamente')", true);
    registrarMensaje(iuBackup, actor, "18: mostrarMensajeExitoRestauracion()", true);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
    Repository.WriteOutput("Script", "=== Diagrama CU28 generado con éxito ===", 0);
}

crearDiagramaSecuenciaCU28();
