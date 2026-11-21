/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagrama de Secuencia - UML 2.5+ (100% Nombres Literales del Código)
 * 
 * CASO DE USO 12: Gestionar Pedidos y Ventas
 *   - Actor: :Emprendedor
 *   - Boundary (UI): :MisPedidos (MisPedidos.jsx)
 *   - Control (CC): :PedidosViews (apps/pedidos/views.py)
 *   - Entity 1: :Pedido (models.py Pedido)
 *   - Entity 2: :OrdenCompra (models.py OrdenCompra)
 * ==============================================================================
 */

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
var BOTTOM_LIFELINES = -920;

var FRAG_X_LEFT  = 285;
var FRAG_X_RIGHT = 1160;

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

function posicionarElemento(diagram, elem, left, right, top, bottom) {
    var coords = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
}

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

function generarCU12_Secuencia(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Secuencia CU12...", 0);

    var pkgCU12 = parentPkg.Packages.AddNew("CU12 - Gestionar Pedidos y Ventas", "Package");
    pkgCU12.Update();

    var diag = pkgCU12.Diagrams.AddNew("Diagrama de Secuencia - CU12", "Sequence");
    diag.Update();

    var el = pkgCU12.Elements;

    var act = el.AddNew(":Emprendedor", "Actor");
    act.Update();

    var ui = el.AddNew(":MisPedidos", "Sequence"); // MisPedidos.jsx
    ui.Stereotype = "boundary";
    ui.Update();

    var ctrl = el.AddNew(":PedidosViews", "Sequence"); // apps/pedidos/views.py
    ctrl.Stereotype = "control";
    ctrl.Update();

    var entPed = el.AddNew(":Pedido", "Sequence"); // models.py Pedido
    entPed.Stereotype = "entity";
    entPed.Update();

    var entOrd = el.AddNew(":OrdenCompra", "Sequence"); // models.py OrdenCompra
    entOrd.Stereotype = "entity";
    entOrd.Update();

    posicionarElemento(diag, act, POS_ACTOR_LEFT, POS_ACTOR_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ui, POS_UI_LEFT, POS_UI_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, POS_CTRL_LEFT, POS_CTRL_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, entPed, POS_ENT1_LEFT, POS_ENT1_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, entOrd, POS_ENT2_LEFT, POS_ENT2_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Cambiar estado operativo del pedido (MisPedidos.jsx -> EditarEliminarMiPedidoView)
    registrarMensaje(act, ui, "1: cambiarEstado(pedido, nuevoEstado)", false, seq++);
    registrarMensaje(ui, ctrl, "2: EditarEliminarMiPedidoView.patch(request, pedido_id)", false, seq++);
    registrarMensaje(ctrl, entPed, "3: pedido.save(update_fields=['estado'])", false, seq++);
    registrarMensaje(entPed, ctrl, "4: pedido_actualizado (estado='ENVIADO')", true, seq++);
    registrarMensaje(ctrl, ui, "5: Response(PedidoSerializer.data, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "6: setResultados(prev => prev.map(...))", true, seq++);

    // Bloque 2: Aceptar comprobante QR y confirmar venta (MisPedidos.jsx -> EditarEliminarMiPedidoView)
    registrarMensaje(act, ui, "7: aceptarComprobante(pedido)", false, seq++);
    registrarMensaje(ui, ctrl, "8: EditarEliminarMiPedidoView.patch(request, pedido_id)", false, seq++);
    registrarMensaje(ctrl, entOrd, "9: orden_compra.save(update_fields=['estado_pago'])", false, seq++);
    registrarMensaje(entOrd, ctrl, "10: orden_pago_actualizada (estado_pago='PAGADO')", true, seq++);
    registrarMensaje(ctrl, entPed, "11: pedido.save(update_fields=['estado'])", false, seq++);
    registrarMensaje(entPed, ctrl, "12: pedido_confirmado (estado='CONFIRMADO')", true, seq++);
    registrarMensaje(ctrl, ui, "13: Response(PedidoSerializer.data, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "14: setModalComprobante(null) + setResultados(...)", true, seq++);

    // Fragmentos ALT acotados
    crearFragmentoAlt(pkgCU12, diag, FRAG_X_LEFT, FRAG_X_RIGHT, -145, -420);
    crearFragmentoAlt(pkgCU12, diag, FRAG_X_LEFT, FRAG_X_RIGHT, -510, -850);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
    Repository.WriteOutput("Script", "[+] Secuencia CU12 generada con éxito.", 0);
}

function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMA DE SECUENCIA CU12 ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var root = currentPackage.Packages.AddNew("Diagrama de Secuencia - CU12", "Package");
    root.Update();

    generarCU12_Secuencia(root);

    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);
    Repository.WriteOutput("Script", "=== PROCESO COMPLETADO EXITOSAMENTE ===", 0);
    Session.Prompt("¡Diagrama de Secuencia CU12 generado con éxito!", 0);
}

main();
