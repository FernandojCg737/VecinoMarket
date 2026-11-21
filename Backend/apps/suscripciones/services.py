"""CU20: reglas compartidas sobre qué empresas tienen hoy un plan con IA.

Una empresa "tiene IA" cuando su plan actual incluye IA (`plan.incluye_ia`)
Y además tiene una suscripción ACTIVA que todavía no venció. Se exige
también la fecha (no solo el estado) porque `sp_expirar_suscripciones_vencidas`
no corre solo: hasta que alguien lo dispara, una suscripción vencida puede
seguir marcada como ACTIVA.

La usan PlanPermiteIA (empresa/empleado que entra a una función de IA) y los
motores de apps/ia (CU1/CU2 solo recomiendan productos de estas empresas).
"""
from django.utils import timezone

from .models import Suscripcion


def suscripciones_vigentes():
    return Suscripcion.objects.filter(
        estado=Suscripcion.Estado.ACTIVA,
        fecha_vencimiento__gt=timezone.now(),
    )


def empresa_tiene_ia(empresa):
    if not empresa or not empresa.plan_id or not empresa.plan.incluye_ia:
        return False
    return suscripciones_vigentes().filter(empresa=empresa).exists()


def ids_empresas_con_ia():
    """Subconsulta (lazy) con los ids de empresas ACTIVAS con IA vigente,
    para usar en filtros: `Producto.objects.filter(empresa_id__in=ids_empresas_con_ia())`."""
    from apps.usuarios.models import Empresa

    return (
        Empresa.objects.filter(
            estado=Empresa.Estado.ACTIVA,
            plan__incluye_ia=True,
            suscripciones__in=suscripciones_vigentes(),
        )
        .values('id')
        .distinct()
    )
