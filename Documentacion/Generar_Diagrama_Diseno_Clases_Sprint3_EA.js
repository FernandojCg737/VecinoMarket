/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
 * MODULO: DIAGRAMA DE DISEÑO DE CLASES DE SOFTWARE - SPRINT 3 (UML 2.5)
 * ESTRUCTURA: Clases Físicas de Software (ViewSets, Serializers, Services, Models ORM)
 * ==============================================================================
 */

function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== GENERANDO DIAGRAMA DE DISEÑO DE CLASES (SPRINT 3) ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
    if (currentPackage == null) {
        Session.Prompt("Por favor seleccione un Paquete en el Project Browser antes de ejecutar.", 0);
        return;
    }

    var pkg = currentPackage.Packages.AddNew("Diseño de Clases - Sprint 3", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("DCL-Sprint 3 - Arquitectura y Clases de Software", "Class");
    diag.Update();

    // 1. CAPA CONTROLADORES (Django REST Framework ViewSets)
    var cEmp = crearClase(pkg, "EmpleadoViewSet", "controller", [
        ["permission_classes", "List = [EsEmpresa]"],
        ["serializer_class", "EmpleadoAdminSerializer"]
    ], [
        ["create(request: Request)", "Response"],
        ["list(request: Request)", "Response"],
        ["toggle_permiso(request, emp_id, perm_id)", "Response"]
    ]);

    var cPed = crearClase(pkg, "PedidoViewSet", "controller", [
        ["permission_classes", "List = [IsAuthenticated]"],
        ["serializer_class", "PedidoSerializer"]
    ], [
        ["avanzar_estado(request, pk)", "Response"],
        ["comprobante_digital(request, pk)", "FileResponse"],
        ["trazabilidad(request, pk)", "Response"]
    ]);

    var cPro = crearClase(pkg, "PromocionViewSet", "controller", [
        ["permission_classes", "List = [EsEmpresa]"],
        ["serializer_class", "PromocionSerializer"]
    ], [
        ["create(request: Request)", "Response"],
        ["impacto_metricas(request, pk)", "Response"]
    ]);

    // 2. CAPA SERIALIZADORES (DRF ModelSerializers)
    var sEmp = crearClase(pkg, "EmpleadoAdminSerializer", "serializer", [
        ["Meta.model", "Empleado"],
        ["Meta.fields", "List = ['id', 'usuario', 'cargo', 'permisos']"]
    ], [
        ["to_representation(instance)", "Dict"],
        ["validate(attrs)", "Dict"]
    ]);

    var sPed = crearClase(pkg, "PedidoSerializer", "serializer", [
        ["Meta.model", "Pedido"],
        ["Meta.fields", "List = ['id', 'numero_pedido', 'total', 'estado']"]
    ], [
        ["to_representation(instance)", "Dict"]
    ]);

    var sPro = crearClase(pkg, "PromocionSerializer", "serializer", [
        ["Meta.model", "Promocion"],
        ["Meta.fields", "List = ['id', 'nombre', 'valor', 'fecha_fin']"]
    ], [
        ["validate_fecha_fin(value)", "Date"]
    ]);

    // 3. CAPA SERVICIOS DE NEGOCIO (Engines / Infrastructure)
    var srvDesc = crearClase(pkg, "DescuentoEngine", "service", [
        ["reglas", "List<ReglaDescuento>"]
    ], [
        ["calcular_precio_final(producto, promo)", "Decimal"],
        ["sincronizar_descuentos_empresa(empresa)", "int"]
    ]);

    var srvFCM = crearClase(pkg, "FirebaseFCMService", "service", [
        ["credentials_path", "str"],
        ["app_instance", "firebase_admin.App"]
    ], [
        ["send_push(user_id, title, body, data)", "bool"],
        ["send_multicast(tokens, title, body)", "BatchResponse"]
    ]);

    // 4. CAPA MODELOS ORM (Base de Datos Real Supabase)
    var mEmp = crearClase(pkg, "Empleado", "model", [
        ["id", "UUIDField(primary_key=True)"],
        ["cargo", "CharField(max_length=100)"],
        ["estado", "CharField(choices=Estado)"],
        ["fecha_ingreso", "DateField(auto_now_add=True)"]
    ], [
        ["tiene_permiso(codigo: str)", "bool"],
        ["desactivar()", "void"]
    ]);

    var mPed = crearClase(pkg, "Pedido", "model", [
        ["id", "UUIDField(primary_key=True)"],
        ["numero_pedido", "CharField(unique=True)"],
        ["total", "DecimalField(max_digits=10, decimal_places=2)"],
        ["estado", "CharField(choices=EstadoPedido)"],
        ["fecha_pedido", "DateTimeField(auto_now_add=True)"]
    ], [
        ["calcular_total()", "Decimal"],
        ["avanzar_siguiente_estado()", "void"]
    ]);

    var mPro = crearClase(pkg, "Promocion", "model", [
        ["id", "UUIDField(primary_key=True)"],
        ["nombre", "CharField(max_length=150)"],
        ["tipo", "CharField(choices=TipoPromocion)"],
        ["valor", "DecimalField(max_digits=5, decimal_places=2)"],
        ["fecha_inicio", "DateField()"],
        ["fecha_fin", "DateField()"]
    ], [
        ["esta_vigente()", "bool"],
        ["aplicar_a_producto(producto)", "Decimal"]
    ]);

    var mLog = crearClase(pkg, "LogAuditoria", "model", [
        ["id", "UUIDField(primary_key=True)"],
        ["accion", "CharField(max_length=100)"],
        ["entidad_afectada", "CharField(max_length=80)"],
        ["entidad_id", "UUIDField()"],
        ["detalle", "JSONField(default=dict)"],
        ["ip_origen", "GenericIPAddressField()"],
        ["fecha", "DateTimeField(auto_now_add=True)"]
    ], [
        ["registrar(usuario, accion, obj)", "LogAuditoria"]
    ]);

    // Posicionamiento en cuadrícula (4 capas: Controllers, Serializers, Services, Models)
    // Fila 1: Controladores
    pos(diag, cEmp, 60, 360, 50, 220);
    pos(diag, cPed, 420, 720, 50, 220);
    pos(diag, cPro, 780, 1080, 50, 220);

    // Fila 2: Serializadores y Servicios
    pos(diag, sEmp, 60, 360, 280, 440);
    pos(diag, sPed, 420, 720, 280, 440);
    pos(diag, sPro, 780, 1080, 280, 440);
    pos(diag, srvDesc, 1140, 1440, 280, 440);

    // Fila 3: Modelos ORM
    pos(diag, mEmp, 60, 360, 510, 700);
    pos(diag, mPed, 420, 720, 510, 700);
    pos(diag, mPro, 780, 1080, 510, 700);
    pos(diag, mLog, 1140, 1440, 510, 700);

    // Relaciones de Dependencia y Uso entre Capas
    conectarRelacion(cEmp, sEmp, "Dependency", "uses");
    conectarRelacion(cPed, sPed, "Dependency", "uses");
    conectarRelacion(cPro, sPro, "Dependency", "uses");
    conectarRelacion(cPro, srvDesc, "Dependency", "calculates_with");

    conectarRelacion(sEmp, mEmp, "Dependency", "serializes");
    conectarRelacion(sPed, mPed, "Dependency", "serializes");
    conectarRelacion(sPro, mPro, "Dependency", "serializes");

    conectarRelacion(cEmp, mLog, "Dependency", "audits");
    conectarRelacion(cPed, mLog, "Dependency", "audits");
    conectarRelacion(cPro, mLog, "Dependency", "audits");

    diag.DiagramLinks.Refresh();
    diag.Update();
    Repository.ReloadDiagram(diag.DiagramID);

    pkg.Packages.Refresh();
    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] DIAGRAMA DE DISEÑO DE CLASES DE SOFTWARE GENERADO ===", 0);
    Session.Prompt("¡Diagrama de Diseño de Clases (Software Architecture) generado con éxito!", 0);
}

function crearClase(pkg, nombre, estereotipo, atributos, metodos) {
    var c = pkg.Elements.AddNew(nombre, "Class");
    if (estereotipo && estereotipo.length > 0) {
        c.Stereotype = estereotipo;
    }
    c.Update();

    for (var i = 0; i < atributos.length; i++) {
        var a = c.Attributes.AddNew(atributos[i][0], atributos[i][1]);
        a.Visibility = "Private";
        a.Update();
    }

    for (var j = 0; j < metodos.length; j++) {
        var m = c.Methods.AddNew(metodos[j][0], metodos[j][1]);
        m.Visibility = "Public";
        m.Update();
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

function conectarRelacion(src, dst, tipo, nombre) {
    var con = src.Connectors.AddNew(nombre, tipo);
    con.SupplierID = dst.ElementID;
    con.Direction = "Source -> Destination";
    con.Update();
    src.Connectors.Refresh();
    return con;
}

main();
