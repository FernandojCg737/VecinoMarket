//!INC Local Scripts.EAConstants-JScript
/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagramas de Secuencia UML 2.5+ (Estructura y Acotamiento de Fragmentos)
 * 
 * CASOS DE USO:
 *   - CU18: Visualizar Dashboard y Reportes de Empresa (RF40: Productos más vendidos)
 *   - CU28: Administrar Backup y Restore de Base de Datos (T062)
 * 
 * REGLA DE ARQUITECTURA BCE:
 *   - Solo se utilizan Entidades reales de la Base de Datos (LogAuditoria, Pedido, Producto).
 *   - El procesamiento de dumps y restores es ejecutado por el Controlador en el Backend.
 * ==============================================================================
 */

// Coordenadas horizontales de las Líneas de Vida
var POS_ACTOR_LEFT  = 60;
var POS_ACTOR_RIGHT = 180;

var POS_UI_LEFT     = 290;
var POS_UI_RIGHT    = 420;

var POS_CTRL_LEFT   = 530;
var POS_CTRL_RIGHT  = 660;

var POS_ENT1_LEFT   = 770;
var POS_ENT1_RIGHT  = 900;

var POS_ENT2_LEFT   = 1010;
var POS_ENT2_RIGHT  = 1140;

var TOP_LIFELINES    = -30;
var BOTTOM_LIFELINES = -900;

// Límites horizontales para fragmentos ALT
var FRAG_X_LEFT  = 285;
var FRAG_X_RIGHT_CU18 = 1160;
var FRAG_X_RIGHT_CU28 = 920;

// Función para registrar mensajes de secuencia en orden estricto
function registrarMensaje(origen, destino, nombreMensaje, esRetorno, seqCounter) {
    var con = origen.Connectors.AddNew(nombreMensaje, "Sequence");
    con.SupplierID = destino.ElementID;
    con.SequenceNo = seqCounter;
    if (esRetorno) {
        con.Stereotype = "return";
        con.SubType = "Return";
        con.StyleEx = "LF_synch=0;LF_isReturn=1;";
    } else {
        con.SubType = "SynchCall";
        con.StyleEx = "LF_synch=1;";
    }
    con.Update();
    origen.Connectors.Refresh();
    return con;
}

// Función auxiliar para posicionar elementos en el diagrama
function posicionarElemento(diagram, elem, left, right, top, bottom) {
    var coords = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
}

// Función para crear fragmentos ALT con coordenadas exactas
function crearFragmentoAlt(pkg, diagram, left, right, top, bottom) {
    try {
        var frag = pkg.Elements.AddNew("", "InteractionFragment");
        frag.Subtype = 0; // 0 = alt
        frag.Update();
        posicionarElemento(diagram, frag, left, right, top, bottom);
        return frag;
    } catch(e) {
        try {
            var frag2 = pkg.Elements.AddNew("", "Fragment");
            frag2.Subtype = 0;
            frag2.Update();
            posicionarElemento(diagram, frag2, left, right, top, bottom);
            return frag2;
        } catch(e2) {
            return null;
        }
    }
}

/* ==============================================================================
 * CASO DE USO 18: Visualizar Dashboard y Reportes de Empresa
 * ============================================================================== */
function generarCU18(parentPkg) {
    Repository.WriteOutput("Script", "-> Creando CU18: Visualizar Dashboard y Reportes de Empresa...", 0);

    var pkgCU18 = parentPkg.Packages.AddNew("CU18 - Visualizar Dashboard y Reportes de Empresa", "Package");
    pkgCU18.Update();

    var diag = pkgCU18.Diagrams.AddNew("Diagrama de Secuencia - CU18", "Sequence");
    diag.Update();

    var elements = pkgCU18.Elements;

    var act = elements.AddNew(":Emprendedor", "Actor");
    act.Update();

    var iu = elements.AddNew(":UIDashboardEmpresa", "Sequence");
    iu.Stereotype = "boundary";
    iu.Update();

    var ctrl = elements.AddNew(":DashboardEmpresaController", "Sequence");
    ctrl.Stereotype = "control";
    ctrl.Update();

    var entPed = elements.AddNew(":Pedido", "Sequence");
    entPed.Stereotype = "entity";
    entPed.Update();

    var entProd = elements.AddNew(":Producto", "Sequence");
    entProd.Stereotype = "entity";
    entProd.Update();

    // Posicionar Lifelines (5 líneas de vida)
    posicionarElemento(diag, act, POS_ACTOR_LEFT, POS_ACTOR_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, iu, POS_UI_LEFT, POS_UI_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, POS_CTRL_LEFT, POS_CTRL_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, entPed, POS_ENT1_LEFT, POS_ENT1_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, entProd, POS_ENT2_LEFT, POS_ENT2_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Carga de métricas y ranking
    registrarMensaje(act, iu, "1: ingresarSeccionDashboard()", false, seq++);
    registrarMensaje(iu, ctrl, "2: obtenerMetricasDashboard(empresa_id, token_jwt)", false, seq++);
    registrarMensaje(ctrl, entPed, "3: query := consultarVentasYPedidos(empresa_id)", false, seq++);
    registrarMensaje(entPed, ctrl, "4: resumenVentasYPendientes(total_ventas, total_pedidos, pendientes)", true, seq++);
    registrarMensaje(ctrl, entProd, "5: top_prod := consultarProductosMasVendidos(empresa_id, limit=5)", false, seq++);
    registrarMensaje(entProd, ctrl, "6: listaTopProductos(ranking_unidades)", true, seq++);
    registrarMensaje(ctrl, iu, "7: renderizarMetricasYGraficos(resumenVentas, listaTopProductos)", true, seq++);
    registrarMensaje(iu, act, "8: mostrarPantallaDashboard(metricasTotales, topProductos)", true, seq++);

    // Bloque 2: Exportar Reporte a PDF
    registrarMensaje(act, iu, "9: solicitarExportarPDF()", false, seq++);
    registrarMensaje(iu, ctrl, "10: exportarReportePDF(empresa_id, formato='PDF')", false, seq++);
    registrarMensaje(ctrl, entPed, "11: pdf_bytes := compilarDocumentoReporte(secciones, total_ventas, top_prod)", false, seq++);
    registrarMensaje(entPed, ctrl, "12: archivoGeneradoBlob(pdf_bytes)", true, seq++);
    registrarMensaje(ctrl, iu, "13: descargarPDF(pdf_bytes, 'dashboard_empresa.pdf')", true, seq++);
    registrarMensaje(iu, act, "14: entregarArchivoPDF('dashboard_empresa.pdf')", true, seq++);

    // Fragmentos ALT
    crearFragmentoAlt(pkgCU18, diag, FRAG_X_LEFT, FRAG_X_RIGHT_CU18, -145, -420);
    crearFragmentoAlt(pkgCU18, diag, FRAG_X_LEFT, FRAG_X_RIGHT_CU18, -510, -780);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
    Repository.WriteOutput("Script", "[+] CU18 generado con éxito.", 0);
}

/* ==============================================================================
 * CASO DE USO 28: Administrar Backup y Restore de Base de Datos
 * (Adaptado: Sin MotorBaseDatos, con la Entidad real LogAuditoria de la BD)
 * ============================================================================== */
function generarCU28(parentPkg) {
    Repository.WriteOutput("Script", "-> Creando CU28: Administrar Backup y Restore (BCE Oficial)...", 0);

    var pkgCU28 = parentPkg.Packages.AddNew("CU28 - Administrar Backup y Restore", "Package");
    pkgCU28.Update();

    var diag = pkgCU28.Diagrams.AddNew("Diagrama de Secuencia - CU28", "Sequence");
    diag.Update();

    var elements = pkgCU28.Elements;

    var act = elements.AddNew(":SuperAdmin", "Actor");
    act.Update();

    var iu = elements.AddNew(":UIBackupRestore", "Sequence");
    iu.Stereotype = "boundary";
    iu.Update();

    var ctrl = elements.AddNew(":BackupRestoreController", "Sequence");
    ctrl.Stereotype = "control";
    ctrl.Update();

    var entAudit = elements.AddNew(":LogAuditoria", "Sequence");
    entAudit.Stereotype = "entity";
    entAudit.Update();

    // Posicionar Lifelines (4 líneas de vida limpias)
    posicionarElemento(diag, act, POS_ACTOR_LEFT, POS_ACTOR_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, iu, POS_UI_LEFT, POS_UI_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, POS_CTRL_LEFT, POS_CTRL_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, entAudit, POS_ENT1_LEFT, POS_ENT1_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Generación y Descarga de Backup Manual
    registrarMensaje(act, iu, "1: clickDescargarBackup()", false, seq++);
    registrarMensaje(iu, ctrl, "2: generarBackupSistema(token_jwt)", false, seq++);
    registrarMensaje(ctrl, entAudit, "3: registrarAuditoria(accion='BACKUP_MANUAL', detalle='dump_vecinomarket.json')", false, seq++);
    registrarMensaje(entAudit, ctrl, "4: auditoriaGuardada(log_id, timestamp)", true, seq++);
    registrarMensaje(ctrl, iu, "5: descargarArchivoJSON(dump_json, 'vecinomarket_backup.json')", true, seq++);
    registrarMensaje(iu, act, "6: entregarArchivoJSON('vecinomarket_backup.json')", true, seq++);

    // Bloque 2: Restauración de Respaldo
    registrarMensaje(act, iu, "7: subirArchivoBackup(archivo_json)", false, seq++);
    registrarMensaje(iu, ctrl, "8: procesarRestauracion(archivo_json)", false, seq++);
    registrarMensaje(ctrl, iu, "9: mostrarError('Archivo JSON corrupto o incompatible')", true, seq++);
    registrarMensaje(ctrl, entAudit, "10: registrarAuditoria(accion='RESTORE_MANUAL', detalle=nombre_archivo)", false, seq++);
    registrarMensaje(entAudit, ctrl, "11: auditoriaGuardada(estado='EXITOSO')", true, seq++);
    registrarMensaje(ctrl, iu, "12: mostrarMensajeExito('Respaldo restaurado correctamente')", true, seq++);
    registrarMensaje(iu, act, "13: notificarResultadoRestauracion()", true, seq++);

    // Fragmentos ALT acotados al ancho exacto de las 4 líneas de vida
    crearFragmentoAlt(pkgCU28, diag, FRAG_X_LEFT, FRAG_X_RIGHT_CU28, -145, -380);
    crearFragmentoAlt(pkgCU28, diag, FRAG_X_LEFT, FRAG_X_RIGHT_CU28, -460, -780);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
    Repository.WriteOutput("Script", "[+] CU28 generado con éxito (4 Lifelines limpias).", 0);
}

// ==============================================================================
// FUNCIÓN PRINCIPAL
// ==============================================================================
function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "==========================================================", 0);
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMAS DE SECUENCIA DEFINITIVOS =========", 0);
    Repository.WriteOutput("Script", "==========================================================", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var rootDiagramas = currentPackage.Packages.AddNew("Diagramas de Secuencia", "Package");
    rootDiagramas.Update();

    generarCU18(rootDiagramas);
    generarCU28(rootDiagramas);

    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);
    Repository.WriteOutput("Script", "=== PROCESO COMPLETADO EXITOSAMENTE ===", 0);
}

main();
