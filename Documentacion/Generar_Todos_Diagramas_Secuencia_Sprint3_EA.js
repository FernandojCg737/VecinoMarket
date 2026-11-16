/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: DIAGRAMAS DE SECUENCIA COMPLETOS - SPRINT 3 (UML 2.5)
 * 
 * CARACTERÍSTICAS Y ALINEACIÓN 1:1 CON CÓDIGO REAL:
 *   1. Mapeo exacto 1:1 de funciones del backend Django (views, models, serializers, _log).
 *   2. Correspondencia directa con los Diagramas de Comunicación y Modelo Conceptual.
 *   3. Arquitectura Robusta BCE (Boundary, Control, Entity) con Lifelines especializadas.
 *   4. Controladores centralizados: Cero acoplamiento directo entre Entidades.
 *   5. Fragmentos combinados UML 2.5 (alt, loop, opt) con guardas explícitas de negocio.
 *   6. Registro obligatorio de auditoría y retornos síncronos explícitos (LF_synch=0;LF_isReturn=1;).
 * 
 * CASOS DE USO SPRINT 3:
 *   - CU09: Gestionar Empleados y Permisos (views: CrearEmpleadoView, PermisoEmpleadoPropioView)
 *   - CU12: Gestionar Pedidos y Ventas (views: ListaMisPedidosView, EditarEliminarMiPedidoView, ComprobanteDigitalView)
 *   - CU13: Gestionar Entregas y Logística (views: ListaMisEntregasView, EditarEliminarMiEntregaView, MarcarMiEntregaEntregadaView)
 *   - CU16: Gestionar Promociones y Descuentos (views: ListaCrearMisPromocionesView, EditarEliminarMiPromocionView)
 *   - CU17: Transmisiones en Vivo - Live Commerce (views/consumers: ListaCrearMisLivesView, LiveSignalingConsumer)
 *   - CU23: Gestionar Notificaciones del Sistema (views: ListaMisNotificacionesView, MarcarLeidaView, MarcarTodasLeidasView)
 * ==============================================================================
 */

// Posiciones y dimensiones estándar para Lifelines (UML 2.5)
var TOP_LIFELINES    = -30;
var BOTTOM_LIFELINES = -1120;

function posicionarElemento(diagram, elem, left, right, top, bottom) {
    var coords = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
}

function registrarMensaje(origen, destino, nombreMensaje, esRetorno, seqCounter) {
    var con = origen.Connectors.AddNew(nombreMensaje, "Sequence");
    con.SupplierID = destino.ElementID;
    con.SequenceNo = seqCounter;
    con.Direction = "Source -> Destination";
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

    try {
        Repository.Execute("UPDATE t_connector SET SeqNo=" + seqCounter + " WHERE Connector_ID=" + con.ConnectorID);
    } catch(e) {}

    return con;
}

function crearFragmento(pkg, diagram, nombre, tipoSubtype, left, right, top, bottom) {
    try {
        var frag = pkg.Elements.AddNew(nombre, "InteractionFragment");
        frag.Subtype = tipoSubtype; // 0 = alt, 1 = opt, 4 = loop
        frag.Update();
        posicionarElemento(diagram, frag, left, right, top, bottom);
        return frag;
    } catch(e) {
        try {
            var frag2 = pkg.Elements.AddNew(nombre, "Fragment");
            frag2.Subtype = tipoSubtype;
            frag2.Update();
            posicionarElemento(diagram, frag2, left, right, top, bottom);
            return frag2;
        } catch(e2) {
            return null;
        }
    }
}

function finalizarDiagrama(diag) {
    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

/* ==============================================================================
 * 1. CU09: Gestionar Empleados y Permisos
 * ============================================================================== */
function generarSecuenciaCU09(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Secuencia CU09: Empleados y Permisos...", 0);

    var pkg = parentPkg.Packages.AddNew("CU09 - Gestionar Empleados y Permisos", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Secuencia - CU09", "Sequence");
    diag.Update();

    var el = pkg.Elements;
    var act  = el.AddNew(":Emprendedor", "Actor"); act.Update();
    var ui   = el.AddNew(":EmpleadosPermisosView", "Sequence"); ui.Stereotype = "boundary"; ui.Update();
    var ctrl = el.AddNew(":EmpleadosController", "Sequence"); ctrl.Stereotype = "control"; ctrl.Update();
    var eUsu = el.AddNew(":Usuario", "Sequence"); eUsu.Stereotype = "entity"; eUsu.Update();
    var eEmp = el.AddNew(":Empleado", "Sequence"); eEmp.Stereotype = "entity"; eEmp.Update();
    var ePer = el.AddNew(":EmpleadoPermiso", "Sequence"); ePer.Stereotype = "entity"; ePer.Update();
    var eLog = el.AddNew(":LogAuditoria", "Sequence"); eLog.Stereotype = "entity"; eLog.Update();

    posicionarElemento(diag, act,  60,   180,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ui,   280,  410,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, 510,  650,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eUsu, 750,  880,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eEmp, 980,  1110, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ePer, 1210, 1340, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eLog, 1440, 1570, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Invitar y Registrar Empleado
    registrarMensaje(act, ui, "1: invitarEmpleado(email, cargo, permisos)", false, seq++);
    registrarMensaje(ui, ctrl, "2: CrearEmpleadoView.create(request)", false, seq++);
    registrarMensaje(ctrl, eUsu, "3: get_object_or_404(Usuario, email=email)", false, seq++);
    registrarMensaje(eUsu, ctrl, "4: usuario_encontrado (id=15, is_active=True)", true, seq++);

    // [alt: usuario.is_active == true]
    registrarMensaje(ctrl, eEmp, "5: Empleado.objects.create(usuario, empresa, cargo)", false, seq++);
    registrarMensaje(eEmp, ctrl, "6: empleado_creado (id=8, estado='ACTIVO')", true, seq++);

    // [loop: por cada permiso]
    registrarMensaje(ctrl, ePer, "7: EmpleadoPermiso.objects.get_or_create(empleado, permiso)", false, seq++);
    registrarMensaje(ePer, ctrl, "8: permiso_vinculado", true, seq++);

    registrarMensaje(ctrl, eLog, "9: _log(request, 'CREAR_EMPLEADO', empleado.id)", false, seq++);
    registrarMensaje(eLog, ctrl, "10: log_registrado", true, seq++);
    registrarMensaje(ctrl, ui, "11: Response(EmpleadoAdminSerializer(empleado).data, 201_CREATED)", true, seq++);
    registrarMensaje(ui, act, "12: mostrarAlertaExito('Empleado vinculado')", true, seq++);

    // Bloque 2: Asignación Posterior de Permiso Específico
    registrarMensaje(act, ui, "13: asignarPermiso(empleadoId, permisoId)", false, seq++);
    registrarMensaje(ui, ctrl, "14: PermisoEmpleadoPropioView.post(request, empleado_id, permiso_id)", false, seq++);
    registrarMensaje(ctrl, ePer, "15: EmpleadoPermiso.objects.get_or_create(empleado, permiso)", false, seq++);
    registrarMensaje(ePer, ctrl, "16: permiso_asignado", true, seq++);
    registrarMensaje(ctrl, eLog, "17: _log(request, 'ASIGNAR_PERMISO_EMPLEADO', empleado.id)", false, seq++);
    registrarMensaje(eLog, ctrl, "18: log_registrado", true, seq++);
    registrarMensaje(ctrl, ui, "19: Response({'detail': 'Permiso asignado'}, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "20: confirmarEstadoActualizado()", true, seq++);

    // Fragmentos combinados
    crearFragmento(pkg, diag, "alt [usuario.is_active == true]", 0, 260, 1590, -180, -620);
    crearFragmento(pkg, diag, "loop [por cada permiso en lista]", 4, 490, 1360, -320, -420);
    crearFragmento(pkg, diag, "opt [asignacion de permisos]", 1, 260, 1590, -640, -1040);

    finalizarDiagrama(diag);
}

/* ==============================================================================
 * 2. CU12: Gestionar Pedidos y Ventas
 * ============================================================================== */
function generarSecuenciaCU12(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Secuencia CU12: Pedidos y Ventas...", 0);

    var pkg = parentPkg.Packages.AddNew("CU12 - Gestionar Pedidos y Ventas", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Secuencia - CU12", "Sequence");
    diag.Update();

    var el = pkg.Elements;
    var act  = el.AddNew(":Emprendedor", "Actor"); act.Update();
    var ui   = el.AddNew(":PedidosVentasView", "Sequence"); ui.Stereotype = "boundary"; ui.Update();
    var ctrl = el.AddNew(":PedidosController", "Sequence"); ctrl.Stereotype = "control"; ctrl.Update();
    var ePed = el.AddNew(":Pedido", "Sequence"); ePed.Stereotype = "entity"; ePed.Update();
    var eItm = el.AddNew(":PedidoItem", "Sequence"); eItm.Stereotype = "entity"; eItm.Update();
    var eOrd = el.AddNew(":OrdenCompra", "Sequence"); eOrd.Stereotype = "entity"; eOrd.Update();
    var ePag = el.AddNew(":Pago", "Sequence"); ePag.Stereotype = "entity"; ePag.Update();

    posicionarElemento(diag, act,  60,   180,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ui,   280,  410,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, 510,  650,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ePed, 750,  880,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eItm, 980,  1110, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eOrd, 1210, 1340, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ePag, 1440, 1570, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Consultar Pedidos
    registrarMensaje(act, ui, "1: consultarPedidos(estado, tipo)", false, seq++);
    registrarMensaje(ui, ctrl, "2: ListaMisPedidosView.get(request)", false, seq++);
    registrarMensaje(ctrl, ePed, "3: _filtrar_pedidos(qs, params)", false, seq++);
    registrarMensaje(ePed, ctrl, "4: lista_pedidos", true, seq++);
    registrarMensaje(ctrl, ui, "5: Response(PedidoSerializer(pedidos, many=True).data, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "6: renderizarTablaPedidos(pedidos)", true, seq++);

    // Bloque 2: Aceptar Comprobante y Confirmar Pedido
    registrarMensaje(act, ui, "7: aceptarComprobante(pedido)", false, seq++);
    registrarMensaje(ui, ctrl, "8: EditarEliminarMiPedidoView.patch(request, pedido_id)", false, seq++);
    registrarMensaje(ctrl, eOrd, "9: orden_compra.save(update_fields=['estado_pago'])", false, seq++);
    registrarMensaje(eOrd, ctrl, "10: orden_pago_actualizada (estado_pago='PAGADO')", true, seq++);
    registrarMensaje(ctrl, ePed, "11: pedido.save(update_fields=['estado'])", false, seq++);
    registrarMensaje(ePed, ctrl, "12: pedido_confirmado (estado='CONFIRMADO')", true, seq++);
    registrarMensaje(ctrl, ui, "13: Response(PedidoSerializer(pedido).data, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "14: notificarEstadoActualizado('CONFIRMADO')", true, seq++);

    // Bloque 3: Generar y Descargar Comprobante Digital
    registrarMensaje(act, ui, "15: generarComprobante(pedido_id)", false, seq++);
    registrarMensaje(ui, ctrl, "16: ComprobanteDigitalView.get(request, pedido_id)", false, seq++);
    registrarMensaje(ctrl, eItm, "17: PedidoItem.objects.filter(pedido_id=pedido_id)", false, seq++);
    registrarMensaje(eItm, ctrl, "18: items_pedido", true, seq++);
    registrarMensaje(ctrl, ePag, "19: orden_compra.pagos.filter(estado=APROBADO)", false, seq++);
    registrarMensaje(ePag, ctrl, "20: pago_aprobado", true, seq++);
    registrarMensaje(ctrl, ui, "21: descargarPDF(comprobante_stream)", true, seq++);
    registrarMensaje(ui, act, "22: abrirVisorPDF(comprobante.pdf)", true, seq++);

    // Fragmentos combinados
    crearFragmento(pkg, diag, "alt [pago verificado y comprobante aprobado]", 0, 260, 1590, -350, -680);
    crearFragmento(pkg, diag, "opt [generar comprobante digital]", 1, 260, 1590, -700, -1060);
    crearFragmento(pkg, diag, "loop [por cada item en pedido]", 4, 490, 1130, -780, -880);

    finalizarDiagrama(diag);
}

/* ==============================================================================
 * 3. CU13: Gestionar Entregas y Logística
 * ============================================================================== */
function generarSecuenciaCU13(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Secuencia CU13: Entregas y Logística...", 0);

    var pkg = parentPkg.Packages.AddNew("CU13 - Gestionar Entregas y Logistica", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Secuencia - CU13", "Sequence");
    diag.Update();

    var el = pkg.Elements;
    var act  = el.AddNew(":Repartidor", "Actor"); act.Update();
    var ui   = el.AddNew(":EntregasDespachoView", "Sequence"); ui.Stereotype = "boundary"; ui.Update();
    var ctrl = el.AddNew(":EntregasController", "Sequence"); ctrl.Stereotype = "control"; ctrl.Update();
    var eEnt = el.AddNew(":Entrega", "Sequence"); eEnt.Stereotype = "entity"; eEnt.Update();
    var ePed = el.AddNew(":Pedido", "Sequence"); ePed.Stereotype = "entity"; ePed.Update();
    var eSuc = el.AddNew(":Sucursal", "Sequence"); eSuc.Stereotype = "entity"; eSuc.Update();
    var eNot = el.AddNew(":Notificacion", "Sequence"); eNot.Stereotype = "entity"; eNot.Update();

    posicionarElemento(diag, act,  60,   180,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ui,   280,  410,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, 510,  650,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eEnt, 750,  880,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ePed, 980,  1110, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eSuc, 1210, 1340, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eNot, 1440, 1570, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Listar Entregas Pendientes
    registrarMensaje(act, ui, "1: listarEntregasPendientes()", false, seq++);
    registrarMensaje(ui, ctrl, "2: ListaMisEntregasView.get(request)", false, seq++);
    registrarMensaje(ctrl, eEnt, "3: Entrega.objects.filter(estado='PENDIENTE')", false, seq++);
    registrarMensaje(eEnt, ctrl, "4: entregas_pendientes", true, seq++);
    registrarMensaje(ctrl, ui, "5: Response(EntregaSerializer(entregas, many=True).data, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "6: mostrarMapaYLista(entregas)", true, seq++);

    // Bloque 2: Iniciar Despacho (Poner en Camino)
    registrarMensaje(act, ui, "7: iniciarDespacho(entregaId, repartidorId)", false, seq++);
    registrarMensaje(ui, ctrl, "8: EditarEliminarMiEntregaView.patch(request, entrega_id)", false, seq++);
    registrarMensaje(ctrl, eSuc, "9: get_object_or_404(Sucursal, id=sucursal_id)", false, seq++);
    registrarMensaje(eSuc, ctrl, "10: sucursal_origen", true, seq++);
    registrarMensaje(ctrl, eEnt, "11: serializer.save(estado='EN_CAMINO')", false, seq++);
    registrarMensaje(eEnt, ctrl, "12: entrega_actualizada (estado='EN_CAMINO')", true, seq++);
    registrarMensaje(ctrl, eNot, "13: _crear_notificacion(comprador, 'PEDIDO_EN_CAMINO')", false, seq++);
    registrarMensaje(eNot, ctrl, "14: notificacion_enviada", true, seq++);
    registrarMensaje(ctrl, ui, "15: Response(EntregaSerializer(entrega).data, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "16: actualizarRutaMapa(coordenadas)", true, seq++);

    // Bloque 3: Finalizar Entrega en Destino
    registrarMensaje(act, ui, "17: finalizarEntrega(entregaId, firmaPin)", false, seq++);
    registrarMensaje(ui, ctrl, "18: MarcarMiEntregaEntregadaView.post(request, entrega_id)", false, seq++);
    registrarMensaje(ctrl, eEnt, "19: _marcar_entregada(entrega)", false, seq++);
    registrarMensaje(eEnt, ctrl, "20: entrega_completada", true, seq++);
    registrarMensaje(ctrl, ePed, "21: pedido.save(update_fields=['estado'])", false, seq++);
    registrarMensaje(ePed, ctrl, "22: pedido_entregado (estado='ENTREGADO')", true, seq++);
    registrarMensaje(ctrl, ui, "23: Response({'detail': 'Entrega exitosa'}, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "24: mostrarAlertaExito('Entrega Finalizada')", true, seq++);

    // Fragmentos combinados
    crearFragmento(pkg, diag, "alt [sucursal valida y stock preparado]", 0, 260, 1590, -350, -720);
    crearFragmento(pkg, diag, "alt [pin de entrega verificado]", 0, 260, 1590, -740, -1070);

    finalizarDiagrama(diag);
}

/* ==============================================================================
 * 4. CU16: Gestionar Promociones y Descuentos
 * ============================================================================== */
function generarSecuenciaCU16(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Secuencia CU16: Promociones y Descuentos...", 0);

    var pkg = parentPkg.Packages.AddNew("CU16 - Gestionar Promociones y Descuentos", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Secuencia - CU16", "Sequence");
    diag.Update();

    var el = pkg.Elements;
    var act  = el.AddNew(":Emprendedor", "Actor"); act.Update();
    var ui   = el.AddNew(":PromocionesView", "Sequence"); ui.Stereotype = "boundary"; ui.Update();
    var ctrl = el.AddNew(":PromocionesController", "Sequence"); ctrl.Stereotype = "control"; ctrl.Update();
    var ePro = el.AddNew(":Promocion", "Sequence"); ePro.Stereotype = "entity"; ePro.Update();
    var ePp  = el.AddNew(":PromocionProducto", "Sequence"); ePp.Stereotype = "entity"; ePp.Update();
    var ePrd = el.AddNew(":Producto", "Sequence"); ePrd.Stereotype = "entity"; ePrd.Update();
    var eCat = el.AddNew(":Categoria", "Sequence"); eCat.Stereotype = "entity"; eCat.Update();

    posicionarElemento(diag, act,  60,   180,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ui,   280,  410,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, 510,  650,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ePro, 750,  880,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ePp,  980,  1110, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ePrd, 1210, 1340, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eCat, 1440, 1570, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Listar Promociones
    registrarMensaje(act, ui, "1: solicitarPromociones()", false, seq++);
    registrarMensaje(ui, ctrl, "2: ListaCrearMisPromocionesView.get(request)", false, seq++);
    registrarMensaje(ctrl, ePro, "3: Promocion.objects.filter(empresa=empresa)", false, seq++);
    registrarMensaje(ePro, ctrl, "4: promociones_empresa", true, seq++);
    registrarMensaje(ctrl, ui, "5: Response(PromocionSerializer(promociones, many=True).data, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "6: mostrarTablaPromociones(promos)", true, seq++);

    // Bloque 2: Crear Promoción y Vincular Productos en Lote
    registrarMensaje(act, ui, "7: crearPromocion(datosPromo, productosIds)", false, seq++);
    registrarMensaje(ui, ctrl, "8: ListaCrearMisPromocionesView.perform_create(serializer)", false, seq++);
    registrarMensaje(ctrl, ePro, "9: serializer.save(empresa=empresa)", false, seq++);
    registrarMensaje(ePro, ctrl, "10: promocion_creada (id=12)", true, seq++);
    registrarMensaje(ctrl, ePp, "11: PromocionProducto.objects.bulk_create(items)", false, seq++);
    registrarMensaje(ePp, ctrl, "12: items_vinculados", true, seq++);
    registrarMensaje(ctrl, ePrd, "13: sincronizar_descuentos_productos(productos)", false, seq++);
    registrarMensaje(ePrd, ctrl, "14: precios_actualizados", true, seq++);
    registrarMensaje(ctrl, ui, "15: Response(PromocionSerializer(promocion).data, 201_CREATED)", true, seq++);
    registrarMensaje(ui, act, "16: confirmarPromocion(promocion)", true, seq++);

    // Bloque 3: Consultar Métricas de Impacto
    registrarMensaje(act, ui, "17: consultarImpacto(promocion_id)", false, seq++);
    registrarMensaje(ui, ctrl, "18: EditarEliminarMiPromocionView.patch(request, promocion_id)", false, seq++);
    registrarMensaje(ctrl, eCat, "19: Categoria.objects.filter(activo=True)", false, seq++);
    registrarMensaje(eCat, ctrl, "20: categorias_activas", true, seq++);
    registrarMensaje(ctrl, ui, "21: renderizarGraficoImpacto(kpis)", true, seq++);
    registrarMensaje(ui, act, "22: visualizarMetricasConversion()", true, seq++);

    // Fragmentos combinados
    crearFragmento(pkg, diag, "alt [fechas y descuento validos]", 0, 260, 1590, -350, -750);
    crearFragmento(pkg, diag, "loop [por cada producto participante]", 4, 490, 1360, -480, -680);
    crearFragmento(pkg, diag, "opt [analisis de impacto y conversion]", 1, 260, 1590, -770, -1070);

    finalizarDiagrama(diag);
}

/* ==============================================================================
 * 5. CU17: Transmisiones en Vivo - Live Commerce
 * ============================================================================== */
function generarSecuenciaCU17(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Secuencia CU17: Live Commerce y Streaming...", 0);

    var pkg = parentPkg.Packages.AddNew("CU17 - Live Commerce y Streaming", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Secuencia - CU17", "Sequence");
    diag.Update();

    var el = pkg.Elements;
    var act  = el.AddNew(":Anfitrion", "Actor"); act.Update();
    var ui   = el.AddNew(":LiveCommerceStudioView", "Sequence"); ui.Stereotype = "boundary"; ui.Update();
    var ctrl = el.AddNew(":LiveSignalingConsumer", "Sequence"); ctrl.Stereotype = "control"; ctrl.Update();
    var eLiv = el.AddNew(":LiveCommerceSesion", "Sequence"); eLiv.Stereotype = "entity"; eLiv.Update();
    var eLp  = el.AddNew(":LiveCommerceSesionProducto", "Sequence"); eLp.Stereotype = "entity"; eLp.Update();
    var eCom = el.AddNew(":ComentarioLive", "Sequence"); eCom.Stereotype = "entity"; eCom.Update();
    var ePrd = el.AddNew(":Producto", "Sequence"); ePrd.Stereotype = "entity"; ePrd.Update();

    posicionarElemento(diag, act,  60,   180,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ui,   280,  410,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, 510,  650,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eLiv, 750,  880,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eLp,  980,  1110, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eCom, 1210, 1340, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ePrd, 1440, 1570, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Iniciar Transmisión Live Commerce
    registrarMensaje(act, ui, "1: iniciarTransmisionLive(titulo, prods)", false, seq++);
    registrarMensaje(ui, ctrl, "2: ListaCrearMisLivesView.create(request)", false, seq++);
    registrarMensaje(ctrl, eLiv, "3: sesion.save(estado='EN_VIVO')", false, seq++);
    registrarMensaje(eLiv, ctrl, "4: sesion_iniciada (estado='EN_VIVO')", true, seq++);
    registrarMensaje(ctrl, eLp, "5: LiveCommerceSesionProducto.objects.bulk_create(prods)", false, seq++);
    registrarMensaje(eLp, ctrl, "6: productos_enlazados", true, seq++);
    registrarMensaje(ctrl, ui, "7: confirmarConexionWebRTC(sdp_answer)", true, seq++);
    registrarMensaje(ui, act, "8: iniciarTransmisionVideo()", true, seq++);

    // Bloque 2: Chat en Vivo e Interacción
    registrarMensaje(act, ui, "9: enviarComentarioChat(texto)", false, seq++);
    registrarMensaje(ui, ctrl, "10: ListaCrearComentariosLiveView.post(request)", false, seq++);
    registrarMensaje(ctrl, eCom, "11: ComentarioLive.objects.create(sesion, usuario, texto)", false, seq++);
    registrarMensaje(eCom, ctrl, "12: comentario_guardado", true, seq++);
    registrarMensaje(ctrl, ui, "13: broadcastMensaje(chatPayload)", true, seq++);
    registrarMensaje(ui, act, "14: renderizarComentario()", true, seq++);

    // Bloque 3: Anclar Producto Destacado y Finalizar
    registrarMensaje(act, ui, "15: anclarProductoDestacado(prod_id)", false, seq++);
    registrarMensaje(ui, ctrl, "16: LiveSignalingConsumer.fijar_producto(prod_id)", false, seq++);
    registrarMensaje(ctrl, ePrd, "17: get_object_or_404(Producto, id=prod_id)", false, seq++);
    registrarMensaje(ePrd, ctrl, "18: producto_destacado", true, seq++);
    registrarMensaje(ctrl, ui, "19: broadcastBannerProducto(banner)", true, seq++);
    registrarMensaje(ui, act, "20: mostrarBannerDestacado()", true, seq++);
    registrarMensaje(act, ui, "21: finalizarTransmision(sesion_id)", false, seq++);
    registrarMensaje(ui, ctrl, "22: EditarEliminarMiLiveView.patch(request, live_id)", false, seq++);
    registrarMensaje(ctrl, eLiv, "23: sesion.save(estado='FINALIZADA')", false, seq++);
    registrarMensaje(eLiv, ctrl, "24: sesion_cerrada", true, seq++);
    registrarMensaje(ctrl, ui, "25: mostrarResumenLive(espectadores)", true, seq++);
    registrarMensaje(ui, act, "26: mostrarAlertaExito('Sesion Finalizada')", true, seq++);

    // Fragmentos combinados
    crearFragmento(pkg, diag, "loop [por cada producto a promocionar]", 4, 490, 1130, -220, -320);
    crearFragmento(pkg, diag, "opt [chat interactivo en vivo]", 1, 260, 1360, -420, -680);
    crearFragmento(pkg, diag, "alt [estado == EN_VIVO]", 0, 260, 1590, -700, -1070);

    finalizarDiagrama(diag);
}

/* ==============================================================================
 * 6. CU23: Gestionar Notificaciones del Sistema
 * ============================================================================== */
function generarSecuenciaCU23(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Secuencia CU23: Notificaciones del Sistema...", 0);

    var pkg = parentPkg.Packages.AddNew("CU23 - Gestionar Notificaciones del Sistema", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("Diagrama de Secuencia - CU23", "Sequence");
    diag.Update();

    var el = pkg.Elements;
    var act  = el.AddNew(":Usuario", "Actor"); act.Update();
    var ui   = el.AddNew(":NotificationCenterView", "Sequence"); ui.Stereotype = "boundary"; ui.Update();
    var ctrl = el.AddNew(":NotificationHub", "Sequence"); ctrl.Stereotype = "control"; ctrl.Update();
    var eNot = el.AddNew(":Notificacion", "Sequence"); eNot.Stereotype = "entity"; eNot.Update();
    var eUsu = el.AddNew(":UsuarioEntity", "Sequence"); eUsu.Stereotype = "entity"; eUsu.Update();

    posicionarElemento(diag, act,  60,   180,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ui,   290,  430,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, 540,  690,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eNot, 800,  960,  TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, eUsu, 1070, 1230, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Apertura y Consulta de Notificaciones
    registrarMensaje(act, ui, "1: abrirCentroNotificaciones()", false, seq++);
    registrarMensaje(ui, ctrl, "2: ListaMisNotificacionesView.get(request)", false, seq++);
    registrarMensaje(ctrl, eNot, "3: Notificacion.objects.filter(usuario=user, leido=False)", false, seq++);
    registrarMensaje(eNot, ctrl, "4: notificaciones_pendientes", true, seq++);
    registrarMensaje(ctrl, ui, "5: renderizarListaAvisos(notificaciones)", true, seq++);
    registrarMensaje(ui, act, "6: mostrarPanelNotificaciones()", true, seq++);

    // Bloque 2: Marcar Notificación Individual y Redirigir
    registrarMensaje(act, ui, "7: seleccionarNotificacion(notif_id)", false, seq++);
    registrarMensaje(ui, ctrl, "8: MarcarLeidaView.post(request, notificacion_id)", false, seq++);
    registrarMensaje(ctrl, eNot, "9: notif.save(update_fields=['leido'])", false, seq++);
    registrarMensaje(eNot, ctrl, "10: notificacion_actualizada", true, seq++);
    registrarMensaje(ctrl, eUsu, "11: get_object_or_404(Usuario, id=user_id)", false, seq++);
    registrarMensaje(eUsu, ctrl, "12: datos_usuario", true, seq++);
    registrarMensaje(ctrl, ui, "13: retornarEnlaceDestino(enlace)", true, seq++);
    registrarMensaje(ui, act, "14: redirigirAVistaDetalle(enlace)", true, seq++);

    // Bloque 3: Marcar Todas como Leídas
    registrarMensaje(act, ui, "15: solicitarMarcarTodasLeidas()", false, seq++);
    registrarMensaje(ui, ctrl, "16: MarcarTodasLeidasView.post(request)", false, seq++);
    registrarMensaje(ctrl, eNot, "17: Notificacion.objects.filter(usuario=user).update(leido=True)", false, seq++);
    registrarMensaje(eNot, ctrl, "18: count_actualizadas", true, seq++);
    registrarMensaje(ctrl, ui, "19: actualizarBadgeContador(0)", true, seq++);
    registrarMensaje(ui, act, "20: actualizarIconoCampana()", true, seq++);

    // Fragmentos combinados
    crearFragmento(pkg, diag, "alt [notificacion no leida]", 0, 270, 1250, -350, -710);
    crearFragmento(pkg, diag, "opt [marcar todas leidas]", 1, 270, 1250, -730, -1060);

    finalizarDiagrama(diag);
}

/* ==============================================================================
 * FUNCIÓN PRINCIPAL DE EJECUCIÓN (MAIN)
 * ============================================================================== */
function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO TODOS LOS DIAGRAMAS DE SECUENCIA (SPRINT 3) ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var rootPkg = currentPackage.Packages.AddNew("Diagramas de Secuencia - Sprint 3", "");
    rootPkg.Update();

    generarSecuenciaCU09(rootPkg);
    generarSecuenciaCU12(rootPkg);
    generarSecuenciaCU13(rootPkg);
    generarSecuenciaCU16(rootPkg);
    generarSecuenciaCU17(rootPkg);
    generarSecuenciaCU23(rootPkg);

    rootPkg.Packages.Refresh();
    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] TODOS LOS DIAGRAMAS DE SECUENCIA GENERADOS EXITOSAMENTE ===", 0);
    Session.Prompt("¡Los 6 Diagramas de Secuencia de Sprint 3 han sido generados exitosamente con las funciones reales del código!", 0);
}

main();
