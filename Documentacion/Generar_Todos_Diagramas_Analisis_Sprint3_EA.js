/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: DIAGRAMAS DE ANÁLISIS DE CLASES (BCE) - SPRINT 3 (UML 2.5)
 * 
 * ALINEACIÓN 100% LITERAL CON EL MODELO CONCEPTUAL OFICIAL:
 *   - Nombres y orden exacto de atributos (comenzando por 'id'):
 *     * EMPRESA: id, razon_social, nit, slug, logo_url, color_marca, descripcion, ubicacion, departamento, ciudad, estado, fecha_registro
 *     * USUARIO: id, email, password_hash, nombre, apellido, telefono, rol, estado, fecha_registro, ultimo_login
 *     * EMPLEADO: id, cargo, fecha_ingreso, estado
 *     * PERMISO: id, codigo, descripcion
 *     * PEDIDO: id, numero_pedido, subtotal, comision_monto, estado, modalidad_entrega, fecha_pedido
 *     * ENTREGA: id, estado, fecha_estimada, fecha_entregada
 *     * SUCURSAL: id, nombre, direccion_texto, ubicacion, telefono, estado
 *     * DIRECCION: id, alias, direccion_texto, ubicacion, departamento, ciudad, es_predeterminada
 *     * ORDEN_COMPRA: id, monto_total, metodo_pago, estado_pago, fecha
 *     * PAGO: id, monto, metodo, referencia_pasarela, estado, fecha_pago
 *     * PEDIDO_ITEM: id, cantidad, precio_unitario, subtotal
 *     * PRODUCTO: id, nombre, descripcion, sku, precio, precio_descuento, estado, fecha_creacion, fecha_actualizacion
 *     * CATEGORIA: id, nombre, descripcion, icono
 *     * PROMOCION: id, nombre, tipo, valor, fecha_inicio, fecha_fin, estado
 *     * LIVE_COMMERCE_SESION: id, titulo, url_stream, estado, fecha_inicio, fecha_fin
 *     * COMENTARIO_LIVE: id, texto, fecha_hora
 *     * COMPRADOR: id, ubicacion_default, departamento
 *     * NOTIFICACION: id, tipo, titulo, mensaje, enlace, leido, fecha_creacion
 *   - Posición explícita (a.Pos = i, m.Pos = j) para ordenamiento estricto.
 *   - MÉTODOS DE DOMINIO EN ENTIDADES («Model»): Nombres limpios sin parámetros redundantes para evitar paréntesis dobles.
 *   - CERO LOGAUDITORIA: La bitácora transaccional no pertenece al diagrama de análisis de clases.
 *   - Controlador («CC») conectado ÚNICAMENTE a la Entidad Principal del caso de uso.
 * ==============================================================================
 */

function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMAS DE ANÁLISIS DE CLASES (BCE) - SPRINT 3 ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var rootPkg = currentPackage.Packages.AddNew("Diagramas de Analisis (BCE) - Sprint 3", "");
    rootPkg.Update();

    Repository.WriteOutput("Script", "[1/6] Generando ANL-CU09: Gestionar Empleados y Permisos...", 0);
    generarAnalisisCU09(rootPkg);

    Repository.WriteOutput("Script", "[2/6] Generando ANL-CU12: Gestionar Pedidos y Ventas...", 0);
    generarAnalisisCU12(rootPkg);

    Repository.WriteOutput("Script", "[3/6] Generando ANL-CU13: Gestionar Entregas...", 0);
    generarAnalisisCU13(rootPkg);

    Repository.WriteOutput("Script", "[4/6] Generando ANL-CU16: Gestionar Promociones y Descuentos...", 0);
    generarAnalisisCU16(rootPkg);

    Repository.WriteOutput("Script", "[5/6] Generando ANL-CU17: Live Commerce y Streaming...", 0);
    generarAnalisisCU17(rootPkg);

    Repository.WriteOutput("Script", "[6/6] Generando ANL-CU23: Gestionar Notificaciones del Sistema...", 0);
    generarAnalisisCU23(rootPkg);

    rootPkg.Packages.Refresh();
    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] TODOS LOS DIAGRAMAS DE ANÁLISIS GENERADOS EXITOSAMENTE ===", 0);
    Session.Prompt("¡Los 6 Diagramas de Análisis de Clases (con atributos ordenados e inclusión de métodos en entidades) han sido generados exitosamente!", 0);
}

/* ==============================================================================
 * 1. ANL-CU09: Gestionar Empleados y Permisos
 * ============================================================================== */
function generarAnalisisCU09(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("ANL-CU09 - Gestionar Empleados y Permisos", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("CU09. Gestionar Empleados y Permisos", "Class");
    diag.Update();

    var act = pkg.Elements.AddNew("Emprendedor", "Actor"); act.Update();

    var ui = crearClase(pkg, "MisEmpleados", "UI", [
        ["empleados", "Array<Empleado>"],
        ["form", "Object"],
        ["mostrarForm", "Boolean"],
        ["permisos", "Array<Permiso>"]
    ], [
        ["cargar", "void"],
        ["crearEmpleado", "void"],
        ["toggleEstado", "void"],
        ["togglePermiso", "void"]
    ]);

    var ctrl = crearClase(pkg, "UsuariosViews", "CC", [], [
        ["CrearEmpleadoView_create", "Response"],
        ["DesactivarEmpleadoView_post", "Response"],
        ["PermisoEmpleadoPropioView_delete", "Response"],
        ["PermisoEmpleadoPropioView_post", "Response"]
    ]);

    // Entidad Principal: EMPLEADO (con métodos de negocio limpios)
    var eEmp = crearClase(pkg, "Empleado", "Model", [
        ["id", "BIGSERIAL"],
        ["cargo", "VARCHAR(60)"],
        ["fecha_ingreso", "TIMESTAMP"],
        ["estado", "VARCHAR(20)"]
    ], [
        ["asignarPermiso", "void"],
        ["desactivar", "void"],
        ["obtenerPermisos", "Array<Permiso>"]
    ]);

    // EMPRESA
    var eEmpresa = crearClase(pkg, "Empresa", "Model", [
        ["id", "BIGSERIAL"],
        ["razon_social", "VARCHAR(150)"],
        ["nit", "VARCHAR(30)"],
        ["slug", "VARCHAR(150)"],
        ["logo_url", "VARCHAR(255)"],
        ["color_marca", "VARCHAR(20)"],
        ["descripcion", "TEXT"],
        ["ubicacion", "VARCHAR(255)"],
        ["departamento", "VARCHAR(100)"],
        ["ciudad", "VARCHAR(100)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_registro", "TIMESTAMP"]
    ], [
        ["registrarEmpleado", "Empleado"],
        ["listarEmpleados", "Array<Empleado>"]
    ]);

    // USUARIO
    var eUsuario = crearClase(pkg, "Usuario", "Model", [
        ["id", "BIGSERIAL"],
        ["email", "VARCHAR(150)"],
        ["password_hash", "VARCHAR(255)"],
        ["nombre", "VARCHAR(100)"],
        ["apellido", "VARCHAR(100)"],
        ["telefono", "VARCHAR(20)"],
        ["rol", "VARCHAR(20)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_registro", "TIMESTAMP"],
        ["ultimo_login", "TIMESTAMP"]
    ], [
        ["autenticar", "Boolean"],
        ["getNombreCompleto", "String"]
    ]);

    var eEmpPerm = crearClase(pkg, "EmpleadoPermiso", "Model", [
        ["id", "BIGSERIAL"],
        ["empleado_id", "BIGINT"],
        ["permiso_id", "INTEGER"]
    ], [
        ["activar", "void"],
        ["revocar", "void"]
    ]);

    // PERMISO
    var ePerm = crearClase(pkg, "Permiso", "Model", [
        ["id", "SERIAL"],
        ["codigo", "VARCHAR(50)"],
        ["descripcion", "VARCHAR(200)"]
    ], [
        ["validarCodigo", "Boolean"]
    ]);

    // Posicionamiento amplio y proporcionado
    pos(diag, act, 60, 130, 290, 390);
    pos(diag, ui, 180, 410, 180, 430);
    pos(diag, ctrl, 460, 820, 200, 410);
    pos(diag, eEmp, 890, 1120, 200, 410);       // Entidad Principal (altura 210)
    pos(diag, eEmpresa, 890, 1140, -100, 160);  // Arriba (altura 260)
    pos(diag, eUsuario, 890, 1140, 450, 710);   // Abajo (altura 260)
    pos(diag, eEmpPerm, 1200, 1420, 200, 350);  // Derecha (altura 150)
    pos(diag, ePerm, 1200, 1420, 400, 540);     // Abajo de EmpleadoPermiso (altura 140)

    // Conexiones de control
    conectarSimple(act, ui);
    conectarSimple(ui, ctrl);
    conectarSimple(ctrl, eEmp);                 // Controller conecta ÚNICAMENTE a Empleado

    // Relaciones del Modelo Conceptual Oficial
    conectarRelacion(eEmpresa, eEmp, "trabaja", "1..1", "0..*");
    conectarRelacion(eUsuario, eEmp, "tiene", "1..1", "0..1");
    conectarRelacion(eEmp, eEmpPerm, "posee", "1..1", "1..*");
    conectarRelacion(eEmpPerm, ePerm, "corresponde_a", "0..*", "1..1");

    finalizar(diag);
}

/* ==============================================================================
 * 2. ANL-CU12: Gestionar Pedidos y Ventas
 * ============================================================================== */
function generarAnalisisCU12(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("ANL-CU12 - Gestionar Pedidos y Ventas", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("CU12. Gestionar Pedidos y Ventas", "Class");
    diag.Update();

    var act = pkg.Elements.AddNew("Emprendedor", "Actor"); act.Update();

    var ui = crearClase(pkg, "PedidosVentasUI", "UI", [
        ["filtroEstado", "String"],
        ["modalDetalle", "Boolean"],
        ["pedidoSeleccionado", "Pedido"],
        ["pedidos", "Array<Pedido>"]
    ], [
        ["cambiarEstado", "void"],
        ["cargarPedidos", "void"],
        ["filtrarPorEstado", "void"],
        ["verDetalle", "void"]
    ]);

    var ctrl = crearClase(pkg, "PedidosViews", "CC", [], [
        ["ComprobanteDigitalView_get", "Response"],
        ["DetallePedidoView_get", "Response"],
        ["EditarEliminarMiPedidoView_patch", "Response"],
        ["ListaMisPedidosView_get", "Response"]
    ]);

    // PEDIDO (con métodos de dominio)
    var ePed = crearClase(pkg, "Pedido", "Model", [
        ["id", "BIGSERIAL"],
        ["numero_pedido", "VARCHAR(30)"],
        ["subtotal", "DECIMAL(10,2)"],
        ["comision_monto", "DECIMAL(10,2)"],
        ["estado", "VARCHAR(20)"],
        ["modalidad_entrega", "VARCHAR(20)"],
        ["fecha_pedido", "TIMESTAMP"]
    ], [
        ["confirmar", "void"],
        ["avanzarEstado", "void"],
        ["calcularTotal", "Decimal"]
    ]);

    // EMPRESA
    var eEmpresa = crearClase(pkg, "Empresa", "Model", [
        ["id", "BIGSERIAL"],
        ["razon_social", "VARCHAR(150)"],
        ["nit", "VARCHAR(30)"],
        ["slug", "VARCHAR(150)"],
        ["logo_url", "VARCHAR(255)"],
        ["color_marca", "VARCHAR(20)"],
        ["descripcion", "TEXT"],
        ["ubicacion", "VARCHAR(255)"],
        ["departamento", "VARCHAR(100)"],
        ["ciudad", "VARCHAR(100)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_registro", "TIMESTAMP"]
    ], [
        ["listarPedidos", "Array<Pedido>"]
    ]);

    // ORDEN_COMPRA
    var eOrden = crearClase(pkg, "OrdenCompra", "Model", [
        ["id", "BIGSERIAL"],
        ["monto_total", "DECIMAL(10,2)"],
        ["metodo_pago", "VARCHAR(20)"],
        ["estado_pago", "VARCHAR(20)"],
        ["fecha", "TIMESTAMP"]
    ], [
        ["dividirPorEmpresas", "Array<Pedido>"],
        ["verificarPago", "Boolean"]
    ]);

    // PEDIDO_ITEM
    var eItem = crearClase(pkg, "PedidoItem", "Model", [
        ["id", "BIGSERIAL"],
        ["cantidad", "INTEGER"],
        ["precio_unitario", "DECIMAL(10,2)"],
        ["subtotal", "DECIMAL(10,2)"]
    ], [
        ["calcularSubtotal", "Decimal"],
        ["verificarStock", "Boolean"]
    ]);

    // PRODUCTO
    var eProd = crearClase(pkg, "Producto", "Model", [
        ["id", "BIGSERIAL"],
        ["nombre", "VARCHAR(150)"],
        ["descripcion", "TEXT"],
        ["sku", "VARCHAR(50)"],
        ["precio", "DECIMAL(10,2)"],
        ["precio_descuento", "DECIMAL(10,2)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_creacion", "TIMESTAMP"],
        ["fecha_actualizacion", "TIMESTAMP"]
    ], [
        ["descontarStock", "Boolean"],
        ["reponerStock", "void"]
    ]);

    // PAGO
    var ePago = crearClase(pkg, "Pago", "Model", [
        ["id", "BIGSERIAL"],
        ["monto", "DECIMAL(10,2)"],
        ["metodo", "VARCHAR(20)"],
        ["referencia_pasarela", "VARCHAR(100)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_pago", "TIMESTAMP"]
    ], [
        ["aprobar", "void"],
        ["rechazar", "void"]
    ]);

    // Posicionamiento amplio y sin solapamiento
    pos(diag, act, 60, 130, 290, 390);
    pos(diag, ui, 180, 410, 190, 430);
    pos(diag, ctrl, 460, 820, 210, 410);
    pos(diag, ePed, 890, 1130, 200, 460);      // Entidad Principal (altura 260)
    pos(diag, eEmpresa, 890, 1140, -100, 160); // Arriba (altura 260)
    pos(diag, eOrden, 1200, 1430, 20, 230);    // Derecha-Arriba (altura 210)
    pos(diag, ePago, 1490, 1720, 20, 230);     // Extremo Derecha (altura 210)
    pos(diag, eItem, 1200, 1440, 270, 440);    // Derecha (altura 170)
    pos(diag, eProd, 1200, 1440, 480, 740);    // Abajo de PedidoItem (altura 260)

    // Conexiones de control
    conectarSimple(act, ui);
    conectarSimple(ui, ctrl);
    conectarSimple(ctrl, ePed);                // Controller conecta ÚNICAMENTE a Pedido

    // Relaciones del Modelo Conceptual Oficial
    conectarRelacion(eEmpresa, ePed, "recibe", "1..1", "0..*");
    conectarRelacion(eOrden, ePed, "divide", "1..1", "1..*");
    conectarRelacion(eOrden, ePago, "pertenece", "1..1", "1..*");
    conectarRelacion(ePed, eItem, "tiene", "1..1", "1..*");
    conectarRelacion(eItem, eProd, "contiene", "0..*", "1..1");

    finalizar(diag);
}

/* ==============================================================================
 * 3. ANL-CU13: Gestionar Entregas y Logística
 * ============================================================================== */
function generarAnalisisCU13(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("ANL-CU13 - Gestionar Entregas", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("CU13. Gestionar Entregas", "Class");
    diag.Update();

    var act = pkg.Elements.AddNew("Repartidor", "Actor"); act.Update();

    var ui = crearClase(pkg, "EntregasDespachoUI", "UI", [
        ["entregaActiva", "Entrega"],
        ["entregas", "Array<Entrega>"],
        ["estadoFiltro", "String"],
        ["rutaGPS", "Object"]
    ], [
        ["actualizarUbicacion", "void"],
        ["confirmarEntrega", "void"],
        ["iniciarDespacho", "void"],
        ["listarEntregas", "void"]
    ]);

    var ctrl = crearClase(pkg, "EntregasViews", "CC", [], [
        ["EditarEliminarMiEntregaView_patch", "Response"],
        ["ListaMisEntregasView_get", "Response"],
        ["MarcarMiEntregaEntregadaView_post", "Response"]
    ]);

    // ENTREGA (con métodos de dominio)
    var eEnt = crearClase(pkg, "Entrega", "Model", [
        ["id", "BIGSERIAL"],
        ["estado", "VARCHAR(20)"],
        ["fecha_estimada", "DATE"],
        ["fecha_entregada", "TIMESTAMP"]
    ], [
        ["iniciarDespacho", "void"],
        ["marcarEntregada", "void"],
        ["registrarFirma", "Boolean"]
    ]);

    // PEDIDO
    var ePed = crearClase(pkg, "Pedido", "Model", [
        ["id", "BIGSERIAL"],
        ["numero_pedido", "VARCHAR(30)"],
        ["subtotal", "DECIMAL(10,2)"],
        ["comision_monto", "DECIMAL(10,2)"],
        ["estado", "VARCHAR(20)"],
        ["modalidad_entrega", "VARCHAR(20)"],
        ["fecha_pedido", "TIMESTAMP"]
    ], [
        ["marcarEnviado", "void"],
        ["marcarEntregado", "void"],
        ["getModalidad", "String"]
    ]);

    // SUCURSAL
    var eSuc = crearClase(pkg, "Sucursal", "Model", [
        ["id", "BIGSERIAL"],
        ["nombre", "VARCHAR(100)"],
        ["direccion_texto", "VARCHAR(200)"],
        ["ubicacion", "VARCHAR(255)"],
        ["telefono", "VARCHAR(20)"],
        ["estado", "VARCHAR(20)"]
    ], [
        ["validarHorarioAtencion", "Boolean"],
        ["verificarDisponibilidad", "Boolean"]
    ]);

    // DIRECCION
    var eDir = crearClase(pkg, "Direccion", "Model", [
        ["id", "BIGSERIAL"],
        ["alias", "VARCHAR(50)"],
        ["direccion_texto", "VARCHAR(255)"],
        ["ubicacion", "VARCHAR(255)"],
        ["departamento", "VARCHAR(100)"],
        ["ciudad", "VARCHAR(100)"],
        ["es_predeterminada", "BOOLEAN"]
    ], [
        ["getDireccionCompleta", "String"],
        ["validarUbicacionGPS", "Boolean"]
    ]);

    // Posicionamiento amplio y sin solapamiento
    pos(diag, act, 60, 130, 290, 390);
    pos(diag, ui, 180, 410, 190, 430);
    pos(diag, ctrl, 460, 820, 210, 400);
    pos(diag, eEnt, 890, 1120, 220, 410);      // Entidad Principal (altura 190)
    pos(diag, ePed, 890, 1130, -30, 200);      // Pedido (Arriba de Entrega, altura 230)
    pos(diag, eSuc, 1200, 1430, -30, 190);     // Sucursal (Derecha de Pedido, altura 220)
    pos(diag, eDir, 1200, 1430, 220, 460);     // Direccion (Derecha de Entrega, altura 240)

    // Conexiones de control
    conectarSimple(act, ui);
    conectarSimple(ui, ctrl);
    conectarSimple(ctrl, eEnt);                // Controller conecta ÚNICAMENTE a Entrega

    // Relaciones del Modelo Conceptual Oficial
    conectarRelacion(ePed, eEnt, "realiza", "1..1", "0..1");
    conectarRelacion(ePed, eSuc, "recoje", "0..*", "0..1");
    conectarRelacion(ePed, eDir, "destino", "0..*", "0..1");

    finalizar(diag);
}

/* ==============================================================================
 * 4. ANL-CU16: Gestionar Promociones y Descuentos
 * ============================================================================== */
function generarAnalisisCU16(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("ANL-CU16 - Gestionar Promociones y Descuentos", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("CU16. Gestionar Promociones y Descuentos", "Class");
    diag.Update();

    var act = pkg.Elements.AddNew("Emprendedor", "Actor"); act.Update();

    var ui = crearClase(pkg, "PromocionesUI", "UI", [
        ["catalogoProductos", "Array<Producto>"],
        ["formPromo", "Object"],
        ["modalCrear", "Boolean"],
        ["promociones", "Array<Promocion>"]
    ], [
        ["asociarProductos", "void"],
        ["crearPromocion", "void"],
        ["listarPromociones", "void"],
        ["toggleEstado", "void"]
    ]);

    var ctrl = crearClase(pkg, "PromocionesViews", "CC", [], [
        ["CrearPromocionEmpresaView_post", "Response"],
        ["DesactivarPromocionEmpresaView_post", "Response"],
        ["EditarEliminarPromocionEmpresaView_patch", "Response"],
        ["ListaPromocionesEmpresaView_get", "Response"]
    ]);

    // PROMOCION (con métodos de dominio)
    var ePro = crearClase(pkg, "Promocion", "Model", [
        ["id", "BIGSERIAL"],
        ["nombre", "VARCHAR(150)"],
        ["tipo", "VARCHAR(20)"],
        ["valor", "DECIMAL(10,2)"],
        ["fecha_inicio", "DATE"],
        ["fecha_fin", "DATE"],
        ["estado", "VARCHAR(20)"]
    ], [
        ["activar", "void"],
        ["desactivar", "void"],
        ["esVigente", "Boolean"],
        ["calcularDescuento", "Decimal"]
    ]);

    // EMPRESA
    var eEmpresa = crearClase(pkg, "Empresa", "Model", [
        ["id", "BIGSERIAL"],
        ["razon_social", "VARCHAR(150)"],
        ["nit", "VARCHAR(30)"],
        ["slug", "VARCHAR(150)"],
        ["logo_url", "VARCHAR(255)"],
        ["color_marca", "VARCHAR(20)"],
        ["descripcion", "TEXT"],
        ["ubicacion", "VARCHAR(255)"],
        ["departamento", "VARCHAR(100)"],
        ["ciudad", "VARCHAR(100)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_registro", "TIMESTAMP"]
    ], [
        ["crearPromocion", "Promocion"]
    ]);

    var eProProd = crearClase(pkg, "PromocionProducto", "Model", [
        ["id", "BIGSERIAL"],
        ["promocion_id", "BIGINT"],
        ["producto_id", "BIGINT"]
    ], [
        ["fijarPrecioPromocional", "void"]
    ]);

    // PRODUCTO
    var eProd = crearClase(pkg, "Producto", "Model", [
        ["id", "BIGSERIAL"],
        ["nombre", "VARCHAR(150)"],
        ["descripcion", "TEXT"],
        ["sku", "VARCHAR(50)"],
        ["precio", "DECIMAL(10,2)"],
        ["precio_descuento", "DECIMAL(10,2)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_creacion", "TIMESTAMP"],
        ["fecha_actualizacion", "TIMESTAMP"]
    ], [
        ["aplicarDescuento", "void"],
        ["restaurarPrecioBase", "void"]
    ]);

    // CATEGORIA
    var eCat = crearClase(pkg, "Categoria", "Model", [
        ["id", "BIGSERIAL"],
        ["nombre", "VARCHAR(100)"],
        ["descripcion", "VARCHAR(255)"],
        ["icono", "VARCHAR(100)"]
    ], [
        ["getProductosActivos", "Array<Producto>"]
    ]);

    // Posicionamiento amplio y sin solapamiento
    pos(diag, act, 60, 130, 290, 390);
    pos(diag, ui, 180, 410, 190, 430);
    pos(diag, ctrl, 460, 820, 210, 410);
    pos(diag, ePro, 890, 1130, 200, 440);      // Entidad Principal (altura 240)
    pos(diag, eEmpresa, 890, 1140, -100, 160); // Arriba (altura 260)
    pos(diag, eProProd, 1200, 1430, 190, 330); // Derecha (altura 140)
    pos(diag, eProd, 1200, 1440, 370, 640);    // Abajo de PromocionProducto (altura 270)
    pos(diag, eCat, 1500, 1710, 370, 540);     // Extremo Derecha (altura 170)

    // Conexiones de control
    conectarSimple(act, ui);
    conectarSimple(ui, ctrl);
    conectarSimple(ctrl, ePro);                // Controller conecta ÚNICAMENTE a Promocion

    // Relaciones del Modelo Conceptual Oficial
    conectarRelacion(eEmpresa, ePro, "crea", "1..1", "0..*");
    conectarRelacion(ePro, eProProd, "aplica", "1..1", "1..*");
    conectarRelacion(eProProd, eProd, "corresponde", "0..*", "1..1");
    conectarRelacion(eCat, eProd, "pertenece", "1..1", "0..*");

    finalizar(diag);
}

/* ==============================================================================
 * 5. ANL-CU17: Transmisiones en Vivo (Live Commerce)
 * ============================================================================== */
function generarAnalisisCU17(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("ANL-CU17 - Live Commerce y Streaming", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("CU17. Live Commerce y Streaming", "Class");
    diag.Update();

    var act = pkg.Elements.AddNew("Emprendedor", "Actor"); act.Update();

    var ui = crearClase(pkg, "LiveCommerceStudioUI", "UI", [
        ["chatMensajes", "Array<ComentarioLive>"],
        ["productosFijados", "Array<Producto>"],
        ["sesionActiva", "LiveCommerceSesion"],
        ["visorStreamUrl", "String"]
    ], [
        ["enviarMensajeChat", "void"],
        ["fijarProducto", "void"],
        ["finalizarLive", "void"],
        ["iniciarLive", "void"]
    ]);

    var ctrl = crearClase(pkg, "LiveCommerceViews", "CC", [], [
        ["EnviarComentarioLiveView_post", "Response"],
        ["FijarProductoLiveView_post", "Response"],
        ["FinalizarSesionLiveView_post", "Response"],
        ["IniciarSesionLiveView_post", "Response"]
    ]);

    // LIVE_COMMERCE_SESION (con métodos de dominio)
    var eLive = crearClase(pkg, "LiveCommerceSesion", "Model", [
        ["id", "BIGSERIAL"],
        ["titulo", "VARCHAR(150)"],
        ["url_stream", "VARCHAR(255)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_inicio", "TIMESTAMP"],
        ["fecha_fin", "TIMESTAMP"]
    ], [
        ["iniciarStream", "void"],
        ["finalizarStream", "void"],
        ["anclarProducto", "void"]
    ]);

    // EMPRESA
    var eEmpresa = crearClase(pkg, "Empresa", "Model", [
        ["id", "BIGSERIAL"],
        ["razon_social", "VARCHAR(150)"],
        ["nit", "VARCHAR(30)"],
        ["slug", "VARCHAR(150)"],
        ["logo_url", "VARCHAR(255)"],
        ["color_marca", "VARCHAR(20)"],
        ["descripcion", "TEXT"],
        ["ubicacion", "VARCHAR(255)"],
        ["departamento", "VARCHAR(100)"],
        ["ciudad", "VARCHAR(100)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_registro", "TIMESTAMP"]
    ], [
        ["programarSesionLive", "LiveCommerceSesion"]
    ]);

    var eLiveProd = crearClase(pkg, "LiveCommerceSesionProducto", "Model", [
        ["id", "BIGSERIAL"],
        ["sesion_id", "BIGINT"],
        ["producto_id", "BIGINT"]
    ], [
        ["fijarEnPantalla", "void"],
        ["desfijar", "void"]
    ]);

    // PRODUCTO
    var eProd = crearClase(pkg, "Producto", "Model", [
        ["id", "BIGSERIAL"],
        ["nombre", "VARCHAR(150)"],
        ["descripcion", "TEXT"],
        ["sku", "VARCHAR(50)"],
        ["precio", "DECIMAL(10,2)"],
        ["precio_descuento", "DECIMAL(10,2)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_creacion", "TIMESTAMP"],
        ["fecha_actualizacion", "TIMESTAMP"]
    ], [
        ["consultarStockLive", "Integer"]
    ]);

    // COMENTARIO_LIVE
    var eCom = crearClase(pkg, "ComentarioLive", "Model", [
        ["id", "BIGSERIAL"],
        ["texto", "VARCHAR(255)"],
        ["fecha_hora", "TIMESTAMP"]
    ], [
        ["moderar", "void"],
        ["marcarDestacado", "void"]
    ]);

    // COMPRADOR
    var eComprador = crearClase(pkg, "Comprador", "Model", [
        ["id", "BIGSERIAL"],
        ["ubicacion_default", "VARCHAR(200)"],
        ["departamento", "VARCHAR(100)"]
    ], [
        ["emitirComentario", "ComentarioLive"]
    ]);

    // Posicionamiento amplio y sin solapamiento
    pos(diag, act, 60, 130, 290, 390);
    pos(diag, ui, 180, 410, 190, 430);
    pos(diag, ctrl, 460, 820, 210, 410);
    pos(diag, eLive, 890, 1130, 200, 430);     // Entidad Principal (altura 230)
    pos(diag, eEmpresa, 890, 1140, -100, 160); // Arriba (altura 260)
    pos(diag, eLiveProd, 1200, 1430, 100, 230);// Derecha-Arriba (altura 130)
    pos(diag, eProd, 1490, 1720, 100, 370);    // Extremo Derecha (altura 270)
    pos(diag, eCom, 1200, 1430, 270, 410);     // Derecha (altura 140)
    pos(diag, eComprador, 1200, 1430, 450, 580);// Abajo de Comentario (altura 130)

    // Conexiones de control
    conectarSimple(act, ui);
    conectarSimple(ui, ctrl);
    conectarSimple(ctrl, eLive);               // Controller conecta ÚNICAMENTE a LiveCommerceSesion

    // Relaciones del Modelo Conceptual Oficial
    conectarRelacion(eEmpresa, eLive, "transmite", "1..1", "0..*");
    conectarRelacion(eLive, eLiveProd, "fija", "1..1", "0..*");
    conectarRelacion(eLiveProd, eProd, "exhibe", "0..*", "1..1");
    conectarRelacion(eLive, eCom, "recibe", "1..1", "0..*");
    conectarRelacion(eComprador, eCom, "escribe", "1..1", "0..*");

    finalizar(diag);
}

/* ==============================================================================
 * 6. ANL-CU23: Gestionar Notificaciones del Sistema
 * ============================================================================== */
function generarAnalisisCU23(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("ANL-CU23 - Gestionar Notificaciones del Sistema", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("CU23. Gestionar Notificaciones del Sistema", "Class");
    diag.Update();

    var act = pkg.Elements.AddNew("Comprador", "Actor"); act.Update();

    var ui = crearClase(pkg, "CentroNotificacionesUI", "UI", [
        ["filtroTipo", "String"],
        ["noLeidasCount", "Integer"],
        ["notificaciones", "Array<Notificacion>"],
        ["panelAbierto", "Boolean"]
    ], [
        ["cargarNotificaciones", "void"],
        ["eliminarNotificacion", "void"],
        ["marcarComoLeida", "void"],
        ["marcarTodasLeidas", "void"]
    ]);

    var ctrl = crearClase(pkg, "NotificacionesViews", "CC", [], [
        ["EliminarNotificacionView_delete", "Response"],
        ["ListaNotificacionesUsuarioView_get", "Response"],
        ["MarcarNotificacionLeidaView_patch", "Response"],
        ["MarcarTodasLeidasView_post", "Response"]
    ]);

    // NOTIFICACION (con métodos de dominio)
    var eNot = crearClase(pkg, "Notificacion", "Model", [
        ["id", "BIGSERIAL"],
        ["tipo", "VARCHAR(30)"],
        ["titulo", "VARCHAR(150)"],
        ["mensaje", "TEXT"],
        ["enlace", "VARCHAR(255)"],
        ["leido", "BOOLEAN"],
        ["fecha_creacion", "TIMESTAMP"]
    ], [
        ["marcarComoLeida", "void"],
        ["enviarPush", "Boolean"],
        ["getTiempoTranscurrido", "String"]
    ]);

    // USUARIO
    var eUsuario = crearClase(pkg, "Usuario", "Model", [
        ["id", "BIGSERIAL"],
        ["email", "VARCHAR(150)"],
        ["password_hash", "VARCHAR(255)"],
        ["nombre", "VARCHAR(100)"],
        ["apellido", "VARCHAR(100)"],
        ["telefono", "VARCHAR(20)"],
        ["rol", "VARCHAR(20)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_registro", "TIMESTAMP"],
        ["ultimo_login", "TIMESTAMP"]
    ], [
        ["getNoLeidasCount", "Integer"],
        ["limpiarNotificaciones", "void"]
    ]);

    // EMPRESA
    var eEmpresa = crearClase(pkg, "Empresa", "Model", [
        ["id", "BIGSERIAL"],
        ["razon_social", "VARCHAR(150)"],
        ["nit", "VARCHAR(30)"],
        ["slug", "VARCHAR(150)"],
        ["logo_url", "VARCHAR(255)"],
        ["color_marca", "VARCHAR(20)"],
        ["descripcion", "TEXT"],
        ["ubicacion", "VARCHAR(255)"],
        ["departamento", "VARCHAR(100)"],
        ["ciudad", "VARCHAR(100)"],
        ["estado", "VARCHAR(20)"],
        ["fecha_registro", "TIMESTAMP"]
    ], [
        ["emitirNotificacionMasiva", "void"]
    ]);

    // Posicionamiento amplio y sin solapamiento
    pos(diag, act, 60, 160, 270, 370);
    pos(diag, ui, 200, 430, 190, 420);
    pos(diag, ctrl, 480, 840, 210, 400);
    pos(diag, eNot, 900, 1150, 190, 440);      // Entidad Principal (altura 250)
    pos(diag, eUsuario, 1220, 1450, 190, 450); // Derecha (altura 260)
    pos(diag, eEmpresa, 900, 1150, -100, 160); // Arriba (altura 260)

    // Conexiones de control
    conectarSimple(act, ui);
    conectarSimple(ui, ctrl);
    conectarSimple(ctrl, eNot);                // Controller conecta ÚNICAMENTE a Notificacion

    // Relaciones del Modelo Conceptual Oficial
    conectarRelacion(eUsuario, eNot, "notifica", "1..1", "0..*");
    conectarRelacion(eEmpresa, eNot, "administra", "1..1", "0..*");

    finalizar(diag);
}

// -----------------------------------------------------------------------------
// UTILIDADES PARA CREACIÓN DE TABLAS DE ANÁLISIS EN ENTERPRISE ARCHITECT
// -----------------------------------------------------------------------------
function crearClase(pkg, nombre, estereotipo, atributos, metodos) {
    var c = pkg.Elements.AddNew(nombre, "Class");
    if (estereotipo && estereotipo.length > 0) {
        c.Stereotype = estereotipo;
    }
    c.Update();

    // Inserción secuencial con asignación explícita de Pos para preservar el orden estricto (id primero)
    for (var i = 0; i < atributos.length; i++) {
        var a = c.Attributes.AddNew(atributos[i][0], atributos[i][1]);
        a.Pos = i;
        a.Visibility = "Public";
        a.Update();
    }

    if (metodos && metodos.length > 0) {
        for (var j = 0; j < metodos.length; j++) {
            var m = c.Methods.AddNew(metodos[j][0], metodos[j][1]);
            m.Pos = j;
            m.Visibility = "Public";
            m.Update();
        }
    }

    c.Attributes.Refresh();
    c.Methods.Refresh();
    c.Update();
    return c;
}

function pos(diag, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + (-t) + ";b=" + (-b) + ";";
    var dObj = diag.DiagramObjects.AddNew(coords, "");
    dObj.ElementID = elem.ElementID;
    dObj.Update();
    return dObj;
}

function conectarSimple(src, dst) {
    var a = src.Connectors.AddNew("", "Association");
    a.SupplierID = dst.ElementID;
    a.Direction = "Unspecified";
    a.Update();
    src.Connectors.Refresh();
    return a;
}

function conectarRelacion(src, dst, nombreRel, cardSrc, cardDst) {
    var a = src.Connectors.AddNew(nombreRel, "Association");
    a.SupplierID = dst.ElementID;
    a.Direction = "Unspecified";
    if (cardSrc && cardSrc.length > 0) {
        a.ClientEnd.Cardinality = cardSrc;
        a.ClientEnd.Update();
    }
    if (cardDst && cardDst.length > 0) {
        a.SupplierEnd.Cardinality = cardDst;
        a.SupplierEnd.Update();
    }
    a.Update();
    src.Connectors.Refresh();
    return a;
}

function finalizar(diag) {
    diag.DiagramLinks.Refresh();
    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
}

main();
