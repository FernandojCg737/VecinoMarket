from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.gis.db import models as gis_models
from django.db import models

from apps.core.models import BaseModel
from .managers import UsuarioManager


class Usuario(AbstractBaseUser, PermissionsMixin):
    class Rol(models.TextChoices):
        SUPERADMIN = 'SUPERADMIN', 'Super administrador'
        ADMIN = 'ADMIN', 'Administrador de soporte'
        EMPRESA = 'EMPRESA', 'Empresa'
        EMPLEADO = 'EMPLEADO', 'Empleado'
        COMPRADOR = 'COMPRADOR', 'Comprador'

    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        INACTIVO = 'INACTIVO', 'Inactivo'
        BLOQUEADO = 'BLOQUEADO', 'Bloqueado'

    email = models.EmailField(max_length=150, unique=True)
    # CU01: para cuentas de EMPRESA, `email` es un identificador generado
    # (no una casilla real — ver generar_correo_empresa), así que los avisos
    # (credenciales, reset de password) van a este correo real en su lugar.
    # Vacío para COMPRADOR/EMPLEADO/ADMIN, donde `email` ya es real.
    correo_recuperacion = models.EmailField(max_length=150, blank=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    rol = models.CharField(max_length=20, choices=Rol.choices)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombre']

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f'{self.nombre} ({self.get_rol_display()})'

    def es_admin(self):
        """Personal de la plataforma (soporte o dueño). Para acciones
        exclusivas del dueño, usar es_superadmin()."""
        return self.rol in (self.Rol.ADMIN, self.Rol.SUPERADMIN)

    def es_superadmin(self):
        return self.rol == self.Rol.SUPERADMIN

    def es_empresa(self):
        return self.rol == self.Rol.EMPRESA

    def es_empleado(self):
        return self.rol == self.Rol.EMPLEADO

    def es_comprador(self):
        return self.rol == self.Rol.COMPRADOR

    def get_empresa(self):
        """Empresa (tenant) asociada, según el rol. None para SUPERADMIN, ADMIN y COMPRADOR."""
        if self.rol == self.Rol.EMPRESA:
            return getattr(self, 'empresa', None)
        if self.rol == self.Rol.EMPLEADO:
            empleado = getattr(self, 'empleado', None)
            return empleado.empresa if empleado else None
        return None


class Permiso(BaseModel):
    """Catálogo de permisos de la plataforma (CU24)."""

    codigo = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(max_length=200)

    class Meta:
        verbose_name = 'Permiso'
        verbose_name_plural = 'Permisos'

    def __str__(self):
        return self.codigo


class RolBase(BaseModel):
    """Roles base de la plataforma definidos por el administrador (CU24)."""

    nombre = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name = 'Rol base'
        verbose_name_plural = 'Roles base'

    def __str__(self):
        return self.nombre


class RolBasePermiso(models.Model):
    rol_base = models.ForeignKey(RolBase, on_delete=models.CASCADE, related_name='permisos')
    permiso = models.ForeignKey(Permiso, on_delete=models.CASCADE, related_name='+')

    class Meta:
        verbose_name = 'Permiso de rol base'
        verbose_name_plural = 'Permisos de rol base'
        unique_together = ('rol_base', 'permiso')

    def __str__(self):
        return f'{self.rol_base.nombre} -> {self.permiso.codigo}'


class SolicitudEmpresa(BaseModel):
    """CU01: solicitud de cuenta de empresa, previa a la aprobación del admin."""

    class Estado(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        APROBADA = 'APROBADA', 'Aprobada'
        RECHAZADA = 'RECHAZADA', 'Rechazada'

    usuario_solicitante = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='solicitudes_empresa'
    )
    razon_social = models.CharField(max_length=150)
    nit = models.CharField(max_length=30)
    documento_url = models.URLField(max_length=255, blank=True)
    plan = models.ForeignKey(
        'suscripciones.Plan', on_delete=models.PROTECT, null=True, blank=True, related_name='solicitudes_empresa',
        help_text='CU01: plan elegido al solicitar. Nulo solo en solicitudes viejas, previas a esta funcionalidad.',
    )
    paypal_order_id = models.CharField(
        max_length=50, blank=True,
        help_text='CU01: orden de PayPal abierta para pagar un plan Básico/Premium (vacío para el plan Prueba).',
    )
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    revisado_por_admin = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name='solicitudes_revisadas'
    )
    motivo_rechazo = models.CharField(max_length=255, blank=True)
    fecha_revision = models.DateTimeField(null=True, blank=True)
    codigo_referido = models.CharField(
        max_length=80, blank=True,
        help_text='CU27: slug de la empresa que lo invitó, si se registró con un código de referido.',
    )

    class Meta:
        verbose_name = 'Solicitud de empresa'
        verbose_name_plural = 'Solicitudes de empresa'

    def __str__(self):
        return f'{self.razon_social} ({self.estado})'


class Empresa(BaseModel):
    """CU01 + CU25: la empresa (tenant) ya aprobada."""

    class Estado(models.TextChoices):
        ACTIVA = 'ACTIVA', 'Activa'
        SUSPENDIDA = 'SUSPENDIDA', 'Suspendida'
        CANCELADA = 'CANCELADA', 'Cancelada'

    usuario_dueno = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='empresa')
    solicitud = models.ForeignKey(
        SolicitudEmpresa, on_delete=models.SET_NULL, null=True, blank=True, related_name='empresas'
    )
    razon_social = models.CharField(max_length=150)
    nit = models.CharField(max_length=30)
    slug = models.SlugField(max_length=80, unique=True)
    logo_url = models.URLField(max_length=255, blank=True)
    color_marca = models.CharField(max_length=7, blank=True)
    descripcion = models.CharField(max_length=500, blank=True)
    ubicacion = gis_models.PointField(geography=True, srid=4326, null=True, blank=True)
    departamento = models.CharField(max_length=60, blank=True)
    ciudad = models.CharField(max_length=60, blank=True)
    plan = models.ForeignKey(
        'suscripciones.Plan', on_delete=models.SET_NULL, null=True, blank=True, related_name='empresas'
    )
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    referida_por = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='referidas',
        help_text='CU27: empresa cuyo código de referido se usó al registrarse.',
    )
    bloqueo_live_hasta = models.DateTimeField(
        null=True, blank=True,
        help_text='CU17: si está en el futuro, la empresa no puede emitir en vivo (sanción por incumplimiento).',
    )

    class Meta:
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'

    def __str__(self):
        return self.razon_social


class Empleado(BaseModel):
    """CU09: empleados de una empresa."""

    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        INACTIVO = 'INACTIVO', 'Inactivo'

    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='empleado')
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='empleados')
    cargo = models.CharField(max_length=60, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)

    class Meta:
        verbose_name = 'Empleado'
        verbose_name_plural = 'Empleados'
        indexes = [models.Index(fields=['empresa'])]

    def __str__(self):
        return f'{self.usuario.email} @ {self.empresa.razon_social}'


class EmpleadoPermiso(models.Model):
    """CU09: permisos específicos que la empresa asigna a cada empleado."""

    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='permisos')
    permiso = models.ForeignKey(Permiso, on_delete=models.CASCADE, related_name='+')

    class Meta:
        verbose_name = 'Permiso de empleado'
        verbose_name_plural = 'Permisos de empleados'
        unique_together = ('empleado', 'permiso')

    def __str__(self):
        return f'{self.empleado} -> {self.permiso.codigo}'


class Comprador(BaseModel):
    """CU03: comprador (rol global, no pertenece a ninguna empresa)."""

    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='comprador')
    ubicacion_default = gis_models.PointField(geography=True, srid=4326, null=True, blank=True)
    departamento = models.CharField(max_length=60, blank=True)

    class Meta:
        verbose_name = 'Comprador'
        verbose_name_plural = 'Compradores'

    def __str__(self):
        return self.usuario.email


class Direccion(BaseModel):
    comprador = models.ForeignKey(Comprador, on_delete=models.CASCADE, related_name='direcciones')
    alias = models.CharField(max_length=50, blank=True)
    direccion_texto = models.CharField(max_length=255)
    ubicacion = gis_models.PointField(geography=True, srid=4326)
    departamento = models.CharField(max_length=60, blank=True)
    ciudad = models.CharField(max_length=60, blank=True)
    es_predeterminada = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Dirección'
        verbose_name_plural = 'Direcciones'

    def __str__(self):
        return f'{self.alias or "Dirección"} - {self.comprador.usuario.email}'
