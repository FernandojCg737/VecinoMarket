import { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';

const SECCIONES = [
  {
    id: 'general',
    titulo: 'Centro de ayuda',
    preguntas: [
      {
        p: '¿Qué es VecinoMarket?',
        r: 'Un marketplace donde negocios locales venden sus productos y los compradores navegan, arman su carrito y compran en línea, con entrega o retiro.',
      },
      {
        p: '¿Cómo creo una cuenta?',
        r: 'Dale click a "Crear cuenta" arriba a la derecha, o inicia sesión directo con tu cuenta de Google.',
      },
      {
        p: '¿Olvidé mi contraseña, qué hago?',
        r: 'En la pantalla de inicio de sesión, dale click a "¿Olvidaste tu contraseña?" e ingresa tu correo — te llega un link para elegir una nueva.',
      },
      {
        p: '¿Cómo contacto a una tienda?',
        r: 'Desde la página de un producto o de la tienda hay un botón de chat directo con la empresa, o puedes usar el chatbot de esa tienda para preguntas rápidas.',
      },
    ],
  },
  {
    id: 'comprar',
    titulo: 'Cómo comprar',
    preguntas: [
      {
        p: '¿Cómo agrego un producto al carrito?',
        r: 'Entra al producto que te interesa y dale click a "Agregar al carrito". Puedes seguir explorando y comprar varios productos de distintas tiendas en un solo pedido por tienda.',
      },
      {
        p: '¿Qué métodos de pago aceptan?',
        r: 'Depende de cada tienda — algunas aceptan pago con PayPal (tarjeta), QR o transferencia. Lo ves al momento del checkout.',
      },
      {
        p: '¿Puedo guardar una tarjeta para no ingresarla cada vez?',
        r: 'Sí, desde "Mi cuenta → Métodos de pago" puedes guardar una cuenta de PayPal para futuras compras.',
      },
      {
        p: '¿Cómo veo el estado de mi pedido?',
        r: 'En "Mi cuenta → Mis compras" ves todos tus pedidos y su estado actual (pendiente, confirmado, en camino, entregado).',
      },
    ],
  },
  {
    id: 'envios',
    titulo: 'Envíos y entregas',
    preguntas: [
      {
        p: '¿Cuánto tarda mi pedido?',
        r: 'Depende de cada tienda y su zona de entrega — lo indican en el detalle del pedido una vez confirmado.',
      },
      {
        p: '¿Puedo cambiar mi dirección de entrega?',
        r: 'Sí, desde "Mi cuenta → Mis direcciones" puedes agregar o editar tus direcciones antes de finalizar la compra.',
      },
      {
        p: '¿Qué hago si mi pedido no llegó?',
        r: 'Contacta directo a la tienda por el chat del pedido — ellos gestionan la entrega. Si no consigues respuesta, escríbenos a hola@vecinomarket.bo.',
      },
    ],
  },
];

function Pregunta({ p, r }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 py-3">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left font-medium text-gray-800 dark:text-gray-100"
      >
        {p}
        <ChevronDown size={16} className={`shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{r}</p>}
    </div>
  );
}

export default function Ayuda() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-2 mb-1">
        <HelpCircle className="text-brand-600 dark:text-brand-400" size={26} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Centro de ayuda</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Respuestas rápidas a las dudas más comunes. ¿No encuentras lo que buscas? Escríbenos a{' '}
        <a href="mailto:hola@vecinomarket.bo" className="text-brand-600 dark:text-brand-400 hover:underline">
          hola@vecinomarket.bo
        </a>
        .
      </p>

      {SECCIONES.map((seccion) => (
        <section key={seccion.id} id={seccion.id} className="mb-8 scroll-mt-20">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{seccion.titulo}</h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-4">
            {seccion.preguntas.map((item) => (
              <Pregunta key={item.p} {...item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
