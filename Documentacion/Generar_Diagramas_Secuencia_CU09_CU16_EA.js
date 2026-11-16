/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: Diagramas de Secuencia UML 2.5+ (100% Nombres Literales del Código)
 * 
 * CASOS DE USO:
 *   - CU09: Gestionar Empleados y Permisos
 *           (UI: MisEmpleados.jsx | CC: usuarios/views.py | Modelos: Empleado, EmpleadoPermiso)
 *   - CU16: Gestionar Promociones y Descuentos
 *           (UI: MisPromociones.jsx | CC: promociones/views.py | Modelos: Promocion, PromocionProducto)
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

/* ==============================================================================
 * CU09: Gestionar Empleados y Permisos
 * ============================================================================== */
function generarCU09_Secuencia(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Secuencia CU09...", 0);

    var pkgCU09 = parentPkg.Packages.AddNew("CU09 - Gestionar Empleados y Permisos", "Package");
    pkgCU09.Update();

    var diag = pkgCU09.Diagrams.AddNew("Diagrama de Secuencia - CU09", "Sequence");
    diag.Update();

    var el = pkgCU09.Elements;

    var act = el.AddNew(":Emprendedor", "Actor");
    act.Update();

    var ui = el.AddNew(":MisEmpleados", "Sequence"); // MisEmpleados.jsx
    ui.Stereotype = "boundary";
    ui.Update();

    var ctrl = el.AddNew(":UsuariosViews", "Sequence"); // apps/usuarios/views.py
    ctrl.Stereotype = "control";
    ctrl.Update();

    var entEmp = el.AddNew(":Empleado", "Sequence"); // models.py Empleado
    entEmp.Stereotype = "entity";
    entEmp.Update();

    var entPerm = el.AddNew(":EmpleadoPermiso", "Sequence"); // models.py EmpleadoPermiso
    entPerm.Stereotype = "entity";
    entPerm.Update();

    posicionarElemento(diag, act, POS_ACTOR_LEFT, POS_ACTOR_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ui, POS_UI_LEFT, POS_UI_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, POS_CTRL_LEFT, POS_CTRL_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, entEmp, POS_ENT1_LEFT, POS_ENT1_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, entPerm, POS_ENT2_LEFT, POS_ENT2_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Crear Empleado (crearEmpleado en MisEmpleados.jsx -> CrearEmpleadoView en views.py)
    registrarMensaje(act, ui, "1: crearEmpleado(form)", false, seq++);
    registrarMensaje(ui, ctrl, "2: CrearEmpleadoView.create(request)", false, seq++);
    registrarMensaje(ctrl, entEmp, "3: Empleado.objects.create(usuario, empresa, cargo)", false, seq++);
    registrarMensaje(entEmp, ctrl, "4: empleado (id, estado='ACTIVO')", true, seq++);
    registrarMensaje(ctrl, ui, "5: Response(UsuarioSerializer.data, 201_CREATED)", true, seq++);
    registrarMensaje(ui, act, "6: setMostrarForm(false) + cargar()", true, seq++);

    // Bloque 2: Asignar / Quitar Permiso (togglePermiso en MisEmpleados.jsx -> PermisoEmpleadoPropioView en views.py)
    registrarMensaje(act, ui, "7: togglePermiso(empleado, permiso)", false, seq++);
    registrarMensaje(ui, ctrl, "8: PermisoEmpleadoPropioView.post(request, empleado_id, permiso_id)", false, seq++);
    registrarMensaje(ctrl, entPerm, "9: EmpleadoPermiso.objects.get_or_create(empleado, permiso)", false, seq++);
    registrarMensaje(entPerm, ctrl, "10: empleado_permiso (creado=true)", true, seq++);
    registrarMensaje(ctrl, ui, "11: Response(EmpleadoAdminSerializer.data, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "12: setEmpleados(lista_actualizada)", true, seq++);

    // Fragmentos ALT acotados
    crearFragmentoAlt(pkgCU09, diag, FRAG_X_LEFT, FRAG_X_RIGHT, -145, -390);
    crearFragmentoAlt(pkgCU09, diag, FRAG_X_LEFT, FRAG_X_RIGHT, -480, -780);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
    Repository.WriteOutput("Script", "[+] Secuencia CU09 generada con éxito.", 0);
}

/* ==============================================================================
 * CU16: Gestionar Promociones y Descuentos
 * ============================================================================== */
function generarCU16_Secuencia(parentPkg) {
    Repository.WriteOutput("Script", "-> Generando Secuencia CU16...", 0);

    var pkgCU16 = parentPkg.Packages.AddNew("CU16 - Gestionar Promociones y Descuentos", "Package");
    pkgCU16.Update();

    var diag = pkgCU16.Diagrams.AddNew("Diagrama de Secuencia - CU16", "Sequence");
    diag.Update();

    var el = pkgCU16.Elements;

    var act = el.AddNew(":Emprendedor", "Actor");
    act.Update();

    var ui = el.AddNew(":MisPromociones", "Sequence"); // MisPromociones.jsx
    ui.Stereotype = "boundary";
    ui.Update();

    var ctrl = el.AddNew(":PromocionesViews", "Sequence"); // apps/promociones/views.py
    ctrl.Stereotype = "control";
    ctrl.Update();

    var entPromo = el.AddNew(":Promocion", "Sequence"); // models.py Promocion
    entPromo.Stereotype = "entity";
    entPromo.Update();

    var entPromoProd = el.AddNew(":PromocionProducto", "Sequence"); // models.py PromocionProducto
    entPromoProd.Stereotype = "entity";
    entPromoProd.Update();

    posicionarElemento(diag, act, POS_ACTOR_LEFT, POS_ACTOR_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ui, POS_UI_LEFT, POS_UI_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, ctrl, POS_CTRL_LEFT, POS_CTRL_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, entPromo, POS_ENT1_LEFT, POS_ENT1_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);
    posicionarElemento(diag, entPromoProd, POS_ENT2_LEFT, POS_ENT2_RIGHT, TOP_LIFELINES, BOTTOM_LIFELINES);

    var seq = 1;

    // Bloque 1: Crear promoción (guardar en MisPromociones.jsx -> ListaCrearMisPromocionesView en views.py)
    registrarMensaje(act, ui, "1: guardar(e)", false, seq++);
    registrarMensaje(ui, ctrl, "2: ListaCrearMisPromocionesView.perform_create(serializer)", false, seq++);
    registrarMensaje(ctrl, entPromo, "3: Promocion.objects.create(empresa, nombre, tipo, valor, f_ini, f_fin)", false, seq++);
    registrarMensaje(entPromo, ctrl, "4: promocion (id, estado='ACTIVA')", true, seq++);
    registrarMensaje(ctrl, entPromoProd, "5: promocion.productos.set(productos_ids)", false, seq++);
    registrarMensaje(entPromoProd, ctrl, "6: productos_asociados (ok=true)", true, seq++);
    registrarMensaje(ctrl, ui, "7: Response(PromocionEmpresaSerializer.data, 201_CREATED)", true, seq++);
    registrarMensaje(ui, act, "8: setMostrarModal(false) + cargarPromociones()", true, seq++);

    // Bloque 2: Cambiar estado (cambiarEstado en MisPromociones.jsx -> EditarEliminarMiPromocionView en views.py)
    registrarMensaje(act, ui, "9: cambiarEstado(promocion, nuevoEstado)", false, seq++);
    registrarMensaje(ui, ctrl, "10: EditarEliminarMiPromocionView.patch(request, promocion_id)", false, seq++);
    registrarMensaje(ctrl, entPromo, "11: promocion.save(update_fields=['estado'])", false, seq++);
    registrarMensaje(entPromo, ctrl, "12: promocion_actualizada", true, seq++);
    registrarMensaje(ctrl, ui, "13: Response(PromocionEmpresaSerializer.data, 200_OK)", true, seq++);
    registrarMensaje(ui, act, "14: setPromociones(prev => prev.map(...))", true, seq++);

    // Fragmentos ALT acotados
    crearFragmentoAlt(pkgCU16, diag, FRAG_X_LEFT, FRAG_X_RIGHT, -145, -420);
    crearFragmentoAlt(pkgCU16, diag, FRAG_X_LEFT, FRAG_X_RIGHT, -510, -800);

    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);
    Repository.WriteOutput("Script", "[+] Secuencia CU16 generada con éxito.", 0);
}

function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "==========================================================", 0);
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMAS DE SECUENCIA (CU09 Y CU16) =======", 0);
    Repository.WriteOutput("Script", "==========================================================", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var root = currentPackage.Packages.AddNew("Diagramas de Secuencia (CU09 y CU16)", "Package");
    root.Update();

    generarCU09_Secuencia(root);
    generarCU16_Secuencia(root);

    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);
    Repository.WriteOutput("Script", "=== PROCESO COMPLETADO EXITOSAMENTE ===", 0);
}

main();
