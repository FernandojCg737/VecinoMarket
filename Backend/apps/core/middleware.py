class TenantContextMiddleware:
    """
    Cuelga `request.tenant` con el id de empresa del usuario autenticado
    (None para superadmin y clientes, que no pertenecen a un tenant).
    Las vistas y querysets deben filtrar siempre por request.tenant,
    nunca por un empresa_id que venga del body/query params.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated:
            empresa = user.get_empresa()
            if empresa:
                request.tenant = empresa.id
        return self.get_response(request)
