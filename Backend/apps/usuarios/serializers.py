import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.contrib.gis.geos import Point
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.suscripciones.models import Plan, Suscripcion

from .models import Comprador, Direccion, Empleado, Empresa, Permiso, RolBase, SolicitudEmpresa, Usuario

logger = logging.getLogger(__name__)


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        empresa = user.get_empresa()
        token['rol'] = user.rol
        token['empresa_id'] = empresa.id if empresa else None
        token['nombre'] = user.nombre
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.estado != Usuario.Estado.ACTIVO:
            raise serializers.ValidationError('El usuario no está activo.')
        return data


class SolicitudEmpresaSerializer(serializers.ModelSerializer):
    """CU01: solicitud de cuenta de empresa con el plan Prueba — se aprueba
    sola (SolicitarEmpresaView crea la cuenta de una). Los planes Básico y
    Premium requieren pago y pasan por SolicitarEmpresaCheckoutView en vez
    de este serializer."""

    plan_id = serializers.PrimaryKeyRelatedField(
        queryset=Plan.objects.filter(estado=Plan.Estado.ACTIVO), source='plan'
    )
    plan_nombre = serializers.CharField(source='plan.nombre', read_only=True)

    class Meta:
        model = SolicitudEmpresa
        fields = [
            'id', 'razon_social', 'nit', 'documento_url', 'plan_id', 'plan_nombre',
            'estado', 'motivo_rechazo', 'codigo_referido', 'creado_en',
        ]
        read_only_fields = ['id', 'plan_nombre', 'estado', 'motivo_rechazo', 'creado_en']

    def validate_plan_id(self, plan):
        if plan.codigo != Plan.Codigo.PRUEBA:
            raise serializers.ValidationError(
                'Este plan requiere pago — usa el checkout de planes en vez de esta solicitud directa.'
            )
        return plan

    def create(self, validated_data):
        usuario = self.context['request'].user
        return SolicitudEmpresa.objects.create(usuario_solicitante=usuario, **validated_data)


class AprobarSolicitudSerializer(serializers.Serializer):
    slug = serializers.SlugField()

    def validate_slug(self, value):
        if Empresa.objects.filter(slug=value).exists():
            raise serializers.ValidationError('Ya existe una empresa con ese slug.')
        return value

    def save(self):
        solicitud = self.context['solicitud']
        admin = self.context['request'].user

        referente = None
        if solicitud.codigo_referido:
            referente = Empresa.objects.filter(slug=solicitud.codigo_referido).exclude(
                usuario_dueno=solicitud.usuario_solicitante
            ).first()

        empresa = Empresa.objects.create(
            usuario_dueno=solicitud.usuario_solicitante,
            solicitud=solicitud,
            razon_social=solicitud.razon_social,
            nit=solicitud.nit,
            slug=self.validated_data['slug'],
            referida_por=referente,
        )

        solicitud.usuario_solicitante.rol = Usuario.Rol.EMPRESA
        solicitud.usuario_solicitante.save(update_fields=['rol'])

        solicitud.estado = SolicitudEmpresa.Estado.APROBADA
        solicitud.revisado_por_admin = admin
        solicitud.fecha_revision = timezone.now()
        solicitud.save(update_fields=['estado', 'revisado_por_admin', 'fecha_revision'])

        return empresa


class RechazarSolicitudSerializer(serializers.Serializer):
    motivo_rechazo = serializers.CharField(max_length=255)

    def save(self):
        solicitud = self.context['solicitud']
        admin = self.context['request'].user
        solicitud.estado = SolicitudEmpresa.Estado.RECHAZADA
        solicitud.revisado_por_admin = admin
        solicitud.motivo_rechazo = self.validated_data['motivo_rechazo']
        solicitud.fecha_revision = timezone.now()
        solicitud.save(update_fields=['estado', 'revisado_por_admin', 'motivo_rechazo', 'fecha_revision'])
        return solicitud


class CrearEmpleadoSerializer(serializers.Serializer):
    email = serializers.EmailField()
    nombre = serializers.CharField(max_length=100)
    apellido = serializers.CharField(max_length=100, required=False, allow_blank=True)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    cargo = serializers.CharField(max_length=60, required=False, allow_blank=True)

    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con ese email.')
        return value

    def create(self, validated_data):
        admin = self.context['request'].user
        empresa = admin.get_empresa()
        password = validated_data.pop('password')
        cargo = validated_data.pop('cargo', '')

        usuario = Usuario.objects.create_user(
            password=password,
            rol=Usuario.Rol.EMPLEADO,
            **validated_data,
        )
        return Empleado.objects.create(usuario=usuario, empresa=empresa, cargo=cargo)


class RegistroCompradorSerializer(serializers.Serializer):
    email = serializers.EmailField()
    nombre = serializers.CharField(max_length=100)
    apellido = serializers.CharField(max_length=100, required=False, allow_blank=True)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con ese email.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        usuario = Usuario.objects.create_user(
            password=password,
            rol=Usuario.Rol.COMPRADOR,
            **validated_data,
        )
        Comprador.objects.create(usuario=usuario)
        return usuario


class RegistrarUsuarioAdminSerializer(serializers.Serializer):
    """CU02: el ADMIN registra una cuenta de comprador directamente desde su
    panel."""

    email = serializers.EmailField()
    nombre = serializers.CharField(max_length=100)
    apellido = serializers.CharField(max_length=100, required=False, allow_blank=True)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con ese email.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        usuario = Usuario.objects.create_user(
            password=password,
            rol=Usuario.Rol.COMPRADOR,
            **validated_data,
        )
        Comprador.objects.create(usuario=usuario)
        return usuario


class UsuarioSerializer(serializers.ModelSerializer):
    empresa_id = serializers.SerializerMethodField()
    empresa_slug = serializers.SerializerMethodField()
    permisos = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'email', 'nombre', 'apellido', 'telefono', 'rol', 'estado', 'empresa_id', 'empresa_slug', 'fecha_registro', 'permisos']
        read_only_fields = fields

    def get_empresa_slug(self, obj):
        empresa = obj.get_empresa()
        return empresa.slug if empresa else None

    def get_empresa_id(self, obj):
        empresa = obj.get_empresa()
        return empresa.id if empresa else None

    def get_permisos(self, obj):
        """CU09: para un EMPLEADO, los codigos de permiso que la empresa le asigno
        (EmpleadoPermiso). El frontend los usa para mostrar solo lo que puede usar.
        Para EMPRESA (dueno) no aplica: siempre tiene acceso total (ver TienePermisoEmpleado)."""
        if not obj.es_empleado():
            return None
        return list(obj.empleado.permisos.values_list('permiso__codigo', flat=True))


class ActualizarPerfilSerializer(serializers.ModelSerializer):
    """T013 (RF07): el usuario edita sus propios datos (no el rol ni el email)."""

    class Meta:
        model = Usuario
        fields = ['nombre', 'apellido', 'telefono']


class ActualizarPerfilAdminSerializer(serializers.ModelSerializer):
    """CU03: el propio SuperAdmin editando SU perfil puede tocar también su
    email (a diferencia de ActualizarPerfilSerializer, que es lo que usa
    cualquier otro rol editando lo suyo)."""

    class Meta:
        model = Usuario
        fields = ['email', 'nombre', 'apellido', 'telefono']

    def validate_email(self, value):
        if Usuario.objects.exclude(id=self.instance.id).filter(email=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con ese email.')
        return value


class EditarUsuarioAdminSerializer(serializers.ModelSerializer):
    """CU02/CU03: el personal de la plataforma edita datos de cualquier
    usuario (a diferencia de ActualizarPerfilSerializer, que es el propio
    usuario editando solo lo suyo). El rol NO se edita acá a propósito —
    eso es CU24 (CambiarRolSerializer), exclusivo del SuperAdmin."""

    class Meta:
        model = Usuario
        fields = ['email', 'nombre', 'apellido', 'telefono', 'estado']

    def validate_email(self, value):
        if Usuario.objects.exclude(id=self.instance.id).filter(email=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con ese email.')
        return value


class RestablecerPasswordAdminSerializer(serializers.Serializer):
    """CU03: el SuperAdmin cambia la contraseña de cualquier usuario, sin
    necesitar la actual (a diferencia de CambiarPasswordSerializer, que es
    el propio usuario cambiando la suya)."""

    password_nueva = serializers.CharField(write_only=True, min_length=8)

    def save(self):
        usuario = self.context['usuario']
        usuario.set_password(self.validated_data['password_nueva'])
        usuario.save(update_fields=['password'])
        return usuario


class CambiarRolSerializer(serializers.Serializer):
    """CU24: el SuperAdmin cambia el rol de un usuario (ADMIN/EMPRESA/
    EMPLEADO/COMPRADOR). Acción dedicada y auditada aparte de la edición
    general de datos (EditarUsuarioAdminSerializer), porque cambiar el rol
    es una operación sensible con su propio trigger de base de datos
    (trg_registrar_cambio_rol)."""

    rol = serializers.ChoiceField(choices=Usuario.Rol.choices)

    def save(self):
        usuario = self.context['usuario']
        rol_anterior = usuario.rol
        usuario.rol = self.validated_data['rol']
        usuario.save(update_fields=['rol'])
        return usuario, rol_anterior


class LogoUrlAbsolutoMixin:
    """Convierte 'logo_url' a URL absoluta al serializar, igual que
    ProductoImagenSerializer.get_url(). Necesario porque cuando el storage
    cae a disco local (Cloudinary sin configurar), default_storage.url()
    devuelve una ruta relativa ("/media/...") que Image.network() en la
    app movil no puede resolver."""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        logo = data.get('logo_url')
        if request and logo and logo.startswith('/'):
            data['logo_url'] = request.build_absolute_uri(logo)
        return data


class EditarEmpresaAdminSerializer(LogoUrlAbsolutoMixin, serializers.ModelSerializer):
    """CU01: el SuperAdmin puede editar cualquier dato de la empresa (antes
    solo se podía suspender/reactivar)."""

    class Meta:
        model = Empresa
        fields = [
            'razon_social', 'nit', 'slug', 'logo_url', 'color_marca',
            'descripcion', 'departamento', 'ciudad', 'estado',
        ]

    def validate_slug(self, value):
        if Empresa.objects.exclude(id=self.instance.id).filter(slug=value).exists():
            raise serializers.ValidationError('Ya existe una empresa con ese slug.')
        return value


class EditarMiEmpresaSerializer(LogoUrlAbsolutoMixin, serializers.ModelSerializer):
    """La empresa edita su propio perfil — a diferencia de
    EditarEmpresaAdminSerializer, no incluye 'slug' (identidad de URL) ni
    'estado' (suspensión/moderación), que siguen siendo solo del SuperAdmin."""

    class Meta:
        model = Empresa
        fields = ['razon_social', 'nit', 'logo_url', 'color_marca', 'descripcion', 'departamento', 'ciudad']


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nueva = serializers.CharField(write_only=True, min_length=8)

    def validate_password_actual(self, value):
        usuario = self.context['request'].user
        if not usuario.check_password(value):
            raise serializers.ValidationError('La contraseña actual no es correcta.')
        return value

    def save(self):
        usuario = self.context['request'].user
        usuario.set_password(self.validated_data['password_nueva'])
        usuario.save(update_fields=['password'])
        return usuario


class SolicitarResetPasswordSerializer(serializers.Serializer):
    """T010 (RF03): envía el link de recuperación por correo si el email existe.

    Siempre reporta éxito (aunque el email no exista) para no revelar qué
    correos están registrados en la plataforma.
    """

    email = serializers.EmailField()

    def save(self):
        usuario = Usuario.objects.filter(email=self.validated_data['email']).first()
        if usuario is None:
            return None

        uid = urlsafe_base64_encode(force_bytes(usuario.pk))
        token = default_token_generator.make_token(usuario)
        link = f'{settings.FRONTEND_URL}/restablecer-password?uid={uid}&token={token}'

        destinatario = usuario.correo_recuperacion or usuario.email
        try:
            send_mail(
                'Recupera tu contraseña — VecinoMarket',
                (
                    f'Hola {usuario.nombre},\n\n'
                    'Recibimos una solicitud para restablecer tu contraseña en VecinoMarket. '
                    'Si fuiste tú, entra al siguiente link para elegir una nueva:\n\n'
                    f'{link}\n\n'
                    'Si no fuiste tú, puedes ignorar este correo — tu contraseña actual sigue siendo válida.'
                ),
                settings.DEFAULT_FROM_EMAIL,
                [destinatario],
                fail_silently=False,
            )
        except Exception:
            logger.exception('No se pudo enviar el correo de reset de password a %s', destinatario)
        return usuario


class ConfirmarResetPasswordSerializer(serializers.Serializer):
    """T010 (RF03): valida el link (uid + token) y guarda la nueva contraseña."""

    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        try:
            pk = urlsafe_base64_decode(attrs['uid']).decode()
            usuario = Usuario.objects.get(pk=pk)
        except (Usuario.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError('El link no es válido.')

        if not default_token_generator.check_token(usuario, attrs['token']):
            raise serializers.ValidationError('El link no es válido o ya expiró. Solicita uno nuevo.')

        attrs['usuario'] = usuario
        return attrs

    def save(self):
        usuario = self.validated_data['usuario']
        usuario.set_password(self.validated_data['password'])
        usuario.save(update_fields=['password'])
        return usuario


class EmpresaPublicaSerializer(LogoUrlAbsolutoMixin, serializers.ModelSerializer):
    """CU15/CU17: lo mínimo que puede ver cualquier visitante de una
    empresa — nada administrativo (NIT, dueño, suscripción, etc.)."""

    class Meta:
        model = Empresa
        fields = ['id', 'razon_social', 'slug', 'logo_url', 'ciudad']
        read_only_fields = fields


class EmpresaAdminSerializer(serializers.ModelSerializer):
    """CU01 (T009, RF01/RF02): listado de empresas para el ADMIN de la plataforma.

    `estado_suscripcion` y `fecha_vencimiento` se calculan a partir de la
    suscripción más reciente de la empresa, anotada por
    ListaEmpresasAdminView en `_susc_estado` / `_susc_vencimiento` (evita un
    N+1 por fila). Si el serializer se usa en otro contexto sin esa
    anotación, se resuelve como "solicitando suscripción" por defecto.
    """

    dueno_email = serializers.EmailField(source='usuario_dueno.email', read_only=True)
    dueno_nombre = serializers.CharField(source='usuario_dueno.nombre', read_only=True)
    plan_nombre = serializers.CharField(source='plan.nombre', read_only=True, default=None)
    estado_suscripcion = serializers.SerializerMethodField()
    fecha_inicio = serializers.SerializerMethodField()
    fecha_vencimiento = serializers.SerializerMethodField()

    class Meta:
        model = Empresa
        fields = [
            'id', 'razon_social', 'nit', 'slug', 'ciudad', 'departamento',
            'estado', 'dueno_email', 'dueno_nombre', 'creado_en', 'plan',
            'plan_nombre', 'estado_suscripcion', 'fecha_inicio', 'fecha_vencimiento',
        ]
        read_only_fields = fields

    def get_estado_suscripcion(self, empresa):
        if empresa.plan_id is None:
            return 'SOLICITANDO_SUSCRIPCION'
        vencimiento = getattr(empresa, '_susc_vencimiento', None)
        if vencimiento is None:
            return 'SOLICITANDO_SUSCRIPCION'
        estado = getattr(empresa, '_susc_estado', None)
        if estado != Suscripcion.Estado.ACTIVA or vencimiento < timezone.now():
            return 'EXPIRADA'
        return 'ACTIVA'

    def get_fecha_inicio(self, empresa):
        return getattr(empresa, '_susc_inicio', None)

    def get_fecha_vencimiento(self, empresa):
        return getattr(empresa, '_susc_vencimiento', None)


class PermisoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permiso
        fields = ['id', 'codigo', 'descripcion']
        read_only_fields = fields


class RolBaseSerializer(serializers.ModelSerializer):
    """T054/T055 (RF53/RF54): roles administrativos globales y sus permisos base."""

    permisos = serializers.SerializerMethodField()

    class Meta:
        model = RolBase
        fields = ['id', 'nombre', 'permisos']
        read_only_fields = ['id', 'permisos']

    def get_permisos(self, obj):
        return PermisoSerializer([rp.permiso for rp in obj.permisos.select_related('permiso')], many=True).data


class EmpleadoAdminSerializer(serializers.ModelSerializer):
    """CU09: el SuperAdmin ve a todos los empleados de la plataforma (de
    cualquier empresa) y qué permisos tiene cada cuenta."""

    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)
    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)
    permisos = serializers.SerializerMethodField()

    class Meta:
        model = Empleado
        fields = ['id', 'usuario_nombre', 'usuario_email', 'empresa_nombre', 'cargo', 'estado', 'permisos']
        read_only_fields = fields

    def get_permisos(self, obj):
        return PermisoSerializer([ep.permiso for ep in obj.permisos.select_related('permiso')], many=True).data


class GoogleAuthSerializer(serializers.Serializer):
    """Login/registro con Google Identity Services: verifica el ID token que
    manda el navegador y, si es la primera vez, crea la cuenta de comprador
    automáticamente (mismo email = misma cuenta, sin importar cómo se creó)."""

    credential = serializers.CharField(write_only=True)

    def validate_credential(self, value):
        try:
            payload = google_id_token.verify_oauth2_token(
                value, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
        except ValueError:
            raise serializers.ValidationError('El token de Google no es válido o expiró.')

        if not payload.get('email_verified'):
            raise serializers.ValidationError('Tu cuenta de Google no tiene el email verificado.')

        return payload

    def save(self):
        payload = self.validated_data['credential']
        email = payload['email']
        usuario = Usuario.objects.filter(email=email).first()
        creado = False

        if usuario is None:
            usuario = Usuario.objects.create_user(
                email=email,
                password=None,  # cuenta sin contraseña: siempre ingresa por Google
                nombre=payload.get('given_name') or payload.get('name') or email.split('@')[0],
                apellido=payload.get('family_name', ''),
                rol=Usuario.Rol.COMPRADOR,
            )
            Comprador.objects.create(usuario=usuario)
            creado = True

        return usuario, creado


class DireccionSerializer(serializers.ModelSerializer):
    """CU13: dirección de envío del comprador. 'ubicacion' (PointField de
    PostGIS) no es JSON-friendly directo, así que entra/sale como lat/lon
    planos — el mapa (Leaflet) del frontend manda esos dos números, ya sea
    por click en el mapa o por geolocalización del navegador."""

    lat = serializers.FloatField(write_only=True)
    lon = serializers.FloatField(write_only=True)
    latitud = serializers.SerializerMethodField()
    longitud = serializers.SerializerMethodField()

    class Meta:
        model = Direccion
        fields = [
            'id', 'alias', 'direccion_texto', 'departamento', 'ciudad',
            'es_predeterminada', 'lat', 'lon', 'latitud', 'longitud',
        ]

    def get_latitud(self, obj):
        return obj.ubicacion.y if obj.ubicacion else None

    def get_longitud(self, obj):
        return obj.ubicacion.x if obj.ubicacion else None

    def create(self, validated_data):
        lat = validated_data.pop('lat')
        lon = validated_data.pop('lon')
        validated_data['ubicacion'] = Point(lon, lat, srid=4326)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        lat = validated_data.pop('lat', None)
        lon = validated_data.pop('lon', None)
        if lat is not None and lon is not None:
            validated_data['ubicacion'] = Point(lon, lat, srid=4326)
        return super().update(instance, validated_data)
