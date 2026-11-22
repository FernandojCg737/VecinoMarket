/*
 * ==============================================================================
 * PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos Locales)
 * MODULO: CASO DE USO 30 - GESTIONAR LISTA DE DESEOS Y ALERTAS DE PRECIO
 * IDIOMA: 100% ESPAÑOL FORMAL (Estándar Académico y Profesional UML 2.5+)
 * 
 * DIAGRAMAS INCLUIDOS EN ESTE SCRIPT:
 *   1. ANL-CU30: Diagrama de Análisis de Clases (BCE) con atributos del
 *                Modelo Conceptual Oficial y métodos en español.
 *   2. COM-CU30: Diagrama de Comunicación con flechas bidireccionales
 *                (ida hacia la derecha, retorno hacia la izquierda).
 *   3. SQ-CU30:  Diagrama de Secuencia sin notas al margen, con inicio limpio
 *                en X=60, fragmentos alt/opt desde Interfaz y loop desde Control.
 * 
 * PALETA Y MOTOR DE BASE DE DATOS:
 *   - Objetos y barras de activación: Crema suave oficial (BGR: 14873597).
 *   - Fragmentos combinados: Verde menta suave oficial (BGR: 14611941).
 *   - Compatible al 100% con repositorios DAO/Jet (.EAP) y SQLite (.QEA).
 * ==============================================================================
 */

// ==============================================================================
// PALETA DE COLORES EN FORMATO BGR (ENTERPRISE ARCHITECT)
// ==============================================================================
var C_OBJ_BG      = 14873597; // RGB(253, 243, 226) - Crema / Pergamino cálido uniforme oficial
var C_FRAG_BG     = 14611941; // RGB(229, 245, 222) - Verde menta suave oficial para fragmentos
var C_LINEA_NEGRO = 0;        // Negro puro estándar UML para mensajes de secuencia

// Colores funcionales para mensajes de comunicación
var C_COM_NEGRO = 0;          // Consultas y lecturas
var C_COM_AZUL  = 16711680;   // Mutaciones / Guardado
var C_COM_ROJO  = 255;        // Operaciones críticas / Inserciones BD
var C_COM_VERDE = 32768;      // Confirmaciones, retornos y éxitos
var C_COM_OLIVA = 32896;      // Alertas y modificaciones

// ==============================================================================
// FUNCIÓN PRINCIPAL DE EJECUCIÓN
// ==============================================================================
function main() {
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== INICIANDO GENERACIÓN OFICIAL DE DIAGRAMAS CU30 (100% ESPAÑOL) ===", 0);

    var currentPackage = Repository.GetTreeSelectedPackage();
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

    var cu30Pkg = obtenerOLimpiarPaquete(currentPackage, "CU30 - Gestionar Lista de Deseos y Alertas de Precio");
    cu30Pkg.Update();

    Repository.WriteOutput("Script", "[1/3] Generando ANL-CU30: Diagrama de Análisis de Clases (BCE)...", 0);
    generarAnalisisCU30(cu30Pkg);

    Repository.WriteOutput("Script", "[2/3] Generando COM-CU30: Diagrama de Comunicación...", 0);
    generarComunicacionCU30(cu30Pkg);

    Repository.WriteOutput("Script", "[3/3] Generando SQ-CU30: Diagrama de Secuencia...", 0);
    generarSecuenciaCU30(cu30Pkg);

    cu30Pkg.Packages.Refresh();
    currentPackage.Packages.Refresh();
    Repository.RefreshModelView(currentPackage.PackageID);

    Repository.WriteOutput("Script", "=== [OK] LOS 3 DIAGRAMAS DEL CU30 FUERON GENERADOS EXITOSAMENTE ===", 0);
    Session.Prompt("¡Los 3 diagramas del Caso de Uso 30 han sido generados exitosamente en 100% Español formal!", 0);
}

function obtenerOLimpiarPaquete(parentPkg, nombre) {
    for (var i = parentPkg.Packages.Count - 1; i >= 0; i--) {
        var p = parentPkg.Packages.GetAt(i);
        if (p.Name == nombre) {
            for (var e = p.Elements.Count - 1; e >= 0; e--) { p.Elements.Delete(e); }
            for (var d = p.Diagrams.Count - 1; d >= 0; d--) { p.Diagrams.Delete(d); }
            for (var s = p.Packages.Count - 1; s >= 0; s--) { p.Packages.Delete(s); }
            p.Elements.Refresh();
            p.Diagrams.Refresh();
            p.Packages.Refresh();
            p.Update();
            return p;
        }
    }
    var nuevo = parentPkg.Packages.AddNew(nombre, "Package");
    nuevo.Update();
    return nuevo;
}

/* ==============================================================================
 * 1. DIAGRAMA DE ANÁLISIS DE CLASES (BCE / ROBUSTEZ) - CU30 (100% ESPAÑOL)
 * Alineado exactamente al estándar del Modelo Conceptual Oficial de VecinoMarket
 * ============================================================================== */
function generarAnalisisCU30(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("ANL-CU30 - Análisis de Clases", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("class CU30. Gestionar Lista de Deseos y Alertas de Precio", "Class");
    diag.Update();

    // Actor
    var act = pkg.Elements.AddNew("Comprador", "Actor");
    act.Update();

    // Boundary («UI») en Español Formal
    var ui = crearClaseAnl(pkg, "MisDeseosView", "UI", [
        ["items", "Array<ListaDeseoItem>"],
        ["cargando", "Boolean"],
        ["totalDeseados", "Integer"],
        ["editandoAlertaId", "Integer"],
        ["precioMetaInput", "Decimal"]
    ], [
        ["cargarDeseos", "void"],
        ["alternarDeseo", "void"],
        ["actualizarAlerta", "void"],
        ["moverAlCarrito", "void"]
    ]);

    // Controller («CC») en Español Formal
    var ctrl = crearClaseAnl(pkg, "ListaDeseosViews", "CC", [], [
        ["listarDeseos", "Response"],
        ["alternarDeseo", "Response"],
        ["actualizarAlertaPrecio", "Response"],
        ["moverAlCarrito", "Response"],
        ["verificarAlertasPrecio", "Integer"]
    ]);

    // Entidad Principal («Model»): ListaDeseoItem (Atributos literales del Modelo Conceptual)
    var eDeseo = crearClaseAnl(pkg, "ListaDeseoItem", "Model", [
        ["id", "BIGSERIAL"],
        ["precio_al_guardar", "DECIMAL(10,2)"],
        ["precio_objetivo", "DECIMAL(10,2)"],
        ["notificar_baja_precio", "BOOLEAN"],
        ["ultima_alerta_enviada", "TIMESTAMP"],
        ["creado_en", "TIMESTAMP"]
    ], [
        ["es_baja_precio", "Boolean"],
        ["alcanzo_meta", "Boolean"]
    ]);

    // Entidad Relacionada: COMPRADOR
    var eComprador = crearClaseAnl(pkg, "Comprador", "Model", [
        ["id", "BIGSERIAL"],
        ["ubicacion_default", "VARCHAR(255)"],
        ["departamento", "VARCHAR(100)"]
    ], [
        ["obtener_lista_deseos", "Array<ListaDeseoItem>"]
    ]);

    // Entidad Relacionada: PRODUCTO
    var eProd = crearClaseAnl(pkg, "Producto", "Model", [
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
        ["obtener_precio_actual", "Decimal"],
        ["actualizar_precio", "void"]
    ]);

    // Entidad Relacionada: USUARIO
    var eUsuario = crearClaseAnl(pkg, "Usuario", "Model", [
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

    // Entidad Relacionada: NOTIFICACION
    var eNotif = crearClaseAnl(pkg, "Notificacion", "Model", [
        ["id", "BIGSERIAL"],
        ["tipo", "VARCHAR(50)"],
        ["titulo", "VARCHAR(150)"],
        ["mensaje", "TEXT"],
        ["enlace", "VARCHAR(255)"],
        ["leido", "BOOLEAN"],
        ["fecha_creacion", "TIMESTAMP"]
    ], [
        ["crear_alerta_precio", "Notificacion"]
    ]);

    // Posicionamiento amplio y limpio (Estilo oficial de Sprint 3)
    posAnl(diag, act,        60,  130,  280, 380);
    posAnl(diag, ui,         180, 410,  180, 430);
    posAnl(diag, ctrl,       460, 820,  200, 410);
    posAnl(diag, eDeseo,     890, 1140, 200, 430);       // Entidad Principal
    posAnl(diag, eComprador, 890, 1140, -10, 150);       // Arriba de ListaDeseoItem
    posAnl(diag, eUsuario,   890, 1140, -320, -70);      // Arriba de Comprador
    posAnl(diag, eNotif,     1220, 1480,-320, -80);      // Derecha de Usuario
    posAnl(diag, eProd,      1220, 1480, 180, 450);      // Derecha de ListaDeseoItem

    // Conexiones de control:
    conectarSimple(act, ui);
    conectarSimple(ui, ctrl);
    conectarSimple(ctrl, eDeseo); // Controller conecta ÚNICAMENTE a la entidad principal

    // Relaciones del Modelo Conceptual Oficial con cardinalidades
    conectarRelacion(eComprador, eDeseo, "guarda", "1..1", "0..*");
    conectarRelacion(eUsuario, eComprador, "tiene", "1..1", "0..1");
    conectarRelacion(eDeseo, eProd, "es_deseado_en", "0..*", "1..1");
    conectarRelacion(eUsuario, eNotif, "recibe", "1..1", "0..*");

    diag.DiagramObjects.Refresh();
    diag.Update();
}

/* ==============================================================================
 * 2. DIAGRAMA DE COMUNICACIÓN (COLABORACIÓN) - CU30 (100% ESPAÑOL Y FLECHAS EXACTAS)
 * ============================================================================== */
function generarComunicacionCU30(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("COM-CU30 - Comunicación", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("COM-CU30 - Gestionar Lista de Deseos y Alertas", "Communication");
    if (!diag.Update()) {
        diag = pkg.Diagrams.AddNew("COM-CU30 - Gestionar Lista de Deseos y Alertas", "Analysis");
        diag.Update();
    }

    var act  = pkg.Elements.AddNew("Comprador", "Actor"); act.Update();
    var bnd  = crearObjetoBCE(pkg, "Page : MisDeseosView", "boundary");
    var ctrl = crearObjetoBCE(pkg, "Gestor : ListaDeseosController", "control");

    // 4 Entidades del Modelo Conceptual
    var e1 = crearObjetoBCE(pkg, "ListaDeseoItem", "entity");
    var e2 = crearObjetoBCE(pkg, "Producto", "entity");
    var e3 = crearObjetoBCE(pkg, "Carrito", "entity");
    var e4 = crearObjetoBCE(pkg, "Notificacion", "entity");

    colocar(diag, act,  610, 655, -640, -730);
    colocar(diag, bnd,  950, 1040, -640, -740);
    colocar(diag, ctrl, 1320, 1410, -630, -730);
    colocar(diag, e1,   1580, 1685, -340, -455);
    colocar(diag, e2,   1580, 1685, -540, -655);
    colocar(diag, e3,   1580, 1685, -740, -855);
    colocar(diag, e4,   1580, 1685, -940, -1055);

    // Enlace 1: Actor <-> Boundary (Idas a la derecha act->bnd, Retornos a la izquierda bnd->act)
    var a1 = crearAsociacion(act, bnd, diag);
    crearMsg(act, bnd, diag, a1, "1", "abrirListaDeseos()", false, 1, 15, C_COM_NEGRO);
    crearMsg(act, bnd, diag, a1, "4", "alternarDeseo(productoId)", false, 4, 25, C_COM_AZUL);
    crearMsg(act, bnd, diag, a1, "7", "configurarPrecioMeta(itemId, precioMeta)", false, 7, 35, C_COM_OLIVA);
    crearMsg(act, bnd, diag, a1, "10", "moverAlCarrito(itemId)", false, 10, 45, C_COM_AZUL);
    crearMsg(bnd, act, diag, a1, "3", "renderizarItemsYAlertas(deseos)", true, 3, -15, C_COM_VERDE);
    crearMsg(bnd, act, diag, a1, "6", "actualizarIconoFavorito(enDeseos)", true, 6, -25, C_COM_AZUL);
    crearMsg(bnd, act, diag, a1, "9", "mostrarAlertaExito('Meta guardada')", true, 9, -35, C_COM_VERDE);
    crearMsg(bnd, act, diag, a1, "13", "mostrarAlertaExito('Movido al carrito')", true, 13, -45, C_COM_VERDE);

    // Enlace 2: Boundary <-> Control (Idas a la derecha bnd->ctrl, Retornos a la izquierda ctrl->bnd)
    var a2 = crearAsociacion(bnd, ctrl, diag);
    crearMsg(bnd, ctrl, diag, a2, "1.1", "listarDeseos(comprador)", false, 2, 15, C_COM_NEGRO);
    crearMsg(bnd, ctrl, diag, a2, "4.1", "alternarDeseo(productoId)", false, 5, 25, C_COM_AZUL);
    crearMsg(bnd, ctrl, diag, a2, "7.1", "actualizarAlertaPrecio(itemId, precioMeta)", false, 8, 35, C_COM_OLIVA);
    crearMsg(bnd, ctrl, diag, a2, "10.1", "moverAlCarrito(itemId)", false, 11, 45, C_COM_AZUL);
    crearMsg(ctrl, bnd, diag, a2, "2.1", "retornarListaDeseos(data)", true, 2, -15, C_COM_VERDE);
    crearMsg(ctrl, bnd, diag, a2, "5.1", "retornarEstadoDeseo(enDeseos)", true, 5, -25, C_COM_AZUL);
    crearMsg(ctrl, bnd, diag, a2, "8.1", "confirmarAlertaGuardada(item)", true, 8, -35, C_COM_VERDE);
    crearMsg(ctrl, bnd, diag, a2, "12.1", "confirmarTransferenciaCarrito()", true, 12, -45, C_COM_VERDE);

    // Enlaces Control <-> Entidades
    var aDeseo = crearAsociacion(ctrl, e1, diag);
    crearMsg(ctrl, e1, diag, aDeseo, "1.2", "ListaDeseoItem.objects.filter(comprador)", false, 2, 15, C_COM_NEGRO);
    crearMsg(ctrl, e1, diag, aDeseo, "4.2", "create_or_delete(comprador, producto)", false, 5, 25, C_COM_ROJO);
    crearMsg(ctrl, e1, diag, aDeseo, "7.2", "item.save(update_fields=['precio_objetivo'])", false, 8, 15, C_COM_OLIVA);
    crearMsg(ctrl, e1, diag, aDeseo, "10.3", "item.delete()", false, 12, 35, C_COM_ROJO);

    var aProd = crearAsociacion(ctrl, e2, diag);
    crearMsg(ctrl, e2, diag, aProd, "1.3", "select_related('producto__empresa')", false, 3, 15, C_COM_NEGRO);
    crearMsg(ctrl, e2, diag, aProd, "4.3", "get_object_or_404(Producto, id=producto_id)", false, 6, 25, C_COM_NEGRO);
    crearMsg(ctrl, e2, diag, aProd, "10.2", "validarStockDisponible(producto)", false, 11, 35, C_COM_OLIVA);

    var aCar = crearAsociacion(ctrl, e3, diag);
    crearMsg(ctrl, e3, diag, aCar, "10.4", "Carrito.objects.get_or_create(comprador, ABIERTO)", false, 12, 15, C_COM_AZUL);
    crearMsg(ctrl, e3, diag, aCar, "10.5", "CarritoItem.objects.create(carrito, producto)", false, 13, 25, C_COM_ROJO);

    var aNotif = crearAsociacion(ctrl, e4, diag);
    crearMsg(ctrl, e4, diag, aNotif, "14", "verificarAlertasPrecio(producto, nuevo_precio)", false, 14, 15, C_COM_VERDE);
    crearMsg(ctrl, e4, diag, aNotif, "15", "Notificacion.objects.create(usuario, 'ALERTA_PRECIO')", false, 15, 25, C_COM_VERDE);

    finalizarDiag(diag);
}

/* ==============================================================================
 * 3. DIAGRAMA DE SECUENCIA - CU30 (100% ESPAÑOL, SIN NOTAS, FRAGMENTOS EXACTOS)
 * ============================================================================== */
function generarSecuenciaCU30(parentPkg) {
    var pkg = parentPkg.Packages.AddNew("SQ-CU30 - Secuencia", "Package");
    pkg.Update();

    var diag = pkg.Diagrams.AddNew("SQ-CU30 - Gestionar Lista de Deseos y Alertas", "Sequence");
    diag.Update();

    // 1. Creación de Lifelines en Español formal (Exactamente las 7 clases del CU30 con sus 4 Entidades)
    var act   = crearLifeline(pkg, "Comprador", "actor");
    var ui    = crearLifeline(pkg, "MisDeseosView", "boundary");
    var ctrl  = crearLifeline(pkg, "ListaDeseosController", "control");
    var e1    = crearLifeline(pkg, "ListaDeseoItem", "entity");
    var e2    = crearLifeline(pkg, "Producto", "entity");
    var e3    = crearLifeline(pkg, "Carrito", "entity");
    var e4    = crearLifeline(pkg, "Notificacion", "entity");

    // 2. Posicionamiento horizontal de Lifelines (Inicia limpio en X=60)
    colocarLifeline(diag, act,   60,  150,  -30, -1480, C_OBJ_BG);
    colocarLifeline(diag, ui,    240, 350,  -30, -1480, C_OBJ_BG);
    colocarLifeline(diag, ctrl,  450, 560,  -30, -1480, C_OBJ_BG);
    colocarLifeline(diag, e1,    660, 770,  -30, -1480, C_OBJ_BG);
    colocarLifeline(diag, e2,    870, 980,  -30, -1480, C_OBJ_BG);
    colocarLifeline(diag, e3,    1080, 1190,-30, -1480, C_OBJ_BG);
    colocarLifeline(diag, e4,    1290, 1400,-30, -1480, C_OBJ_BG);

    // =========================================================================
    // FLUJO 1: Consultar Lista de Deseos (abrirListaDeseos) - Ida y Vuelta Completa
    // =========================================================================
    crearMsgSeq(act, ui, diag, "1", "abrirListaDeseos()", false, 1, -80, C_LINEA_NEGRO);
    crearMsgSeq(ui, ctrl, diag, "1.1", "listarDeseos(comprador)", false, 2, -110, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "1.2", "ListaDeseoItem.objects.filter(comprador=comprador)", false, 3, -140, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "1.3", "retorno: [ListaDeseoItem]", true, 4, -170, C_LINEA_NEGRO);

    // Fragmento loop: Bucle interno en el controlador (inicia en Control)
    crearFragmento(pkg, diag, "[por cada producto guardado]", "loop", 430, 1000, -190, -270);
    crearMsgSeq(ctrl, e2, diag, "1.4", "obtenerPrecioActual(producto)", false, 5, -210, C_LINEA_NEGRO);
    crearMsgSeq(e2, ctrl, diag, "1.5", "retorno: precioActual", true, 6, -240, C_LINEA_NEGRO);

    // Retornos hasta el Actor
    crearMsgSeq(ctrl, ui, diag, "1.6", "retornarListaDeseos(items, alertasBaja)", true, 7, -290, C_LINEA_NEGRO);
    crearMsgSeq(ui, act, diag, "1.7", "renderizarItemsYAlertas(deseos)", true, 8, -320, C_LINEA_NEGRO);

    // =========================================================================
    // FLUJO 2: Alternar Favorito Toggle (alternarDeseo) - Ida y Vuelta Completa
    // =========================================================================
    crearMsgSeq(act, ui, diag, "2", "alternarDeseo(productoId)", false, 9, -390, C_LINEA_NEGRO);

    // Fragmento alt: INICIA DESDE LA INTERFAZ (ui: 220 hasta e1: 790)
    crearFragmento(pkg, diag, "[producto no guardado | else: producto ya en lista]", "alt", 220, 790, -415, -680);
    // Rama 1: Guardar nuevo
    crearMsgSeq(ui, ctrl, diag, "2.1a", "alternarDeseo(productoId)", false, 10, -440, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "2.2a", "ListaDeseoItem.objects.create(comprador, producto, precioActual)", false, 11, -465, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "2.3a", "confirmacion(+id)", true, 12, -490, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, ui, diag, "2.4a", "mostrarMensaje('Guardado en favoritos')", true, 13, -515, C_LINEA_NEGRO);
    crearMsgSeq(ui, act, diag, "2.5a", "actualizarIconoFavorito(activo=true)", true, 14, -540, C_LINEA_NEGRO);

    // Rama 2: Quitar existente (else)
    crearMsgSeq(ui, ctrl, diag, "2.1b", "alternarDeseo(productoId)", false, 15, -570, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "2.2b", "ListaDeseoItem.objects.filter(comprador, producto).delete()", false, 16, -595, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "2.3b", "confirmacion(eliminado)", true, 17, -620, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, ui, diag, "2.4b", "mostrarMensaje('Eliminado de favoritos')", true, 18, -645, C_LINEA_NEGRO);
    crearMsgSeq(ui, act, diag, "2.5b", "actualizarIconoFavorito(activo=false)", true, 19, -670, C_LINEA_NEGRO);

    // =========================================================================
    // FLUJO 3: Configurar Alerta de Precio Meta (configurarPrecioMeta) - Ida y Vuelta
    // =========================================================================
    // Espacio amplio: el mensaje del usuario va en Y=-750 y el fragmento opt inicia en Y=-780
    crearMsgSeq(act, ui, diag, "3", "configurarPrecioMeta(itemId, precioMeta)", false, 20, -750, C_LINEA_NEGRO);

    // Fragmento opt: INICIA DESDE LA INTERFAZ (ui: 220 hasta e4: 1420)
    crearFragmento(pkg, diag, "[precio meta válido > 0]", "opt", 220, 1420, -780, -980);
    crearMsgSeq(ui, ctrl, diag, "3.1", "actualizarAlertaPrecio(itemId, precioMeta)", false, 21, -805, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "3.2", "item.save(update_fields=['precio_objetivo'])", false, 22, -835, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "3.3", "confirmacion(actualizado)", true, 23, -865, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e4, diag, "3.4", "Notificacion.objects.create(usuario, 'ALERTA_PRECIO')", false, 24, -895, C_LINEA_NEGRO);
    crearMsgSeq(e4, ctrl, diag, "3.5", "confirmacion(notificacionId)", true, 25, -920, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, ui, diag, "3.6", "mostrarNotificacionExito('Alerta configurada')", true, 26, -945, C_LINEA_NEGRO);
    crearMsgSeq(ui, act, diag, "3.7", "mostrarToastExito('Alerta configurada')", true, 27, -970, C_LINEA_NEGRO);

    // =========================================================================
    // FLUJO 4: Mover Producto al Carrito (moverAlCarrito) - Ida y Vuelta Completa
    // =========================================================================
    crearMsgSeq(act, ui, diag, "4", "moverAlCarrito(itemId)", false, 28, -1040, C_LINEA_NEGRO);

    // Fragmento opt: INICIA DESDE LA INTERFAZ (ui: 220 hasta e3: 1210)
    crearFragmento(pkg, diag, "[producto disponible con stock activo]", "opt", 220, 1210, -1070, -1400);
    crearMsgSeq(ui, ctrl, diag, "4.1", "moverAlCarrito(itemId, mantener=false)", false, 29, -1095, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e2, diag, "4.2", "validarStockDisponible(producto)", false, 30, -1125, C_LINEA_NEGRO);
    crearMsgSeq(e2, ctrl, diag, "4.3", "confirmacionStock(disponible=true)", true, 31, -1155, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e3, diag, "4.4", "Carrito.objects.get_or_create(comprador, ABIERTO)", false, 32, -1185, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e3, diag, "4.5", "CarritoItem.objects.create(carrito, producto, cantidad=1)", false, 33, -1215, C_LINEA_NEGRO);
    crearMsgSeq(e3, ctrl, diag, "4.6", "confirmacionCarrito(+itemId)", true, 34, -1245, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, e1, diag, "4.7", "ListaDeseoItem.objects.filter(id=itemId).delete()", false, 35, -1275, C_LINEA_NEGRO);
    crearMsgSeq(e1, ctrl, diag, "4.8", "confirmacion(eliminado)", true, 36, -1305, C_LINEA_NEGRO);
    crearMsgSeq(ctrl, ui, diag, "4.9", "mostrarMensaje('Movido al carrito')", true, 37, -1340, C_LINEA_NEGRO);
    crearMsgSeq(ui, act, diag, "4.10", "actualizarBadgeCarritoYQuitarFila()", true, 38, -1370, C_LINEA_NEGRO);

    finalizarDiag(diag);
}

// ==============================================================================
// FUNCIONES AUXILIARES DE CREACIÓN Y FORMATO (COMPATIBILIDAD DAO ESTRICTA)
// ==============================================================================
function crearClaseAnl(pkg, nombre, estereotipo, atributos, metodos) {
    var c = pkg.Elements.AddNew(nombre, "Class");
    if (estereotipo && estereotipo.length > 0) {
        c.Stereotype = estereotipo;
    }
    c.Update();

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

function posAnl(diag, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + (-t) + ";b=" + (-b) + ";";
    var dObj = diag.DiagramObjects.AddNew(coords, "");
    dObj.ElementID = elem.ElementID;
    dObj.Update();
    return dObj;
}

function crearObjetoBCE(pkg, nombre, estereotipo) {
    var obj = pkg.Elements.AddNew(nombre, "Object");
    obj.Stereotype = estereotipo;
    obj.Update();

    var sql = "UPDATE t_object SET StyleEx = 'Presentation=1;' WHERE Object_ID = " + obj.ElementID;
    Repository.Execute(sql);

    return obj;
}

function crearLifeline(pkg, nombre, estereotipo) {
    var elem = pkg.Elements.AddNew(nombre, estereotipo == "actor" ? "Actor" : "Sequence");
    if (estereotipo != "actor") {
        elem.Stereotype = estereotipo;
    }
    elem.Update();
    return elem;
}

function colocarElem(diag, elem, left, right, top, bottom, colorBGR) {
    var coords = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
    var diagObj = diag.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    if (colorBGR !== undefined && colorBGR !== null) {
        diagObj.BackgroundColor = colorBGR;
    }
    diagObj.Update();

    if (colorBGR !== undefined && colorBGR !== null) {
        var sql = "UPDATE t_diagramobjects SET ObjectStyle = 'BCol=" + colorBGR + ";BFmt=0;' " +
                  "WHERE Diagram_ID = " + diag.DiagramID + " AND Object_ID = " + elem.ElementID;
        Repository.Execute(sql);
    }
    return diagObj;
}

function colocarLifeline(diag, elem, left, right, top, bottom, colorBGR) {
    return colocarElem(diag, elem, left, right, top, bottom, colorBGR);
}

function colocar(diag, elem, l, r, t, b) {
    var coords = "l=" + l + ";r=" + r + ";t=" + t + ";b=" + b + ";";
    var diagObj = diag.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = elem.ElementID;
    diagObj.Update();
    return diagObj;
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

function crearFragmento(pkg, diag, condicion, operador, left, right, top, bottom) {
    var subTypeVal = 0; // 0 = alt (por defecto)
    if (operador === "opt") subTypeVal = 1;
    else if (operador === "loop") subTypeVal = 4;
    else if (operador === "break") subTypeVal = 2;
    else if (operador === "par") subTypeVal = 3;
    else if (operador === "critical") subTypeVal = 5;

    // Condición limpia entre corchetes
    var nombreFrag = condicion;
    if (nombreFrag.indexOf("[") !== 0) {
        nombreFrag = "[" + nombreFrag + "]";
    }

    var frag = pkg.Elements.AddNew(nombreFrag, "InteractionFragment");
    frag.Subtype = subTypeVal; // 0 = alt, 1 = opt, 4 = loop (Define el operador nativo de EA)
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

    var sqlDiag = "UPDATE t_diagramobjects SET ObjectStyle = 'BCol=" + C_FRAG_BG + ";BFmt=0;' " +
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
