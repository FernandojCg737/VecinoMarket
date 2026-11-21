/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagrama de Análisis de Clases - UML 2.5 (100% Nombres Literales del Código)
 * 
 * CASO DE USO 12: Gestionar Pedidos y Ventas
 *   - Boundary (UI): MisPedidos (Frontend/frontend_web/src/pages/empresa/MisPedidos.jsx)
 *   - Control (CC): PedidosViews (Backend/apps/pedidos/views.py)
 *   - Entity Principal: Pedido (Backend/apps/pedidos/models.py)
 *   - Entity Financiera: OrdenCompra (Backend/apps/pedidos/models.py)
 *   - Entidades Relacionadas: PedidoItem, Entrega, Empresa
 * ==============================================================================
 */

function posicionarObjeto(diagram, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
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

function generarAnalisisCU12(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU12 - Análisis de Clases", "");
    pkg.Update();

    var diagName = "CU12. Gestionar Pedidos y Ventas";
    var diagram = pkg.Diagrams.AddNew(diagName, "Logical");
    diagram.Update();

    // 1. Actor
    var elemActor = pkg.Elements.AddNew("Emprendedor", "Actor");
    elemActor.Update();

    // 2. <<UI>>: MisPedidos.jsx
    var elemUI = pkg.Elements.AddNew("MisPedidos", "Class");
    elemUI.Stereotype = "UI";
    elemUI.Attributes.AddNew("tipo", "String ('venta' | 'pedido')").Update();
    elemUI.Attributes.AddNew("resultados", "Array<Pedido>").Update();
    elemUI.Attributes.AddNew("cargando", "Boolean").Update();
    elemUI.Attributes.AddNew("modalComprobante", "Pedido | null").Update();
    elemUI.Attributes.AddNew("error", "String").Update();
    elemUI.Attributes.Refresh();

    elemUI.Methods.AddNew("cargarPedidos()", "Promise<void>").Update();
    elemUI.Methods.AddNew("cambiarEstado(pedido, nuevoEstado)", "void").Update();
    elemUI.Methods.AddNew("aceptarComprobante(pedido)", "void").Update();
    elemUI.Methods.AddNew("eliminar(pedido)", "void").Update();
    elemUI.Methods.Refresh();
    elemUI.Update();

    // 3. <<CC>>: PedidosViews (apps/pedidos/views.py)
    var elemCtrl = pkg.Elements.AddNew("PedidosViews", "Class");
    elemCtrl.Stereotype = "CC";
    elemCtrl.Methods.AddNew("ListaMisPedidosView_get(request)", "Response").Update();
    elemCtrl.Methods.AddNew("EditarEliminarMiPedidoView_patch(request, pedido_id)", "Response").Update();
    elemCtrl.Methods.AddNew("EditarEliminarMiPedidoView_delete(request, pedido_id)", "Response").Update();
    elemCtrl.Methods.AddNew("_filtrar_pedidos(qs, params)", "QuerySet").Update();
    elemCtrl.Methods.AddNew("_aplicar_cambios_pedido(request, pedido)", "void").Update();
    elemCtrl.Methods.Refresh();
    elemCtrl.Update();

    // 4. Entidad Principal: Pedido
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
    elemPed.Attributes.AddNew("sucursal_recojo_id", "BIGINT").Update();
    elemPed.Attributes.AddNew("direccion_envio_id", "BIGINT").Update();
    elemPed.Attributes.AddNew("fecha_pedido", "TIMESTAMP").Update();
    elemPed.Attributes.Refresh();
    elemPed.Update();

    // 5. Entidad Financiera: OrdenCompra
    var elemOrd = pkg.Elements.AddNew("OrdenCompra", "Class");
    elemOrd.Stereotype = "Model";
    elemOrd.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemOrd.Attributes.AddNew("comprador_id", "BIGINT").Update();
    elemOrd.Attributes.AddNew("monto_total", "NUMERIC(10,2)").Update();
    elemOrd.Attributes.AddNew("metodo_pago", "VARCHAR(20)").Update();
    elemOrd.Attributes.AddNew("estado_pago", "VARCHAR(20)").Update();
    elemOrd.Attributes.AddNew("fecha", "TIMESTAMP").Update();
    elemOrd.Attributes.Refresh();
    elemOrd.Update();

    // 6. Entidad Satélite: PedidoItem
    var elemItem = pkg.Elements.AddNew("PedidoItem", "Class");
    elemItem.Stereotype = "Model";
    elemItem.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemItem.Attributes.AddNew("pedido_id", "BIGINT").Update();
    elemItem.Attributes.AddNew("producto_id", "BIGINT").Update();
    elemItem.Attributes.AddNew("cantidad", "INTEGER").Update();
    elemItem.Attributes.AddNew("precio_unitario", "NUMERIC(10,2)").Update();
    elemItem.Attributes.AddNew("subtotal", "NUMERIC(10,2)").Update();
    elemItem.Attributes.Refresh();
    elemItem.Update();

    // 7. Entidad Satélite: Entrega
    var elemEntr = pkg.Elements.AddNew("Entrega", "Class");
    elemEntr.Stereotype = "Model";
    elemEntr.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemEntr.Attributes.AddNew("pedido_id", "BIGINT").Update();
    elemEntr.Attributes.AddNew("estado", "VARCHAR(20)").Update();
    elemEntr.Attributes.AddNew("fecha_estimada", "DATE").Update();
    elemEntr.Attributes.AddNew("fecha_entregada", "TIMESTAMP").Update();
    elemEntr.Attributes.Refresh();
    elemEntr.Update();

    // 8. Entidad Satélite: Empresa
    var elemEmp = pkg.Elements.AddNew("Empresa", "Class");
    elemEmp.Stereotype = "Model";
    elemEmp.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemEmp.Attributes.AddNew("razon_social", "VARCHAR(150)").Update();
    elemEmp.Attributes.AddNew("nit", "VARCHAR(30)").Update();
    elemEmp.Attributes.AddNew("estado", "VARCHAR(20)").Update();
    elemEmp.Attributes.Refresh();
    elemEmp.Update();

    pkg.Elements.Refresh();

    // 9. Posicionamiento en el Diagrama
    posicionarObjeto(diagram, elemActor, 40, 140, -180, -280);
    posicionarObjeto(diagram, elemUI, 200, 420, -150, -320);
    posicionarObjeto(diagram, elemCtrl, 480, 750, -150, -320);

    // Entidades en la derecha y satélites
    posicionarObjeto(diagram, elemPed, 820, 1070, -40, -260);
    posicionarObjeto(diagram, elemOrd, 820, 1070, -290, -480);
    posicionarObjeto(diagram, elemItem, 1130, 1360, -40, -210);
    posicionarObjeto(diagram, elemEntr, 1130, 1360, -240, -410);
    posicionarObjeto(diagram, elemEmp, 1130, 1360, -440, -590);

    diagram.DiagramObjects.Refresh();

    // 10. Conexiones y Relaciones del Análisis
    conectarConCardinalidad(elemActor, elemUI, "interactua", "1", "1");
    conectarConCardinalidad(elemUI, elemCtrl, "solicita_operacion", "1", "1");
    conectarConCardinalidad(elemCtrl, elemPed, "gestiona_estado", "1", "1..*");
    conectarConCardinalidad(elemCtrl, elemOrd, "valida_pago", "1", "1");

    conectarConCardinalidad(elemOrd, elemPed, "contiene", "1", "1..*");
    conectarConCardinalidad(elemPed, elemItem, "detalle", "1", "1..*");
    conectarConCardinalidad(elemPed, elemEntr, "despacho", "1", "1");
    conectarConCardinalidad(elemEmp, elemPed, "recibe", "1", "0..*");

    diagram.DiagramLinks.Refresh();
    diagram.Update();
    Repository.ReloadDiagram(diagram.DiagramID);
    Repository.OpenDiagram(diagram.DiagramID);
}

function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO ANÁLISIS DE CLASES CU12 ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var root = currentPackage.Packages.AddNew("Diagrama de Analisis de Clases - CU12", "Package");
    root.Update();

    generarAnalisisCU12(root);

    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);
    Repository.WriteOutput("Script", "=== PROCESO COMPLETADO EXITOSAMENTE ===", 0);
    Session.Prompt("¡Diagrama de Análisis de Clases CU12 generado con éxito!", 0);
}

main();
