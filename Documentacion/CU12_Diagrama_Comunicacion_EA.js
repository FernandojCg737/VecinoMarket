/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagrama de Comunicación - UML 2.5 (100% Nombres Literales del Código)
 * ESTRUCTURA: Correspondencia 1:1 EXACTA con el Diagrama de Secuencia
 * 
 * CASO DE USO 12: Gestionar Pedidos y Ventas
 *   - Actor: :Emprendedor
 *   - Boundary: :MisPedidos
 *   - Control: :PedidosViews
 *   - Entidad 1: :Pedido
 *   - Entidad 2: :OrdenCompra
 * ==============================================================================
 */

function generarDiagramaComunicacionCU12() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMA DE COMUNICACIÓN CU12 ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var rootPkg = currentPackage.Packages.AddNew("Diagrama de Comunicacion CU12", "");
    rootPkg.Update();

    generarCU12_Comunicacion(rootPkg);

    rootPkg.Packages.Refresh();
    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] DIAGRAMA DE COMUNICACIÓN CU12 GENERADO EXITOSAMENTE ===", 0);
    Session.Prompt("¡Diagrama de Comunicación CU12 generado con éxito!", 0);
}

function generarCU12_Comunicacion(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU12 - Gestionar Pedidos y Ventas", "");
    pkg.Update();

    var diagName = "CU12. Gestionar Pedidos y Ventas";
    var diagram = pkg.Diagrams.AddNew(diagName, "Communication");
    if (!diagram.Update()) {
        diagram = pkg.Diagrams.AddNew(diagName, "Analysis");
        diagram.Update();
    }

    // 1. Elementos BCE con nombres EXACTOS al Diagrama de Secuencia
    var elemActor = pkg.Elements.AddNew(":Emprendedor", "Actor");
    elemActor.Update();

    var elemUI = pkg.Elements.AddNew(":MisPedidos", "Class");
    elemUI.Stereotype = "boundary";
    elemUI.StereotypeEx = "boundary";
    elemUI.Update();

    var elemCtrl = pkg.Elements.AddNew(":PedidosViews", "Class");
    elemCtrl.Stereotype = "control";
    elemCtrl.StereotypeEx = "control";
    elemCtrl.Update();

    var elemEnt1 = pkg.Elements.AddNew(":Pedido", "Class");
    elemEnt1.Stereotype = "entity";
    elemEnt1.StereotypeEx = "entity";
    elemEnt1.Update();

    var elemEnt2 = pkg.Elements.AddNew(":OrdenCompra", "Class");
    elemEnt2.Stereotype = "entity";
    elemEnt2.StereotypeEx = "entity";
    elemEnt2.Update();

    pkg.Elements.Refresh();

    // 2. Posicionamiento claro y espacioso en forma de bifurcación
    colocarObjeto(diagram, elemActor, 60, 160, -160, -250);
    colocarObjeto(diagram, elemUI, 340, 440, -160, -250);
    colocarObjeto(diagram, elemCtrl, 640, 740, -160, -250);
    colocarObjeto(diagram, elemEnt1, 960, 1060, -70, -160);   // Arriba derecha
    colocarObjeto(diagram, elemEnt2, 960, 1060, -250, -340); // Abajo derecha

    diagram.DiagramObjects.Refresh();

    // 3. Enlaces y Mensajes 1:1 con la Secuencia (Numeración 1..14 plana, con flechas)
    // Enlace 1: :Emprendedor <---> :MisPedidos
    var m1 = [
        "1: cambiarEstado(pedido, nuevoEstado) \u2192",
        "6: setResultados(prev => prev.map(...)) \u2190",
        "7: aceptarComprobante(pedido) \u2192",
        "14: setModalComprobante(null) + setResultados(...) \u2190"
    ];
    conectar(diagram, elemActor, elemUI, m1);

    // Enlace 2: :MisPedidos <---> :PedidosViews
    var m2 = [
        "2: EditarEliminarMiPedidoView.patch(request, pedido_id) \u2192",
        "5: Response(PedidoSerializer.data, 200_OK) \u2190",
        "8: EditarEliminarMiPedidoView.patch(request, pedido_id) \u2192",
        "13: Response(PedidoSerializer.data, 200_OK) \u2190"
    ];
    conectar(diagram, elemUI, elemCtrl, m2);

    // Enlace 3: :PedidosViews <---> :Pedido
    var m3 = [
        "3: pedido.save(update_fields=['estado']) \u2192",
        "4: pedido_actualizado (estado='ENVIADO') \u2190",
        "11: pedido.save(update_fields=['estado']) \u2192",
        "12: pedido_confirmado (estado='CONFIRMADO') \u2190"
    ];
    conectar(diagram, elemCtrl, elemEnt1, m3);

    // Enlace 4: :PedidosViews <---> :OrdenCompra
    var m4 = [
        "9: orden_compra.save(update_fields=['estado_pago']) \u2192",
        "10: orden_pago_actualizada (estado_pago='PAGADO') \u2190"
    ];
    conectar(diagram, elemCtrl, elemEnt2, m4);

    diagram.DiagramLinks.Refresh();
    diagram.Update();
    Repository.ReloadDiagram(diagram.DiagramID);
    Repository.OpenDiagram(diagram.DiagramID);
}

function colocarObjeto(diagram, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Style = "ShowStereoIcon=1;HideIcon=0;";
    diagObj.Update();
    return diagObj;
}

function conectar(diagram, de, a, mensajes) {
    var link = de.Connectors.AddNew("", "Association");
    link.SupplierID = a.ElementID;
    link.Direction = "Unspecified";
    link.Name = mensajes.join("\n");
    link.Update();

    de.Connectors.Refresh();

    try {
        var dLink = diagram.DiagramLinks.AddNew("", "");
        dLink.ConnectorID = link.ConnectorID;
        dLink.Style = 1; // Línea recta sólida continua
        dLink.Update();
    } catch(e) {}
}

generarDiagramaComunicacionCU12();
