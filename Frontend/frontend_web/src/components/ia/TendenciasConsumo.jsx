import { useEffect, useState } from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import { formatoNumero, obtenerTendencias } from '../../api/ia';
import { DEPARTAMENTOS } from '../../context/LocationContext';

const PERIODOS = [4, 8, 12, 26];
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const ESTADOS = {
  en_alza: { texto: '▲ En alza', clase: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  en_baja: { texto: '▼ En baja', clase: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  estable: { texto: '• Estable', clase: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  sin_datos: { texto: 'Sin datos', clase: 'bg-gray-50 text-gray-400 dark:bg-gray-800/60 dark:text-gray-500' },
};

const SELECT = 'rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300';
const TARJETA = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4';

function pct(valor) {
  if (valor == null) return '—';
  return `${valor > 0 ? '+' : valor < 0 ? '−' : ''}${formatoNumero(Math.abs(valor), 1)} %`;
}

function suma(lista) {
  return lista.reduce((a, b) => a + b, 0);
}

// conVistas: si la categoría no vendió pero sí tuvo vistas, "Sin ventas" es más claro que "Sin datos".
function EstadoBadge({ estado, conVistas = false }) {
  const e = ESTADOS[estado] || ESTADOS.sin_datos;
  const texto = estado === 'sin_datos' && conVistas ? 'Sin ventas' : e.texto;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${e.clase}`}>{texto}</span>;
}

function Kpi({ etiqueta, valor, detalle }) {
  return (
    <div className={TARJETA}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{etiqueta}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{valor}</p>
      {detalle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{detalle}</p>}
    </div>
  );
}

// Barras de unidades por semana + pronóstico (mismo estilo que VentasPorDiaChart).
function GraficoSemanal({ titulo, semanas, pronostico, tendencia }) {
  const maximo = Math.max(...semanas, ...pronostico, 1);
  const barras = [
    ...semanas.map((v, i) => ({ v, etiqueta: `S${i + 1}`, futuro: false })),
    ...pronostico.map((v, i) => ({ v, etiqueta: `+${i + 1}`, futuro: true })),
  ];
  return (
    <div className={`${TARJETA} lg:col-span-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{titulo}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Unidades vendidas</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-brand-400 bg-brand-100 dark:bg-brand-900/40" /> Pronóstico {pronostico.length} semanas</span>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-44">
        {barras.map((b) => (
          <div key={b.etiqueta} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{formatoNumero(b.v)}</span>
            <div
              className={`w-full rounded-t-sm ${
                b.futuro
                  ? 'border border-dashed border-brand-400 bg-brand-100 dark:bg-brand-900/40'
                  : b.v > 0 ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              style={{ height: `${Math.max((b.v / maximo) * 100, b.v > 0 ? 3 : 1)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {barras.map((b) => (
          <div key={b.etiqueta} className="flex-1 text-center text-[9px] text-gray-400 dark:text-gray-500">{b.etiqueta}</div>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Tendencia: {pct(tendencia.pct_semanal)} por semana (pendiente de regresión lineal sobre {semanas.length} semanas cerradas).
        Solo cuenta pedidos pagados y no cancelados.
      </p>
    </div>
  );
}

// "sábados de 19:00 a 21:00": hora pico y las vecinas con al menos el 60 % de sus pedidos.
function horarioPico(picos) {
  if (!picos.dia_pico) return null;
  const horas = picos.horas.map((h) => h.pedidos);
  const max = Math.max(...horas);
  if (max === 0) return null;
  let desde = horas.indexOf(max);
  let hasta = desde;
  while (desde > 0 && horas[desde - 1] >= max * 0.6) desde -= 1;
  while (hasta < 23 && horas[hasta + 1] >= max * 0.6) hasta += 1;
  const dia = picos.dia_pico.toLowerCase();
  const plural = dia.endsWith('s') ? dia : `${dia}s`;
  const hora = (h) => `${String(h % 24).padStart(2, '0')}:00`;
  return `${plural} de ${hora(desde)} a ${hora(hasta + 1)}`;
}

function DiasPico({ picos }) {
  const pedidos = picos.dias.map((d) => d.pedidos);
  const maximo = Math.max(...pedidos, 1);
  const pico = Math.max(...pedidos) > 0 ? pedidos.indexOf(Math.max(...pedidos)) : -1;
  const horario = horarioPico(picos);
  return (
    <div className={TARJETA}>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Días con más ventas</p>
      <div className="flex items-end gap-2 h-28">
        {pedidos.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${formatoNumero(v)} pedidos`}>
            <div
              className={`w-full rounded-t-sm ${i === pico ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              style={{ height: `${Math.max((v / maximo) * 100, 3)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1.5">
        {DIAS_CORTOS.map((d) => (
          <div key={d} className="flex-1 text-center text-[10px] text-gray-400 dark:text-gray-500">{d}</div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
        <Clock size={14} />
        {horario ? `Horario pico: ${horario}` : 'Todavía no hay pedidos en este período.'}
      </div>
    </div>
  );
}

function TablaCategorias({ datos, esEmpresa }) {
  return (
    <div className={TARJETA}>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Tendencia por categoría {datos.zona ? `en ${datos.zona}` : 'en toda la plataforma'}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Crecimiento semanal: más de +{formatoNumero(datos.umbral_pct)} % es «En alza», menos de −{formatoNumero(datos.umbral_pct)} % es «En baja», el resto es «Estable».
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th className="py-2 pr-3 font-medium">Categoría</th>
              <th className="py-2 px-3 font-medium text-right">Ventas ({datos.semanas.length} sem.)</th>
              <th className="py-2 px-3 font-medium text-right">Vistas</th>
              <th className="py-2 px-3 font-medium text-right">Crecimiento / sem.</th>
              <th className="py-2 px-3 font-medium">Estado</th>
              {esEmpresa && <th className="py-2 pl-3 font-medium">¿Lo ofreces?</th>}
            </tr>
          </thead>
          <tbody>
            {datos.categorias.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                <td className="py-2 pr-3 font-medium text-gray-900 dark:text-gray-100">{c.nombre}</td>
                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{formatoNumero(suma(c.serie.unidades))}</td>
                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{formatoNumero(suma(c.serie.vistas))}</td>
                <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-100">{pct(c.tendencia.pct_semanal)}</td>
                <td className="py-2 px-3"><EstadoBadge estado={c.tendencia.estado} conVistas={suma(c.serie.vistas) > 0} /></td>
                {esEmpresa && <td className="py-2 pl-3 text-gray-700 dark:text-gray-300">{c.vende_empresa ? 'Sí' : 'No'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BusquedasSinResultados({ busquedas, zona }) {
  return (
    <div className={TARJETA}>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Búsquedas sin resultados {zona ? `en ${zona}` : 'en la plataforma'}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Productos que los compradores buscan y nadie ofrece todavía</p>
      {busquedas.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Ninguna búsqueda quedó sin resultados en este período.</p>
      ) : (
        <div className="space-y-2">
          {busquedas.slice(0, 6).map((b) => (
            <div key={b.termino} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">«{b.termino}»</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{formatoNumero(b.veces)} {b.veces === 1 ? 'búsqueda' : 'búsquedas'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Máximo 6 filas: primero las categorías que nadie ofrece en la zona (las
// oportunidades más claras, hasta 3), luego las de más vistas por producto.
function DemandaOferta({ categorias }) {
  const sinOferta = categorias
    .filter((c) => c.demanda_oferta.nivel === 'sin_oferta')
    .sort((a, b) => b.demanda_oferta.vistas - a.demanda_oferta.vistas)
    .slice(0, 3);
  const conRatio = categorias
    .filter((c) => c.demanda_oferta.vistas_por_producto != null)
    .sort((a, b) => b.demanda_oferta.vistas_por_producto - a.demanda_oferta.vistas_por_producto)
    .slice(0, 6 - sinOferta.length);
  const maximo = Math.max(...conRatio.map((c) => c.demanda_oferta.vistas_por_producto), 1);
  return (
    <div className={TARJETA}>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Demanda vs. oferta</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Vistas por producto activo en la categoría (más alto = menos competencia)</p>
      {sinOferta.map((c) => (
        <div key={c.id} className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">{c.nombre}</span>
            <span className="text-green-700 dark:text-green-400">{formatoNumero(c.demanda_oferta.vistas)} vistas / nadie la ofrece</span>
          </div>
          <div className="h-2 rounded-full bg-green-600" />
        </div>
      ))}
      {conRatio.length === 0 && sinOferta.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Sin datos suficientes en este período.</p>
      ) : conRatio.map((c) => (
        <div key={c.id} className="mb-3">
          <div className="flex justify-between gap-2 text-xs mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">{c.nombre}</span>
            <span className="text-gray-500 dark:text-gray-400 shrink-0">
              {formatoNumero(c.demanda_oferta.vistas)} vistas / {formatoNumero(c.demanda_oferta.productos_activos)} {c.demanda_oferta.productos_activos === 1 ? 'producto' : 'productos'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(c.demanda_oferta.vistas_por_producto / maximo) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Requisito de CU3 que el prototipo no dibuja: empresa vs. promedio del mercado de su zona.
function ComparacionMercado({ comparacion, zona }) {
  return (
    <div className={TARJETA}>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tú vs. el mercado {zona ? `de ${zona}` : ''}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Promedio por empresa entre {formatoNumero(comparacion.empresas_en_zona)} {comparacion.empresas_en_zona === 1 ? 'empresa' : 'empresas'} de tu zona
      </p>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tu participación</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {comparacion.participacion_pct == null ? '—' : `${formatoNumero(comparacion.participacion_pct, 1)} %`}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tus ventas (Bs)</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{pct(comparacion.tendencia_empresa.pct_semanal)}</p>
          <EstadoBadge estado={comparacion.tendencia_empresa.estado} />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Promedio del mercado</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{pct(comparacion.tendencia_mercado.pct_semanal)}</p>
          <EstadoBadge estado={comparacion.tendencia_mercado.estado} />
        </div>
      </div>
      {comparacion.por_categoria.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800 py-2 text-xs">
          <span className="font-medium text-gray-900 dark:text-gray-100">{c.nombre}</span>
          <span className="text-gray-500 dark:text-gray-400">
            Tú {pct(c.tendencia_empresa.pct_semanal)} · mercado {pct(c.tendencia_mercado.pct_semanal)}
            {c.participacion_pct != null && ` · ${formatoNumero(c.participacion_pct, 1)} % de las ventas`}
          </span>
        </div>
      ))}
    </div>
  );
}

// CU3 (RF46): tablero de tendencias. modo 'empresa' (su zona) o 'admin' (global, filtro por departamento).
// onAccesoDenegado(err) recibe los 403 para que la página muestre su pantalla de "Sin acceso".
export default function TendenciasConsumo({ modo = 'empresa', onAccesoDenegado }) {
  const esEmpresa = modo === 'empresa';
  const [semanas, setSemanas] = useState(12);
  const [departamento, setDepartamento] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    obtenerTendencias({ semanas, departamento })
      .then((res) => {
        if (!vigente) return;
        setDatos(res);
        setError('');
      })
      .catch((err) => {
        if (!vigente) return;
        if (err?.response?.status === 403 && onAccesoDenegado) onAccesoDenegado(err);
        else setError('No se pudo cargar el análisis de tendencias.');
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [semanas, departamento, onAccesoDenegado]);

  function cambiar(setter) {
    return (e) => {
      setCargando(true);
      setter(e.target.value);
    };
  }

  const resumen = datos?.resumen;
  const conDatos = datos ? datos.categorias.filter((c) => c.tendencia.estado !== 'sin_datos') : [];
  const enAlza = conDatos.filter((c) => c.tendencia.estado === 'en_alza');
  const mayor = conDatos.reduce((m, c) => (m == null || c.tendencia.pct_semanal > m.tendencia.pct_semanal ? c : m), null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-gray-800 text-brand-600 dark:text-brand-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Análisis de tendencias</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {esEmpresa ? 'CU20 · RF46 · Patrones de consumo para planificar tu oferta' : 'CU20 · RF46 · Patrones de consumo de toda la plataforma'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!esEmpresa && (
            <>
              <label htmlFor="tendencias-departamento" className="text-sm text-gray-500 dark:text-gray-400">Zona</label>
              <select id="tendencias-departamento" value={departamento} onChange={cambiar(setDepartamento)} className={SELECT}>
                <option value="">Todo el país</option>
                {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </>
          )}
          <label htmlFor="tendencias-periodo" className="text-sm text-gray-500 dark:text-gray-400">Período</label>
          <select id="tendencias-periodo" value={semanas} onChange={cambiar((v) => setSemanas(Number(v)))} className={SELECT}>
            {PERIODOS.map((p) => <option key={p} value={p}>Últimas {p} semanas</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {!datos ? (
        !error && <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <div className={`space-y-6 transition-opacity ${cargando ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              etiqueta="Categorías en alza"
              valor={`${enAlza.length} de ${conDatos.length}`}
              detalle={enAlza.map((c) => c.nombre).join(', ') || 'Ninguna por ahora'}
            />
            <Kpi
              etiqueta="Mayor crecimiento"
              valor={mayor ? `${pct(mayor.tendencia.pct_semanal)} / sem.` : '—'}
              detalle={mayor?.nombre}
            />
            <Kpi
              etiqueta={`Pronóstico próximas ${resumen.pronostico_unidades.length} semanas`}
              valor={`${formatoNumero(suma(resumen.pronostico_unidades))} unidades`}
              detalle={esEmpresa ? 'Regresión lineal sobre tus ventas' : 'Regresión lineal sobre las ventas del mercado'}
            />
            <Kpi
              etiqueta={esEmpresa ? 'Vistas a tus productos' : 'Vistas de productos'}
              valor={formatoNumero(suma(resumen.vistas_semanales.slice(-4)))}
              detalle="Últimas 4 semanas"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GraficoSemanal
              titulo={esEmpresa ? 'Tus ventas semanales y pronóstico' : 'Ventas semanales y pronóstico'}
              semanas={resumen.unidades_semanales}
              pronostico={resumen.pronostico_unidades}
              tendencia={resumen.tendencia_unidades}
            />
            <DiasPico picos={datos.picos} />
          </div>

          <TablaCategorias datos={datos} esEmpresa={esEmpresa} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BusquedasSinResultados busquedas={datos.busquedas_sin_resultados} zona={datos.zona} />
            <DemandaOferta categorias={datos.categorias} />
          </div>

          {esEmpresa && datos.comparacion_mercado && (
            <ComparacionMercado comparacion={datos.comparacion_mercado} zona={datos.zona} />
          )}
        </div>
      )}
    </div>
  );
}
