/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagramas Completos CU17 - UML 2.5 (Secuencia, Comunicación y Análisis)
 * ESTRUCTURA: Correspondencia 1:1 con Código Real Django y React
 * 
 * CASO DE USO 17: Transmisión en Vivo - Live Commerce
 *   - Actor: :Emprendedor
 *   - Boundary (UI): :MisLives (Frontend/frontend_web/src/pages/empresa/MisLives.jsx)
 *   - Control (CC): :LiveCommerceViews (Backend/apps/promociones/views.py)
 *   - Entity 1: :LiveCommerceSesion (Backend/apps/promociones/models.py)
 *   - Entity 2: :LiveCommerceProducto (Backend/apps/promociones/models.py)
 * ==============================================================================
 */

function mainCU17() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMAS UML CU17 (LIVE COMMERCE) ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var root = currentPackage.Packages.AddNew("CU17 - Gestionar Live Commerce", "Package");
    root.Update();

    generarCU17_Secuencia(root);
    generarCU17_Comunicacion(root);
    generarCU17_AnalisisClases(root);

    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);
    Repository.WriteOutput("Script", "=== [OK] DIAGRAMAS CU17 GENERADOS EXITOSAMENTE ===", 0);
    Session.Prompt("¡Diagramas de Secuencia, Comunicación y Análisis de Clases (CU17) generados con éxito!", 0);
}

/* ==============================================================================
 * 1. DIAGRAMA DE SECUENCIA (CU17)
 * ============================================================================== */
function generarCU17_Secuencia(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("1. Secuencia", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Secuencia - CU17", "Sequence");
    diag.Update();

    var el = pkg.Elements;
    var act = el.AddNew(":Emprendedor", "Actor"); act.Update();
    var ui = el.AddNew(":MisLives", "Sequence"); ui.Stereotype = "boundary"; ui.Update();
    var ctrl = el.AddNew(":LiveCommerceViews", "Sequence"); ctrl.Stereotype = "control"; ctrl.Update();
    var entSes = el.AddNew(":LiveCommerceSesion", "Sequence"); entSes.Stereotype = "entity"; entSes.Update();
    var entProd = el.AddNew(":LiveCommerceProducto", "Sequence"); entProd.Stereotype = "entity"; entProd.Update();

    posicionar(diag, act, 60, 180, -30, -900);
    posicionar(diag, ui, 290, 420, -30, -900);
    posicionar(diag, ctrl, 530, 660, -30, -900);
    posicionar(diag, entSes, 770, 900, -30, -900);
    posicionar(diag, entProd, 1010, 1140, -30, -900);

    var seq = 1;

    // Bloque 1: Iniciar transmisión y registrar sesión
    regMsgSeq(act, ui, "1: guardar(form)", false, seq++);
    regMsgSeq(ui, ctrl, "2: ListaCrearMisLivesView.post(request)", false, seq++);
    regMsgSeq(ctrl, entSes, "3: LiveCommerceSesion.objects.create(empresa, titulo, estado='EN_VIVO')", false, seq++);
    regMsgSeq(entSes, ctrl, "4: sesion_creada (id, estado='EN_VIVO')", true, seq++);
    regMsgSeq(ctrl, entProd, "5: LiveCommerceProducto.objects.bulk_create(productos)", false, seq++);
    regMsgSeq(entProd, ctrl, "6: productos_asociados (ok=true)", true, seq++);
    regMsgSeq(ctrl, ui, "7: Response(LiveSesionSerializer.data, 201_CREATED)", true, seq++);
    regMsgSeq(ui, act, "8: setMostrarForm(false) + cargarLives()", true, seq++);

    // Bloque 2: Fijar producto / Oferta flash en vivo
    regMsgSeq(act, ui, "9: fijarProducto(producto_id)", false, seq++);
    regMsgSeq(ui, ctrl, "10: FijarProductoLiveView.post(request, live_id)", false, seq++);
    regMsgSeq(ctrl, entProd, "11: live_producto.save(fijado=True)", false, seq++);
    regMsgSeq(entProd, ctrl, "12: producto_fijado (notificado=true)", true, seq++);
    regMsgSeq(ctrl, ui, "13: Response({'detail': 'Producto fijado'}, 200_OK)", true, seq++);
    regMsgSeq(ui, act, "14: broadcastProductoFijado(producto)", true, seq++);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

/* ==============================================================================
 * 2. DIAGRAMA DE COMUNICACIÓN (CU17)
 * ============================================================================== */
function generarCU17_Comunicacion(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("2. Comunicacion", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Comunicacion - CU17", "Communication");
    if (!diag.Update()) {
        diag = pkg.Diagrams.AddNew("Diagrama de Comunicacion - CU17", "Analysis");
        diag.Update();
    }

    var elemActor = pkg.Elements.AddNew(":Emprendedor", "Actor"); elemActor.Update();
    var elemUI = pkg.Elements.AddNew(":MisLives", "Class"); elemUI.Stereotype = "boundary"; elemUI.Update();
    var elemCtrl = pkg.Elements.AddNew(":LiveCommerceViews", "Class"); elemCtrl.Stereotype = "control"; elemCtrl.Update();
    var elemEnt1 = pkg.Elements.AddNew(":LiveCommerceSesion", "Class"); elemEnt1.Stereotype = "entity"; elemEnt1.Update();
    var elemEnt2 = pkg.Elements.AddNew(":LiveCommerceProducto", "Class"); elemEnt2.Stereotype = "entity"; elemEnt2.Update();

    posicionar(diag, elemActor, 60, 160, -160, -250);
    posicionar(diag, elemUI, 340, 440, -160, -250);
    posicionar(diag, elemCtrl, 640, 740, -160, -250);
    posicionar(diag, elemEnt1, 960, 1060, -70, -160);
    posicionar(diag, elemEnt2, 960, 1060, -250, -340);

    conectarCom(diag, elemActor, elemUI, [
        "1: guardar(form) \u2192",
        "8: setMostrarForm(false) + cargarLives() \u2190",
        "9: fijarProducto(producto_id) \u2192",
        "14: broadcastProductoFijado(producto) \u2190"
    ]);

    conectarCom(diag, elemUI, elemCtrl, [
        "2: ListaCrearMisLivesView.post(request) \u2192",
        "7: Response(LiveSesionSerializer.data, 201_CREATED) \u2190",
        "10: FijarProductoLiveView.post(request, live_id) \u2192",
        "13: Response({'detail': 'Producto fijado'}, 200_OK) \u2190"
    ]);

    conectarCom(diag, elemCtrl, elemEnt1, [
        "3: LiveCommerceSesion.objects.create(empresa, titulo, estado='EN_VIVO') \u2192",
        "4: sesion_creada (id, estado='EN_VIVO') \u2190"
    ]);

    conectarCom(diag, elemCtrl, elemEnt2, [
        "5: LiveCommerceProducto.objects.bulk_create(productos) \u2192",
        "6: productos_asociados (ok=true) \u2190",
        "11: live_producto.save(fijado=True) \u2192",
        "12: producto_fijado (notificado=true) \u2190"
    ]);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

/* ==============================================================================
 * 3. DIAGRAMA DE ANÁLISIS DE CLASES (CU17)
 * ============================================================================== */
function generarCU17_AnalisisClases(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("3. Analisis de Clases", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Analisis - CU17", "Logical");
    diag.Update();

    var elemActor = pkg.Elements.AddNew("Emprendedor", "Actor"); elemActor.Update();

    var elemUI = pkg.Elements.AddNew("MisLives", "Class");
    elemUI.Stereotype = "UI";
    elemUI.Attributes.AddNew("lives", "Array<LiveCommerceSesion>").Update();
    elemUI.Attributes.AddNew("productos", "Array<Producto>").Update();
    elemUI.Attributes.AddNew("form", "Object").Update();
    elemUI.Attributes.AddNew("cargando", "Boolean").Update();
    elemUI.Attributes.AddNew("error", "String").Update();
    elemUI.Methods.AddNew("cargarLives()", "Promise<void>").Update();
    elemUI.Methods.AddNew("guardar(e)", "Promise<void>").Update();
    elemUI.Methods.AddNew("cambiarEstado(live, nuevoEstado)", "void").Update();
    elemUI.Methods.AddNew("fijarProducto(producto_id)", "void").Update();
    elemUI.Update();

    var elemCtrl = pkg.Elements.AddNew("LiveCommerceViews", "Class");
    elemCtrl.Stereotype = "CC";
    elemCtrl.Methods.AddNew("ListaCrearMisLivesView_get(request)", "Response").Update();
    elemCtrl.Methods.AddNew("ListaCrearMisLivesView_post(request)", "Response").Update();
    elemCtrl.Methods.AddNew("EditarEliminarMiLiveView_patch(request, live_id)", "Response").Update();
    elemCtrl.Methods.AddNew("FijarProductoLiveView_post(request, live_id)", "Response").Update();
    elemCtrl.Methods.AddNew("TerminarLiveView_post(request, live_id)", "Response").Update();
    elemCtrl.Update();

    var elemSes = pkg.Elements.AddNew("LiveCommerceSesion", "Class");
    elemSes.Stereotype = "Model";
    elemSes.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemSes.Attributes.AddNew("empresa_id", "BIGINT").Update();
    elemSes.Attributes.AddNew("titulo", "VARCHAR(150)").Update();
    elemSes.Attributes.AddNew("url_stream", "VARCHAR(255)").Update();
    elemSes.Attributes.AddNew("estado", "VARCHAR(20)").Update();
    elemSes.Attributes.AddNew("fecha_inicio", "TIMESTAMP").Update();
    elemSes.Attributes.AddNew("fecha_fin", "TIMESTAMP").Update();
    elemSes.Attributes.AddNew("pausado_desde", "TIMESTAMP").Update();
    elemSes.Update();

    var elemProd = pkg.Elements.AddNew("LiveCommerceProducto", "Class");
    elemProd.Stereotype = "Model";
    elemProd.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemProd.Attributes.AddNew("sesion_id", "BIGINT").Update();
    elemProd.Attributes.AddNew("producto_id", "BIGINT").Update();
    elemProd.Update();

    var elemCom = pkg.Elements.AddNew("ComentarioLive", "Class");
    elemCom.Stereotype = "Model";
    elemCom.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemCom.Attributes.AddNew("sesion_id", "BIGINT").Update();
    elemCom.Attributes.AddNew("usuario_id", "BIGINT").Update();
    elemCom.Attributes.AddNew("texto", "VARCHAR(280)").Update();
    elemCom.Attributes.AddNew("fecha", "TIMESTAMP").Update();
    elemCom.Update();

    posicionar(diag, elemActor, 40, 140, -180, -280);
    posicionar(diag, elemUI, 200, 420, -150, -320);
    posicionar(diag, elemCtrl, 480, 750, -150, -320);
    posicionar(diag, elemSes, 820, 1070, -40, -240);
    posicionar(diag, elemProd, 820, 1070, -270, -430);
    posicionar(diag, elemCom, 1130, 1360, -40, -200);

    conectarCard(elemActor, elemUI, "transmite", "1", "1");
    conectarCard(elemUI, elemCtrl, "solicita_streaming", "1", "1");
    conectarCard(elemCtrl, elemSes, "administra_sesion", "1", "1..*");
    conectarCard(elemCtrl, elemProd, "etiqueta_ofertas", "1", "0..*");
    conectarCard(elemSes, elemProd, "incluye", "1", "0..*");
    conectarCard(elemSes, elemCom, "registra_chat", "1", "0..*");

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

mainCU17();
