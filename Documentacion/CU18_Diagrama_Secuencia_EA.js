//!INC Local Scripts.EAConstants-JScript
/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * CASO DE USO: CU18 - Visualizar Dashboard y Reportes de Empresa (Web/Móvil)
 * TAREAS: T044 (RF40: Productos más vendidos, RF42: Productos más vistos)
 * METODOLOGÍA: UML 2.5+ / Arquitectura Robusta de 3 Capas (BCE)
 * DESCRIPCIÓN: Script en JScript para Enterprise Architect (Sparx Systems).
 *              Genera automáticamente el Diagrama de Secuencia con Lifelines,
 *              Fragmentos combinados (ALT, OPT, LOOP) y Mensajes síncronos/retornos.
 * ==============================================================================
 */

function crearDiagramaSecuenciaCU18() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== Iniciando generación Diagrama de Secuencia: CU18 ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar el script.", 0);
        return;
    }

    // 1. Crear el diagrama de secuencia
    var diagrams = currentPackage.Diagrams;
    var diag = diagrams.AddNew("CU18 - Visualizar Dashboard y Reportes de Empresa", "Sequence");
    diag.Update();

    // 2. Definición de Elementos (Líneas de Vida - BCE)
    var elements = currentPackage.Elements;

    // Actor
    var actor = elements.AddNew("Emprendedor / Admin Empresa", "Actor");
    actor.Update();

    // Boundary (Interfaz)
    var iuDashboard = elements.AddNew("iuDash : IUDashboardEmpresa", "Sequence");
    iuDashboard.Stereotype = "boundary";
    iuDashboard.Update();

    var iuExportar = elements.AddNew("iuExp : IUExportarMenu", "Sequence");
    iuExportar.Stereotype = "boundary";
    iuExportar.Update();

    // Control (Controladores)
    var ctrlReportes = elements.AddNew("ctrlRep : CtrlDashboardReportes", "Sequence");
    ctrlReportes.Stereotype = "control";
    ctrlReportes.Update();

    var ctrlExportador = elements.AddNew("ctrlExp : CtrlExportadorBytes", "Sequence");
    ctrlExportador.Stereotype = "control";
    ctrlExportador.Update();

    // Entities (Entidades del Negocio)
    var entEmpresa = elements.AddNew("emp : Empresa", "Sequence");
    entEmpresa.Stereotype = "entity";
    entEmpresa.Update();

    var entPedido = elements.AddNew("ped : Pedido", "Sequence");
    entPedido.Stereotype = "entity";
    entPedido.Update();

    var entProducto = elements.AddNew("prod : Producto", "Sequence");
    entProducto.Stereotype = "entity";
    entProducto.Update();

    var entComision = elements.AddNew("com : ComisionVenta", "Sequence");
    entComision.Stereotype = "entity";
    entComision.Update();

    var entValoracion = elements.AddNew("val : Valoracion", "Sequence");
    entValoracion.Stereotype = "entity";
    entValoracion.Update();

    // 3. Posicionamiento en el Diagrama
    function colocar(diagram, elem, left, right, top, bottom) {
        var dObjs = diagram.DiagramObjects;
        var obj = dObjs.AddNew("", "");
        obj.ElementID = elem.ElementID;
        obj.left = left;
        obj.right = right;
        obj.top = top;
        obj.bottom = bottom;
        obj.Update();
    }

    var startX = 50;
    var width = 110;
    var gap = 45;

    colocar(diag, actor, startX, startX + 90, -30, -700);
    colocar(diag, iuDashboard, startX + 135, startX + 135 + width, -30, -700);
    colocar(diag, iuExportar, startX + 290, startX + 290 + width, -30, -700);
    colocar(diag, ctrlReportes, startX + 445, startX + 445 + width, -30, -700);
    colocar(diag, ctrlExportador, startX + 600, startX + 600 + width, -30, -700);
    colocar(diag, entEmpresa, startX + 755, startX + 755 + width, -30, -700);
    colocar(diag, entPedido, startX + 910, startX + 910 + width, -30, -700);
    colocar(diag, entProducto, startX + 1065, startX + 1065 + width, -30, -700);
    colocar(diag, entComision, startX + 1220, startX + 1220 + width, -30, -700);
    colocar(diag, entValoracion, startX + 1375, startX + 1375 + width, -30, -700);

    // 4. Función de Registro de Mensajes
    function registrarMensaje(origen, destino, nombre, esRetorno) {
        var con = origen.Connectors.AddNew(nombre, "Sequence");
        con.SupplierID = destino.ElementID;
        if (esRetorno) {
            con.SubType = "Return";
            con.StyleEx = "LF_synch=0;LF_isReturn=1;";
        } else {
            con.SubType = "Call";
            con.StyleEx = "LF_synch=1;";
        }
        con.Update();
    }

    // --- FLUJO DE MENSAJES SÍNCRONOS Y RETORNOS ---
    registrarMensaje(actor, iuDashboard, "1: accederDashboardEmpresa()", false);
    registrarMensaje(iuDashboard, ctrlReportes, "2: GET /api/reportes/mi-dashboard/ (tokenJWT)", false);

    // Validación de permisos
    registrarMensaje(ctrlReportes, entEmpresa, "3: validarPermisoEmpleado(usuario, 'ver_reportes')", false);
    registrarMensaje(entEmpresa, ctrlReportes, "4: permisoValido(empresaId, estadoActivo)", true);

    // Consultas de Negocio para el Dashboard
    registrarMensaje(ctrlReportes, entPedido, "5: consultarVentasYPedidosPendientes(empresaId)", false);
    registrarMensaje(entPedido, ctrlReportes, "6: resumenVentas(totalVentas, countPagados, countPendientes)", true);

    registrarMensaje(ctrlReportes, entComision, "7: consultarComisionesPlataforma(empresaId)", false);
    registrarMensaje(entComision, ctrlReportes, "8: totalComisiones(montoComision)", true);

    registrarMensaje(ctrlReportes, entValoracion, "9: fn_resumen_valoraciones_empresa(empresaId)", false);
    registrarMensaje(entValoracion, ctrlReportes, "10: reputacion(promedioEstrellas, totalResenas)", true);

    // Ranking de productos más vendidos (RF40)
    registrarMensaje(ctrlReportes, entProducto, "11: obtenerTopProductosVendidos(empresaId, limit=5)", false);
    registrarMensaje(entProducto, ctrlReportes, "12: listaTopProductos(rankingUnidades)", true);

    // Histórico de ventas de los últimos 14 días (LOOP)
    registrarMensaje(ctrlReportes, entPedido, "13: consultarVentasPorDia(empresaId, dias=14)", false);
    registrarMensaje(entPedido, ctrlReportes, "14: serieHistoricaVentas(dias, totales)", true);

    // Retorno al frontend
    registrarMensaje(ctrlReportes, iuDashboard, "15: 200 OK JSON (metricas, topProductos, graficoVentas)", true);
    registrarMensaje(iuDashboard, actor, "16: renderizarDashboardYMetricas()", true);

    // Opción de Exportación (OPT)
    registrarMensaje(actor, iuExportar, "17: seleccionarFormatoExportacion('PDF' | 'XLSX' | 'HTML')", false);
    registrarMensaje(iuExportar, ctrlReportes, "18: GET /api/reportes/mi-dashboard/exportar/?formato=pdf", false);
    registrarMensaje(ctrlReportes, ctrlExportador, "19: generarBytes(formato, seccionesDashboard)", false);
    registrarMensaje(ctrlExportador, ctrlReportes, "20: bytesArchivoBlob", true);
    registrarMensaje(ctrlReportes, iuExportar, "21: 200 OK (Content-Disposition: attachment)", true);
    registrarMensaje(iuExportar, actor, "22: descargarArchivoReporte()", true);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
    Repository.WriteOutput("Script", "=== Diagrama CU18 generado con éxito ===", 0);
}

crearDiagramaSecuenciaCU18();
