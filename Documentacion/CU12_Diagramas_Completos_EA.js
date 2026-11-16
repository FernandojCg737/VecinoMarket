/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagramas Completos CU12 - UML 2.5 (Secuencia, Comunicación y Análisis)
 * ESTRUCTURA: Correspondencia 1:1 con Código Real Django REST y React SPA
 * 
 * CASO DE USO 12: Gestionar Pedidos y Ventas
 *   - Actor: :Emprendedor
 *   - Boundary (UI): :MisPedidos (Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx)
 *   - Control (CC): :PedidosViews (Backend/apps/pedidos/views.py)
 *   - Entity Principal: :Pedido (Backend/apps/pedidos/models.py)
 *   - Entity Financiera: :OrdenCompra (Backend/apps/pedidos/models.py)
 * ==============================================================================
 */

function mainCU12() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMAS UML CU12 (PEDIDOS Y VENTAS) ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var root = currentPackage.Packages.AddNew("CU12 - Gestionar Pedidos y Ventas", "Package");
    root.Update();

    generarCU12_Secuencia(root);
    generarCU12_Comunicacion(root);
    generarCU12_AnalisisClases(root);

    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);
    Repository.WriteOutput("Script", "=== [OK] DIAGRAMAS CU12 GENERADOS EXITOSAMENTE ===", 0);
    Session.Prompt("¡Diagramas de Secuencia, Comunicación y Análisis de Clases (CU12) generados con éxito!", 0);
}

/* ==============================================================================
 * 1. DIAGRAMA DE SECUENCIA (CU12)
 * ============================================================================== */
function generarCU12_Secuencia(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Secuencia CU12...", 0);

    var pkg = parentPkg.Packages.AddNew("1. Secuencia", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Secuencia - CU12", "Sequence");
    diag.Update();

    var el = pkg.Elements;
    var act = el.AddNew(":Emprendedor", "Actor"); act.Update();
    var ui = el.AddNew(":MisPedidos", "Sequence"); ui.Stereotype = "boundary"; ui.Update();
    var ctrl = el.AddNew(":PedidosViews", "Sequence"); ctrl.Stereotype = "control"; ctrl.Update();
    var entPed = el.AddNew(":Pedido", "Sequence"); entPed.Stereotype = "entity"; entPed.Update();
    var entOrd = el.AddNew(":OrdenCompra", "Sequence"); entOrd.Stereotype = "entity"; entOrd.Update();

    posicionar(diag, act, 60, 180, -30, -920);
    posicionar(diag, ui, 290, 420, -30, -920);
    posicionar(diag, ctrl, 530, 660, -30, -920);
    posicionar(diag, entPed, 770, 900, -30, -920);
    posicionar(diag, entOrd, 1010, 1140, -30, -920);

    var seq = 1;

    // Bloque 1: Cambiar estado operativo del pedido (MisPedidos.jsx -> EditarEliminarMiPedidoView)
    regMsgSeq(act, ui, "1: cambiarEstado(pedido, nuevoEstado)", false, seq++);
    regMsgSeq(ui, ctrl, "2: EditarEliminarMiPedidoView.patch(request, pedido_id)", false, seq++);
    regMsgSeq(ctrl, entPed, "3: pedido.save(update_fields=['estado'])", false, seq++);
    regMsgSeq(entPed, ctrl, "4: pedido_actualizado (estado='ENVIADO')", true, seq++);
    regMsgSeq(ctrl, ui, "5: Response(PedidoSerializer.data, 200_OK)", true, seq++);
    regMsgSeq(ui, act, "6: setResultados(prev => prev.map(...))", true, seq++);

    // Bloque 2: Aceptar comprobante QR y confirmar venta (MisPedidos.jsx -> EditarEliminarMiPedidoView)
    regMsgSeq(act, ui, "7: aceptarComprobante(pedido)", false, seq++);
    regMsgSeq(ui, ctrl, "8: EditarEliminarMiPedidoView.patch(request, pedido_id)", false, seq++);
    regMsgSeq(ctrl, entOrd, "9: orden_compra.save(update_fields=['estado_pago'])", false, seq++);
    regMsgSeq(entOrd, ctrl, "10: orden_pago_actualizada (estado_pago='PAGADO')", true, seq++);
    regMsgSeq(ctrl, entPed, "11: pedido.save(update_fields=['estado'])", false, seq++);
    regMsgSeq(entPed, ctrl, "12: pedido_confirmado (estado='CONFIRMADO')", true, seq++);
    regMsgSeq(ctrl, ui, "13: Response(PedidoSerializer.data, 200_OK)", true, seq++);
    regMsgSeq(ui, act, "14: setModalComprobante(null) + setResultados(...)", true, seq++);

    crearFragAlt(pkg, diag, 285, 1160, -145, -420);
    crearFragAlt(pkg, diag, 285, 1160, -510, -850);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

/* ==============================================================================
 * 2. DIAGRAMA DE COMUNICACIÓN (CU12)
 * ============================================================================== */
function generarCU12_Comunicacion(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Comunicacion CU12...", 0);

    var pkg = parentPkg.Packages.AddNew("2. Comunicacion", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Comunicacion - CU12", "Communication");
    if (!diag.Update()) {
        diag = pkg.Diagrams.AddNew("Diagrama de Comunicacion - CU12", "Analysis");
        diag.Update();
    }

    var elemActor = pkg.Elements.AddNew(":Emprendedor", "Actor"); elemActor.Update();
    var elemUI = pkg.Elements.AddNew(":MisPedidos", "Class"); elemUI.Stereotype = "boundary"; elemUI.Update();
    var elemCtrl = pkg.Elements.AddNew(":PedidosViews", "Class"); elemCtrl.Stereotype = "control"; elemCtrl.Update();
    var elemEnt1 = pkg.Elements.AddNew(":Pedido", "Class"); elemEnt1.Stereotype = "entity"; elemEnt1.Update();
    var elemEnt2 = pkg.Elements.AddNew(":OrdenCompra", "Class"); elemEnt2.Stereotype = "entity"; elemEnt2.Update();

    posicionar(diag, elemActor, 60, 160, -160, -250);
    posicionar(diag, elemUI, 340, 440, -160, -250);
    posicionar(diag, elemCtrl, 640, 740, -160, -250);
    posicionar(diag, elemEnt1, 960, 1060, -70, -160);
    posicionar(diag, elemEnt2, 960, 1060, -250, -340);

    conectarCom(diag, elemActor, elemUI, [
        "1: cambiarEstado(pedido, nuevoEstado) \u2192",
        "6: setResultados(prev => prev.map(...)) \u2190",
        "7: aceptarComprobante(pedido) \u2192",
        "14: setModalComprobante(null) + setResultados(...) \u2190"
    ]);

    conectarCom(diag, elemUI, elemCtrl, [
        "2: EditarEliminarMiPedidoView.patch(request, pedido_id) \u2192",
        "5: Response(PedidoSerializer.data, 200_OK) \u2190",
        "8: EditarEliminarMiPedidoView.patch(request, pedido_id) \u2192",
        "13: Response(PedidoSerializer.data, 200_OK) \u2190"
    ]);

    conectarCom(diag, elemCtrl, elemEnt1, [
        "3: pedido.save(update_fields=['estado']) \u2192",
        "4: pedido_actualizado (estado='ENVIADO') \u2190",
        "11: pedido.save(update_fields=['estado']) \u2192",
        "12: pedido_confirmado (estado='CONFIRMADO') \u2190"
    ]);

    conectarCom(diag, elemCtrl, elemEnt2, [
        "9: orden_compra.save(update_fields=['estado_pago']) \u2192",
        "10: orden_pago_actualizada (estado_pago='PAGADO') \u2190"
    ]);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

/* ==============================================================================
 * 3. DIAGRAMA DE ANÁLISIS DE CLASES (CU12)
 * ============================================================================== */
function generarCU12_AnalisisClases(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Analisis de Clases CU12...", 0);

    var pkg = parentPkg.Packages.AddNew("3. Analisis de Clases", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Analisis - CU12", "Logical");
    diag.Update();

    var elemActor = pkg.Elements.AddNew("Emprendedor", "Actor"); elemActor.Update();

    var elemUI = pkg.Elements.AddNew("MisPedidos", "Class");
    elemUI.Stereotype = "UI";
    elemUI.Attributes.AddNew("tipo", "String ('venta' | 'pedido')").Update();
    elemUI.Attributes.AddNew("resultados", "Array<Pedido>").Update();
    elemUI.Attributes.AddNew("cargando", "Boolean").Update();
    elemUI.Attributes.AddNew("modalComprobante", "Pedido | null").Update();
    elemUI.Attributes.AddNew("error", "String").Update();
    elemUI.Methods.AddNew("cargarPedidos()", "Promise<void>").Update();
    elemUI.Methods.AddNew("cambiarEstado(pedido, nuevoEstado)", "void").Update();
    elemUI.Methods.AddNew("aceptarComprobante(pedido)", "void").Update();
    elemUI.Methods.AddNew("eliminar(pedido)", "void").Update();
    elemUI.Update();

    var elemCtrl = pkg.Elements.AddNew("PedidosViews", "Class");
    elemCtrl.Stereotype = "CC";
    elemCtrl.Methods.AddNew("ListaMisPedidosView_get(request)", "Response").Update();
    elemCtrl.Methods.AddNew("EditarEliminarMiPedidoView_patch(request, pedido_id)", "Response").Update();
    elemCtrl.Methods.AddNew("EditarEliminarMiPedidoView_delete(request, pedido_id)", "Response").Update();
    elemCtrl.Methods.AddNew("_filtrar_pedidos(qs, params)", "QuerySet").Update();
    elemCtrl.Methods.AddNew("_aplicar_cambios_pedido(request, pedido)", "void").Update();
    elemCtrl.Update();

    var elemPed = pkg.Elements.AddNew("Pedido", "Class");
    elemPed.Stereotype = "Model";
    elemPed.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemPed.Attributes.AddNew("orden_compra_id", "BIGINT").Update();
    elemPed.Attributes.AddNew("empresa_id", "BIGINT").Update();
    elemPed.Attributes.AddNew("numero_pedido", "VARCHAR(30)").Update();
    elemPed.Attributes.AddNew("subtotal", "NUMERIC(10,2)").Update();
    elemPed.Attributes.AddNew("comision_monto", "NUMERIC(10,2)").Update();
    elemPed.Attributes.AddNew("estado", "VARCHAR(20)").Update();
    elemPed.Attributes.AddNew("modalidad_entrega", "VARCHAR(20)").Update();
    elemPed.Attributes.AddNew("fecha_pedido", "TIMESTAMP").Update();
    elemPed.Update();

    var elemOrd = pkg.Elements.AddNew("OrdenCompra", "Class");
    elemOrd.Stereotype = "Model";
    elemOrd.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemOrd.Attributes.AddNew("comprador_id", "BIGINT").Update();
    elemOrd.Attributes.AddNew("monto_total", "NUMERIC(10,2)").Update();
    elemOrd.Attributes.AddNew("metodo_pago", "VARCHAR(20)").Update();
    elemOrd.Attributes.AddNew("estado_pago", "VARCHAR(20)").Update();
    elemOrd.Attributes.AddNew("fecha", "TIMESTAMP").Update();
    elemOrd.Update();

    var elemItem = pkg.Elements.AddNew("PedidoItem", "Class");
    elemItem.Stereotype = "Model";
    elemItem.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemItem.Attributes.AddNew("pedido_id", "BIGINT").Update();
    elemItem.Attributes.AddNew("producto_id", "BIGINT").Update();
    elemItem.Attributes.AddNew("cantidad", "INTEGER").Update();
    elemItem.Attributes.AddNew("precio_unitario", "NUMERIC(10,2)").Update();
    elemItem.Attributes.AddNew("subtotal", "NUMERIC(10,2)").Update();
    elemItem.Update();

    var elemEntr = pkg.Elements.AddNew("Entrega", "Class");
    elemEntr.Stereotype = "Model";
    elemEntr.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemEntr.Attributes.AddNew("pedido_id", "BIGINT").Update();
    elemEntr.Attributes.AddNew("estado", "VARCHAR(20)").Update();
    elemEntr.Attributes.AddNew("fecha_estimada", "DATE").Update();
    elemEntr.Attributes.AddNew("fecha_entregada", "TIMESTAMP").Update();
    elemEntr.Update();

    posicionar(diag, elemActor, 40, 140, -180, -280);
    posicionar(diag, elemUI, 200, 420, -150, -320);
    posicionar(diag, elemCtrl, 480, 750, -150, -320);
    posicionar(diag, elemPed, 820, 1070, -40, -260);
    posicionar(diag, elemOrd, 820, 1070, -290, -480);
    posicionar(diag, elemItem, 1130, 1360, -40, -210);
    posicionar(diag, elemEntr, 1130, 1360, -240, -410);

    conectarCard(elemActor, elemUI, "interactua", "1", "1");
    conectarCard(elemUI, elemCtrl, "solicita_operacion", "1", "1");
    conectarCard(elemCtrl, elemPed, "gestiona_estado", "1", "1..*");
    conectarCard(elemCtrl, elemOrd, "valida_pago", "1", "1");
    conectarCard(elemOrd, elemPed, "contiene", "1", "1..*");
    conectarCard(elemPed, elemItem, "detalle", "1", "1..*");
    conectarCard(elemPed, elemEntr, "despacho", "1", "1");

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

/* ==============================================================================
 * UTILIDADES COMUNES
 * ============================================================================== */
function posicionar(diagram, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
}

function regMsgSeq(origen, destino, nombre, esRetorno, seqCounter) {
    var con = origen.Connectors.AddNew(nombre, "Sequence");
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

function crearFragAlt(pkg, diagram, left, right, top, bottom) {
    try {
        var frag = pkg.Elements.AddNew("", "InteractionFragment");
        frag.Subtype = 0;
        frag.Update();
        posicionar(diagram, frag, left, right, top, bottom);
    } catch(e) {}
}

function conectarCom(diagram, de, a, mensajes) {
    var link = de.Connectors.AddNew("", "Association");
    link.SupplierID = a.ElementID;
    link.Direction = "Unspecified";
    link.Name = mensajes.join("\n");
    link.Update();
    de.Connectors.Refresh();
    try {
        var dLink = diagram.DiagramLinks.AddNew("", "");
        dLink.ConnectorID = link.ConnectorID;
        dLink.Style = 1; // Línea recta continua
        dLink.Update();
    } catch(e) {}
}

function conectarCard(origen, destino, nombreRol, cardOrigen, cardDestino) {
    var con = origen.Connectors.AddNew(nombreRol, "Association");
    con.SupplierID = destino.ElementID;
    con.Direction = "Unspecified";
    con.ClientEnd.Cardinality = cardOrigen;
    con.SupplierEnd.Cardinality = cardDestino;
    con.Update();
    origen.Connectors.Refresh();
    return con;
}

mainCU12();
