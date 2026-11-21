# ==============================================================================
# PROYECTO: VecinoMarket (Plataforma Multicategoría de Emprendimientos)
# SCRIPT POWERSHELL: Generación del Diagrama de Comunicación CU09 en Enterprise Architect
# ESTILO: Oficial EA (Iconos Robustez BCE circulares nativos, sin duplicados)
# ==============================================================================

try {
    $ea = [System.Runtime.InteropServices.Marshal]::GetActiveObject("EA.App")
    $repo = $ea.Repository
    Write-Host "[OK] Conectado a la instancia activa de Enterprise Architect." -ForegroundColor Green
} catch {
    Write-Host "[INFO] Iniciando conexión COM con EA.App..." -ForegroundColor Yellow
    $ea = New-Object -ComObject EA.App
    $repo = $ea.Repository
}

$pkg = $repo.GetTreeSelectedPackage()
if ($null -eq $pkg) {
    $model = $repo.Models.GetAt(0)
    $pkg = $model.Packages.AddNew("Diagramas de Comunicacion Sprint 3", "")
    $pkg.Update()
}

$subPkg = $pkg.Packages.AddNew("CU09 - Gestionar Empleados y Permisos (Comunicacion)", "")
$subPkg.Update()

$diag = $subPkg.Diagrams.AddNew("COM-CU09 - Gestionar Empleados y Permisos", "Communication")
if (-not $diag.Update()) {
    $diag = $subPkg.Diagrams.AddNew("COM-CU09 - Gestionar Empleados y Permisos", "Analysis")
    $diag.Update()
}

# 1. Elementos BCE Nativos como "Object"
$act = $subPkg.Elements.AddNew("Empresa", "Actor")
$act.Update()

$bnd = $subPkg.Elements.AddNew("Page : EmpleadosPermisosView", "Object")
$bnd.Stereotype = "boundary"
$bnd.Update()

$ctrl = $subPkg.Elements.AddNew("Gestor : EmpleadosController", "Object")
$ctrl.Stereotype = "control"
$ctrl.Update()

$ent1 = $subPkg.Elements.AddNew("Empleado", "Object")
$ent1.Stereotype = "entity"
$ent1.Update()

$ent2 = $subPkg.Elements.AddNew("Usuario", "Object")
$ent2.Stereotype = "entity"
$ent2.Update()

$ent3 = $subPkg.Elements.AddNew("EmpleadoPermiso", "Object")
$ent3.Stereotype = "entity"
$ent3.Update()

$ent4 = $subPkg.Elements.AddNew("Permiso", "Object")
$ent4.Stereotype = "entity"
$ent4.Update()

$subPkg.Elements.Refresh()

# Función para posicionar elemento con proporciones circulares
function Colocar-Elemento($d, $el, $l, $r, $t, $b) {
    $obj = $d.DiagramObjects.AddNew("l=$l;r=$r;t=$t;b=$b;", "")
    $obj.ElementID = $el.ElementID
    $obj.Update()
}

Colocar-Elemento $diag $act 610 655 -640 -730
Colocar-Elemento $diag $bnd 950 1040 -640 -740
Colocar-Elemento $diag $ctrl 1320 1410 -630 -730
Colocar-Elemento $diag $ent1 1580 1685 -340 -455
Colocar-Elemento $diag $ent2 1580 1685 -540 -655
Colocar-Elemento $diag $ent3 1580 1685 -740 -855
Colocar-Elemento $diag $ent4 1580 1685 -940 -1055

$diag.DiagramObjects.Refresh()

# Funciones de Enlaces y Mensajes
function Crear-Asociacion($src, $dst, $d) {
    $assoc = $src.Connectors.AddNew("", "Association")
    $assoc.SupplierID = $dst.ElementID
    $assoc.Direction = "Unspecified"
    $assoc.Update()
    
    $dlink = $d.DiagramLinks.AddNew("", "")
    $dlink.ConnectorID = $assoc.ConnectorID
    $dlink.Style = "Mode=1;Color=-1;LWidth=0;"
    $dlink.Update()
    return $assoc.ConnectorID
}

function Crear-Mensaje($src, $dst, $d, $assocId, $seqStr, $label, $esRetorno, $seqInt, $offsetY, $color) {
    $msg = $src.Connectors.AddNew($label, "Collaboration")
    $msg.SupplierID = $dst.ElementID
    $msg.Direction = if ($esRetorno) { "Destination -> Source" } else { "Source -> Destination" }
    $msg.DiagramID = $d.DiagramID
    $msg.Update()

    $sql = "UPDATE t_connector SET SourceIsAggregate=$assocId, SeqNo=$seqInt, PDATA1='Synchronous', PDATA3='Call', PDATA4='$seqStr', PDATA5='SX=0;SY=$offsetY;EX=0;EY=0;', HeadStyle=1, RouteStyle=3 WHERE Connector_ID=$($msg.ConnectorID)"
    $repo.Execute($sql)

    $dlink = $d.DiagramLinks.AddNew("", "")
    $dlink.ConnectorID = $msg.ConnectorID
    $dlink.Geometry = "SX=0;SY=$offsetY;EX=0;EY=0;EDGE=2;"
    $dlink.Style = "Mode=1;Color=$color;LWidth=0;"
    $dlink.Update()
}

# Colores BGR
$C_NEGRO = 0
$C_AZUL  = 16711680
$C_ROJO  = 255
$C_VERDE = 32768
$C_OLIVA = 32896

# ENLACE 1: Empresa <-> Page
$a1 = Crear-Asociacion $act $bnd $diag
Crear-Mensaje $act $bnd $diag $a1 "1" "consultarEmpleados(empresa_id)" $false 1 15 $C_NEGRO
Crear-Mensaje $act $bnd $diag $a1 "4" "registrarEmpleado(datos, cargo)" $false 4 25 $C_AZUL
Crear-Mensaje $act $bnd $diag $a1 "8" "asignarPermiso(empleado_id, cod_permiso)" $false 8 35 $C_OLIVA
Crear-Mensaje $act $bnd $diag $a1 "12" "actualizarMatrizPermisos()" $true 12 -15 $C_VERDE

# ENLACE 2: Page <-> Gestor
$a2 = Crear-Asociacion $bnd $ctrl $diag
Crear-Mensaje $bnd $ctrl $diag $a2 "1.1" "get(/api/v1/usuarios/empleados/?empresa=id)" $false 2 15 $C_NEGRO
Crear-Mensaje $bnd $ctrl $diag $a2 "4.1" "post(/api/v1/usuarios/empleados/)" $false 5 25 $C_AZUL
Crear-Mensaje $bnd $ctrl $diag $a2 "8.1" "post(/api/v1/usuarios/empleados/permisos/)" $false 9 35 $C_OLIVA
Crear-Mensaje $bnd $ctrl $diag $a2 "3" "renderizarTablaEmpleados(empleados)" $true 3 -15 $C_VERDE
Crear-Mensaje $bnd $ctrl $diag $a2 "7" "notificarRegistroExitoso(empleado)" $true 7 -25 $C_AZUL
Crear-Mensaje $bnd $ctrl $diag $a2 "11" "notificarPermisoAsignado()" $true 11 -35 $C_ROJO

# ENLACES Control <-> Entidades
$a3 = Crear-Asociacion $ctrl $ent1 $diag
Crear-Mensaje $ctrl $ent1 $diag $a3 "2" "SELECT Empleado WHERE empresa_id" $false 2 15 $C_OLIVA
Crear-Mensaje $ctrl $ent1 $diag $a3 "6" "INSERT Empleado(usuario_id, empresa_id, cargo)" $false 6 25 $C_VERDE

$a4 = Crear-Asociacion $ctrl $ent2 $diag
Crear-Mensaje $ctrl $ent2 $diag $a4 "5" "INSERT Usuario(username, password, email)" $false 5 15 $C_ROJO

$a5 = Crear-Asociacion $ctrl $ent3 $diag
Crear-Mensaje $ctrl $ent3 $diag $a5 "10" "INSERT EmpleadoPermiso(empleado_id, permiso_id)" $false 10 15 $C_NEGRO

$a6 = Crear-Asociacion $ctrl $ent4 $diag
Crear-Mensaje $ctrl $ent4 $diag $a6 "9" "SELECT Permiso WHERE codigo=cod_permiso" $false 9 15 $C_NEGRO

$diag.DiagramLinks.Refresh()
$diag.Update()
$repo.ReloadDiagram($diag.DiagramID)
$repo.OpenDiagram($diag.DiagramID)
$repo.RefreshModelView($pkg.PackageID)

Write-Host "Diagrama de Comunicacion CU09 generado con exito con formas circulares BCE nativas." -ForegroundColor Cyan
