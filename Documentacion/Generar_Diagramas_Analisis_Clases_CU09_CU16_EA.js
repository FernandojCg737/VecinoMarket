/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagramas de Análisis de Clases (100% Nombres Literales del Código)
 * 
 * CASOS DE USO:
 *   - CU09: Gestionar Empleados y Permisos
 *   - CU16: Gestionar Promociones y Descuentos
 * ==============================================================================
 */

function posicionarObjeto(diagram, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
}

function conectarSimple(origen, destino) {
    var con = origen.Connectors.AddNew("", "Association");
    con.SupplierID = destino.ElementID;
    con.Direction = "Unspecified";
    con.Update();
    origen.Connectors.Refresh();
    return con;
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

/* ==============================================================================
 * CU09: Análisis de Clases (Nombres Exactos del Código)
 * ============================================================================== */
function generarAnalisisCU09(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU09 - Análisis de Clases", "");
    pkg.Update();

    var diagName = "CU09. Gestionar Empleados y Permisos";
    var diagram = pkg.Diagrams.AddNew(diagName, "Logical");
    diagram.Update();

    var elemActor = pkg.Elements.AddNew("Emprendedor", "Actor");
    elemActor.Update();

    // <<UI>>: MisEmpleados.jsx
    var elemUI = pkg.Elements.AddNew("MisEmpleados", "Class");
    elemUI.Stereotype = "UI";
    elemUI.Attributes.AddNew("form", "Object").Update();
    elemUI.Attributes.AddNew("empleados", "Array<Empleado>").Update();
    elemUI.Attributes.AddNew("permisos", "Array<Permiso>").Update();
    elemUI.Attributes.AddNew("mostrarForm", "Boolean").Update();
    elemUI.Attributes.Refresh();

    elemUI.Methods.AddNew("cargar()", "void").Update();
    elemUI.Methods.AddNew("crearEmpleado(e)", "void").Update();
    elemUI.Methods.AddNew("togglePermiso(empleado, permiso)", "void").Update();
    elemUI.Methods.AddNew("toggleEstado(empleado)", "void").Update();
    elemUI.Methods.Refresh();
    elemUI.Update();

    // <<CC>>: Clases de views.py de apps/usuarios
    var elemCtrl = pkg.Elements.AddNew("UsuariosViews", "Class");
    elemCtrl.Stereotype = "CC";
    elemCtrl.Methods.AddNew("CrearEmpleadoView_create(request)", "Response").Update();
    elemCtrl.Methods.AddNew("PermisoEmpleadoPropioView_post(request, empleado_id, permiso_id)", "Response").Update();
    elemCtrl.Methods.AddNew("PermisoEmpleadoPropioView_delete(request, empleado_id, permiso_id)", "Response").Update();
    elemCtrl.Methods.AddNew("DesactivarEmpleadoView_post(request, empleado_id)", "Response").Update();
    elemCtrl.Methods.Refresh();
    elemCtrl.Update();

    // Entidad Principal: Empleado
    var elemEmp = pkg.Elements.AddNew("Empleado", "Class");
    elemEmp.Stereotype = "Model";
    elemEmp.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemEmp.Attributes.AddNew("usuario_id", "BIGINT").Update();
    elemEmp.Attributes.AddNew("empresa_id", "BIGINT").Update();
    elemEmp.Attributes.AddNew("cargo", "VARCHAR(60)").Update();
    elemEmp.Attributes.AddNew("fecha_ingreso", "TIMESTAMP").Update();
    elemEmp.Attributes.AddNew("estado", "VARCHAR(20)").Update();
    elemEmp.Attributes.Refresh();
    elemEmp.Update();

    // Tablas Satélites de la Base de Datos
    var elemEmpresa = pkg.Elements.AddNew("Empresa", "Class");
    elemEmpresa.Stereotype = "Model";
    elemEmpresa.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemEmpresa.Attributes.AddNew("razon_social", "VARCHAR(150)").Update();
    elemEmpresa.Attributes.AddNew("nit", "VARCHAR(30)").Update();
    elemEmpresa.Attributes.AddNew("estado", "VARCHAR(20)").Update();
    elemEmpresa.Attributes.Refresh();
    elemEmpresa.Update();

    var elemUsuario = pkg.Elements.AddNew("Usuario", "Class");
    elemUsuario.Stereotype = "Model";
    elemUsuario.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemUsuario.Attributes.AddNew("email", "VARCHAR(150)").Update();
    elemUsuario.Attributes.AddNew("nombre", "VARCHAR(100)").Update();
    elemUsuario.Attributes.AddNew("rol", "VARCHAR(20)").Update();
    elemUsuario.Attributes.Refresh();
    elemUsuario.Update();

    var elemEmpPerm = pkg.Elements.AddNew("EmpleadoPermiso", "Class");
    elemEmpPerm.Stereotype = "Model";
    elemEmpPerm.Attributes.AddNew("empleado_id", "BIGINT").Update();
    elemEmpPerm.Attributes.AddNew("permiso_id", "INTEGER").Update();
    elemEmpPerm.Attributes.Refresh();
    elemEmpPerm.Update();

    var elemPermiso = pkg.Elements.AddNew("Permiso", "Class");
    elemPermiso.Stereotype = "Model";
    elemPermiso.Attributes.AddNew("id", "SERIAL").Update();
    elemPermiso.Attributes.AddNew("codigo", "VARCHAR(50)").Update();
    elemPermiso.Attributes.AddNew("descripcion", "VARCHAR(200)").Update();
    elemPermiso.Attributes.Refresh();
    elemPermiso.Update();

    // Conexiones BCE
    conectarSimple(elemActor, elemUI);
    conectarSimple(elemUI, elemCtrl);
    conectarSimple(elemCtrl, elemEmp);

    // Conexiones con Cardinalidades
    conectarConCardinalidad(elemEmpresa, elemEmp, "emplea", "1..1", "0..*");
    conectarConCardinalidad(elemUsuario, elemEmp, "pertenece_a", "1..1", "1..1");
    conectarConCardinalidad(elemEmp, elemEmpPerm, "posee", "1..1", "1..*");
    conectarConCardinalidad(elemEmpPerm, elemPermiso, "corresponde_a", "0..*", "1..1");

    posicionarObjeto(diagram, elemActor, 50, 130, -200, -320);
    posicionarObjeto(diagram, elemUI, 170, 330, -170, -360);
    posicionarObjeto(diagram, elemCtrl, 370, 560, -170, -350);
    posicionarObjeto(diagram, elemEmp, 610, 770, -170, -330);

    posicionarObjeto(diagram, elemEmpresa, 610, 770, -30, -130);
    posicionarObjeto(diagram, elemUsuario, 610, 770, -380, -500);
    posicionarObjeto(diagram, elemEmpPerm, 830, 990, -170, -290);
    posicionarObjeto(diagram, elemPermiso, 1040, 1200, -170, -290);

    diagram.DiagramObjects.Refresh();
    diagram.Update();
    Repository.ReloadDiagram(diagram.DiagramID);
    Repository.OpenDiagram(diagram.DiagramID);
}

/* ==============================================================================
 * CU16: Análisis de Clases (Nombres Exactos del Código)
 * ============================================================================== */
function generarAnalisisCU16(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU16 - Análisis de Clases", "");
    pkg.Update();

    var diagName = "CU16. Gestionar Promociones y Descuentos";
    var diagram = pkg.Diagrams.AddNew(diagName, "Logical");
    diagram.Update();

    var elemActor = pkg.Elements.AddNew("Emprendedor", "Actor");
    elemActor.Update();

    // <<UI>>: MisPromociones.jsx
    var elemUI = pkg.Elements.AddNew("MisPromociones", "Class");
    elemUI.Stereotype = "UI";
    elemUI.Attributes.AddNew("form", "Object").Update();
    elemUI.Attributes.AddNew("promociones", "Array<Promocion>").Update();
    elemUI.Attributes.AddNew("mostrarModal", "Boolean").Update();
    elemUI.Attributes.Refresh();

    elemUI.Methods.AddNew("cargarPromociones()", "void").Update();
    elemUI.Methods.AddNew("guardar(e)", "void").Update();
    elemUI.Methods.AddNew("cambiarEstado(promocion, nuevoEstado)", "void").Update();
    elemUI.Methods.AddNew("eliminar(promocion)", "void").Update();
    elemUI.Methods.Refresh();
    elemUI.Update();

    // <<CC>>: Clases de views.py de apps/promociones
    var elemCtrl = pkg.Elements.AddNew("PromocionesViews", "Class");
    elemCtrl.Stereotype = "CC";
    elemCtrl.Methods.AddNew("ListaCrearMisPromocionesView_perform_create(serializer)", "void").Update();
    elemCtrl.Methods.AddNew("EditarEliminarMiPromocionView_patch(request, promocion_id)", "Response").Update();
    elemCtrl.Methods.AddNew("EditarEliminarMiPromocionView_delete(request, promocion_id)", "Response").Update();
    elemCtrl.Methods.Refresh();
    elemCtrl.Update();

    // Entidad Principal: Promocion
    var elemPromo = pkg.Elements.AddNew("Promocion", "Class");
    elemPromo.Stereotype = "Model";
    elemPromo.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemPromo.Attributes.AddNew("empresa_id", "BIGINT").Update();
    elemPromo.Attributes.AddNew("nombre", "VARCHAR(100)").Update();
    elemPromo.Attributes.AddNew("tipo", "VARCHAR(20)").Update();
    elemPromo.Attributes.AddNew("valor", "NUMERIC(10,2)").Update();
    elemPromo.Attributes.AddNew("fecha_inicio", "TIMESTAMP").Update();
    elemPromo.Attributes.AddNew("fecha_fin", "TIMESTAMP").Update();
    elemPromo.Attributes.AddNew("estado", "VARCHAR(20)").Update();
    elemPromo.Attributes.Refresh();
    elemPromo.Update();

    // Tablas Satélites de la Base de Datos
    var elemEmpresa = pkg.Elements.AddNew("Empresa", "Class");
    elemEmpresa.Stereotype = "Model";
    elemEmpresa.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemEmpresa.Attributes.AddNew("razon_social", "VARCHAR(150)").Update();
    elemEmpresa.Attributes.AddNew("nit", "VARCHAR(30)").Update();
    elemEmpresa.Attributes.Refresh();
    elemEmpresa.Update();

    var elemPromoProd = pkg.Elements.AddNew("PromocionProducto", "Class");
    elemPromoProd.Stereotype = "Model";
    elemPromoProd.Attributes.AddNew("promocion_id", "BIGINT").Update();
    elemPromoProd.Attributes.AddNew("producto_id", "BIGINT").Update();
    elemPromoProd.Attributes.Refresh();
    elemPromoProd.Update();

    var elemProducto = pkg.Elements.AddNew("Producto", "Class");
    elemProducto.Stereotype = "Model";
    elemProducto.Attributes.AddNew("id", "BIGSERIAL").Update();
    elemProducto.Attributes.AddNew("nombre", "VARCHAR(150)").Update();
    elemProducto.Attributes.AddNew("sku", "VARCHAR(50)").Update();
    elemProducto.Attributes.AddNew("precio", "NUMERIC(10,2)").Update();
    elemProducto.Attributes.AddNew("precio_descuento", "NUMERIC(10,2)").Update();
    elemProducto.Attributes.Refresh();
    elemProducto.Update();

    conectarSimple(elemActor, elemUI);
    conectarSimple(elemUI, elemCtrl);
    conectarSimple(elemCtrl, elemPromo);

    conectarConCardinalidad(elemEmpresa, elemPromo, "lanza", "1..1", "0..*");
    conectarConCardinalidad(elemPromo, elemPromoProd, "incluye", "1..1", "1..*");
    conectarConCardinalidad(elemPromoProd, elemProducto, "aplica_a", "0..*", "1..1");

    posicionarObjeto(diagram, elemActor, 50, 130, -200, -320);
    posicionarObjeto(diagram, elemUI, 170, 330, -170, -360);
    posicionarObjeto(diagram, elemCtrl, 370, 560, -170, -350);
    posicionarObjeto(diagram, elemPromo, 610, 780, -170, -350);

    posicionarObjeto(diagram, elemEmpresa, 610, 780, -30, -130);
    posicionarObjeto(diagram, elemPromoProd, 840, 1010, -170, -290);
    posicionarObjeto(diagram, elemProducto, 1070, 1240, -170, -330);

    diagram.DiagramObjects.Refresh();
    diagram.Update();
    Repository.ReloadDiagram(diagram.DiagramID);
    Repository.OpenDiagram(diagram.DiagramID);
}

function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "==========================================================", 0);
    Repository.WriteOutput("Script", "=== GENERANDO ANÁLISIS DE CLASES (CU09 Y CU16) ===========", 0);
    Repository.WriteOutput("Script", "==========================================================", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var rootPkg = currentPackage.Packages.AddNew("Diagramas de Análisis (CU09 y CU16)", "");
    rootPkg.Update();

    generarAnalisisCU09(rootPkg);
    generarAnalisisCU16(rootPkg);

    rootPkg.Packages.Refresh();
    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== PROCESO COMPLETADO EXITOSAMENTE ===", 0);
}

main();
