//!INC Local Scripts.EAConstants-JScript
/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODELO: Modelo C4 - NIVEL 4: DIAGRAMA DE CÓDIGO (Code Diagram)
 * DESCRIPCIÓN: Representa la estructura interna a nivel de clases del Backend,
 *              agrupadas por Contenedores / Módulos de Negocio (Boundary Boxes con colores)
 *              mostrando atributos, métodos y dependencias reales del proyecto.
 * 
 * MÓDULOS DEL NIVEL 4:
 *   1. Módulo SaaS Multi-Empresa y Seguridad (apps/usuarios, apps/auditoria)
 *   2. Módulo de Catálogo e Inventario (apps/catalogo, apps/inventario)
 *   3. Módulo de Pedidos, Ventas y Facturación (apps/pedidos, apps/facturacion)
 *   4. Módulo de Dashboards, Reportes y Auditoría (apps/reportes)
 * ==============================================================================
 */

function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "==========================================================", 0);
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMA C4 NIVEL 4: CÓDIGO (VECINOMARKET) ===", 0);
    Repository.WriteOutput("Script", "==========================================================", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", promptOK);
        return;
    }

    var pkgC4 = currentPackage.Packages.AddNew("C4 - Nivel 4 Diagrama de Código", "");
    pkgC4.Update();

    var diagram = pkgC4.Diagrams.AddNew("Nivel 4 - Diagrama de Código (Backend VecinoMarket)", "Logical");
    diagram.Update();

    var elements = pkgC4.Elements;

    // ==========================================================================
    // 1. CONTENEDORES VISUALES (BOUNDARIES MODULARES CON COLORES)
    // ==========================================================================
    var bSaas = elements.AddNew("Administración SaaS y Seguridad", "Boundary");
    bSaas.Update();

    var bCat = elements.AddNew("Catálogo e Inventario", "Boundary");
    bCat.Update();

    var bPed = elements.AddNew("Gestión de Pedidos y Facturación", "Boundary");
    bPed.Update();

    var bRep = elements.AddNew("Dashboards, Reportes y Auditoría", "Boundary");
    bRep.Update();

    // ==========================================================================
    // 2. CLASES DEL MÓDULO 1: SAAS Y SEGURIDAD (apps.usuarios)
    // ==========================================================================
    var clsUsuario = elements.AddNew("Usuario", "Class");
    clsUsuario.Attributes.AddNew("id", "Integer").Update();
    clsUsuario.Attributes.AddNew("email", "String").Update();
    clsUsuario.Attributes.AddNew("rol", "String").Update();
    clsUsuario.Attributes.AddNew("estado", "String").Update();
    clsUsuario.Methods.AddNew("autenticarUsuario()", "Token").Update();
    clsUsuario.Methods.AddNew("cambiarPassword()", "Boolean").Update();
    clsUsuario.Update();

    var clsEmpresa = elements.AddNew("Empresa", "Class");
    clsEmpresa.Attributes.AddNew("id", "Integer").Update();
    clsEmpresa.Attributes.AddNew("razon_social", "String").Update();
    clsEmpresa.Attributes.AddNew("nit", "String").Update();
    clsEmpresa.Attributes.AddNew("ciudad", "String").Update();
    clsEmpresa.Attributes.AddNew("estado", "String").Update();
    clsEmpresa.Methods.AddNew("registrarEmpresa()", "Empresa").Update();
    clsEmpresa.Methods.AddNew("actualizarPerfil()", "void").Update();
    clsEmpresa.Update();

    var clsRol = elements.AddNew("RolBase", "Class");
    clsRol.Attributes.AddNew("id", "Integer").Update();
    clsRol.Attributes.AddNew("nombre", "String").Update();
    clsRol.Methods.AddNew("asignarPermiso()", "void").Update();
    clsRol.Update();

    // ==========================================================================
    // 3. CLASES DEL MÓDULO 2: CATÁLOGO E INVENTARIO (apps.catalogo)
    // ==========================================================================
    var clsCategoria = elements.AddNew("Categoria", "Class");
    clsCategoria.Attributes.AddNew("id", "Integer").Update();
    clsCategoria.Attributes.AddNew("nombre", "String").Update();
    clsCategoria.Attributes.AddNew("icono", "String").Update();
    clsCategoria.Methods.AddNew("crearCategoria()", "void").Update();
    clsCategoria.Update();

    var clsProducto = elements.AddNew("Producto", "Class");
    clsProducto.Attributes.AddNew("id", "Integer").Update();
    clsProducto.Attributes.AddNew("nombre", "String").Update();
    clsProducto.Attributes.AddNew("sku", "String").Update();
    clsProducto.Attributes.AddNew("precio", "Decimal").Update();
    clsProducto.Attributes.AddNew("estado", "String").Update();
    clsProducto.Methods.AddNew("publicarProducto()", "void").Update();
    clsProducto.Methods.AddNew("actualizarPrecio()", "void").Update();
    clsProducto.Methods.AddNew("verificarDisponibilidad()", "Boolean").Update();
    clsProducto.Update();

    // ==========================================================================
    // 4. CLASES DEL MÓDULO 3: PEDIDOS Y FACTURACIÓN (apps.pedidos, facturacion)
    // ==========================================================================
    var clsPedido = elements.AddNew("Pedido", "Class");
    clsPedido.Attributes.AddNew("id", "Integer").Update();
    clsPedido.Attributes.AddNew("numero_pedido", "String").Update();
    clsPedido.Attributes.AddNew("subtotal", "Decimal").Update();
    clsPedido.Attributes.AddNew("comision_monto", "Decimal").Update();
    clsPedido.Attributes.AddNew("estado", "String").Update();
    clsPedido.Methods.AddNew("crearPedido()", "Pedido").Update();
    clsPedido.Methods.AddNew("actualizarEstado()", "void").Update();
    clsPedido.Methods.AddNew("calcularSubtotal()", "Decimal").Update();
    clsPedido.Update();

    var clsItem = elements.AddNew("PedidoItem", "Class");
    clsItem.Attributes.AddNew("id", "Integer").Update();
    clsItem.Attributes.AddNew("cantidad", "Integer").Update();
    clsItem.Attributes.AddNew("precio_unitario", "Decimal").Update();
    clsItem.Attributes.AddNew("subtotal", "Decimal").Update();
    clsItem.Methods.AddNew("calcularImporte()", "Decimal").Update();
    clsItem.Update();

    var clsComision = elements.AddNew("ComisionVenta", "Class");
    clsComision.Attributes.AddNew("id", "Integer").Update();
    clsComision.Attributes.AddNew("monto_venta", "Decimal").Update();
    clsComision.Attributes.AddNew("monto_comision", "Decimal").Update();
    clsComision.Methods.AddNew("calcularComision()", "Decimal").Update();
    clsComision.Update();

    // ==========================================================================
    // 5. CLASES DEL MÓDULO 4: REPORTES Y AUDITORÍA (apps.reportes, auditoria)
    // ==========================================================================
    var clsReporte = elements.AddNew("DashboardReportesController", "Class");
    clsReporte.Attributes.AddNew("empresaId", "Integer").Update();
    clsReporte.Attributes.AddNew("rangoFechas", "String").Update();
    clsReporte.Methods.AddNew("obtenerMetricasDashboard()", "Dict").Update();
    clsReporte.Methods.AddNew("obtenerTopProductosVendidos()", "List").Update();
    clsReporte.Methods.AddNew("exportarReportePDF()", "Blob").Update();
    clsReporte.Update();

    var clsValoracion = elements.AddNew("Valoracion", "Class");
    clsValoracion.Attributes.AddNew("id", "Integer").Update();
    clsValoracion.Attributes.AddNew("calificacion", "Integer").Update();
    clsValoracion.Attributes.AddNew("comentario", "String").Update();
    clsValoracion.Methods.AddNew("registrarResena()", "void").Update();
    clsValoracion.Update();

    var clsAuditoria = elements.AddNew("LogAuditoria", "Class");
    clsAuditoria.Attributes.AddNew("id", "Integer").Update();
    clsAuditoria.Attributes.AddNew("accion", "String").Update();
    clsAuditoria.Attributes.AddNew("detalle", "JSON").Update();
    clsAuditoria.Attributes.AddNew("ip_origen", "String").Update();
    clsAuditoria.Methods.AddNew("registrarAccion()", "void").Update();
    clsAuditoria.Update();

    pkgC4.Elements.Refresh();

    // ==========================================================================
    // 6. RELACIONES Y DEPENDENCIAS ENTRE CLASES
    // ==========================================================================
    conectarRelacion(clsUsuario, clsRol, "asigna");
    conectarRelacion(clsUsuario, clsEmpresa, "administra");
    conectarRelacion(clsEmpresa, clsProducto, "posee");
    conectarRelacion(clsCategoria, clsProducto, "agrupa");
    conectarRelacion(clsEmpresa, clsPedido, "recibe");
    conectarRelacion(clsPedido, clsItem, "contiene");
    conectarRelacion(clsItem, clsProducto, "referencia");
    conectarRelacion(clsPedido, clsComision, "genera");
    conectarRelacion(clsEmpresa, clsValoracion, "obtiene");
    conectarRelacion(clsReporte, clsPedido, "consulta");
    conectarRelacion(clsReporte, clsProducto, "analiza");
    conectarRelacion(clsUsuario, clsAuditoria, "audita");

    // ==========================================================================
    // 7. POSICIONAMIENTO EN 4 COLUMNAS (LAYOUT C4 NIVEL 4)
    // ==========================================================================
    var colWidth = 230;
    var gap = 30;
    var topBoundary = -40;
    var botBoundary = -680;

    // Columna 1: SaaS y Seguridad (X: 40 a 270)
    posicionarObjeto(diagram, bSaas, 40, 270, topBoundary, botBoundary);
    posicionarObjeto(diagram, clsUsuario, 60, 250, -80, -220);
    posicionarObjeto(diagram, clsEmpresa, 60, 250, -260, -420);
    posicionarObjeto(diagram, clsRol, 60, 250, -460, -580);

    // Columna 2: Catálogo e Inventario (X: 300 a 530)
    posicionarObjeto(diagram, bCat, 300, 530, topBoundary, botBoundary);
    posicionarObjeto(diagram, clsCategoria, 320, 510, -80, -220);
    posicionarObjeto(diagram, clsProducto, 320, 510, -260, -440);

    // Columna 3: Pedidos y Facturación (X: 560 a 790)
    posicionarObjeto(diagram, bPed, 560, 790, topBoundary, botBoundary);
    posicionarObjeto(diagram, clsPedido, 580, 770, -80, -240);
    posicionarObjeto(diagram, clsItem, 580, 770, -270, -410);
    posicionarObjeto(diagram, clsComision, 580, 770, -440, -580);

    // Columna 4: Dashboards, Reportes y Auditoría (X: 820 a 1050)
    posicionarObjeto(diagram, bRep, 820, 1050, topBoundary, botBoundary);
    posicionarObjeto(diagram, clsReporte, 840, 1030, -80, -240);
    posicionarObjeto(diagram, clsValoracion, 840, 1030, -270, -410);
    posicionarObjeto(diagram, clsAuditoria, 840, 1030, -440, -580);

    diagram.DiagramObjects.Refresh();
    diagram.Update();
    Repository.ReloadDiagram(diagram.DiagramID);
    Repository.OpenDiagram(diagram.DiagramID);

    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] DIAGRAMA C4 NIVEL 4 GENERADO EXITOSAMENTE ===", 0);
    Session.Prompt("¡Diagrama C4 Nivel 4 (Código) generado exitosamente con módulos y clases!", promptOK);
}

function posicionarObjeto(diagram, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
}

function conectarRelacion(origen, destino, nombre) {
    var con = origen.Connectors.AddNew(nombre, "Association");
    con.SupplierID = destino.ElementID;
    con.Direction = "Source -> Destination";
    con.Update();
    origen.Connectors.Refresh();
    return con;
}

main();
