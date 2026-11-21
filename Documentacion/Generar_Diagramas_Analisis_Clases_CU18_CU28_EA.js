//!INC Local Scripts.EAConstants-JScript
/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagramas de Análisis de Clases (VCR / BCE) - UML 2.5
 * 
 * ESTRUCTURA RIGUROSA (Conforme a las imágenes de referencia):
 *   1. Actor -> se conecta ÚNICAMENTE a <<UI>>.
 *   2. <<UI>> -> se conecta ÚNICAMENTE a <<CC>> (Controller).
 *   3. <<CC>> -> se conecta ÚNICAMENTE a la ENTIDAD PRINCIPAL.
 *   4. La ENTIDAD PRINCIPAL se conecta a todas las demás tablas involucradas
 *      con sus nombres exactos del modelo de base de datos y sus CARDINALIDADES (1..1, 0..*, 1..*).
 * ==============================================================================
 */

function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "==========================================================", 0);
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMAS DE ANÁLISIS DE CLASES (MODELO DB) ==", 0);
    Repository.WriteOutput("Script", "==========================================================", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", promptOK);
        return;
    }

    var rootPkg = currentPackage.Packages.AddNew("Diagramas de Análisis de Clases", "");
    rootPkg.Update();

    generarAnalisisCU18(rootPkg);
    generarAnalisisCU28(rootPkg);

    rootPkg.Packages.Refresh();
    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] PROCESO COMPLETADO EXITOSAMENTE ===", 0);
    Session.Prompt("¡Diagramas de Análisis de Clases (CU18 y CU28) generados exitosamente!", promptOK);
}

/* ==============================================================================
 * CASO DE USO 18: Visualizar Dashboard y Reportes de Empresa
 * ============================================================================== */
function generarAnalisisCU18(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU18 - Visualizar Dashboard y Reportes de Empresa", "");
    pkg.Update();

    var diagName = "CU18. Visualizar Dashboard y Reportes de Empresa";
    var diagram = pkg.Diagrams.AddNew(diagName, "Logical");
    diagram.Update();

    // 1. Actor
    var elemActor = pkg.Elements.AddNew("Emprendedor", "Actor");
    elemActor.Update();

    // 2. Boundary / UI
    var elemUI = pkg.Elements.AddNew("DashboardEmpresaUI", "Class");
    elemUI.Stereotype = "UI";
    elemUI.Update();

    elemUI.Attributes.AddNew("empresaId", "Integer").Update();
    elemUI.Attributes.AddNew("totalVentas", "Decimal").Update();
    elemUI.Attributes.AddNew("pedidosPendientes", "Integer").Update();
    elemUI.Attributes.AddNew("totalComisiones", "Decimal").Update();
    elemUI.Attributes.AddNew("topProductos", "List<Producto>").Update();
    elemUI.Attributes.Refresh();

    elemUI.Methods.AddNew("ingresarDashboard()", "void").Update();
    elemUI.Methods.AddNew("solicitarExportarPDF()", "void").Update();
    elemUI.Methods.AddNew("mostrarPantallaDashboard()", "void").Update();
    elemUI.Methods.AddNew("renderizarGraficosYTotales()", "void").Update();
    elemUI.Methods.Refresh();

    // 3. Control / Controller
    var elemCtrl = pkg.Elements.AddNew("DashboardEmpresaController", "Class");
    elemCtrl.Stereotype = "CC";
    elemCtrl.Update();

    elemCtrl.Methods.AddNew("validarPermisoEmpleado(usuario, permiso)", "Boolean").Update();
    elemCtrl.Methods.AddNew("obtenerMetricasDashboard(empresaId)", "Dict").Update();
    elemCtrl.Methods.AddNew("consultarProductosMasVendidos(empresaId, limit)", "List").Update();
    elemCtrl.Methods.AddNew("exportarReportePDF(empresaId, formato)", "Blob").Update();
    elemCtrl.Methods.AddNew("notificarErrorAcceso()", "void").Update();
    elemCtrl.Methods.Refresh();

    // 4. ENTIDAD PRINCIPAL: Empresa
    var elemEmpresa = pkg.Elements.AddNew("Empresa", "Class");
    elemEmpresa.Stereotype = "Model";
    elemEmpresa.Update();

    elemEmpresa.Attributes.AddNew("id", "Integer").Update();
    elemEmpresa.Attributes.AddNew("razon_social", "String").Update();
    elemEmpresa.Attributes.AddNew("nit", "String").Update();
    elemEmpresa.Attributes.AddNew("ciudad", "String").Update();
    elemEmpresa.Attributes.AddNew("departamento", "String").Update();
    elemEmpresa.Attributes.AddNew("estado", "String").Update();
    elemEmpresa.Attributes.Refresh();

    // 5. Entidad Relacionada: Pedido
    var elemPedido = pkg.Elements.AddNew("Pedido", "Class");
    elemPedido.Stereotype = "Model";
    elemPedido.Update();

    elemPedido.Attributes.AddNew("id", "Integer").Update();
    elemPedido.Attributes.AddNew("numero_pedido", "String").Update();
    elemPedido.Attributes.AddNew("subtotal", "Decimal").Update();
    elemPedido.Attributes.AddNew("comision_monto", "Decimal").Update();
    elemPedido.Attributes.AddNew("estado", "String").Update();
    elemPedido.Attributes.AddNew("creado_en", "DateTime").Update();
    elemPedido.Attributes.Refresh();

    // 6. Entidad Relacionada: PedidoItem
    var elemItem = pkg.Elements.AddNew("PedidoItem", "Class");
    elemItem.Stereotype = "Model";
    elemItem.Update();

    elemItem.Attributes.AddNew("id", "Integer").Update();
    elemItem.Attributes.AddNew("cantidad", "Integer").Update();
    elemItem.Attributes.AddNew("precio_unitario", "Decimal").Update();
    elemItem.Attributes.AddNew("subtotal", "Decimal").Update();
    elemItem.Attributes.Refresh();

    // 7. Entidad Relacionada: Producto (RF40: Ranking de más vendidos)
    var elemProducto = pkg.Elements.AddNew("Producto", "Class");
    elemProducto.Stereotype = "Model";
    elemProducto.Update();

    elemProducto.Attributes.AddNew("id", "Integer").Update();
    elemProducto.Attributes.AddNew("nombre", "String").Update();
    elemProducto.Attributes.AddNew("sku", "String").Update();
    elemProducto.Attributes.AddNew("precio", "Decimal").Update();
    elemProducto.Attributes.AddNew("estado", "String").Update();
    elemProducto.Attributes.Refresh();

    // 8. Entidad Relacionada: ComisionVenta
    var elemComision = pkg.Elements.AddNew("ComisionVenta", "Class");
    elemComision.Stereotype = "Model";
    elemComision.Update();

    elemComision.Attributes.AddNew("id", "Integer").Update();
    elemComision.Attributes.AddNew("monto_venta", "Decimal").Update();
    elemComision.Attributes.AddNew("porcentaje_aplicado", "Decimal").Update();
    elemComision.Attributes.AddNew("monto_comision", "Decimal").Update();
    elemComision.Attributes.Refresh();

    // 9. Entidad Relacionada: Valoracion
    var elemValoracion = pkg.Elements.AddNew("Valoracion", "Class");
    elemValoracion.Stereotype = "Model";
    elemValoracion.Update();

    elemValoracion.Attributes.AddNew("id", "Integer").Update();
    elemValoracion.Attributes.AddNew("calificacion", "Integer").Update();
    elemValoracion.Attributes.AddNew("comentario", "String").Update();
    elemValoracion.Attributes.Refresh();

    pkg.Elements.Refresh();

    // ==========================================================================
    // CONEXIONES BCE Y CARDINALIDADES
    // ==========================================================================
    conectarSimple(elemActor, elemUI);
    conectarSimple(elemUI, elemCtrl);
    conectarSimple(elemCtrl, elemEmpresa); // Control -> ONLY Entidad Principal (Empresa)

    // Empresa -> Pedido (1..1 a 0..*)
    conectarConCardinalidad(elemEmpresa, elemPedido, "recibe", "1..1", "0..*");

    // Pedido -> PedidoItem (1..1 a 1..*)
    conectarConCardinalidad(elemPedido, elemItem, "contiene", "1..1", "1..*");

    // PedidoItem -> Producto (0..* a 1..1)
    conectarConCardinalidad(elemItem, elemProducto, "referencia", "0..*", "1..1");

    // Empresa -> ComisionVenta (1..1 a 0..*)
    conectarConCardinalidad(elemEmpresa, elemComision, "aplica", "1..1", "0..*");

    // Empresa -> Valoracion (1..1 a 0..*)
    conectarConCardinalidad(elemEmpresa, elemValoracion, "obtiene", "1..1", "0..*");

    // ==========================================================================
    // POSICIONAMIENTO EN EL DIAGRAMA (LAYOUT LIMPIO TIPO ÁRBOL)
    // ==========================================================================
    posicionarObjeto(diagram, elemActor, 50, 130, -200, -320);
    posicionarObjeto(diagram, elemUI, 170, 330, -170, -350);
    posicionarObjeto(diagram, elemCtrl, 370, 560, -170, -340);

    // Entidad Principal (Centro)
    posicionarObjeto(diagram, elemEmpresa, 610, 760, -170, -320);

    // Entidades Satélites con Cardinalidades
    posicionarObjeto(diagram, elemPedido, 820, 970, -40, -180);    // Arriba Derecha
    posicionarObjeto(diagram, elemItem, 1030, 1170, -40, -170);   // Extremo Arriba Derecha
    posicionarObjeto(diagram, elemProducto, 1030, 1170, -200, -330); // Extremo Centro Derecha
    posicionarObjeto(diagram, elemComision, 820, 970, -210, -340);  // Centro Derecha
    posicionarObjeto(diagram, elemValoracion, 610, 760, -370, -500); // Abajo Centro

    diagram.DiagramObjects.Refresh();
    diagram.Update();
    Repository.ReloadDiagram(diagram.DiagramID);
    Repository.OpenDiagram(diagram.DiagramID);
}

/* ==============================================================================
 * CASO DE USO 28: Administrar Backup y Restore de Base de Datos
 * ============================================================================== */
function generarAnalisisCU28(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU28 - Administrar Backup y Restore", "");
    pkg.Update();

    var diagName = "CU28. Administrar Backup y Restore";
    var diagram = pkg.Diagrams.AddNew(diagName, "Logical");
    diagram.Update();

    // 1. Actor
    var elemActor = pkg.Elements.AddNew("SuperAdmin", "Actor");
    elemActor.Update();

    // 2. Boundary / UI
    var elemUI = pkg.Elements.AddNew("BackupRestoreUI", "Class");
    elemUI.Stereotype = "UI";
    elemUI.Update();

    elemUI.Attributes.AddNew("archivoJSON", "File").Update();
    elemUI.Attributes.AddNew("descargando", "Boolean").Update();
    elemUI.Attributes.AddNew("restaurando", "Boolean").Update();
    elemUI.Attributes.AddNew("mensajeExito", "String").Update();
    elemUI.Attributes.AddNew("mensajeError", "String").Update();
    elemUI.Attributes.Refresh();

    elemUI.Methods.AddNew("clickDescargarBackup()", "void").Update();
    elemUI.Methods.AddNew("subirArchivoRestore()", "void").Update();
    elemUI.Methods.AddNew("confirmarRestauracion()", "Boolean").Update();
    elemUI.Methods.AddNew("mostrarMensajeExito()", "void").Update();
    elemUI.Methods.AddNew("mostrarMensajeError()", "void").Update();
    elemUI.Methods.Refresh();

    // 3. Control / Controller
    var elemCtrl = pkg.Elements.AddNew("BackupRestoreController", "Class");
    elemCtrl.Stereotype = "CC";
    elemCtrl.Update();

    elemCtrl.Methods.AddNew("validarPermisoSuperAdmin(usuario)", "Boolean").Update();
    elemCtrl.Methods.AddNew("generarBackupJSON()", "String").Update();
    elemCtrl.Methods.AddNew("restaurarBackupJSON(archivo)", "Boolean").Update();
    elemCtrl.Methods.AddNew("registrarAuditoria(accion, detalle)", "void").Update();
    elemCtrl.Methods.AddNew("validarFormatoJSON(archivo)", "Boolean").Update();
    elemCtrl.Methods.Refresh();

    // 4. ENTIDAD PRINCIPAL: Usuario (SuperAdmin / Administrador de la BD)
    var elemUsuario = pkg.Elements.AddNew("Usuario", "Class");
    elemUsuario.Stereotype = "Model";
    elemUsuario.Update();

    elemUsuario.Attributes.AddNew("id", "Integer").Update();
    elemUsuario.Attributes.AddNew("email", "String").Update();
    elemUsuario.Attributes.AddNew("nombre", "String").Update();
    elemUsuario.Attributes.AddNew("apellido", "String").Update();
    elemUsuario.Attributes.AddNew("rol", "String").Update();
    elemUsuario.Attributes.AddNew("is_staff", "Boolean").Update();
    elemUsuario.Attributes.AddNew("estado", "String").Update();
    elemUsuario.Attributes.Refresh();

    // 5. Entidad Relacionada: LogAuditoria (Registro inmutable)
    var elemAudit = pkg.Elements.AddNew("LogAuditoria", "Class");
    elemAudit.Stereotype = "Model";
    elemAudit.Update();

    elemAudit.Attributes.AddNew("id", "Integer").Update();
    elemAudit.Attributes.AddNew("accion", "String").Update();
    elemAudit.Attributes.AddNew("entidad_afectada", "String").Update();
    elemAudit.Attributes.AddNew("detalle", "JSON").Update();
    elemAudit.Attributes.AddNew("ip_origen", "String").Update();
    elemAudit.Attributes.AddNew("user_agent", "String").Update();
    elemAudit.Attributes.AddNew("creado_en", "DateTime").Update();
    elemAudit.Attributes.Refresh();

    // 6. Entidad Relacionada: RolBase
    var elemRol = pkg.Elements.AddNew("RolBase", "Class");
    elemRol.Stereotype = "Model";
    elemRol.Update();

    elemRol.Attributes.AddNew("id", "Integer").Update();
    elemRol.Attributes.AddNew("nombre", "String").Update();
    elemRol.Attributes.Refresh();

    // 7. Entidad Relacionada: Permiso
    var elemPermiso = pkg.Elements.AddNew("Permiso", "Class");
    elemPermiso.Stereotype = "Model";
    elemPermiso.Update();

    elemPermiso.Attributes.AddNew("id", "Integer").Update();
    elemPermiso.Attributes.AddNew("codigo", "String").Update();
    elemPermiso.Attributes.AddNew("descripcion", "String").Update();
    elemPermiso.Attributes.Refresh();

    // 8. Entidad Relacionada: Empresa (Datos del negocio respaldados/restaurados)
    var elemEmpresa = pkg.Elements.AddNew("Empresa", "Class");
    elemEmpresa.Stereotype = "Model";
    elemEmpresa.Update();

    elemEmpresa.Attributes.AddNew("id", "Integer").Update();
    elemEmpresa.Attributes.AddNew("razon_social", "String").Update();
    elemEmpresa.Attributes.AddNew("nit", "String").Update();
    elemEmpresa.Attributes.AddNew("estado", "String").Update();
    elemEmpresa.Attributes.Refresh();

    pkg.Elements.Refresh();

    // ==========================================================================
    // CONEXIONES BCE Y CARDINALIDADES
    // ==========================================================================
    conectarSimple(elemActor, elemUI);
    conectarSimple(elemUI, elemCtrl);
    conectarSimple(elemCtrl, elemUsuario); // Control -> ONLY Entidad Principal (Usuario)

    // Usuario -> LogAuditoria (1..1 a 0..*)
    conectarConCardinalidad(elemUsuario, elemAudit, "genera", "1..1", "0..*");

    // Usuario -> RolBase (0..* a 1..1)
    conectarConCardinalidad(elemUsuario, elemRol, "posee", "0..*", "1..1");

    // RolBase -> Permiso (0..* a 1..*)
    conectarConCardinalidad(elemRol, elemPermiso, "asigna", "0..*", "1..*");

    // Usuario -> Empresa (1..1 a 0..*)
    conectarConCardinalidad(elemUsuario, elemEmpresa, "administra", "1..1", "0..*");

    // ==========================================================================
    // POSICIONAMIENTO EN EL DIAGRAMA (LAYOUT LIMPIO TIPO ÁRBOL)
    // ==========================================================================
    posicionarObjeto(diagram, elemActor, 50, 130, -200, -320);
    posicionarObjeto(diagram, elemUI, 170, 330, -170, -350);
    posicionarObjeto(diagram, elemCtrl, 370, 560, -170, -340);

    // Entidad Principal (Centro)
    posicionarObjeto(diagram, elemUsuario, 610, 760, -170, -340);

    // Entidades Satélites con Cardinalidades
    posicionarObjeto(diagram, elemRol, 610, 760, -30, -130);       // Arriba Centro
    posicionarObjeto(diagram, elemPermiso, 830, 980, -30, -140);   // Arriba Derecha
    posicionarObjeto(diagram, elemEmpresa, 830, 980, -190, -320);  // Derecha Centro
    posicionarObjeto(diagram, elemAudit, 610, 760, -390, -550);    // Abajo Centro

    diagram.DiagramObjects.Refresh();
    diagram.Update();
    Repository.ReloadDiagram(diagram.DiagramID);
    Repository.OpenDiagram(diagram.DiagramID);
}

/* ==============================================================================
 * UTILIDADES COMUNES
 * ============================================================================== */
function posicionarObjeto(diagram, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
}

function conectarSimple(origen, destino) {
    var con = origen.Connectors.AddNew("", "Association");
    con.SupplierID = destino.ElementID;
    con.Direction = "Unspecified";
    con.Update();
    origen.Connectors.Refresh();
    return con;
}

function conectarConCardinalidad(origen, destino, nombreRol, cardOrigen, cardDestino) {
    var con = origen.Connectors.AddNew(nombreRol, "Association");
    con.SupplierID = destino.ElementID;
    con.Direction = "Unspecified";
    con.ClientEnd.Cardinality = cardOrigen;
    con.SupplierEnd.Cardinality = cardDestino;
    con.Update();
    origen.Connectors.Refresh();
    return con;
}

main();
