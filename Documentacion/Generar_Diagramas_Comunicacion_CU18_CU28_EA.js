//!INC Local Scripts.EAConstants-JScript
/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagramas de Comunicación UML 2.5+ (Enterprise Architect)
 * 
 * CASOS DE USO:
 *   - CU18: Visualizar Dashboard y Reportes de Empresa
 *   - CU28: Administrar Backup y Restore de Base de Datos
 * 
 * REGLAS DE ARQUITECTURA BCE:
 *   - Estricta coincidencia 1 a 1 con los Diagramas de Secuencia.
 *   - CU18: 5 objetos (:Emprendedor -> :UIDashboardEmpresa -> :DashboardEmpresaController -> :Pedido, :Producto)
 *   - CU28: 4 objetos (:SuperAdmin -> :UIBackupRestore -> :BackupRestoreController -> :LogAuditoria)
 *   - Mensajes limpios y direccionales sobre los conectores.
 * ==============================================================================
 */

// Función auxiliar para registrar mensajes en enlaces de comunicación
function agregarMensajeComunicacion(conector, numSecuencia, nombreMensaje, haciaDestino) {
    try {
        var msg = conector.Messages.AddNew(nombreMensaje, "Communication");
        msg.SequenceNo = numSecuencia;
        msg.Direction = haciaDestino ? "Destination" : "Source";
        msg.Update();
        conector.Messages.Refresh();
    } catch(e) {
        // Enlace alternativo si la API maneja mensajes directos
    }
}

// Función auxiliar para conectar objetos en comunicación
function conectarObjetos(diagram, origen, destino, textoEnlace) {
    var con = origen.Connectors.AddNew(textoEnlace, "Communication");
    con.SupplierID = destino.ElementID;
    con.Update();
    origen.Connectors.Refresh();
    return con;
}

// Función auxiliar para posicionar elementos
function posicionar(diagram, elem, left, right, top, bottom) {
    var coords = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
}

/* ==============================================================================
 * CASO DE USO 18: Diagrama de Comunicación
 * ============================================================================== */
function generarComunicacionCU18(parentPkg) {
    Repository.WriteOutput("Script", "-> Creando Comunicación CU18: Visualizar Dashboard...", 0);

    var pkgCU18 = parentPkg.Packages.AddNew("CU18 - Comunicación", "Package");
    pkgCU18.Update();

    var diag = pkgCU18.Diagrams.AddNew("Diagrama de Comunicacion - CU18", "Communication");
    diag.Update();

    var el = pkgCU18.Elements;

    var act = el.AddNew(":Emprendedor", "Actor");
    act.Update();

    var ui = el.AddNew(":UIDashboardEmpresa", "Object");
    ui.Stereotype = "boundary";
    ui.Update();

    var ctrl = el.AddNew(":DashboardEmpresaController", "Object");
    ctrl.Stereotype = "control";
    ctrl.Update();

    var entPed = el.AddNew(":Pedido", "Object");
    entPed.Stereotype = "entity";
    entPed.Update();

    var entProd = el.AddNew(":Producto", "Object");
    entProd.Stereotype = "entity";
    entProd.Update();

    // Posicionamiento en forma de diamante / estrella
    posicionar(diag, act, 50, 150, -200, -280);
    posicionar(diag, ui, 250, 370, -200, -280);
    posicionar(diag, ctrl, 490, 630, -200, -280);
    posicionar(diag, entPed, 750, 870, -100, -180);
    posicionar(diag, entProd, 750, 870, -320, -400);

    // Conectores con los mensajes exactos del diagrama de secuencia
    var c1 = conectarObjetos(diag, act, ui, "1: ingresarSeccionDashboard()\n8: mostrarPantallaDashboard()\n9: solicitarExportarPDF()\n14: entregarArchivoPDF()");
    var c2 = conectarObjetos(diag, ui, ctrl, "2: obtenerMetricasDashboard()\n7: renderizarMetricasYGraficos()\n10: exportarReportePDF()\n13: descargarPDF()");
    var c3 = conectarObjetos(diag, ctrl, entPed, "3: consultarVentasYPedidos()\n4: resumenVentasYPendientes()\n11: compilarDocumentoReporte()\n12: archivoGeneradoBlob()");
    var c4 = conectarObjetos(diag, ctrl, entProd, "5: consultarProductosMasVendidos()\n6: listaTopProductos()");

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
    Repository.WriteOutput("Script", "[+] Comunicación CU18 generado.", 0);
}

/* ==============================================================================
 * CASO DE USO 28: Diagrama de Comunicación (Sin MotorBaseDatos, con LogAuditoria)
 * ============================================================================== */
function generarComunicacionCU28(parentPkg) {
    Repository.WriteOutput("Script", "-> Creando Comunicación CU28: Administrar Backup...", 0);

    var pkgCU28 = parentPkg.Packages.AddNew("CU28 - Comunicación", "Package");
    pkgCU28.Update();

    var diag = pkgCU28.Diagrams.AddNew("Diagrama de Comunicacion - CU28", "Communication");
    diag.Update();

    var el = pkgCU28.Elements;

    var act = el.AddNew(":SuperAdmin", "Actor");
    act.Update();

    var ui = el.AddNew(":UIBackupRestore", "Object");
    ui.Stereotype = "boundary";
    ui.Update();

    var ctrl = el.AddNew(":BackupRestoreController", "Object");
    ctrl.Stereotype = "control";
    ctrl.Update();

    var entAudit = el.AddNew(":LogAuditoria", "Object");
    entAudit.Stereotype = "entity";
    entAudit.Update();

    // Posicionamiento horizontal lineal limpio (4 objetos)
    posicionar(diag, act, 50, 150, -200, -280);
    posicionar(diag, ui, 260, 380, -200, -280);
    posicionar(diag, ctrl, 500, 640, -200, -280);
    posicionar(diag, entAudit, 770, 890, -200, -280);

    // Conectores con mensajes de Backup y Restore
    var c1 = conectarObjetos(diag, act, ui, "1: clickDescargarBackup()\n6: entregarArchivoJSON()\n7: subirArchivoBackup()\n13: notificarResultadoRestauracion()");
    var c2 = conectarObjetos(diag, ui, ctrl, "2: generarBackupSistema()\n5: descargarArchivoJSON()\n8: procesarRestauracion()\n9: mostrarError()\n12: mostrarMensajeExito()");
    var c3 = conectarObjetos(diag, ctrl, entAudit, "3: registrarAuditoria(BACKUP)\n4: auditoriaGuardada()\n10: registrarAuditoria(RESTORE)\n11: auditoriaGuardada()");

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
    Repository.WriteOutput("Script", "[+] Comunicación CU28 generado (4 objetos limpios).", 0);
}

// ==============================================================================
// FUNCIÓN PRINCIPAL
// ==============================================================================
function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "==========================================================", 0);
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMAS DE COMUNICACIÓN DEFINITIVOS ======", 0);
    Repository.WriteOutput("Script", "==========================================================", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var rootDiagramas = currentPackage.Packages.AddNew("Diagramas de Comunicación", "Package");
    rootDiagramas.Update();

    generarComunicacionCU18(rootDiagramas);
    generarComunicacionCU28(rootDiagramas);

    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);
    Repository.WriteOutput("Script", "=== COMUNICACIÓN COMPLETADA CON ÉXITO ===", 0);
}

main();
