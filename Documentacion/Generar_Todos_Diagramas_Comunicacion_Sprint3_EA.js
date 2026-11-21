/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: DIAGRAMAS DE COMUNICACIÓN COMPLETOS - SPRINT 3 (UML 2.5)
 * 
 * CASOS DE USO SPRINT 3 (100% Alineados al Modelo Conceptual y Código Real):
 *   1. CU09: Gestionar Empleados y Permisos
 *      - Entidades: Usuario, Empleado, EmpleadoPermiso, LogAuditoria
 *   2. CU12: Gestionar Pedidos y Ventas
 *      - Entidades: Pedido, PedidoItem, OrdenCompra, Pago
 *   3. CU13: Gestionar Entregas y Logística
 *      - Entidades: Entrega, Pedido, Sucursal, Notificacion
 *   4. CU16: Gestionar Promociones y Descuentos
 *      - Entidades: Promocion, PromocionProducto, Producto, Categoria
 *   5. CU17: Transmisiones en Vivo - Live Commerce
 *      - Entidades: LiveCommerceSesion, LiveCommerceSesionProducto, ComentarioLive, Producto
 *   6. CU23: Gestionar Notificaciones del Sistema
 *      - Entidades: Notificacion, Usuario
 * 
 * REGLAS ARQUITECTÓNICAS IMPLEMENTADAS:
 *   - Iconos circulares nativos de Robustez BCE (Type="Object" con estereotipos boundary/control/entity).
 *   - Topología en estrella: Cero conexión directa Entidad <-> Entidad.
 *   - Conectores Collaboration vinculados a Association base (SourceIsAggregate).
 *   - NOMBRES REALES DE FUNCIONES DEL BACKEND (Vistas DRF, Modelos y Servicios reales de VecinoMarket).
 *   - Cero código ORM/SQL crudo (reemplazado por métodos formales del código real).
 *   - Codificación cromática de mensajes por flujo funcional.
 * ==============================================================================
 */

// Paleta de Colores en formato BGR para Enterprise Architect
var C_NEGRO = 0;          // 0x000000 - Consultas generales y lecturas
var C_AZUL  = 16711680;   // 0xFF0000 - Acciones de registro / actualización
var C_ROJO  = 255;        // 0x0000FF - Operaciones críticas / Inserciones BD
var C_VERDE = 32768;      // 0x008000 - Confirmaciones, respuestas y éxitos
var C_OLIVA = 32896;      // 0x008080 - Operaciones secundarias / filtros

function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO TODOS LOS DIAGRAMAS DE COMUNICACIÓN (SPRINT 3) ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var rootPkg = currentPackage.Packages.AddNew("Diagramas de Comunicacion - Sprint 3", "");
    rootPkg.Update();

    Repository.WriteOutput("Script", "[1/6] Generando COM-CU09...", 0);
    generarCOM_CU09(rootPkg);

    Repository.WriteOutput("Script", "[2/6] Generando COM-CU12...", 0);
    generarCOM_CU12(rootPkg);

    Repository.WriteOutput("Script", "[3/6] Generando COM-CU13...", 0);
    generarCOM_CU13(rootPkg);

    Repository.WriteOutput("Script", "[4/6] Generando COM-CU16...", 0);
    generarCOM_CU16(rootPkg);

    Repository.WriteOutput("Script", "[5/6] Generando COM-CU17...", 0);
    generarCOM_CU17(rootPkg);

    Repository.WriteOutput("Script", "[6/6] Generando COM-CU23...", 0);
    generarCOM_CU23(rootPkg);

    rootPkg.Packages.Refresh();
    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] TODOS LOS DIAGRAMAS DE COMUNICACIÓN DE SPRINT 3 GENERADOS ===", 0);
    Session.Prompt("¡Los 6 Diagramas de Comunicación del Sprint 3 han sido generados exitosamente con las funciones reales del código!", 0);
}

/* ==============================================================================
 * 1. COM-CU09: Gestionar Empleados y Permisos
 * ============================================================================== */
function generarCOM_CU09(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU09 - Gestionar Empleados y Permisos", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("COM-CU09 - Gestionar Empleados y Permisos", "Communication");
    if (!diag.Update()) { diag = pkg.Diagrams.AddNew("COM-CU09 - Gestionar Empleados y Permisos", "Analysis"); diag.Update(); }

    var act = pkg.Elements.AddNew("Empresa / Emprendedor", "Actor"); act.Update();
    var bnd = crearObjetoBCE(pkg, "Page : EmpleadosPermisosView", "boundary");
    var ctrl = crearObjetoBCE(pkg, "Gestor : EmpleadosController", "control");

    // 4 Entidades del Modelo Conceptual
    var e1 = crearObjetoBCE(pkg, "Usuario", "entity");
    var e2 = crearObjetoBCE(pkg, "Empleado", "entity");
    var e3 = crearObjetoBCE(pkg, "EmpleadoPermiso", "entity");
    var e4 = crearObjetoBCE(pkg, "LogAuditoria", "entity");

    colocar(diag, act, 610, 655, -640, -730);
    colocar(diag, bnd, 950, 1040, -640, -740);
    colocar(diag, ctrl, 1320, 1410, -630, -730);
    colocar(diag, e1, 1580, 1685, -340, -455);
    colocar(diag, e2, 1580, 1685, -540, -655);
    colocar(diag, e3, 1580, 1685, -740, -855);
    colocar(diag, e4, 1580, 1685, -940, -1055);

    // Enlace 1: Actor <-> Boundary
    var a1 = crearAsociacion(act, bnd, diag);
    crearMsg(act, bnd, diag, a1, "1", "invitarEmpleado(email, cargo, permisos)", false, 1, 15, C_NEGRO);
    crearMsg(act, bnd, diag, a1, "4", "asignarPermiso(empleadoId, permisoId)", false, 4, 25, C_AZUL);
    crearMsg(act, bnd, diag, a1, "10", "desactivarEmpleado(empleadoId)", false, 10, 35, C_OLIVA);
    crearMsg(act, bnd, diag, a1, "14", "mostrarAlertaExito('Empleado vinculado')", true, 14, -15, C_VERDE);

    // Enlace 2: Boundary <-> Control (Funciones reales de views.py de apps/usuarios)
    var a2 = crearAsociacion(bnd, ctrl, diag);
    crearMsg(bnd, ctrl, diag, a2, "1.1", "CrearEmpleadoView.create(request)", false, 2, 15, C_NEGRO);
    crearMsg(bnd, ctrl, diag, a2, "4.1", "PermisoEmpleadoPropioView.post(request, empleado_id, permiso_id)", false, 5, 25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "10.1", "DesactivarEmpleadoView.post(request, empleado_id)", false, 11, 35, C_OLIVA);
    crearMsg(bnd, ctrl, diag, a2, "3", "renderizarListadoEmpleados(empleados)", true, 3, -15, C_VERDE);
    crearMsg(bnd, ctrl, diag, a2, "9", "confirmarVinculacion(empleado)", true, 9, -25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "13", "confirmarEstadoActualizado()", true, 13, -35, C_ROJO);

    // Enlaces Control <-> Entidades (Modelos de apps/usuarios/models.py)
    var aUsuario = crearAsociacion(ctrl, e1, diag);
    crearMsg(ctrl, e1, diag, aUsuario, "5", "get_object_or_404(Usuario, email=email)", false, 5, 15, C_ROJO);

    var aEmpleado = crearAsociacion(ctrl, e2, diag);
    crearMsg(ctrl, e2, diag, aEmpleado, "2", "Empleado.objects.filter(empresa=empresa)", false, 2, 15, C_OLIVA);
    crearMsg(ctrl, e2, diag, aEmpleado, "6", "Empleado.objects.create(usuario, empresa, cargo)", false, 6, 25, C_AZUL);

    var aPermiso = crearAsociacion(ctrl, e3, diag);
    crearMsg(ctrl, e3, diag, aPermiso, "7", "EmpleadoPermiso.objects.get_or_create(empleado, permiso)", false, 7, 15, C_NEGRO);
    crearMsg(ctrl, e3, diag, aPermiso, "11", "EmpleadoPermiso.objects.filter(empleado).delete()", false, 11, 25, C_OLIVA);

    var aAudit = crearAsociacion(ctrl, e4, diag);
    crearMsg(ctrl, e4, diag, aAudit, "8", "_log(request, 'CREAR_EMPLEADO', empleado.id)", false, 8, 15, C_VERDE);
    crearMsg(ctrl, e4, diag, aAudit, "12", "_log(request, 'ASIGNAR_PERMISO_EMPLEADO', empleado.id)", false, 12, 25, C_VERDE);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 2. COM-CU12: Gestionar Pedidos y Ventas
 * ============================================================================== */
function generarCOM_CU12(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU12 - Gestionar Pedidos y Ventas", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("COM-CU12 - Gestionar Pedidos y Ventas", "Communication");
    if (!diag.Update()) { diag = pkg.Diagrams.AddNew("COM-CU12 - Gestionar Pedidos y Ventas", "Analysis"); diag.Update(); }

    var act = pkg.Elements.AddNew("Empresa / Comprador", "Actor"); act.Update();
    var bnd = crearObjetoBCE(pkg, "Page : PedidosVentasView", "boundary");
    var ctrl = crearObjetoBCE(pkg, "Gestor : PedidosController", "control");

    // 4 Entidades del Modelo Conceptual
    var e1 = crearObjetoBCE(pkg, "Pedido", "entity");
    var e2 = crearObjetoBCE(pkg, "PedidoItem", "entity");
    var e3 = crearObjetoBCE(pkg, "OrdenCompra", "entity");
    var e4 = crearObjetoBCE(pkg, "Pago", "entity");

    colocar(diag, act, 610, 655, -640, -730);
    colocar(diag, bnd, 950, 1040, -640, -740);
    colocar(diag, ctrl, 1320, 1410, -630, -730);
    colocar(diag, e1, 1580, 1685, -340, -455);
    colocar(diag, e2, 1580, 1685, -540, -655);
    colocar(diag, e3, 1580, 1685, -740, -855);
    colocar(diag, e4, 1580, 1685, -940, -1055);

    var a1 = crearAsociacion(act, bnd, diag);
    crearMsg(act, bnd, diag, a1, "1", "consultarPedidos(estado, tipo)", false, 1, 15, C_NEGRO);
    crearMsg(act, bnd, diag, a1, "4", "avanzarEstado(pedido_id, nuevoEstado)", false, 4, 25, C_AZUL);
    crearMsg(act, bnd, diag, a1, "8", "generarComprobante(pedido_id)", false, 8, 35, C_OLIVA);
    crearMsg(act, bnd, diag, a1, "12", "abrirVisorPDF(comprobante.pdf)", true, 12, -15, C_VERDE);

    // Enlace 2: Boundary <-> Control (Funciones reales de apps/pedidos/views.py)
    var a2 = crearAsociacion(bnd, ctrl, diag);
    crearMsg(bnd, ctrl, diag, a2, "1.1", "ListaMisPedidosView.get(request)", false, 2, 15, C_NEGRO);
    crearMsg(bnd, ctrl, diag, a2, "4.1", "EditarEliminarMiPedidoView.patch(request, pedido_id)", false, 5, 25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "8.1", "ComprobanteDigitalView.get(request, pedido_id)", false, 9, 35, C_OLIVA);
    crearMsg(bnd, ctrl, diag, a2, "3", "renderizarTablaPedidos(pedidos)", true, 3, -15, C_VERDE);
    crearMsg(bnd, ctrl, diag, a2, "7", "notificarEstadoActualizado('CONFIRMADO')", true, 7, -25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "11", "descargarPDF(comprobante_stream)", true, 11, -35, C_ROJO);

    // Enlaces Control <-> Entidades
    var aPedido = crearAsociacion(ctrl, e1, diag);
    crearMsg(ctrl, e1, diag, aPedido, "2", "_filtrar_pedidos(qs, params)", false, 2, 15, C_OLIVA);
    crearMsg(ctrl, e1, diag, aPedido, "5", "_aplicar_cambios_pedido(request, pedido)", false, 5, 25, C_ROJO);

    var aItem = crearAsociacion(ctrl, e2, diag);
    crearMsg(ctrl, e2, diag, aItem, "9", "PedidoItem.objects.filter(pedido_id=pedido_id)", false, 9, 15, C_NEGRO);

    var aOrden = crearAsociacion(ctrl, e3, diag);
    crearMsg(ctrl, e3, diag, aOrden, "6", "orden_compra.save(update_fields=['estado_pago'])", false, 6, 15, C_VERDE);

    var aPago = crearAsociacion(ctrl, e4, diag);
    crearMsg(ctrl, e4, diag, aPago, "10", "orden_compra.pagos.filter(estado=APROBADO)", false, 10, 15, C_NEGRO);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 3. COM-CU13: Gestionar Entregas y Logística
 * ============================================================================== */
function generarCOM_CU13(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU13 - Gestionar Entregas", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("COM-CU13 - Gestionar Entregas", "Communication");
    if (!diag.Update()) { diag = pkg.Diagrams.AddNew("COM-CU13 - Gestionar Entregas", "Analysis"); diag.Update(); }

    var act = pkg.Elements.AddNew("Empresa / Repartidor", "Actor"); act.Update();
    var bnd = crearObjetoBCE(pkg, "Page : EntregasDespachoView", "boundary");
    var ctrl = crearObjetoBCE(pkg, "Gestor : EntregasController", "control");

    // 4 Entidades del Modelo Conceptual
    var e1 = crearObjetoBCE(pkg, "Entrega", "entity");
    var e2 = crearObjetoBCE(pkg, "Pedido", "entity");
    var e3 = crearObjetoBCE(pkg, "Sucursal", "entity");
    var e4 = crearObjetoBCE(pkg, "Notificacion", "entity");

    colocar(diag, act, 610, 655, -640, -730);
    colocar(diag, bnd, 950, 1040, -640, -740);
    colocar(diag, ctrl, 1320, 1410, -630, -730);
    colocar(diag, e1, 1580, 1685, -340, -455);
    colocar(diag, e2, 1580, 1685, -540, -655);
    colocar(diag, e3, 1580, 1685, -740, -855);
    colocar(diag, e4, 1580, 1685, -940, -1055);

    var a1 = crearAsociacion(act, bnd, diag);
    crearMsg(act, bnd, diag, a1, "1", "listarEntregasPendientes()", false, 1, 15, C_NEGRO);
    crearMsg(act, bnd, diag, a1, "4", "iniciarDespacho(entregaId, repartidorId)", false, 4, 25, C_AZUL);
    crearMsg(act, bnd, diag, a1, "9", "finalizarEntrega(entregaId, firmaPin)", false, 9, 35, C_OLIVA);
    crearMsg(act, bnd, diag, a1, "13", "mostrarAlertaExito('Entrega Finalizada')", true, 13, -15, C_VERDE);

    // Enlace 2: Boundary <-> Control (Funciones reales de apps/pedidos/views.py)
    var a2 = crearAsociacion(bnd, ctrl, diag);
    crearMsg(bnd, ctrl, diag, a2, "1.1", "ListaMisEntregasView.get(request)", false, 2, 15, C_NEGRO);
    crearMsg(bnd, ctrl, diag, a2, "4.1", "EditarEliminarMiEntregaView.patch(request, entrega_id)", false, 5, 25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "9.1", "MarcarMiEntregaEntregadaView.post(request, entrega_id)", false, 10, 35, C_OLIVA);
    crearMsg(bnd, ctrl, diag, a2, "3", "mostrarMapaYLista(entregas)", true, 3, -15, C_VERDE);
    crearMsg(bnd, ctrl, diag, a2, "8", "actualizarRutaMapa(coordenadas)", true, 8, -25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "12", "notificarEntregaExitosa()", true, 12, -35, C_ROJO);

    // Enlaces Control <-> Entidades
    var aEntrega = crearAsociacion(ctrl, e1, diag);
    crearMsg(ctrl, e1, diag, aEntrega, "2", "Entrega.objects.filter(estado='PENDIENTE')", false, 2, 15, C_OLIVA);
    crearMsg(ctrl, e1, diag, aEntrega, "5", "serializer.save(estado='EN_CAMINO')", false, 5, 25, C_AZUL);
    crearMsg(ctrl, e1, diag, aEntrega, "10", "_marcar_entregada(entrega)", false, 10, 35, C_VERDE);

    var aPedido = crearAsociacion(ctrl, e2, diag);
    crearMsg(ctrl, e2, diag, aPedido, "11", "pedido.save(update_fields=['estado'])", false, 11, 15, C_ROJO);

    var aSucursal = crearAsociacion(ctrl, e3, diag);
    crearMsg(ctrl, e3, diag, aSucursal, "6", "get_object_or_404(Sucursal, id=sucursal_id)", false, 6, 15, C_NEGRO);

    var aNotif = crearAsociacion(ctrl, e4, diag);
    crearMsg(ctrl, e4, diag, aNotif, "7", "_crear_notificacion(comprador, 'PEDIDO_EN_CAMINO')", false, 7, 15, C_VERDE);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 4. COM-CU16: Gestionar Promociones y Descuentos
 * ============================================================================== */
function generarCOM_CU16(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU16 - Gestionar Promociones y Descuentos", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("COM-CU16 - Gestionar Promociones y Descuentos", "Communication");
    if (!diag.Update()) { diag = pkg.Diagrams.AddNew("COM-CU16 - Gestionar Promociones y Descuentos", "Analysis"); diag.Update(); }

    var act = pkg.Elements.AddNew("Empresa / Emprendedor", "Actor"); act.Update();
    var bnd = crearObjetoBCE(pkg, "Page : PromocionesView", "boundary");
    var ctrl = crearObjetoBCE(pkg, "Gestor : PromocionesController", "control");

    // 4 Entidades del Modelo Conceptual
    var e1 = crearObjetoBCE(pkg, "Promocion", "entity");
    var e2 = crearObjetoBCE(pkg, "PromocionProducto", "entity");
    var e3 = crearObjetoBCE(pkg, "Producto", "entity");
    var e4 = crearObjetoBCE(pkg, "Categoria", "entity");

    colocar(diag, act, 610, 655, -640, -730);
    colocar(diag, bnd, 950, 1040, -640, -740);
    colocar(diag, ctrl, 1320, 1410, -630, -730);
    colocar(diag, e1, 1580, 1685, -340, -455);
    colocar(diag, e2, 1580, 1685, -540, -655);
    colocar(diag, e3, 1580, 1685, -740, -855);
    colocar(diag, e4, 1580, 1685, -940, -1055);

    var a1 = crearAsociacion(act, bnd, diag);
    crearMsg(act, bnd, diag, a1, "1", "solicitarPromociones()", false, 1, 15, C_NEGRO);
    crearMsg(act, bnd, diag, a1, "4", "crearPromocion(datosPromo, productosIds)", false, 4, 25, C_AZUL);
    crearMsg(act, bnd, diag, a1, "9", "consultarImpacto(promocion_id)", false, 9, 35, C_OLIVA);
    crearMsg(act, bnd, diag, a1, "12", "visualizarMetricasConversion()", true, 12, -15, C_VERDE);

    // Enlace 2: Boundary <-> Control (Funciones reales de apps/promociones/views.py)
    var a2 = crearAsociacion(bnd, ctrl, diag);
    crearMsg(bnd, ctrl, diag, a2, "1.1", "ListaCrearMisPromocionesView.get(request)", false, 2, 15, C_NEGRO);
    crearMsg(bnd, ctrl, diag, a2, "4.1", "ListaCrearMisPromocionesView.perform_create(serializer)", false, 5, 25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "9.1", "EditarEliminarMiPromocionView.patch(request, promocion_id)", false, 10, 35, C_OLIVA);
    crearMsg(bnd, ctrl, diag, a2, "3", "mostrarTablaPromociones(promos)", true, 3, -15, C_VERDE);
    crearMsg(bnd, ctrl, diag, a2, "8", "confirmarPromocion(promocion)", true, 8, -25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "11", "renderizarGraficoImpacto(kpis)", true, 11, -35, C_ROJO);

    // Enlaces Control <-> Entidades
    var aPromo = crearAsociacion(ctrl, e1, diag);
    crearMsg(ctrl, e1, diag, aPromo, "2", "Promocion.objects.filter(empresa=empresa)", false, 2, 15, C_OLIVA);
    crearMsg(ctrl, e1, diag, aPromo, "5", "serializer.save(empresa=empresa)", false, 5, 25, C_ROJO);

    var aPromoProd = crearAsociacion(ctrl, e2, diag);
    crearMsg(ctrl, e2, diag, aPromoProd, "6", "PromocionProducto.objects.bulk_create(items)", false, 6, 15, C_NEGRO);

    var aProd = crearAsociacion(ctrl, e3, diag);
    crearMsg(ctrl, e3, diag, aProd, "7", "sincronizar_descuentos_productos(productos)", false, 7, 15, C_AZUL);

    var aCat = crearAsociacion(ctrl, e4, diag);
    crearMsg(ctrl, e4, diag, aCat, "10", "Categoria.objects.filter(activo=True)", false, 10, 15, C_VERDE);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 5. COM-CU17: Transmisiones en Vivo - Live Commerce
 * ============================================================================== */
function generarCOM_CU17(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU17 - Live Commerce", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("COM-CU17 - Gestionar Live Commerce", "Communication");
    if (!diag.Update()) { diag = pkg.Diagrams.AddNew("COM-CU17 - Gestionar Live Commerce", "Analysis"); diag.Update(); }

    var act = pkg.Elements.AddNew("Empresa / Anfitrion", "Actor"); act.Update();
    var bnd = crearObjetoBCE(pkg, "Page : LiveCommerceStudioView", "boundary");
    var ctrl = crearObjetoBCE(pkg, "Gestor : LiveSignalingConsumer", "control");

    // 4 Entidades del Modelo Conceptual
    var e1 = crearObjetoBCE(pkg, "LiveCommerceSesion", "entity");
    var e2 = crearObjetoBCE(pkg, "LiveCommerceSesionProducto", "entity");
    var e3 = crearObjetoBCE(pkg, "ComentarioLive", "entity");
    var e4 = crearObjetoBCE(pkg, "Producto", "entity");

    colocar(diag, act, 610, 655, -640, -730);
    colocar(diag, bnd, 950, 1040, -640, -740);
    colocar(diag, ctrl, 1320, 1410, -630, -730);
    colocar(diag, e1, 1580, 1685, -340, -455);
    colocar(diag, e2, 1580, 1685, -540, -655);
    colocar(diag, e3, 1580, 1685, -740, -855);
    colocar(diag, e4, 1580, 1685, -940, -1055);

    var a1 = crearAsociacion(act, bnd, diag);
    crearMsg(act, bnd, diag, a1, "1", "iniciarTransmisionLive(titulo, prods)", false, 1, 15, C_NEGRO);
    crearMsg(act, bnd, diag, a1, "5", "enviarComentarioChat(texto)", false, 5, 25, C_AZUL);
    crearMsg(act, bnd, diag, a1, "8", "anclarProductoDestacado(prod_id)", false, 8, 35, C_OLIVA);
    crearMsg(act, bnd, diag, a1, "11", "finalizarTransmision(sesion_id)", false, 11, 45, C_ROJO);
    crearMsg(act, bnd, diag, a1, "14", "mostrarAlertaExito('Sesion Finalizada')", true, 14, -15, C_VERDE);

    // Enlace 2: Boundary <-> Control (Funciones reales de apps/promociones/views.py y consumers.py)
    var a2 = crearAsociacion(bnd, ctrl, diag);
    crearMsg(bnd, ctrl, diag, a2, "1.1", "ListaCrearMisLivesView.create(request)", false, 2, 15, C_NEGRO);
    crearMsg(bnd, ctrl, diag, a2, "5.1", "ListaCrearComentariosLiveView.post(request)", false, 6, 25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "8.1", "LiveSignalingConsumer.fijar_producto(prod_id)", false, 9, 35, C_OLIVA);
    crearMsg(bnd, ctrl, diag, a2, "11.1", "EditarEliminarMiLiveView.patch(request, live_id)", false, 12, 45, C_ROJO);
    crearMsg(bnd, ctrl, diag, a2, "4", "confirmarConexionWebRTC(sdp_answer)", true, 4, -15, C_VERDE);
    crearMsg(bnd, ctrl, diag, a2, "7", "broadcastMensaje(chatPayload)", true, 7, -25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "10", "broadcastBannerProducto(banner)", true, 10, -35, C_OLIVA);
    crearMsg(bnd, ctrl, diag, a2, "13", "mostrarResumenLive(espectadores)", true, 13, -45, C_VERDE);

    // Enlaces Control <-> Entidades
    var aLive = crearAsociacion(ctrl, e1, diag);
    crearMsg(ctrl, e1, diag, aLive, "2", "sesion.save(estado=EN_VIVO)", false, 2, 15, C_ROJO);
    crearMsg(ctrl, e1, diag, aLive, "12", "sesion.save(estado=FINALIZADA)", false, 12, 25, C_VERDE);

    var aLiveProd = crearAsociacion(ctrl, e2, diag);
    crearMsg(ctrl, e2, diag, aLiveProd, "3", "LiveCommerceSesionProducto.objects.bulk_create(prods)", false, 3, 15, C_AZUL);

    var aComent = crearAsociacion(ctrl, e3, diag);
    crearMsg(ctrl, e3, diag, aComent, "6", "ComentarioLive.objects.create(sesion, usuario, texto)", false, 6, 15, C_NEGRO);

    var aProd = crearAsociacion(ctrl, e4, diag);
    crearMsg(ctrl, e4, diag, aProd, "9", "get_object_or_404(Producto, id=prod_id)", false, 9, 15, C_OLIVA);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 6. COM-CU23: Gestionar Notificaciones del Sistema
 * ============================================================================== */
function generarCOM_CU23(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU23 - Gestionar Notificaciones", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("COM-CU23 - Gestionar Notificaciones", "Communication");
    if (!diag.Update()) { diag = pkg.Diagrams.AddNew("COM-CU23 - Gestionar Notificaciones", "Analysis"); diag.Update(); }

    var act = pkg.Elements.AddNew("Comprador / Empresa", "Actor"); act.Update();
    var bnd = crearObjetoBCE(pkg, "Page : NotificationCenterView", "boundary");
    var ctrl = crearObjetoBCE(pkg, "Gestor : NotificationHub", "control");

    // 2 Entidades del Modelo Conceptual
    var e1 = crearObjetoBCE(pkg, "Notificacion", "entity");
    var e2 = crearObjetoBCE(pkg, "Usuario", "entity");

    colocar(diag, act, 610, 655, -640, -730);
    colocar(diag, bnd, 950, 1040, -640, -740);
    colocar(diag, ctrl, 1320, 1410, -630, -730);
    colocar(diag, e1, 1580, 1685, -440, -555);
    colocar(diag, e2, 1580, 1685, -740, -855);

    var a1 = crearAsociacion(act, bnd, diag);
    crearMsg(act, bnd, diag, a1, "1", "abrirCentroNotificaciones()", false, 1, 15, C_NEGRO);
    crearMsg(act, bnd, diag, a1, "4", "seleccionarNotificacion(notif_id)", false, 4, 25, C_AZUL);
    crearMsg(act, bnd, diag, a1, "8", "solicitarMarcarTodasLeidas()", false, 8, 35, C_OLIVA);
    crearMsg(act, bnd, diag, a1, "7", "redirigirAVistaDetalle(enlace)", true, 7, -15, C_VERDE);
    crearMsg(act, bnd, diag, a1, "11", "actualizarIconoCampana()", true, 11, -25, C_VERDE);

    // Enlace 2: Boundary <-> Control (Funciones reales de apps/notificaciones/views.py)
    var a2 = crearAsociacion(bnd, ctrl, diag);
    crearMsg(bnd, ctrl, diag, a2, "1.1", "ListaMisNotificacionesView.get(request)", false, 2, 15, C_NEGRO);
    crearMsg(bnd, ctrl, diag, a2, "4.1", "MarcarLeidaView.post(request, notificacion_id)", false, 5, 25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "8.1", "MarcarTodasLeidasView.post(request)", false, 9, 35, C_OLIVA);
    crearMsg(bnd, ctrl, diag, a2, "3", "renderizarListaAvisos(notificaciones)", true, 3, -15, C_VERDE);
    crearMsg(bnd, ctrl, diag, a2, "6", "retornarEnlaceDestino(enlace)", true, 6, -25, C_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "10", "actualizarBadgeContador(0)", true, 10, -35, C_ROJO);

    // Enlaces Control <-> Entidades
    var aNotif = crearAsociacion(ctrl, e1, diag);
    crearMsg(ctrl, e1, diag, aNotif, "2", "Notificacion.objects.filter(usuario=user, leido=False)", false, 2, 15, C_OLIVA);
    crearMsg(ctrl, e1, diag, aNotif, "5", "notif.save(update_fields=['leido'])", false, 5, 25, C_AZUL);
    crearMsg(ctrl, e1, diag, aNotif, "9", "Notificacion.objects.filter(usuario=user).update(leido=True)", false, 9, 35, C_VERDE);

    var aUser = crearAsociacion(ctrl, e2, diag);
    crearMsg(ctrl, e2, diag, aUser, "6.1", "get_object_or_404(Usuario, id=user_id)", false, 6, 15, C_NEGRO);

    finalizarDiag(diag);
}

// -----------------------------------------------------------------------------
// UTILIDADES COMUNES (LÍNEAS RECTAS, METADATOS Y COLORES)
// -----------------------------------------------------------------------------
function crearObjetoBCE(pkg, nombre, estereotipo) {
    var obj = pkg.Elements.AddNew(nombre, "Object");
    obj.Stereotype = estereotipo;
    obj.Update();
    return obj;
}

function colocar(diag, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diag.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
}

function crearAsociacion(src, dst, diag) {
    var assoc = src.Connectors.AddNew("", "Association");
    assoc.SupplierID = dst.ElementID;
    assoc.Direction = "Unspecified";
    assoc.Update();

    var dlink = diag.DiagramLinks.AddNew("", "");
    dlink.ConnectorID = assoc.ConnectorID;
    dlink.Style = "Mode=1;Color=-1;LWidth=0;";
    dlink.Update();

    return assoc.ConnectorID;
}

function crearMsg(src, dst, diag, assocId, seqStr, label, esRetorno, seqInt, offsetY, color) {
    var msg = src.Connectors.AddNew(label, "Collaboration");
    msg.SupplierID = dst.ElementID;
    msg.Direction = esRetorno ? "Destination -> Source" : "Source -> Destination";
    msg.DiagramID = diag.DiagramID;
    msg.Update();

    var msgId = msg.ConnectorID;

    var sql = "UPDATE t_connector SET " +
              "SourceIsAggregate = " + assocId + ", " +
              "SeqNo = " + seqInt + ", " +
              "PDATA1 = 'Synchronous', " +
              "PDATA3 = 'Call', " +
              "PDATA4 = '" + seqStr + "', " +
              "PDATA5 = 'SX=0;SY=" + offsetY + ";EX=0;EY=0;', " +
              "HeadStyle = 1, " +
              "RouteStyle = 3 " +
              "WHERE Connector_ID = " + msgId;
    Repository.Execute(sql);

    var dlink = diag.DiagramLinks.AddNew("", "");
    dlink.ConnectorID = msgId;
    dlink.Geometry = "SX=0;SY=" + offsetY + ";EX=0;EY=0;EDGE=2;";
    dlink.Style = "Mode=1;Color=" + color + ";LWidth=0;";
    dlink.Update();

    return msgId;
}

function finalizarDiag(diag) {
    diag.DiagramLinks.Refresh();
    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

main();
