' =============================================================
' VecinoMarket - Diagrama de Navegacion Web (UML 2.5+)
' Ejecutar desde EA: Scripting > New Script > VBScript
' Pega este codigo y presiona el boton "Run"
' =============================================================

Option Explicit

Sub GenerarDiagramaNavegacion()

    Dim repo As EA.Repository
    Set repo = Repository

    Dim rootModel As EA.Package
    Set rootModel = repo.Models.GetAt(0)

    Dim navPkg As EA.Package
    Dim i As Integer
    For i = 0 To rootModel.Packages.Count - 1
        Dim p As EA.Package
        Set p = rootModel.Packages.GetAt(i)
        If InStr(LCase(p.Name), "navegacion") > 0 Then
            Set navPkg = p
        End If
    Next i

    If navPkg Is Nothing Then
        Set navPkg = rootModel.Packages.AddNew("Diagramas de Navegacion Web", "")
        navPkg.Update
        rootModel.Packages.Refresh
    End If

    Dim adminPkg As EA.Package
    For i = 0 To navPkg.Packages.Count - 1
        Dim sp As EA.Package
        Set sp = navPkg.Packages.GetAt(i)
        If InStr(sp.Name, "SuperAdmin") > 0 Then
            Set adminPkg = sp
        End If
    Next i

    If adminPkg Is Nothing Then
        Set adminPkg = navPkg.Packages.AddNew("SuperAdmin - Navegacion", "")
        adminPkg.Update
        navPkg.Packages.Refresh
    End If

    Dim diag As EA.Diagram
    Set diag = adminPkg.Diagrams.AddNew("SuperAdmin-navegacion", "Logical")
    diag.Update

    Dim elems(25) As EA.Element
    Dim names(25) As String
    Dim stereos(25) As String
    Dim xs(25) As Integer
    Dim ys(25) As Integer
    Dim ws(25) As Integer
    Dim hs(25) As Integer
    Dim n As Integer
    n = 0

    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Login",           "Client page",  700,  60, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Home",            "Client page",  280, 220, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Dashboard",       "Client page",  700, 220, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Perfil",          "Client page",  280, 100, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Bitacora",        "Client page", 1100, 220, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Usuarios",        "Client page",   80, 400, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Empresas",        "Client page",  280, 400, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Roles y Planes",  "Client page",  480, 400, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Reportes",        "Client page",  680, 400, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Backup",          "Client page",  880, 400, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Categorias",      "Client page", 1080, 400, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "Pagina de Registro",        "Client page",  700, 580, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "AuthController",            "Server page", 1050,  60, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "BitacoraController",        "Server page", 1300, 220, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "UsuarioController",         "Server page",  -80, 260, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "ReportesController",        "Server page",  680, 500, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "CategoriaController",       "Server page", 1280, 400, 160, 60) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "FormLogin",                 "form",          940,  60, 140, 50) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "PerfilForm",                "form",           60, 100, 140, 50) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "RegistroForm",              "form",          530, 580, 140, 50) : n=n+1
    Call Def(n, names, stereos, xs, ys, ws, hs, "ApiService.js",             "object",        460, 400, 140, 50) : n=n+1

    Dim total As Integer
    total = n

    Dim j As Integer
    For j = 0 To total - 1
        Dim el As EA.Element
        Set el = adminPkg.Elements.AddNew(names(j), "Class")
        el.Stereotype = stereos(j)
        el.Update
        Set elems(j) = el
        Dim dObj As EA.DiagramObject
        Set dObj = diag.DiagramObjects.AddNew("", "")
        dObj.ElementID = el.ElementID
        dObj.left   =  xs(j)
        dObj.right  =  xs(j) + ws(j)
        dObj.top    = -ys(j)
        dObj.bottom = -(ys(j) + hs(j))
        dObj.Update
    Next j

    adminPkg.Elements.Refresh
    diag.DiagramObjects.Refresh

    Dim conns(40) As String
    Dim nc As Integer
    nc = 0
    conns(nc) = Idx(names,total,"Pagina de Login")      &"|"& Idx(names,total,"FormLogin")             &"|form"        : nc=nc+1
    conns(nc) = Idx(names,total,"FormLogin")             &"|"& Idx(names,total,"AuthController")       &"|Submit"      : nc=nc+1
    conns(nc) = Idx(names,total,"AuthController")        &"|"& Idx(names,total,"Pagina de Login")      &"|Client page" : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Login")       &"|"& Idx(names,total,"Pagina de Dashboard")  &"|Link"        : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Dashboard")  &"|"& Idx(names,total,"Pagina de Home")        &"|Link"        : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Dashboard")  &"|"& Idx(names,total,"Pagina de Perfil")      &"|Link"        : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Dashboard")  &"|"& Idx(names,total,"Pagina de Bitacora")    &"|Client page" : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Dashboard")  &"|"& Idx(names,total,"Pagina de Usuarios")    &"|Link"        : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Dashboard")  &"|"& Idx(names,total,"Pagina de Empresas")    &"|Link"        : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Dashboard")  &"|"& Idx(names,total,"Pagina de Roles y Planes") &"|Link"    : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Dashboard")  &"|"& Idx(names,total,"Pagina de Reportes")    &"|Link"        : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Dashboard")  &"|"& Idx(names,total,"Pagina de Backup")      &"|Link"        : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Dashboard")  &"|"& Idx(names,total,"Pagina de Categorias")  &"|Link"        : nc=nc+1
    conns(nc) = Idx(names,total,"PerfilForm")            &"|"& Idx(names,total,"Pagina de Perfil")      &"|form"        : nc=nc+1
    conns(nc) = Idx(names,total,"PerfilForm")            &"|"& Idx(names,total,"UsuarioController")     &"|Submit"      : nc=nc+1
    conns(nc) = Idx(names,total,"UsuarioController")     &"|"& Idx(names,total,"Pagina de Perfil")      &"|build"       : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Bitacora")   &"|"& Idx(names,total,"BitacoraController")    &"|build"       : nc=nc+1
    conns(nc) = Idx(names,total,"BitacoraController")   &"|"& Idx(names,total,"Pagina de Bitacora")    &"|Server page" : nc=nc+1
    conns(nc) = Idx(names,total,"UsuarioController")     &"|"& Idx(names,total,"Pagina de Usuarios")    &"|build"       : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Usuarios")   &"|"& Idx(names,total,"ApiService.js")          &"|object"      : nc=nc+1
    conns(nc) = Idx(names,total,"ApiService.js")         &"|"& Idx(names,total,"Pagina de Empresas")    &"|object"      : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Reportes")   &"|"& Idx(names,total,"ReportesController")    &"|build"       : nc=nc+1
    conns(nc) = Idx(names,total,"ReportesController")   &"|"& Idx(names,total,"Pagina de Reportes")    &"|Server page" : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Categorias") &"|"& Idx(names,total,"CategoriaController")   &"|build"       : nc=nc+1
    conns(nc) = Idx(names,total,"CategoriaController")  &"|"& Idx(names,total,"Pagina de Categorias")  &"|Server page" : nc=nc+1
    conns(nc) = Idx(names,total,"RegistroForm")          &"|"& Idx(names,total,"Pagina de Registro")    &"|form"        : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Registro")   &"|"& Idx(names,total,"UsuarioController")     &"|Submit"      : nc=nc+1
    conns(nc) = Idx(names,total,"UsuarioController")     &"|"& Idx(names,total,"Pagina de Login")       &"|Redirect"    : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Home")        &"|"& Idx(names,total,"Pagina de Login")       &"|Link"        : nc=nc+1
    conns(nc) = Idx(names,total,"Pagina de Home")        &"|"& Idx(names,total,"Pagina de Registro")    &"|Link"        : nc=nc+1

    Dim k As Integer
    For k = 0 To nc - 1
        Dim parts() As String
        parts = Split(conns(k), "|")
        Dim srcIdx As Integer : srcIdx = CInt(parts(0))
        Dim dstIdx As Integer : dstIdx = CInt(parts(1))
        Dim stereo As String  : stereo = parts(2)
        If srcIdx >= 0 And dstIdx >= 0 Then
            Dim con As EA.Connector
            Set con = elems(srcIdx).Connectors.AddNew("", "Dependency")
            con.Stereotype = stereo
            con.SupplierID = elems(dstIdx).ElementID
            con.Direction  = "Source -> Destination"
            con.Update
            elems(srcIdx).Connectors.Refresh
        End If
    Next k

    diag.Update
    repo.ReloadDiagram diag.DiagramID
    MsgBox "Diagrama generado!" & vbCrLf & "Busca: Diagramas de Navegacion Web > SuperAdmin - Navegacion", vbInformation, "VecinoMarket"

End Sub

Sub Def(n, names, stereos, xs, ys, ws, hs, nm, st, x, y, w, h)
    names(n)=nm : stereos(n)=st : xs(n)=x : ys(n)=y : ws(n)=w : hs(n)=h
End Sub

Function Idx(names, total, target)
    Dim i As Integer
    Idx = -1
    For i = 0 To total - 1
        If names(i) = target Then Idx = i : Exit Function
    Next i
End Function

GenerarDiagramaNavegacion