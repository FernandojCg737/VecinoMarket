/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagrama de Comunicación CU09 (UML 2.5 Oficial Enterprise Architect)
 * REGLA DE FLECHAS:
 *   - Mensajes de Ida (arriba): emisor (izq) -> receptor (der) => Flechas a la DERECHA (────►)
 *   - Mensajes de Retorno (abajo): emisor (der) -> receptor (izq) => Flechas a la IZQUIERDA (◄────)
 * ==============================================================================
 */

var C_NEGRO = 0;          // 0x000000 - Consultas generales
var C_AZUL  = 16711680;   // 0xFF0000 - Peticiones y registros
var C_ROJO  = 255;        // 0x0000FF - Operaciones críticas / Inserciones BD
var C_VERDE = 32768;      // 0x008000 - Respuestas y confirmaciones
var C_OLIVA = 32896;      // 0x008080 - Permisos y filtros

function generarDiagramaComunicacionCU09() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMA DE COMUNICACIÓN CU09 ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var pkgCU09 = currentPackage.Packages.AddNew("CU09 - Gestionar Empleados y Permisos", "");
    pkgCU09.Update();

    var diag = pkgCU09.Diagrams.AddNew("COM-CU09 - Gestionar Empleados y Permisos", "Communication");
    if (!diag.Update()) {
        diag = pkgCU09.Diagrams.AddNew("COM-CU09 - Gestionar Empleados y Permisos", "Analysis");
        diag.Update();
    }

    // 1. Elementos BCE Nativos como "Object"
    var act = pkgCU09.Elements.AddNew("Empresa / Emprendedor", "Actor"); act.Update();
    var bnd = crearObjetoBCE(pkgCU09, "Page : EmpleadosPermisosView", "boundary");
    var ctrl = crearObjetoBCE(pkgCU09, "Gestor : EmpleadosController", "control");

    // 4 Entidades del Modelo Conceptual
    var e1 = crearObjetoBCE(pkgCU09, "Usuario", "entity");
    var e2 = crearObjetoBCE(pkgCU09, "Empleado", "entity");
    var e3 = crearObjetoBCE(pkgCU09, "EmpleadoPermiso", "entity");
    var e4 = crearObjetoBCE(pkgCU09, "LogAuditoria", "entity");

    // 2. Posicionamiento en el Diagrama
    colocar(diag, act, 610, 655, -640, -730);
    colocar(diag, bnd, 950, 1040, -640, -740);
    colocar(diag, ctrl, 1320, 1410, -630, -730);
    colocar(diag, e1, 1580, 1685, -340, -455);
    colocar(diag, e2, 1580, 1685, -540, -655);
    colocar(diag, e3, 1580, 1685, -740, -855);
    colocar(diag, e4, 1580, 1685, -940, -1055);

    diag.DiagramObjects.Refresh();

    // 3. Enlace 1: Actor <=====> Boundary
    var a1 = crearAsociacion(act, bnd, diag);
    // Ida (de act a bnd): Flechas a la DERECHA arriba de la línea
    crearMensaje(act, bnd, diag, a1, "1", "abrirGestionEmpleados()", 15, C_NEGRO);
    crearMensaje(act, bnd, diag, a1, "4", "invitarEmpleado(email, permisos)", 25, C_AZUL);
    crearMensaje(act, bnd, diag, a1, "10", "actualizarPermisos(id, permisos)", 35, C_OLIVA);
    // Retorno (de bnd a act): Flechas a la IZQUIERDA abajo de la línea (◄────)
    crearMensaje(bnd, act, diag, a1, "14", "mostrarAlertaExito()", -15, C_VERDE);

    // 4. Enlace 2: Boundary <=====> Control
    var a2 = crearAsociacion(bnd, ctrl, diag);
    // Ida (de bnd a ctrl): Flechas a la DERECHA arriba de la línea
    crearMensaje(bnd, ctrl, diag, a2, "1.1", "get(api/v1/usuarios/empleados/)", 15, C_NEGRO);
    crearMensaje(bnd, ctrl, diag, a2, "4.1", "post(api/v1/usuarios/empleados/)", 25, C_AZUL);
    crearMensaje(bnd, ctrl, diag, a2, "10.1", "put(api/v1/usuarios/empleados/id/)", 35, C_OLIVA);
    // Retorno (de ctrl a bnd): Flechas a la IZQUIERDA abajo de la línea (◄────)
    crearMensaje(ctrl, bnd, diag, a2, "3", "mostrarListadoEmpleados(empleados)", -15, C_VERDE);
    crearMensaje(ctrl, bnd, diag, a2, "9", "confirmarVinculacion(empleado)", -25, C_AZUL);
    crearMensaje(ctrl, bnd, diag, a2, "13", "confirmarActualizacion()", -35, C_ROJO);

    // 5. Enlaces Control <=====> Entidades
    var aUsuario = crearAsociacion(ctrl, e1, diag);
    crearMensaje(ctrl, e1, diag, aUsuario, "5", "SELECT Usuario WHERE email", 15, C_ROJO);

    var aEmpleado = crearAsociacion(ctrl, e2, diag);
    crearMensaje(ctrl, e2, diag, aEmpleado, "2", "SELECT Empleado WHERE empresa_id", 15, C_OLIVA);
    crearMensaje(ctrl, e2, diag, aEmpleado, "6", "INSERT Empleado(usuario, ACTIVO)", 25, C_AZUL);

    var aPermiso = crearAsociacion(ctrl, e3, diag);
    crearMensaje(ctrl, e3, diag, aPermiso, "7", "bulk_create EmpleadoPermiso(permisos)", 15, C_NEGRO);
    crearMensaje(ctrl, e3, diag, aPermiso, "11", "UPDATE EmpleadoPermiso SET activo", 25, C_OLIVA);

    var aAudit = crearAsociacion(ctrl, e4, diag);
    crearMensaje(ctrl, e4, diag, aAudit, "8", "INSERT LogAuditoria(VINCULAR_EMPLEADO)", 15, C_VERDE);
    crearMensaje(ctrl, e4, diag, aAudit, "12", "INSERT LogAuditoria(ACTUALIZAR_PERM)", 25, C_VERDE);

    diag.DiagramLinks.Refresh();
    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
    Repository.OpenDiagram(diag.DiagramID);

    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] DIAGRAMA CU09 CON FLECHAS DE RETORNO A LA IZQUIERDA GENERADO ===", 0);
    Session.Prompt("¡Diagrama CU09 generado! Flechas inferiores orientadas hacia la izquierda (◄────).", 0);
}

// -----------------------------------------------------------------------------
// FUNCIONES AUXILIARES
// -----------------------------------------------------------------------------
function crearObjetoBCE(pkg, nombre, estereotipo) {
    var obj = pkg.Elements.AddNew(nombre, "Object");
    obj.Stereotype = estereotipo;
    obj.Update();
    return obj;
}

function colocar(diag, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diag.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
}

function crearAsociacion(src, dst, diag) {
    var assoc = src.Connectors.AddNew("", "Association");
    assoc.SupplierID = dst.ElementID;
    assoc.Direction = "Unspecified";
    assoc.Update();

    var dlink = diag.DiagramLinks.AddNew("", "");
    dlink.ConnectorID = assoc.ConnectorID;
    dlink.Style = "Mode=1;Color=-1;LWidth=0;";
    dlink.Update();

    return assoc.ConnectorID;
}

function crearMensaje(emisor, receptor, diag, assocId, seqStr, label, offsetY, color) {
    var msg = emisor.Connectors.AddNew(label, "Collaboration");
    msg.SupplierID = receptor.ElementID;
    msg.Direction = "Source -> Destination";
    msg.DiagramID = diag.DiagramID;
    msg.Update();

    var msgId = msg.ConnectorID;
    var edge = (offsetY < 0) ? 4 : 2;

    var sql = "UPDATE t_connector SET " +
              "SourceIsAggregate = " + assocId + ", " +
              "SeqNo = " + parseInt(seqStr) + ", " +
              "PDATA1 = 'Synchronous', " +
              "PDATA3 = 'Call', " +
              "PDATA4 = '" + seqStr + "', " +
              "PDATA5 = 'SX=0;SY=" + offsetY + ";EX=0;EY=0;', " +
              "HeadStyle = 1, " +
              "RouteStyle = 3, " +
              "Direction = 'Source -> Destination' " +
              "WHERE Connector_ID = " + msgId;
    Repository.Execute(sql);

    var dlink = diag.DiagramLinks.AddNew("", "");
    dlink.ConnectorID = msgId;
    dlink.Geometry = "SX=0;SY=" + offsetY + ";EX=0;EY=0;EDGE=" + edge + ";";
    dlink.Style = "Mode=1;Color=" + color + ";LWidth=0;";
    dlink.Update();

    return msgId;
}

generarDiagramaComunicacionCU09();
