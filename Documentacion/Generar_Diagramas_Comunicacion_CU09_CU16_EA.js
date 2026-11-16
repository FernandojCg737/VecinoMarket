/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagramas de Comunicación / Robustez (BCE) - UML 2.5
 * ESTRUCTURA: Correspondencia 1:1 EXACTA con el Diagrama de Secuencia y Código Real
 * 
 * CASOS DE USO SPRINT 3:
 *   - CU09: Gestionar Empleados y Permisos
 *           Elementos: :Emprendedor, :MisEmpleados, :UsuariosViews, :Empleado, :EmpleadoPermiso
 *   - CU16: Gestionar Promociones y Descuentos
 *           Elementos: :Emprendedor, :MisPromociones, :PromocionesViews, :Promocion, :PromocionProducto
 * ==============================================================================
 */

function generarDiagramasComunicacionSprint3() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMAS DE COMUNICACIÓN (100% CÓDIGO Y SECUENCIA) ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var rootPkg = currentPackage.Packages.AddNew("Diagramas de Comunicacion CU09 y CU16", "");
    rootPkg.Update();

    generarCU09_Comunicacion(rootPkg);
    generarCU16_Comunicacion(rootPkg);

    rootPkg.Packages.Refresh();
    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] DIAGRAMAS DE COMUNICACIÓN GENERADOS EXITOSAMENTE ===", 0);
    Session.Prompt("¡Diagramas de Comunicación CU09 y CU16 generados con éxito!", 0);
}

/* ==============================================================================
 * CASO DE USO 09: Gestionar Empleados y Permisos
 * ============================================================================== */
function generarCU09_Comunicacion(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU09 - Gestionar Empleados y Permisos", "");
    pkg.Update();

    var diagName = "CU09. Gestionar Empleados y Permisos";
    var diagram = pkg.Diagrams.AddNew(diagName, "Communication");
    if (!diagram.Update()) {
        diagram = pkg.Diagrams.AddNew(diagName, "Analysis");
        diagram.Update();
    }

    // 1. Elementos BCE con nombres EXACTOS al Diagrama de Secuencia
    var elemActor = pkg.Elements.AddNew(":Emprendedor", "Actor");
    elemActor.Update();

    var elemUI = pkg.Elements.AddNew(":MisEmpleados", "Class");
    elemUI.Stereotype = "boundary";
    elemUI.StereotypeEx = "boundary";
    elemUI.Update();

    var elemCtrl = pkg.Elements.AddNew(":UsuariosViews", "Class");
    elemCtrl.Stereotype = "control";
    elemCtrl.StereotypeEx = "control";
    elemCtrl.Update();

    var elemEnt1 = pkg.Elements.AddNew(":Empleado", "Class");
    elemEnt1.Stereotype = "entity";
    elemEnt1.StereotypeEx = "entity";
    elemEnt1.Update();

    var elemEnt2 = pkg.Elements.AddNew(":EmpleadoPermiso", "Class");
    elemEnt2.Stereotype = "entity";
    elemEnt2.StereotypeEx = "entity";
    elemEnt2.Update();

    pkg.Elements.Refresh();

    // 2. Posicionamiento claro y espacioso en forma de bifurcación
    colocarObjeto(diagram, elemActor, 60, 160, -160, -250);
    colocarObjeto(diagram, elemUI, 340, 440, -160, -250);
    colocarObjeto(diagram, elemCtrl, 640, 740, -160, -250);
    colocarObjeto(diagram, elemEnt1, 960, 1060, -70, -160);   // Arriba derecha
    colocarObjeto(diagram, elemEnt2, 960, 1060, -250, -340); // Abajo derecha

    diagram.DiagramObjects.Refresh();

    // 3. Enlaces y Mensajes 1:1 con la Secuencia (Numeración 1..12 plana, sin 1:1)
    // Enlace 1: :Emprendedor <---> :MisEmpleados
    var m1 = [
        "1: crearEmpleado(form) \u2192",
        "6: setMostrarForm(false) + cargar() \u2190",
        "7: togglePermiso(empleado, permiso) \u2192",
        "12: setEmpleados(lista_actualizada) \u2190"
    ];
    conectar(diagram, elemActor, elemUI, m1);

    // Enlace 2: :MisEmpleados <---> :UsuariosViews
    var m2 = [
        "2: CrearEmpleadoView.create(request) \u2192",
        "5: Response(UsuarioSerializer.data, 201_CREATED) \u2190",
        "8: PermisoEmpleadoPropioView.post(request, empleado_id, permiso_id) \u2192",
        "11: Response(EmpleadoAdminSerializer.data, 200_OK) \u2190"
    ];
    conectar(diagram, elemUI, elemCtrl, m2);

    // Enlace 3: :UsuariosViews <---> :Empleado
    var m3 = [
        "3: Empleado.objects.create(usuario, empresa, cargo) \u2192",
        "4: empleado (id, estado='ACTIVO') \u2190"
    ];
    conectar(diagram, elemCtrl, elemEnt1, m3);

    // Enlace 4: :UsuariosViews <---> :EmpleadoPermiso
    var m4 = [
        "9: EmpleadoPermiso.objects.get_or_create(empleado, permiso) \u2192",
        "10: empleado_permiso (creado=true) \u2190"
    ];
    conectar(diagram, elemCtrl, elemEnt2, m4);

    diagram.DiagramLinks.Refresh();
    diagram.Update();
    Repository.ReloadDiagram(diagram.DiagramID);
    Repository.OpenDiagram(diagram.DiagramID);
}

/* ==============================================================================
 * CASO DE USO 16: Gestionar Promociones y Descuentos
 * ============================================================================== */
function generarCU16_Comunicacion(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("CU16 - Gestionar Promociones y Descuentos", "");
    pkg.Update();

    var diagName = "CU16. Gestionar Promociones y Descuentos";
    var diagram = pkg.Diagrams.AddNew(diagName, "Communication");
    if (!diagram.Update()) {
        diagram = pkg.Diagrams.AddNew(diagName, "Analysis");
        diagram.Update();
    }

    // 1. Elementos BCE con nombres EXACTOS al Diagrama de Secuencia
    var elemActor = pkg.Elements.AddNew(":Emprendedor", "Actor");
    elemActor.Update();

    var elemUI = pkg.Elements.AddNew(":MisPromociones", "Class");
    elemUI.Stereotype = "boundary";
    elemUI.StereotypeEx = "boundary";
    elemUI.Update();

    var elemCtrl = pkg.Elements.AddNew(":PromocionesViews", "Class");
    elemCtrl.Stereotype = "control";
    elemCtrl.StereotypeEx = "control";
    elemCtrl.Update();

    var elemEnt1 = pkg.Elements.AddNew(":Promocion", "Class");
    elemEnt1.Stereotype = "entity";
    elemEnt1.StereotypeEx = "entity";
    elemEnt1.Update();

    var elemEnt2 = pkg.Elements.AddNew(":PromocionProducto", "Class");
    elemEnt2.Stereotype = "entity";
    elemEnt2.StereotypeEx = "entity";
    elemEnt2.Update();

    pkg.Elements.Refresh();

    // 2. Posicionamiento claro y espacioso en forma de bifurcación
    colocarObjeto(diagram, elemActor, 60, 160, -160, -250);
    colocarObjeto(diagram, elemUI, 340, 440, -160, -250);
    colocarObjeto(diagram, elemCtrl, 640, 740, -160, -250);
    colocarObjeto(diagram, elemEnt1, 960, 1060, -70, -160);   // Arriba derecha
    colocarObjeto(diagram, elemEnt2, 960, 1060, -250, -340); // Abajo derecha

    diagram.DiagramObjects.Refresh();

    // 3. Enlaces y Mensajes 1:1 con la Secuencia (Numeración 1..14 plana, sin 1:1)
    // Enlace 1: :Emprendedor <---> :MisPromociones
    var m1 = [
        "1: guardar(e) \u2192",
        "8: setMostrarModal(false) + cargarPromociones() \u2190",
        "9: cambiarEstado(promocion, nuevoEstado) \u2192",
        "14: setPromociones(prev => prev.map(...)) \u2190"
    ];
    conectar(diagram, elemActor, elemUI, m1);

    // Enlace 2: :MisPromociones <---> :PromocionesViews
    var m2 = [
        "2: ListaCrearMisPromocionesView.perform_create(serializer) \u2192",
        "7: Response(PromocionEmpresaSerializer.data, 201_CREATED) \u2190",
        "10: EditarEliminarMiPromocionView.patch(request, promocion_id) \u2192",
        "13: Response(PromocionEmpresaSerializer.data, 200_OK) \u2190"
    ];
    conectar(diagram, elemUI, elemCtrl, m2);

    // Enlace 3: :PromocionesViews <---> :Promocion
    var m3 = [
        "3: Promocion.objects.create(empresa, nombre, tipo, valor, f_ini, f_fin) \u2192",
        "4: promocion (id, estado='ACTIVA') \u2190",
        "11: promocion.save(update_fields=['estado']) \u2192",
        "12: promocion_actualizada \u2190"
    ];
    conectar(diagram, elemCtrl, elemEnt1, m3);

    // Enlace 4: :PromocionesViews <---> :PromocionProducto
    var m4 = [
        "5: promocion.productos.set(productos_ids) \u2192",
        "6: productos_asociados (ok=true) \u2190"
    ];
    conectar(diagram, elemCtrl, elemEnt2, m4);

    diagram.DiagramLinks.Refresh();
    diagram.Update();
    Repository.ReloadDiagram(diagram.DiagramID);
    Repository.OpenDiagram(diagram.DiagramID);
}

/* ==============================================================================
 * UTILIDADES COMUNES (LÍNEAS RECTAS CONTINUAS Y NOMBRES NÍTIDOS)
 * ============================================================================== */
function colocarObjeto(diagram, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Style = "ShowStereoIcon=1;HideIcon=0;";
    diagObj.Update();
    return diagObj;
}

function conectar(diagram, de, a, mensajes) {
    var link = de.Connectors.AddNew("", "Association");
    link.SupplierID = a.ElementID;
    link.Direction = "Unspecified";
    // El texto visible en la línea recta continua con números planos 1, 2, 3... y flechas:
    link.Name = mensajes.join("\n");
    link.Update();

    de.Connectors.Refresh();

    try {
        var dLink = diagram.DiagramLinks.AddNew("", "");
        dLink.ConnectorID = link.ConnectorID;
        dLink.Style = 1; // Direct Routing (Línea recta sólida continua)
        dLink.Update();
    } catch(e) {}
}

generarDiagramasComunicacionSprint3();
