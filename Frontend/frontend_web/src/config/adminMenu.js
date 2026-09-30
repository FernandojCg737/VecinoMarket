// Estructura única del panel de SuperAdmin: 5 grupos (P1-P5), cada uno con
// sus casos de uso (CU). Es la fuente de verdad tanto para el menú
// desplegable (AdminMenu.jsx) como para las rutas placeholder en App.jsx,
// para que nunca queden desincronizados.
export const GRUPOS_ADMIN = [
  {
    id: 'p1',
    titulo: 'Usuarios y Seguridad',
    items: [
      {
        cu: 'CU01',
        titulo: 'Gestionar Cuentas de Empresas',
        to: '/admin/empresas',
        implementado: true,
      },
      {
        cu: 'CU02',
        titulo: 'Autenticar y Registrar Usuarios',
        to: '/admin/usuarios',
        implementado: true,
      },
      {
        cu: 'CU03',
        titulo: 'Gestionar Perfil de Usuarios',
        to: '/perfil',
        implementado: true,
      },
      {
        cu: 'CU09',
        titulo: 'Gestionar Empleados y Permisos',
        to: '/admin/empleados',
        implementado: true,
        soloSuperAdmin: true,
      },
      {
        cu: 'CU24',
        titulo: 'Administrar Roles',
        to: '/admin/cambiar-roles',
        implementado: true,
        soloSuperAdmin: true,
      },
    ],
  },
  {
    id: 'p2',
    titulo: 'Catálogo y Productos',
    items: [
      {
        cu: 'CU06',
        titulo: 'Gestionar Categorías de Productos',
        to: '/admin/categorias',
        implementado: true,
      },
      {
        cu: 'CU07',
        titulo: 'Gestionar Productos',
        to: '/admin/productos',
        implementado: true,
      },
      {
        cu: 'CU08',
        titulo: 'Categorizar Producto mediante Visión Artificial',
        to: '/admin/productos',
        implementado: true,
        descripcion: 'Botón "Sugerir categoría con IA" dentro de editar producto (CU07) y catálogo por empresa (CU05).',
      },
      {
        cu: 'CU05',
        titulo: 'Buscar y Explorar Catálogo de Productos',
        to: '/admin/catalogo',
        implementado: true,
      },
      {
        cu: 'CU25',
        titulo: 'Métodos de Pago de Empresas',
        to: '/admin/metodos-pago',
        implementado: true,
      },
    ],
  },
  {
    id: 'p3',
    titulo: 'Inventario, Pedidos y Ventas',
    items: [
      {
        cu: 'CU10',
        titulo: 'Gestionar Inventario y Stock',
        to: '/admin/inventario',
        implementado: true,
      },
      {
        cu: 'CU11',
        titulo: 'Gestionar Carrito de Compras',
        to: '/admin/carritos',
        implementado: true,
      },
      {
        cu: 'CU12',
        titulo: 'Gestionar Pedidos y Ventas',
        to: '/admin/pedidos',
        implementado: true,
      },
      {
        cu: 'CU13',
        titulo: 'Gestionar Entregas',
        to: '/admin/entregas',
        implementado: true,
      },
      {
        cu: 'CU26',
        titulo: 'Gestionar Facturación y Comisiones',
        to: '/admin/facturacion',
        implementado: true,
      },
    ],
  },
  {
    id: 'p4',
    titulo: 'Comunicación, Marketing y Live Commerce',
    items: [
      {
        cu: 'CU04',
        titulo: 'Gestionar Reputación y Valoraciones',
        to: '/admin/reputacion',
        implementado: true,
      },
      {
        cu: 'CU14',
        titulo: 'Gestionar Chat Interno entre Comprador y Empresa',
        to: '/admin/chat',
        implementado: true,
      },
      {
        cu: 'CU15',
        titulo: 'Consultar Chatbot de Atención',
        to: '/admin/chatbot',
        implementado: true,
      },
      {
        cu: 'CU16',
        titulo: 'Gestionar Promociones y Descuentos',
        to: '/admin/promociones',
        implementado: true,
      },
      {
        cu: 'CU17',
        titulo: 'Gestionar Transmisiones en Vivo - Live Commerce',
        to: '/admin/live-commerce',
        implementado: true,
      },
      {
        cu: 'CU27',
        titulo: 'Gestionar Programa de Referidos',
        to: '/admin/referidos',
        implementado: true,
      },
    ],
  },
  {
    id: 'p5',
    titulo: 'Reportes, IA y Auditoría',
    items: [
      {
        cu: 'CU18',
        titulo: 'Visualizar Dashboard y Reportes de Empresa',
        to: '/admin/reportes-empresa',
        implementado: true,
      },
      {
        cu: 'CU19',
        titulo: 'Visualizar Dashboard y Reportes Administrativos',
        to: '/admin/reportes-admin',
        implementado: true,
      },
      {
        cu: 'CU19',
        titulo: 'Reportes personalizados (dinámicos)',
        to: '/admin/reportes-dinamicos',
        implementado: true,
      },
      {
        cu: 'CU20',
        titulo: 'Gestionar Planes y Suscripciones',
        to: '/admin/planes',
        implementado: true,
        soloSuperAdmin: true,
      },
      {
        cu: 'CU21',
        titulo: 'Generar Recomendaciones mediante Inteligencia Artificial',
        to: '/recomendados',
        implementado: true,
        ocultoParaStaff: true,
        descripcion: 'Motor de recomendación de productos personalizado según el historial de cada comprador (vista del comprador en "Recomendado para ti").',
      },
      {
        cu: 'CU22',
        titulo: 'Consultar Logs de Auditoría del Sistema',
        to: '/bitacora',
        implementado: true,
        soloSuperAdmin: true,
      },
      {
        cu: 'CU23',
        titulo: 'Gestionar Notificaciones del Sistema',
        to: '/admin/notificaciones',
        implementado: true,
        soloSuperAdmin: true,
      },
      {
        cu: 'CU28',
        titulo: 'Gestionar Copias de Seguridad y Restauración del Sistema',
        to: '/admin/backup',
        implementado: true,
        soloSuperAdmin: true,
      },
    ],
  },
];
