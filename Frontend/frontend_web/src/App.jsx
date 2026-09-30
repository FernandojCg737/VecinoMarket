import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { GRUPOS_ADMIN } from './config/adminMenu';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Carga diferida (code-splitting dinámico) para reducir el bundle inicial
const Home = lazy(() => import('./pages/Home'));
const ProductListing = lazy(() => import('./pages/ProductListing'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Auth = lazy(() => import('./pages/Auth'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const RequestCompany = lazy(() => import('./pages/RequestCompany'));
const Bitacora = lazy(() => import('./pages/Bitacora'));
const Usuarios = lazy(() => import('./pages/admin/Usuarios'));
const EmpresasAdmin = lazy(() => import('./pages/admin/EmpresasAdmin'));
const Empleados = lazy(() => import('./pages/admin/Empleados'));
const Categorias = lazy(() => import('./pages/admin/Categorias'));
const Productos = lazy(() => import('./pages/admin/Productos'));
const CatalogosEmpresas = lazy(() => import('./pages/admin/CatalogosEmpresas'));
const MetodosPagoEmpresas = lazy(() => import('./pages/admin/MetodosPagoEmpresas'));
const MisMetodosPago = lazy(() => import('./pages/empresa/MisMetodosPago'));
const InventarioEmpresas = lazy(() => import('./pages/admin/InventarioEmpresas'));
const Carritos = lazy(() => import('./pages/admin/Carritos'));
const PedidosVentas = lazy(() => import('./pages/admin/PedidosVentas'));
const MisPedidos = lazy(() => import('./pages/empresa/MisPedidos'));
const Entregas = lazy(() => import('./pages/admin/Entregas'));
const MisEntregas = lazy(() => import('./pages/empresa/MisEntregas'));
const MisDirecciones = lazy(() => import('./pages/MisDirecciones'));
const Facturacion = lazy(() => import('./pages/admin/Facturacion'));
const MisFacturas = lazy(() => import('./pages/empresa/MisFacturas'));
const MisCompras = lazy(() => import('./pages/MisCompras'));
const DashboardComprador = lazy(() => import('./pages/DashboardComprador'));
const Reputacion = lazy(() => import('./pages/admin/Reputacion'));
const MiReputacion = lazy(() => import('./pages/empresa/MiReputacion'));
const MisResenas = lazy(() => import('./pages/MisResenas'));
const MisTarjetas = lazy(() => import('./pages/MisTarjetas'));
const Promociones = lazy(() => import('./pages/admin/Promociones'));
const MisPromociones = lazy(() => import('./pages/empresa/MisPromociones'));
const Referidos = lazy(() => import('./pages/admin/Referidos'));
const MisReferidos = lazy(() => import('./pages/empresa/MisReferidos'));
const Chat = lazy(() => import('./pages/Chat'));
const MiChat = lazy(() => import('./pages/empresa/MiChat'));
const ChatAdmin = lazy(() => import('./pages/admin/ChatAdmin'));
const Live = lazy(() => import('./pages/Live'));
const LiveViewer = lazy(() => import('./pages/LiveViewer'));
const MisLives = lazy(() => import('./pages/empresa/MisLives'));
const TransmitirLive = lazy(() => import('./pages/empresa/TransmitirLive'));
const GrabacionLive = lazy(() => import('./pages/empresa/GrabacionLive'));
const LivesAdmin = lazy(() => import('./pages/admin/LivesAdmin'));
const MisFaqsChatbot = lazy(() => import('./pages/empresa/MisFaqsChatbot'));
const ChatbotEmpresas = lazy(() => import('./pages/ChatbotEmpresas'));
const ChatbotAdmin = lazy(() => import('./pages/admin/ChatbotAdmin'));
const RolesBase = lazy(() => import('./pages/admin/RolesBase'));
const Backup = lazy(() => import('./pages/admin/Backup'));
const Ayuda = lazy(() => import('./pages/Ayuda'));
const CambiarRoles = lazy(() => import('./pages/admin/CambiarRoles'));
const ReportesEmpresaAdmin = lazy(() => import('./pages/admin/ReportesEmpresaAdmin'));
const DashboardAdmin = lazy(() => import('./pages/admin/DashboardAdmin'));
const DashboardEmpresa = lazy(() => import('./pages/empresa/DashboardEmpresa'));
const ReportesDinamicos = lazy(() => import('./pages/empresa/ReportesDinamicos'));
const ReportesDinamicosAdmin = lazy(() => import('./pages/admin/ReportesDinamicos'));
const MisEmpleados = lazy(() => import('./pages/empresa/MisEmpleados'));
const MisProductos = lazy(() => import('./pages/empresa/MisProductos'));
const MiPerfilEmpresa = lazy(() => import('./pages/empresa/MiPerfilEmpresa'));
const MiSuscripcion = lazy(() => import('./pages/empresa/MiSuscripcion'));
const PlanesAdmin = lazy(() => import('./pages/admin/PlanesAdmin'));
const Recomendaciones = lazy(() => import('./pages/Recomendaciones'));
const NotificacionesAdmin = lazy(() => import('./pages/admin/NotificacionesAdmin'));
const EnConstruccion = lazy(() => import('./pages/admin/EnConstruccion'));
const NotFound = lazy(() => import('./pages/NotFound'));

const rutasAdminPendientes = GRUPOS_ADMIN.flatMap((grupo) => grupo.items).filter((item) => !item.implementado);

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<ProductListing />} />
          <Route path="/productos/:id" element={<ProductDetail />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/registro" element={<Auth />} />
          <Route path="/olvide-password" element={<ForgotPassword />} />
          <Route path="/restablecer-password" element={<ResetPassword />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/solicitar-empresa" element={<RequestCompany />} />
          <Route path="/bitacora" element={<Bitacora />} />
          <Route path="/admin/usuarios" element={<Usuarios />} />
          <Route path="/admin/empresas" element={<EmpresasAdmin />} />
          <Route path="/admin/empleados" element={<Empleados />} />
          <Route path="/admin/categorias" element={<Categorias />} />
          <Route path="/admin/productos" element={<Productos />} />
          <Route path="/admin/catalogo" element={<CatalogosEmpresas />} />
          <Route path="/admin/metodos-pago" element={<MetodosPagoEmpresas />} />
          <Route path="/mi-empresa/metodos-pago" element={<MisMetodosPago />} />
          <Route path="/admin/inventario" element={<InventarioEmpresas />} />
          <Route path="/admin/carritos" element={<Carritos />} />
          <Route path="/admin/pedidos" element={<PedidosVentas />} />
          <Route path="/mi-empresa/pedidos" element={<MisPedidos />} />
          <Route path="/admin/entregas" element={<Entregas />} />
          <Route path="/mi-empresa/entregas" element={<MisEntregas />} />
          <Route path="/mis-direcciones" element={<MisDirecciones />} />
          <Route path="/admin/facturacion" element={<Facturacion />} />
          <Route path="/mi-empresa/facturas" element={<MisFacturas />} />
          <Route path="/mis-compras" element={<MisCompras />} />
          <Route path="/mi-cuenta" element={<DashboardComprador />} />
          <Route path="/admin/reputacion" element={<Reputacion />} />
          <Route path="/mi-empresa/reputacion" element={<MiReputacion />} />
          <Route path="/mis-resenas" element={<MisResenas />} />
          <Route path="/mis-tarjetas" element={<MisTarjetas />} />
          <Route path="/admin/promociones" element={<Promociones />} />
          <Route path="/mi-empresa/promociones" element={<MisPromociones />} />
          <Route path="/admin/referidos" element={<Referidos />} />
          <Route path="/mi-empresa/referidos" element={<MisReferidos />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/mi-empresa/chat" element={<MiChat />} />
          <Route path="/admin/chat" element={<ChatAdmin />} />
          <Route path="/live" element={<Live />} />
          <Route path="/live/:id" element={<LiveViewer />} />
          <Route path="/mi-empresa/lives" element={<MisLives />} />
          <Route path="/mi-empresa/lives/:id/transmitir" element={<TransmitirLive />} />
          <Route path="/mi-empresa/lives/:id/grabacion" element={<GrabacionLive />} />
          <Route path="/admin/live-commerce" element={<LivesAdmin />} />
          <Route path="/mi-empresa/chatbot" element={<MisFaqsChatbot />} />
          <Route path="/chatbot" element={<ChatbotEmpresas />} />
          <Route path="/admin/chatbot" element={<ChatbotAdmin />} />
          <Route path="/admin/roles" element={<RolesBase />} />
          <Route path="/admin/backup" element={<Backup />} />
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="/admin/cambiar-roles" element={<CambiarRoles />} />
          <Route path="/admin/reportes-empresa" element={<ReportesEmpresaAdmin />} />
          <Route path="/admin/reportes-admin" element={<DashboardAdmin />} />
          <Route path="/mi-empresa/dashboard" element={<DashboardEmpresa />} />
          <Route path="/mi-empresa/reportes" element={<ReportesDinamicos />} />
          <Route path="/admin/reportes-dinamicos" element={<ReportesDinamicosAdmin />} />
          <Route path="/mi-empresa/empleados" element={<MisEmpleados />} />
          <Route path="/mi-empresa/productos" element={<MisProductos />} />
          <Route path="/mi-empresa/perfil" element={<MiPerfilEmpresa />} />
          <Route path="/mi-empresa/suscripcion" element={<MiSuscripcion />} />
          <Route path="/admin/planes" element={<PlanesAdmin />} />
          <Route path="/recomendados" element={<Recomendaciones />} />
          <Route path="/admin/notificaciones" element={<NotificacionesAdmin />} />
          {rutasAdminPendientes.map((item) => (
            <Route
              key={item.cu}
              path={item.to}
              element={<EnConstruccion cu={item.cu} titulo={item.titulo} descripcion={item.descripcion} />}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
