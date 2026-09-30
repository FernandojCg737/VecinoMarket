// Personal de la plataforma: ADMIN (soporte) o SUPERADMIN (dueño).
// Las acciones sensibles (roles, bitácora, planes/suscripciones, contraseñas
// ajenas) son exclusivas de SUPERADMIN — ver esSuperAdmin().
export function esStaff(usuario) {
  return !!usuario && (usuario.rol === 'ADMIN' || usuario.rol === 'SUPERADMIN');
}

export function esSuperAdmin(usuario) {
  return !!usuario && usuario.rol === 'SUPERADMIN';
}

// Dueño de una empresa o empleado suyo — quienes pueden llegar a tener acceso
// a las secciones de autogestión de la empresa (aunque el empleado necesite
// además el permiso puntual, que valida el backend).
export function esEmpresaOEmpleado(usuario) {
  return !!usuario && (usuario.rol === 'EMPRESA' || usuario.rol === 'EMPLEADO');
}

// Solo el dueño de la empresa (no un empleado suyo) — para las secciones que
// el backend restringe a EsEmpresa, como dar de alta empleados o editar el
// perfil de la empresa.
export function esEmpresa(usuario) {
  return !!usuario && usuario.rol === 'EMPRESA';
}

export function esComprador(usuario) {
  return !!usuario && usuario.rol === 'COMPRADOR';
}

// El dueño de la empresa siempre tiene acceso total (igual que TienePermisoEmpleado
// en el backend). Un EMPLEADO solo ve lo que la empresa le asignó en EmpleadoPermiso
// (usuario.permisos, expuesto por UsuarioSerializer). Usar esto para decidir qué
// mostrar en las secciones de "Mi empresa" que un empleado también puede visitar.
export function tienePermisoEmpleado(usuario, codigo) {
  if (esEmpresa(usuario)) return true;
  return !!usuario && Array.isArray(usuario.permisos) && usuario.permisos.includes(codigo);
}
