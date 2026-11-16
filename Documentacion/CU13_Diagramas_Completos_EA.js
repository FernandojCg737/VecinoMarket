/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagramas Completos CU13 - UML 2.5 (Secuencia, Comunicación y Análisis)
 * ESTRUCTURA: Correspondencia 1:1 con Código Real Django y React
 * 
 * CASO DE USO 13: Gestionar Entregas y Despachos
 *   - Actor: :Emprendedor
 *   - Boundary (UI): :MisEntregas (Frontend/frontend_web/src/pages/empresa/MisEntregas.jsx)
 *   - Control (CC): :EntregasViews (Backend/apps/pedidos/views.py)
 *   - Entity 1: :Entrega (Backend/apps/pedidos/models.py)
 *   - Entity 2: :Pedido (Backend/apps/pedidos/models.py)
 * ==============================================================================
 */

function mainCU13() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMAS UML CU13 (ENTREGAS) ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var root = currentPackage.Packages.AddNew("CU13 - Gestionar Entregas", "Package");
    root.Update();

    generarCU13_Secuencia(root);
    generarCU13_Comunicacion(root);
    generarCU13_AnalisisClases(root);

    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);
    Repository.WriteOutput("Script", "=== [OK] DIAGRAMAS CU13 GENERADOS EXITOSAMENTE ===", 0);
    Session.Prompt("¡Diagramas de Secuencia, Comunicación y Análisis de Clases (CU13) generados con éxito!", 0);
}

/* ==============================================================================
 * 1. DIAGRAMA DE SECUENCIA (CU13)
 * ============================================================================== */
function generarCU13_Secuencia(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("1. Secuencia", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Secuencia - CU13", "Sequence");
    diag.Update();

    var el = pkg.Elements;
    var act = el.AddNew(":Emprendedor", "Actor"); act.Update();
    var ui = el.AddNew(":MisEntregas", "Sequence"); ui.Stereotype = "boundary"; ui.Update();
    var ctrl = el.AddNew(":EntregasViews", "Sequence"); ctrl.Stereotype = "control"; ctrl.Update();
    var entEntr = el.AddNew(":Entrega", "Sequence"); entEntr.Stereotype = "entity"; entEntr.Update();
    var entPed = el.AddNew(":Pedido", "Sequence"); entPed.Stereotype = "entity"; entPed.Update();

    posicionar(diag, act, 60, 180, -30, -850);
    posicionar(diag, ui, 290, 420, -30, -850);
    posicionar(diag, ctrl, 530, 660, -30, -850);
    posicionar(diag, entEntr, 770, 900, -30, -850);
    posicionar(diag, entPed, 1010, 1140, -30, -850);

    var seq = 1;

    // Bloque 1: Despachar pedido / Poner en camino
    regMsgSeq(act, ui, "1: cambiarEstado(entrega, 'EN_CAMINO')", false, seq++);
    regMsgSeq(ui, ctrl, "2: EditarEliminarMiEntregaView.patch(request, entrega_id)", false, seq++);
    regMsgSeq(ctrl, entEntr, "3: entrega.save(update_fields=['estado'])", false, seq++);
    regMsgSeq(entEntr, ctrl, "4: entrega_actualizada (estado='EN_CAMINO')", true, seq++);
    regMsgSeq(ctrl, ui, "5: Response(EntregaSerializer.data, 200_OK)", true, seq++);
    regMsgSeq(ui, act, "6: setResultados(prev => prev.map(...))", true, seq++);

    // Bloque 2: Confirmar recepción / Marcar entregada
    regMsgSeq(act, ui, "7: marcarEntregada(entrega)", false, seq++);
    regMsgSeq(ui, ctrl, "8: MarcarMiEntregaEntregadaView.post(request, entrega_id)", false, seq++);
    regMsgSeq(ctrl, entEntr, "9: fn_marcar_entregada(pedido_id)", false, seq++);
    regMsgSeq(ctrl, entPed, "10: pedido.save(estado='ENTREGADO')", false, seq++);
    regMsgSeq(ctrl, ui, "11: Response(EntregaSerializer.data, 200_OK)", true, seq++);
    regMsgSeq(ui, act, "12: setResultados(prev => prev.map(...))", true, seq++);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

/* ==============================================================================
 * 2. DIAGRAMA DE COMUNICACIÓN (CU13)
 * ============================================================================== */
function generarCU13_Comunicacion(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("2. Comunicacion", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Comunicacion - CU13", "Communication");
    if (!diag.Update()) {
        diag = pkg.Diagrams.AddNew("Diagrama de Comunicacion - CU13", "Analysis");
        diag.Update();
    }

    var elemActor = pkg.Elements.AddNew(":Emprendedor", "Actor"); elemActor.Update();
    var elemUI = pkg.Elements.AddNew(":MisEntregas", "Class"); elemUI.Stereotype = "boundary"; elemUI.Update();
    var elemCtrl = pkg.Elements.AddNew(":EntregasViews", "Class"); elemCtrl.Stereotype = "control"; elemCtrl.Update();
    var elemEnt1 = pkg.Elements.AddNew(":Entrega", "Class"); elemEnt1.Stereotype = "entity"; elemEnt1.Update();
    var elemEnt2 = pkg.Elements.AddNew(":Pedido", "Class"); elemEnt2.Stereotype = "entity"; elemEnt2.Update();

    posicionar(diag, elemActor, 60, 160, -160, -250);
    posicionar(diag, elemUI, 340, 440, -160, -250);
    posicionar(diag, elemCtrl, 640, 740, -160, -250);
    posicionar(diag, elemEnt1, 960, 1060, -70, -160);
    posicionar(diag, elemEnt2, 960, 1060, -250, -340);

    conectarCom(diag, elemActor, elemUI, [
        "1: cambiarEstado(entrega, 'EN_CAMINO') \u2192",
        "6: setResultados(prev => prev.map(...)) \u2190",
        "7: marcarEntregada(entrega) \u2192",
        "12: setResultados(prev => prev.map(...)) \u2190"
    ]);

    conectarCom(diag, elemUI, elemCtrl, [
        "2: EditarEliminarMiEntregaView.patch(request, entrega_id) \u2192",
        "5: Response(EntregaSerializer.data, 200_OK) \u2190",
        "8: MarcarMiEntregaEntregadaView.post(request, entrega_id) \u2192",
        "11: Response(EntregaSerializer.data, 200_OK) \u2190"
    ]);

    conectarCom(diag, elemCtrl, elemEnt1, [
        "3: entrega.save(update_fields=['estado']) \u2192",
        "4: entrega_actualizada (estado='EN_CAMINO') \u2190",
        "9: fn_marcar_entregada(pedido_id) \u2192"
    ]);

    conectarCom(diag, elemCtrl, elemEnt2, [
        "10: pedido.save(estado='ENTREGADO') \u2192"
    ]);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

/* ==============================================================================
 * 3. DIAGRAMA DE ANÁLISIS DE CLASES (CU13)
 * ============================================================================== */
function generarCU13_AnalisisClases(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("3. Analisis de Clases", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Analisis - CU13", "Logical");
    diag.Update();

    var elemActor = pkg.Elements.AddNew("Emprendedor", "Actor"); elemActor.Update();

    var elemUI = pkg.Elements.AddNew("MisEntregas", "Class");
    elemUI.Stereotype = "UI";
    elemUI.Attributes.AddNew("resultados", "Array<Entrega>").Update();
    elemUI.Attributes.AddNew("cargando", "Boolean").Update();
    elemUI.Attributes.AddNew("error", "String").Update();
    elemUI.Methods.AddNew("cargarEntregas()", "Promise<void>").Update();
    elemUI.Methods.AddNew("cambiarEstado(entrega, nuevoEstado)", "void").Update();
    elemUI.Methods.AddNew("marcarEntregada(entrega)", "void").Update();
    elemUI.Methods.AddNew("eliminar(entrega)", "void").Update();
    elemUI.Update();

    var elemCtrl = pkg.Elements.AddNew("EntregasViews", "Class");
    elemCtrl.Stereotype = "CC";
    elemCtrl.Methods.AddNew("ListaMisEntregasView_get(request)", "Response").Update();
    elemCtrl.Methods.AddNew("EditarEliminarMiEntregaView_patch(request, entrega_id)", "Response").Update();
    elemCtrl.Methods.AddNew("MarcarMiEntregaEntregadaView_post(request, entrega_id)", "Response").Update();
    elemCtrl.Methods.AddNew("_marcar_entregada(entrega)", "void").Update();
    elemCtrl.Update();

    var elemEntr = pkg.Elements.AddNew("Entrega", "Class");
    elemEntr.Stereotype = "Model";
    elemEntr.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemEntr.Attributes.AddNew("pedido_id", "BIGINT").Update();
    elemEntr.Attributes.AddNew("estado", "VARCHAR(20)").Update();
    elemEntr.Attributes.AddNew("fecha_estimada", "DATE").Update();
    elemEntr.Attributes.AddNew("fecha_entregada", "TIMESTAMP").Update();
    elemEntr.Update();

    var elemPed = pkg.Elements.AddNew("Pedido", "Class");
    elemPed.Stereotype = "Model";
    elemPed.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemPed.Attributes.AddNew("numero_pedido", "VARCHAR(30)").Update();
    elemPed.Attributes.AddNew("estado", "VARCHAR(20)").Update();
    elemPed.Attributes.AddNew("modalidad_entrega", "VARCHAR(20)").Update();
    elemPed.Attributes.AddNew("sucursal_recojo_id", "BIGINT").Update();
    elemPed.Attributes.AddNew("direccion_envio_id", "BIGINT").Update();
    elemPed.Update();

    posicionar(diag, elemActor, 40, 140, -180, -280);
    posicionar(diag, elemUI, 200, 420, -150, -320);
    posicionar(diag, elemCtrl, 480, 750, -150, -320);
    posicionar(diag, elemEntr, 820, 1070, -50, -230);
    posicionar(diag, elemPed, 820, 1070, -270, -470);

    conectarCard(elemActor, elemUI, "interactua", "1", "1");
    conectarCard(elemUI, elemCtrl, "solicita_operacion", "1", "1");
    conectarCard(elemCtrl, elemEntr, "gestiona_despacho", "1", "1..*");
    conectarCard(elemCtrl, elemPed, "actualiza_estado", "1", "1");
    conectarCard(elemPed, elemEntr, "asigna_entrega", "1", "1");

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
        dLink.Style = 1;
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

mainCU13();
