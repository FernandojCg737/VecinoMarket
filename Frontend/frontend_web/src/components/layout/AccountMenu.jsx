import { Link } from 'react-router-dom';
import { User, LogOut, ChevronDown, Wallet, ClipboardList, Truck, MapPin, Receipt, Star, Tag, Users, MessageCircle, Radio, Bot, LayoutDashboard, Sparkles, UserCog, Building2, Boxes, CreditCard, Sliders, Lock } from 'lucide-react';
import Dropdown from '../ui/Dropdown';
import AdminMenu from './AdminMenu';
import { useAuth } from '../../context/AuthContext';
import { esStaff, esEmpresaOEmpleado, esEmpresa, esComprador, tienePermisoEmpleado, planPermiteLive, planPermiteIA } from '../../utils/roles';

export default function AccountMenu() {
  const { usuario, logout } = useAuth();

  return (
    <Dropdown
      align="right"
      triggerClassName="rounded-full px-2 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      panelPositionClassName="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2"
      panelClassName={`${esStaff(usuario) ? 'sm:w-80' : 'sm:w-56'} rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 shadow-lg text-sm text-gray-700 dark:text-gray-200 max-h-[80vh] overflow-y-auto`}
      trigger={
        <>
          <User size={20} />
          <span className="hidden lg:inline max-w-[100px] truncate">{usuario ? usuario.nombre : 'Cuenta'}</span>
          <ChevronDown size={14} className="hidden md:block" />
        </>
      }
    >
      {usuario ? (
        <>
          <div className="px-4 py-1.5 text-xs text-gray-400 dark:text-gray-500">Hola, {usuario.nombre}</div>
          <Link to="/perfil" className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">Mi perfil</Link>
          {esEmpresaOEmpleado(usuario) && (
            <>
              {tienePermisoEmpleado(usuario, 'ver_reportes') && (
                <Link to="/mi-empresa/dashboard" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <LayoutDashboard size={16} /> Mi dashboard
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'ver_reportes') && (
                <Link to="/mi-empresa/reportes" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Sliders size={16} /> Reportes personalizados
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'gestionar_productos') && (
                <Link to="/mi-empresa/productos" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Boxes size={16} /> Mis productos
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'gestionar_pedidos') && (
                <Link to="/mi-empresa/pedidos" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ClipboardList size={16} /> Pedidos y ventas
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'gestionar_pedidos') && (
                <Link to="/mi-empresa/entregas" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Truck size={16} /> Entregas
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'gestionar_pagos') && (
                <Link to="/mi-empresa/metodos-pago" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Wallet size={16} /> Métodos de pago
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'gestionar_facturacion') && (
                <Link to="/mi-empresa/facturas" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Receipt size={16} /> Facturas
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'ver_reportes') && (
                <Link to="/mi-empresa/reputacion" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Star size={16} /> Reputación
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'gestionar_promociones') && (
                <Link to="/mi-empresa/promociones" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Tag size={16} /> Promociones
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'ver_reportes') && (
                <Link to="/mi-empresa/referidos" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Users size={16} /> Referidos
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'gestionar_chat') && (
                <Link to="/mi-empresa/chat" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <MessageCircle size={16} /> Chat
                </Link>
              )}
              {tienePermisoEmpleado(usuario, 'gestionar_promociones') && (
                planPermiteLive(usuario) ? (
                  <Link to="/mi-empresa/lives" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Radio size={16} /> Live commerce
                  </Link>
                ) : (
                  <Link
                    to="/mi-empresa/suscripcion"
                    title="Función exclusiva del Plan Premium. Haz clic para mejorar tu suscripción."
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 group"
                  >
                    <span className="flex items-center gap-2">
                      <Radio size={16} className="text-gray-400" />
                      <span>Live commerce</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                      <Lock size={10} /> PREMIUM
                    </span>
                  </Link>
                )
              )}
              {tienePermisoEmpleado(usuario, 'gestionar_chat') && (
                planPermiteIA(usuario) ? (
                  <Link to="/mi-empresa/chatbot" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Bot size={16} /> Chatbot (IA)
                  </Link>
                ) : (
                  <Link
                    to="/mi-empresa/suscripcion"
                    title="Requiere plan con Inteligencia Artificial (Básico o Premium)."
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 group"
                  >
                    <span className="flex items-center gap-2">
                      <Bot size={16} className="text-gray-400" />
                      <span>Chatbot</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                      <Lock size={10} /> IA
                    </span>
                  </Link>
                )
              )}
              {esEmpresa(usuario) && (
                <>
                  <Link to="/mi-empresa/empleados" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <UserCog size={16} /> Mis empleados
                  </Link>
                  <Link to="/mi-empresa/perfil" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Building2 size={16} /> Perfil de mi empresa
                  </Link>
                  <Link to="/mi-empresa/suscripcion" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <CreditCard size={16} /> Mi suscripción
                  </Link>
                </>
              )}
            </>
          )}
          {esComprador(usuario) && (
            <>
              <Link to="/mi-cuenta" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                <LayoutDashboard size={16} /> Mi cuenta
              </Link>
              <Link to="/recomendados" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Sparkles size={16} /> Recomendado para ti
              </Link>
              <Link to="/mis-direcciones" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                <MapPin size={16} /> Mis direcciones
              </Link>
              <Link to="/mis-tarjetas" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                <CreditCard size={16} /> Métodos de pago
              </Link>
              <Link to="/mis-compras" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Receipt size={16} /> Mis compras
              </Link>
              <Link to="/mis-resenas" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Star size={16} /> Mis reseñas
              </Link>
              <Link to="/chat" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                <MessageCircle size={16} /> Mis chats
              </Link>
              <Link to="/chatbot" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Bot size={16} /> Chatbot de tiendas
              </Link>
            </>
          )}
          {esStaff(usuario) && (
            <>
              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
              <AdminMenu />
            </>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">Ingresar</Link>
          <Link to="/registro" className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">Crear cuenta</Link>
        </>
      )}
    </Dropdown>
  );
}
