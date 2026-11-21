/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos Locales)
 * MODULO: DIAGRAMAS DE SECUENCIA - ESTILO VISUAL IDÉNTICO A LA PLANTILLA DE REFERENCIA
 * 
 * ESPECIFICACIONES DE COLOR Y DISEÑO APLICADAS (100% IDÉNTICO A CU11):
 *   1. COLOR UNIFORME DE OBJETOS:
 *      - Todos los objetos (Actor, Boundary, Control y Entidades) y barras de activación
 *        tienen el color cálido pergamino / crema suave estándar:
 *        RGB(253, 243, 226) -> BGR: 14873597.
 *   2. LÍNEAS Y FLECHAS DE MENSAJES:
 *      - Todas las llamadas y retornos usan color negro / gris oscuro formal (Color=0).
 *      - Sin líneas de colores estridentes (rojos/azules/verdes eliminados).
 *   3. FRAGMENTOS COMBINADOS (alt, opt, loop):
 *      - Fondo verde menta suave (RGB: 229, 245, 222 -> BGR: 14611941) exacto al de la plantilla.
 *      - 'alt' y 'opt' abarcan desde la clase INTERFAZ (Frontend/Boundary).
 *      - 'loop' abarca únicamente desde la clase CONTROL (Backend/Controller).
 *   4. SIN NOTAS / COMENTARIOS AL MARGEN IZQUIERDO:
 *      - El diagrama empieza limpio y ordenado desde la línea del Actor.
 *   5. MÉTODOS Y FUNCIONES LIMPIAS (UML 2.5):
 *      - Cero verbos HTTP (GET, POST, PUT, PATCH) ni rutas URL.
 * ==============================================================================
 */

// ==============================================================================
// PALETA DE COLORES EN FORMATO BGR (ENTERPRISE ARCHITECT)
// ==============================================================================
var C_OBJ_BG      = 14873597; // RGB(253, 243, 226) - Crema / Pergamino cálido uniforme idéntico a la plantilla
var C_FRAG_BG     = 14611941; // RGB(229, 245, 222) - Verde menta suave idéntico a las etiquetas de fragmentos (loop, alt, opt)
var C_LINEA_NEGRO = 0;        // Negro puro estándar UML para todos los mensajes y retornos

// ==============================================================================
// FUNCIÓN PRINCIPAL DE EJECUCIÓN
// ==============================================================================
function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== INICIANDO GENERACIÓN DE DIAGRAMAS DE SECUENCIA (ESTILO VISUAL OFICIAL) ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    
    // Fallback inteligente si no hay paquete seleccionado
    if (currentPackage == null) {
        if (Repository.Models.Count > 0) {
            var rootModel = Repository.Models.GetAt(0);
            if (rootModel.Packages.Count > 0) {
                currentPackage = rootModel.Packages.GetAt(0);
            } else {
                currentPackage = rootModel;
            }
        }
    }

    if (currentPackage == null) {
        Session.Prompt("Por favor abra un proyecto y seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var rootPkg = currentPackage.Packages.AddNew("Diagramas de Secuencia - Sprint 3 (Estilo Oficial)", "");
    rootPkg.Update();

    Repository.WriteOutput("Script", "[1/6] Generando SQ-CU09: Gestionar Empleados y Permisos...", 0);
    generarSQ_CU09(rootPkg);

    Repository.WriteOutput("Script", "[2/6] Generando SQ-CU12: Gestionar Pedidos y Ventas...", 0);
    generarSQ_CU12(rootPkg);

    Repository.WriteOutput("Script", "[3/6] Generando SQ-CU13: Gestionar Entregas y Logística...", 0);
    generarSQ_CU13(rootPkg);

    Repository.WriteOutput("Script", "[4/6] Generando SQ-CU16: Gestionar Promociones y Descuentos...", 0);
    generarSQ_CU16(rootPkg);

    Repository.WriteOutput("Script", "[5/6] Generando SQ-CU17: Transmisiones Live Commerce...", 0);
    generarSQ_CU17(rootPkg);

    Repository.WriteOutput("Script", "[6/6] Generando SQ-CU23: Gestionar Notificaciones del Sistema...", 0);
    generarSQ_CU23(rootPkg);

    rootPkg.Packages.Refresh();
    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] TODOS LOS DIAGRAMAS HAN SIDO GENERADOS CON EL COLOR Y ESTILO EXACTO ===", 0);
    Session.Prompt("¡Los 6 Diagramas de Secuencia del Sprint 3 han sido generados con los colores y estilo exacto de la plantilla!", 0);
}

/* ==============================================================================
 * 1. SQ-CU09: Gestionar Empleados y Permisos
 * ============================================================================== */
function generarSQ_CU09(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU09 - Gestionar Empleados y Permisos", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("SQ-CU09 - Gestionar Empleados y Permisos", "Sequence");
    diag.Update();

    var act  = crearLifeline(pkg, "Empresa / Emprendedor", "actor");
    var bnd  = crearLifeline(pkg, "MisEmpleadosView", "boundary");
    var ctrl = crearLifeline(pkg, "EmpleadosController", "control");
    var e1   = crearLifeline(pkg, "Usuario", "entity");
    var e2   = crearLifeline(pkg, "Empleado", "entity");
    var e3   = crearLifeline(pkg, "Permiso", "entity");
    var e4   = crearLifeline(pkg, "EmpleadoPermiso", "entity");
    var e5   = crearLifeline(pkg, "LogAuditoria", "entity");

    colocarLifeline(diag, act,  60,  160, -30, -1220, C_OBJ_BG);
    colocarLifeline(diag, bnd,  230, 340, -30, -1220, C_OBJ_BG);
    colocarLifeline(diag, ctrl, 410, 520, -30, -1220, C_OBJ_BG);
    colocarLifeline(diag, e1,   590, 700, -30, -1220, C_OBJ_BG);
    colocarLifeline(diag, e2,   770, 880, -30, -1220, C_OBJ_BG);
    colocarLifeline(diag, e3,   950, 1060, -30, -1220, C_OBJ_BG);
    colocarLifeline(diag, e4,   1130, 1240, -30, -1220, C_OBJ_BG);
    colocarLifeline(diag, e5,   1310, 1420, -30, -1220, C_OBJ_BG);

    // --- FLUJO 1: Cargar / Consultar Empleados ---
    crearMsgSeq(act, bnd, diag, "1", "consultarEmpleados()", false, 1, -120, C_LINEA_NEGRO);
    crearMsgSeq(bnd, ctrl, diag, "2", "listarEmpleados(empresa)", false, 2, -160, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e2, diag, "3", "Empleado.objects.filter(empresa=empresa, is_active=True)", false, 3, -200, C_LINEA_NEGRO);
    crearMsgSeq(e2, ctrl, diag, "4", "retornarListaEmpleados(empleados)", true, 4, -240, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, bnd, diag, "5", "retornarListaEmpleados(empleados)", true, 5, -280, C_LINEA_NEGRO);
    crearMsgSeq(bnd, act, diag, "6", "renderizarTablaEmpleados(empleados)", true, 6, -320, C_LINEA_NEGRO);

    // --- FLUJO 2: Registrar Nuevo Empleado (alt empieza en Interfaz bnd: left=210) ---
    crearMsgSeq(act, bnd, diag, "7", "crearEmpleado(email, password, nombre, cargo)", false, 7, -350, C_LINEA_NEGRO);
    crearMsgSeq(bnd, ctrl, diag, "8", "registrarEmpleado(email, password, nombre, cargo)", false, 8, -380, C_LINEA_NEGRO);

    // Fragmento alt: INICIA DESDE LA CLASE INTERFAZ (Boundary: X=210 hasta X=1440)
    crearFragmento(pkg, diag, "[datos válidos: email no registrado]", "alt", 210, 1440, -390, -605);
    crearMsgSeq(ctrl, e1, diag, "9", "Usuario.objects.create_user(email, password, rol='EMPLEADO')", false, 9, -410, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "10", "retornarUsuarioCreado(usuario)", true, 10, -440, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e2, diag, "11", "Empleado.objects.create(usuario=usuario, empresa=empresa, cargo=cargo)", false, 11, -470, C_LINEA_NEGRO);
    crearMsgSeq(e2, ctrl, diag, "12", "retornarEmpleadoCreado(empleado)", true, 12, -500, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e5, diag, "13", "_log(request, 'CREAR_EMPLEADO', 'empleado', empleado.id)", false, 13, -530, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, bnd, diag, "14", "retornarEmpleadoCreado(empleado)", true, 14, -560, C_LINEA_NEGRO);
    crearMsgSeq(bnd, act, diag, "15", "mostrarAlertaExito('Empleado registrado')", true, 15, -620, C_LINEA_NEGRO);

    // --- FLUJO 3: Asignar Permiso (opt empieza en Interfaz bnd: left=210) ---
    crearMsgSeq(act, bnd, diag, "16", "asignarPermiso(empleado_id, permiso_id)", false, 16, -655, C_LINEA_NEGRO);
    crearMsgSeq(bnd, ctrl, diag, "17", "asignarPermisoEmpleado(empleado_id, permiso_id)", false, 17, -685, C_LINEA_NEGRO);

    // Fragmento opt: INICIA DESDE LA CLASE INTERFAZ (Boundary: X=210 hasta X=1440)
    crearFragmento(pkg, diag, "[permiso válido y no asignado previamente]", "opt", 210, 1440, -710, -855);
    crearMsgSeq(ctrl, e3, diag, "18", "get_object_or_404(Permiso, id=permiso_id)", false, 18, -730, C_LINEA_NEGRO);
    crearMsgSeq(e3, ctrl, diag, "19", "retornarPermiso(permiso)", true, 19, -760, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e4, diag, "20", "EmpleadoPermiso.objects.get_or_create(empleado=empleado, permiso=permiso)", false, 20, -790, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e5, diag, "21", "_log(request, 'ASIGNAR_PERMISO_EMPLEADO', 'empleado', empleado.id)", false, 21, -820, C_LINEA_NEGRO);

    crearMsgSeq(ctrl, bnd, diag, "22", "retornarConfirmacionPermiso()", true, 22, -875, C_LINEA_NEGRO);
    crearMsgSeq(bnd, act, diag, "23", "actualizarPermisoUI(permiso_id, true)", true, 23, -905, C_LINEA_NEGRO);

    // --- FLUJO 4: Desactivar Empleado ---
    crearMsgSeq(act, bnd, diag, "24", "desactivarEmpleado(empleado_id)", false, 24, -945, C_LINEA_NEGRO);
    crearMsgSeq(bnd, ctrl, diag, "25", "inactivarCuentaEmpleado(empleado_id)", false, 25, -975, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e2, diag, "26", "empleado.save(update_fields=['estado=INACTIVO'])", false, 26, -1005, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "27", "usuario.save(update_fields=['is_active=False', 'estado=INACTIVO'])", false, 27, -1035, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e5, diag, "28", "_log(request, 'DESACTIVAR_EMPLEADO', 'empleado', empleado.id)", false, 28, -1065, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, bnd, diag, "29", "retornarConfirmacionExito()", true, 29, -1095, C_LINEA_NEGRO);
    crearMsgSeq(bnd, act, diag, "30", "mostrarAlertaExito('Empleado desactivado')", true, 30, -1125, C_LINEA_NEGRO);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 2. SQ-CU12: Gestionar Pedidos y Ventas
 * ============================================================================== */
function generarSQ_CU12(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU12 - Gestionar Pedidos y Ventas", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("SQ-CU12 - Gestionar Pedidos y Ventas", "Sequence");
    diag.Update();

    var act   = crearLifeline(pkg, "Empresa / Comprador", "actor");
    var bnd1  = crearLifeline(pkg, "MisPedidosView", "boundary");
    var bnd2  = crearLifeline(pkg, "VisorFacturaPDF", "boundary");
    var ctrl1 = crearLifeline(pkg, "PedidosController", "control");
    var ctrl2 = crearLifeline(pkg, "FacturaPDFService", "control");
    var e1    = crearLifeline(pkg, "Pedido", "entity");
    var e2    = crearLifeline(pkg, "PedidoItem", "entity");
    var e3    = crearLifeline(pkg, "OrdenCompra", "entity");
    var e4    = crearLifeline(pkg, "Pago", "entity");

    colocarLifeline(diag, act,   60,  160, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, bnd1,  210, 320, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, bnd2,  370, 480, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, ctrl1, 530, 640, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, ctrl2, 690, 800, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, e1,    850, 950, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, e2,    1000, 1100, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, e3,    1150, 1250, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, e4,    1300, 1400, -30, -880, C_OBJ_BG);

    // --- FLUJO 1: Cargar Pedidos de Venta ---
    crearMsgSeq(act, bnd1, diag, "1", "cargarPedidos(tipo='venta')", false, 1, -120, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, ctrl1, diag, "2", "listarPedidos(empresa, tipo='venta')", false, 2, -160, C_LINEA_NEGRO);
    crearMsgSeq(ctrl1, e1, diag, "3", "_filtrar_pedidos(empresa=empresa, tipo='venta')", false, 3, -200, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl1, diag, "4", "retornarPedidosQS(pedidos)", true, 4, -240, C_LINEA_NEGRO);
    crearMsgSeq(ctrl1, bnd1, diag, "5", "retornarListaPedidos(pedidos)", true, 5, -280, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, act, diag, "6", "renderizarTablaPedidos(pedidos)", true, 6, -320, C_LINEA_NEGRO);

    // --- FLUJO 2: Cambiar Estado de Pedido (alt empieza en Interfaz bnd1: left=190) ---
    crearMsgSeq(act, bnd1, diag, "7", "cambiarEstado(pedido_id, nuevoEstado='CONFIRMADO')", false, 7, -350, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, ctrl1, diag, "8", "actualizarEstadoPedido(pedido_id, nuevoEstado='CONFIRMADO')", false, 8, -380, C_LINEA_NEGRO);

    // Fragmento alt: INICIA DESDE LA CLASE INTERFAZ (Boundary: X=190 hasta X=1420)
    crearFragmento(pkg, diag, "[transición válida: CONFIRMADO]", "alt", 190, 1420, -395, -510);
    crearMsgSeq(ctrl1, e1, diag, "9", "_aplicar_cambios_pedido(pedido, estado='CONFIRMADO')", false, 9, -410, C_LINEA_NEGRO);
    crearMsgSeq(ctrl1, e3, diag, "10", "orden_compra.save(update_fields=['estado_pago=PAGADO'])", false, 10, -440, C_LINEA_NEGRO);
    crearMsgSeq(ctrl1, e4, diag, "11", "orden_compra.pagos.filter(estado='APROBADO')", false, 11, -470, C_LINEA_NEGRO);

    crearMsgSeq(ctrl1, bnd1, diag, "12", "retornarPedidoActualizado(pedido)", true, 12, -530, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, act, diag, "13", "actualizarFilaPedidoUI('CONFIRMADO')", true, 13, -560, C_LINEA_NEGRO);

    // --- FLUJO 3: Generar y Descargar Factura PDF (opt empieza en Interfaz bnd2: left=350) ---
    crearMsgSeq(act, bnd2, diag, "14", "solicitarDescargaFactura(pedido_id)", false, 14, -600, C_LINEA_NEGRO);
    crearMsgSeq(bnd2, ctrl2, diag, "15", "generarFacturaPDF(pedido_id)", false, 15, -630, C_LINEA_NEGRO);

    // Fragmento opt: INICIA DESDE LA CLASE INTERFAZ (Boundary bnd2: X=350 hasta X=1120)
    crearFragmento(pkg, diag, "[pedido con items existentes]", "opt", 350, 1120, -640, -780);
    crearMsgSeq(ctrl2, e1, diag, "16", "get_object_or_404(Pedido, pk=pedido_id)", false, 16, -660, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl2, diag, "17", "retornarPedido(pedido)", true, 17, -690, C_LINEA_NEGRO);
    crearMsgSeq(ctrl2, e2, diag, "18", "pedido.items.select_related('producto')", false, 18, -720, C_LINEA_NEGRO);
    crearMsgSeq(e2, ctrl2, diag, "19", "retornarListaItems(items)", true, 19, -750, C_LINEA_NEGRO);

    crearMsgSeq(ctrl2, bnd2, diag, "20", "retornarDocumentoPDF(pdf_stream)", true, 20, -800, C_LINEA_NEGRO);
    crearMsgSeq(bnd2, act, diag, "21", "desplegarFacturaPDF(pdf_stream)", true, 21, -830, C_LINEA_NEGRO);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 3. SQ-CU13: Gestionar Entregas y Logística
 * ============================================================================== */
function generarSQ_CU13(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU13 - Gestionar Entregas", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("SQ-CU13 - Gestionar Entregas", "Sequence");
    diag.Update();

    var act   = crearLifeline(pkg, "Empresa / Repartidor", "actor");
    var bnd1  = crearLifeline(pkg, "MisEntregasView", "boundary");
    var bnd2  = crearLifeline(pkg, "MapaLogisticaPanel", "boundary");
    var ctrl  = crearLifeline(pkg, "EntregasController", "control");
    var e1    = crearLifeline(pkg, "Entrega", "entity");
    var e2    = crearLifeline(pkg, "Pedido", "entity");
    var e3    = crearLifeline(pkg, "Sucursal", "entity");
    var e4    = crearLifeline(pkg, "Notificacion", "entity");

    colocarLifeline(diag, act,  60,  160, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, bnd1, 210, 320, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, bnd2, 370, 480, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, ctrl, 530, 640, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, e1,   700, 800, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, e2,   860, 960, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, e3,   1020, 1120, -30, -880, C_OBJ_BG);
    colocarLifeline(diag, e4,   1180, 1280, -30, -880, C_OBJ_BG);

    // --- FLUJO 1: Cargar Entregas Asignadas ---
    crearMsgSeq(act, bnd1, diag, "1", "cargarEntregas()", false, 1, -120, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, ctrl, diag, "2", "listarEntregas(empresa)", false, 2, -160, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "3", "Entrega.objects.filter(pedido__empresa=empresa)", false, 3, -200, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "4", "retornarListaEntregas(entregas)", true, 4, -240, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, bnd1, diag, "5", "retornarListaEntregas(entregas)", true, 5, -280, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, act, diag, "6", "renderizarListaEntregas(entregas)", true, 6, -320, C_LINEA_NEGRO);

    // --- FLUJO 2: Iniciar Despacho (opt empieza en Interfaz bnd2: left=350) ---
    crearMsgSeq(act, bnd2, diag, "7", "iniciarDespacho(entrega_id, sucursal_id, 'EN_CAMINO')", false, 7, -350, C_LINEA_NEGRO);
    crearMsgSeq(bnd2, ctrl, diag, "8", "actualizarEstadoDespacho(entrega_id, sucursal_id, 'EN_CAMINO')", false, 8, -380, C_LINEA_NEGRO);

    // Fragmento opt: INICIA DESDE LA CLASE INTERFAZ (Boundary bnd2: X=350 hasta X=1300)
    crearFragmento(pkg, diag, "[sucursal existente y entrega activa]", "opt", 350, 1300, -390, -530);
    crearMsgSeq(ctrl, e3, diag, "9", "get_object_or_404(Sucursal, id=sucursal_id)", false, 9, -410, C_LINEA_NEGRO);
    crearMsgSeq(e3, ctrl, diag, "10", "retornarSucursal(sucursal)", true, 10, -440, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "11", "entrega.save(update_fields=['estado=EN_CAMINO', 'sucursal'])", false, 11, -470, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e4, diag, "12", "_crear_notificacion(comprador, 'PEDIDO_EN_CAMINO')", false, 12, -500, C_LINEA_NEGRO);

    crearMsgSeq(ctrl, bnd2, diag, "13", "retornarEntregaActualizada(entrega)", true, 13, -550, C_LINEA_NEGRO);
    crearMsgSeq(bnd2, act, diag, "14", "trazarRutaMapaLeaflet('EN_CAMINO')", true, 14, -580, C_LINEA_NEGRO);

    // --- FLUJO 3: Marcar Entrega Completada ---
    crearMsgSeq(act, bnd1, diag, "15", "marcarEntregada(entrega_id)", false, 15, -620, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, ctrl, diag, "16", "marcarEntregaCompletada(entrega_id)", false, 16, -650, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "17", "_marcar_entregada(entrega) [cursor: fn_marcar_entregada]", false, 17, -680, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e2, diag, "18", "pedido.save(update_fields=['estado=ENTREGADO'])", false, 18, -710, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e4, diag, "19", "_crear_notificacion(comprador, 'PEDIDO_ENTREGADO')", false, 19, -740, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, bnd1, diag, "20", "retornarEntregaConfirmada(entrega)", true, 20, -770, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, act, diag, "21", "mostrarAlertaExito('Entrega completada')", true, 21, -800, C_LINEA_NEGRO);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 4. SQ-CU16: Gestionar Promociones y Descuentos
 * ============================================================================== */
function generarSQ_CU16(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU16 - Gestionar Promociones y Descuentos", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("SQ-CU16 - Gestionar Promociones y Descuentos", "Sequence");
    diag.Update();

    var act   = crearLifeline(pkg, "Empresa / Emprendedor", "actor");
    var bnd1  = crearLifeline(pkg, "MisPromocionesView", "boundary");
    var bnd2  = crearLifeline(pkg, "FormularioPromocionModal", "boundary");
    var ctrl  = crearLifeline(pkg, "PromocionesController", "control");
    var e1    = crearLifeline(pkg, "Promocion", "entity");
    var e2    = crearLifeline(pkg, "PromocionProducto", "entity");
    var e3    = crearLifeline(pkg, "Producto", "entity");
    var e4    = crearLifeline(pkg, "Categoria", "entity");

    colocarLifeline(diag, act,  60,  160, -30, -900, C_OBJ_BG);
    colocarLifeline(diag, bnd1, 210, 320, -30, -900, C_OBJ_BG);
    colocarLifeline(diag, bnd2, 370, 480, -30, -900, C_OBJ_BG);
    colocarLifeline(diag, ctrl, 530, 640, -30, -900, C_OBJ_BG);
    colocarLifeline(diag, e1,   700, 800, -30, -900, C_OBJ_BG);
    colocarLifeline(diag, e2,   860, 960, -30, -900, C_OBJ_BG);
    colocarLifeline(diag, e3,   1020, 1120, -30, -900, C_OBJ_BG);
    colocarLifeline(diag, e4,   1180, 1280, -30, -900, C_OBJ_BG);

    // --- FLUJO 1: Consultar Promociones ---
    crearMsgSeq(act, bnd1, diag, "1", "solicitarPromociones()", false, 1, -120, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, ctrl, diag, "2", "listarPromociones(empresa)", false, 2, -160, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "3", "Promocion.objects.filter(empresa=empresa)", false, 3, -200, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "4", "retornarListaPromociones(promociones)", true, 4, -240, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, bnd1, diag, "5", "retornarListaPromociones(promociones)", true, 5, -280, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, act, diag, "6", "mostrarTablaPromociones(promociones)", true, 6, -320, C_LINEA_NEGRO);

    // --- FLUJO 2: Crear Promoción y Sincronizar en Lote (loop SOLO desde Control) ---
    crearMsgSeq(act, bnd2, diag, "7", "crearPromocion(datosPromo, productos_ids)", false, 7, -350, C_LINEA_NEGRO);
    crearMsgSeq(bnd2, ctrl, diag, "8", "registrarPromocion(datosPromo, productos_ids)", false, 8, -380, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "9", "Promocion.objects.create(empresa, titulo, descuento, tipo)", false, 9, -410, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "10", "retornarPromocion(promocion)", true, 10, -440, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e3, diag, "11", "Producto.objects.filter(id__in=productos_ids, empresa=empresa)", false, 11, -470, C_LINEA_NEGRO);
    crearMsgSeq(e3, ctrl, diag, "12", "retornarListaProductos(productos)", true, 12, -500, C_LINEA_NEGRO);

    // Fragmento loop: INICIA SOLO DESDE LA CLASE CONTROL (Backend: X=510 hasta X=1140)
    crearFragmento(pkg, diag, "[por cada producto en productos_ids]", "loop", 510, 1140, -525, -590);
    crearMsgSeq(ctrl, e2, diag, "13", "PromocionProducto.objects.bulk_create(items)", false, 13, -530, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e3, diag, "14", "sincronizar_descuentos_productos(productos)", false, 14, -560, C_LINEA_NEGRO);

    crearMsgSeq(ctrl, bnd2, diag, "15", "retornarPromocionCreada(promocion)", true, 15, -605, C_LINEA_NEGRO);
    crearMsgSeq(bnd2, act, diag, "16", "mostrarAlertaExito('Promoción creada')", true, 16, -635, C_LINEA_NEGRO);

    // --- FLUJO 3: Desactivar Promoción ---
    crearMsgSeq(act, bnd1, diag, "17", "actualizarEstadoPromocion(promo_id, activo=False)", false, 17, -680, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, ctrl, diag, "18", "inactivarPromocion(promo_id, activo=False)", false, 18, -710, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "19", "promocion.save(update_fields=['activo=False'])", false, 19, -740, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e4, diag, "20", "Categoria.objects.filter(activo=True)", false, 20, -770, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, bnd1, diag, "21", "retornarPromocionActualizada(promocion)", true, 21, -800, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, act, diag, "22", "actualizarFilaPromocionUI(promocion)", true, 22, -830, C_LINEA_NEGRO);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 5. SQ-CU17: Transmisiones en Vivo - Live Commerce
 * ============================================================================== */
function generarSQ_CU17(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU17 - Live Commerce", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("SQ-CU17 - Gestionar Live Commerce", "Sequence");
    diag.Update();

    var act   = crearLifeline(pkg, "Empresa / Anfitrion", "actor");
    var bnd1  = crearLifeline(pkg, "TransmitirLiveView", "boundary");
    var bnd2  = crearLifeline(pkg, "ChatYProductosLivePanel", "boundary");
    var ctrl1 = crearLifeline(pkg, "LiveRESTController", "control");
    var ctrl2 = crearLifeline(pkg, "LiveSignalingConsumer", "control");
    var e1    = crearLifeline(pkg, "LiveCommerceSesion", "entity");
    var e2    = crearLifeline(pkg, "LiveCommerceSesionProducto", "entity");
    var e3    = crearLifeline(pkg, "ComentarioLive", "entity");
    var e4    = crearLifeline(pkg, "Producto", "entity");

    colocarLifeline(diag, act,   60,  160, -30, -990, C_OBJ_BG);
    colocarLifeline(diag, bnd1,  210, 320, -30, -990, C_OBJ_BG);
    colocarLifeline(diag, bnd2,  370, 480, -30, -990, C_OBJ_BG);
    colocarLifeline(diag, ctrl1, 530, 640, -30, -990, C_OBJ_BG);
    colocarLifeline(diag, ctrl2, 690, 800, -30, -990, C_OBJ_BG);
    colocarLifeline(diag, e1,    850, 950, -30, -990, C_OBJ_BG);
    colocarLifeline(diag, e2,    1000, 1100, -30, -990, C_OBJ_BG);
    colocarLifeline(diag, e3,    1150, 1250, -30, -990, C_OBJ_BG);
    colocarLifeline(diag, e4,    1300, 1400, -30, -990, C_OBJ_BG);

    // --- FLUJO 1: Iniciar Transmisión en Vivo ---
    crearMsgSeq(act, bnd1, diag, "1", "iniciarTransmision(titulo, productos_ids)", false, 1, -120, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, ctrl1, diag, "2", "iniciarSesionLive(titulo, productos_ids)", false, 2, -160, C_LINEA_NEGRO);
    crearMsgSeq(ctrl1, e1, diag, "3", "LiveCommerceSesion.objects.create(empresa, titulo, estado='EN_VIVO')", false, 3, -200, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl1, diag, "4", "retornarSesionLive(sesion)", true, 4, -240, C_LINEA_NEGRO);
    crearMsgSeq(ctrl1, e2, diag, "5", "LiveCommerceSesionProducto.objects.bulk_create(productos)", false, 5, -280, C_LINEA_NEGRO);
    crearMsgSeq(ctrl1, bnd1, diag, "6", "retornarSesionLive(sesion)", true, 6, -310, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, act, diag, "7", "iniciarCamaraYMicrofonoWebRTC()", true, 7, -335, C_LINEA_NEGRO);

    // --- FLUJO 2: Enviar Mensaje de Chat (WebSocket Channels) ---
    crearMsgSeq(act, bnd2, diag, "8", "enviarMensajeChat(texto)", false, 8, -360, C_LINEA_NEGRO);
    crearMsgSeq(bnd2, ctrl2, diag, "9", "transmitirMensajeChat(texto)", false, 9, -390, C_LINEA_NEGRO);
    crearMsgSeq(ctrl2, e3, diag, "10", "ComentarioLive.objects.create(sesion=sesion, usuario=user, texto=texto)", false, 10, -420, C_LINEA_NEGRO);
    crearMsgSeq(e3, ctrl2, diag, "11", "retornarComentario(comentario)", true, 11, -450, C_LINEA_NEGRO);
    crearMsgSeq(ctrl2, bnd2, diag, "12", "difundirMensajeChat(payload)", true, 12, -480, C_LINEA_NEGRO);
    crearMsgSeq(bnd2, act, diag, "13", "agregarMensajeChatUI(comentario)", true, 13, -510, C_LINEA_NEGRO);

    // --- FLUJO 3: Fijar Producto Destacado (WebSocket) ---
    crearMsgSeq(act, bnd2, diag, "14", "fijarProductoDestacado(producto_id)", false, 14, -575, C_LINEA_NEGRO);
    crearMsgSeq(bnd2, ctrl2, diag, "15", "solicitarFijarProducto(producto_id)", false, 15, -605, C_LINEA_NEGRO);
    crearMsgSeq(ctrl2, e4, diag, "16", "get_object_or_404(Producto, id=producto_id)", false, 16, -635, C_LINEA_NEGRO);
    crearMsgSeq(e4, ctrl2, diag, "17", "retornarProducto(producto)", true, 17, -665, C_LINEA_NEGRO);
    crearMsgSeq(ctrl2, bnd2, diag, "18", "difundirProductoFijado(productoData)", true, 18, -695, C_LINEA_NEGRO);
    crearMsgSeq(bnd2, act, diag, "19", "mostrarBannerProductoFijado(producto)", true, 19, -725, C_LINEA_NEGRO);

    // --- FLUJO 4: Finalizar Transmisión ---
    crearMsgSeq(act, bnd1, diag, "20", "finalizarTransmision(live_id)", false, 20, -790, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, ctrl1, diag, "21", "cerrarSesionLive(live_id)", false, 21, -820, C_LINEA_NEGRO);
    crearMsgSeq(ctrl1, e1, diag, "22", "sesion.save(update_fields=['estado=FINALIZADA', 'fin=now()'])", false, 22, -850, C_LINEA_NEGRO);
    crearMsgSeq(ctrl1, bnd1, diag, "23", "retornarSesionFinalizada()", true, 23, -880, C_LINEA_NEGRO);
    crearMsgSeq(bnd1, act, diag, "24", "mostrarResumenMetricasLive(espectadores)", true, 24, -910, C_LINEA_NEGRO);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 6. SQ-CU23: Gestionar Notificaciones del Sistema
 * ============================================================================== */
function generarSQ_CU23(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU23 - Gestionar Notificaciones", "");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("SQ-CU23 - Gestionar Notificaciones", "Sequence");
    diag.Update();

    var act  = crearLifeline(pkg, "Comprador / Empresa", "actor");
    var bnd  = crearLifeline(pkg, "NotificationBellView", "boundary");
    var ctrl = crearLifeline(pkg, "NotificacionesController", "control");
    var e1   = crearLifeline(pkg, "Notificacion", "entity");
    var e2   = crearLifeline(pkg, "Usuario", "entity");

    colocarLifeline(diag, act,  60,  160, -30, -770, C_OBJ_BG);
    colocarLifeline(diag, bnd,  230, 340, -30, -770, C_OBJ_BG);
    colocarLifeline(diag, ctrl, 420, 530, -30, -770, C_OBJ_BG);
    colocarLifeline(diag, e1,   610, 720, -30, -770, C_OBJ_BG);
    colocarLifeline(diag, e2,   800, 910, -30, -770, C_OBJ_BG);

    // --- FLUJO 1: Consultar Notificaciones Pendientes ---
    crearMsgSeq(act, bnd, diag, "1", "abrirCampanaNotificaciones()", false, 1, -120, C_LINEA_NEGRO);
    crearMsgSeq(bnd, ctrl, diag, "2", "listarNotificaciones(usuario)", false, 2, -160, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "3", "Notificacion.objects.filter(usuario=user).order_by('-creado_en')", false, 3, -200, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "4", "retornarNotificacionesQS(notificaciones)", true, 4, -240, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, bnd, diag, "5", "retornarListaNotificaciones(notificaciones)", true, 5, -280, C_LINEA_NEGRO);
    crearMsgSeq(bnd, act, diag, "6", "renderizarBandejaAvisos(notificaciones)", true, 6, -320, C_LINEA_NEGRO);

    // --- FLUJO 2: Marcar Notificación como Leída (opt empieza en Interfaz bnd: left=210) ---
    crearMsgSeq(act, bnd, diag, "7", "clickNotificacion(notificacion_id)", false, 7, -350, C_LINEA_NEGRO);
    crearMsgSeq(bnd, ctrl, diag, "8", "marcarNotificacionLeida(notificacion_id)", false, 8, -380, C_LINEA_NEGRO);

    // Fragmento opt: INICIA DESDE LA CLASE INTERFAZ (Boundary: X=210 hasta X=930)
    crearFragmento(pkg, diag, "[notificación existente]", "opt", 210, 930, -390, -490);
    crearMsgSeq(ctrl, e1, diag, "9", "notificacion.save(update_fields=['leido=True'])", false, 9, -410, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "10", "retornarNotificacionActualizada(notificacion)", true, 10, -440, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e2, diag, "11", "get_object_or_404(Usuario, id=user_id)", false, 11, -470, C_LINEA_NEGRO);

    crearMsgSeq(ctrl, bnd, diag, "12", "retornarNotificacionLeida(notificacion)", true, 12, -510, C_LINEA_NEGRO);
    crearMsgSeq(bnd, act, diag, "13", "redirigirAEnlaceDestino(notificacion.enlace)", true, 13, -540, C_LINEA_NEGRO);

    // --- FLUJO 3: Marcar Todas como Leídas en Lote ---
    crearMsgSeq(act, bnd, diag, "14", "marcarTodasComoLeidas()", false, 14, -580, C_LINEA_NEGRO);
    crearMsgSeq(bnd, ctrl, diag, "15", "marcarTodasNotificacionesLeidas()", false, 15, -610, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "16", "Notificacion.objects.filter(usuario=user, leido=False).update(leido=True)", false, 16, -640, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, bnd, diag, "17", "retornarConfirmacionExito()", true, 17, -670, C_LINEA_NEGRO);
    crearMsgSeq(bnd, act, diag, "18", "actualizarBadgeContador(0)", true, 18, -700, C_LINEA_NEGRO);

    finalizarDiag(diag);
}

// ==============================================================================
// FUNCIONES AUXILIARES (LIFELINES, MENSAJES Y FRAGMENTOS)
// ==============================================================================

function crearLifeline(pkg, nombre, estereotipo) {
    var tipo = (estereotipo == "actor") ? "Actor" : "Sequence";
    var elem = pkg.Elements.AddNew(nombre, tipo);
    if (estereotipo != "actor" && estereotipo != "") {
        elem.Stereotype = estereotipo;
    }
    elem.Update();
    return elem;
}

function colocarLifeline(diag, elem, l, r, t, b, colorBGR) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diag.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.BackgroundColor = colorBGR;
    diagObj.Update();

    var sql = "UPDATE t_diagramobjects SET ObjectStyle = 'BCol=" + colorBGR + ";BFmt=0;' " +
              "WHERE Diagram_ID = " + diag.DiagramID + " AND Object_ID = " + elem.ElementID;
    Repository.Execute(sql);

    return diagObj;
}

function crearMsgSeq(src, dst, diag, seqStr, label, esRetorno, seqInt, yPos, colorLinea) {
    var msg = src.Connectors.AddNew(label, "Sequence");
    msg.SupplierID = dst.ElementID;
    msg.DiagramID = diag.DiagramID;
    msg.Direction = esRetorno ? "Destination -> Source" : "Source -> Destination";
    msg.Update();

    var msgId = msg.ConnectorID;
    var pdata1 = esRetorno ? "Return" : "Synchronous";
    var pdata3 = esRetorno ? "Return" : "Call";

    var sql = "UPDATE t_connector SET " +
              "SeqNo = " + seqInt + ", " +
              "PDATA1 = '" + pdata1 + "', " +
              "PDATA3 = '" + pdata3 + "', " +
              "PDATA4 = '" + seqStr + "', " +
              "PtStartY = " + yPos + ", " +
              "PtEndY = " + yPos + ", " +
              "RouteStyle = 3 " +
              "WHERE Connector_ID = " + msgId;
    Repository.Execute(sql);

    var dlink = diag.DiagramLinks.AddNew("", "");
    dlink.ConnectorID = msgId;
    dlink.Geometry = "SX=0;SY=0;EX=0;EY=0;EDGE=2;";
    dlink.Style = "Mode=1;Color=" + colorLinea + ";LWidth=0;";
    dlink.Update();

    return msgId;
}

function crearFragmento(pkg, diag, nombre, operador, left, right, top, bottom) {
    var frag = pkg.Elements.AddNew(nombre, "InteractionFragment");
    frag.Update();

    var fragId = frag.ElementID;
    var sqlObj = "UPDATE t_object SET PDATA1 = '" + operador + "', StyleEx = 'interactionOperator=" + operador + ";' " +
                 "WHERE Object_ID = " + fragId;
    Repository.Execute(sqlObj);

    frag = Repository.GetElementByID(fragId);

    var coords = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
    var diagObj = diag.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = fragId;
    diagObj.BackgroundColor = C_FRAG_BG;
    diagObj.Sequence = 1;
    diagObj.Update();

    var sqlDiag = "UPDATE t_diagramobjects SET Sequence = 1, ObjectStyle = 'BCol=" + C_FRAG_BG + ";BFmt=0;' " +
                  "WHERE Diagram_ID = " + diag.DiagramID + " AND Object_ID = " + fragId;
    Repository.Execute(sqlDiag);

    return frag;
}

function finalizarDiag(diag) {
    diag.DiagramLinks.Refresh();
    diag.DiagramObjects.Refresh();
    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

// ==============================================================================
// EJECUCIÓN INMEDIATA
// ==============================================================================
main();
