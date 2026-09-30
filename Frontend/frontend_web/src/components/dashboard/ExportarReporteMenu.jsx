import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileType, Globe, Mail } from 'lucide-react';
import Dropdown from '../ui/Dropdown';
import API from '../../api/axios';

const FORMATOS = [
  { valor: 'pdf', etiqueta: 'PDF', icono: FileText },
  { valor: 'xlsx', etiqueta: 'Excel (XLSX)', icono: FileSpreadsheet },
  { valor: 'csv', etiqueta: 'CSV', icono: FileType },
  { valor: 'html', etiqueta: 'HTML', icono: Globe },
];

function nombreDesdeCabecera(cabecera, respaldo) {
  const match = /filename="?([^"]+)"?/.exec(cabecera || '');
  return match ? match[1] : respaldo;
}

export default function ExportarReporteMenu({ url }) {
  const [descargando, setDescargando] = useState(null);

  async function exportar(formato) {
    setDescargando(formato);
    try {
      const res = await API.get(url, { params: { formato }, responseType: 'blob' });
      const nombre = nombreDesdeCabecera(res.headers['content-disposition'], `reporte.${formato}`);
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.alert('No se pudo generar el reporte. Intenta de nuevo.');
    } finally {
      setDescargando(null);
    }
  }

  async function enviarPorCorreo() {
    setDescargando('email');
    try {
      const res = await API.get(url, { params: { formato: 'email' } });
      window.alert(res.data?.detail || 'Reporte enviado por correo.');
    } catch {
      window.alert('No se pudo enviar el reporte por correo. Intenta de nuevo.');
    } finally {
      setDescargando(null);
    }
  }

  return (
    <Dropdown
      align="right"
      triggerClassName="flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      panelClassName="w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1.5 shadow-lg text-sm text-gray-700 dark:text-gray-200"
      trigger={
        <>
          <Download size={15} /> Exportar
        </>
      }
    >
      {FORMATOS.map(({ valor, etiqueta, icono: Icono }) => (
        <button
          key={valor}
          onClick={() => exportar(valor)}
          disabled={descargando !== null}
          className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
        >
          <Icono size={15} /> {descargando === valor ? 'Generando...' : etiqueta}
        </button>
      ))}
      <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
      <button
        onClick={enviarPorCorreo}
        disabled={descargando !== null}
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
      >
        <Mail size={15} /> {descargando === 'email' ? 'Enviando...' : 'Enviar por correo'}
      </button>
    </Dropdown>
  );
}
