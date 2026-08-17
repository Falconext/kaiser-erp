import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import DataTable from '@/components/Datatable';
import Select from '@/components/Select';
import KpiHero from '@/components/ui/KpiHero';

type ReviewEstado = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'OCULTO';

type Review = {
  id: number;
  clienteNombre: string;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  rating: number;
  comentario: string;
  estado: ReviewEstado;
  compraVerificada: boolean;
  creadoEn: string;
  producto?: { id: number; descripcion: string; imagenUrl?: string | null };
  pedido?: { id: number; codigoSeguimiento: string } | null;
};

const estados = [
  { id: 'TODOS', value: 'Todos' },
  { id: 'PENDIENTE', value: 'Pendientes' },
  { id: 'APROBADO', value: 'Aprobados' },
  { id: 'RECHAZADO', value: 'Rechazados' },
  { id: 'OCULTO', value: 'Ocultos' },
];

const estadoStyles: Record<ReviewEstado, string> = {
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  APROBADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECHAZADO: 'bg-rose-50 text-rose-700 border-rose-200',
  OCULTO: 'bg-slate-50 text-slate-600 border-slate-200',
};

function getPayload<T>(response: any): T {
  return (response?.data?.data ?? response?.data) as T;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon
          key={index}
          icon={index < rating ? 'solar:star-bold' : 'solar:star-line-duotone'}
          className="h-4 w-4"
        />
      ))}
    </div>
  );
}

export default function ReviewsTienda() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [estado, setEstado] = useState<string>('PENDIENTE');
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estado !== 'TODOS') params.set('estado', estado);
      params.set('limit', '100');
      const res = await apiClient.get(`/tienda/reviews?${params.toString()}`);
      const payload = getPayload<{ items?: Review[]; total?: number }>(res);
      setReviews(Array.isArray(payload?.items) ? payload.items : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, [estado]);

  const cambiarEstado = async (id: number, nextEstado: ReviewEstado) => {
    await apiClient.patch(`/tienda/reviews/${id}/estado`, { estado: nextEstado });
    await cargar();
  };

  const stats = useMemo(() => {
    const pendientes = reviews.filter((item) => item.estado === 'PENDIENTE').length;
    const aprobadas = reviews.filter((item) => item.estado === 'APROBADO').length;
    return { pendientes, aprobadas, total: reviews.length };
  }, [reviews]);

  const bodyData = reviews.map((review) => ({
    id: review.id,
    Producto: (
      <div className="min-w-[220px]">
        <p className="text-xs font-semibold uppercase text-slate-800 dark:text-white">
          {review.producto?.descripcion || 'Producto'}
        </p>
        <p className="text-[11px] text-slate-400">#{review.producto?.id || '-'}</p>
      </div>
    ),
    Cliente: (
      <div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{review.clienteNombre}</p>
        <p className="text-[11px] text-slate-400">{review.clienteTelefono || review.clienteEmail || 'Sin contacto'}</p>
      </div>
    ),
    Rating: <Stars rating={review.rating} />,
    Comentario: (
      <p className="max-w-[320px] md:max-w-[420px] text-xs leading-5 text-slate-600 dark:text-slate-300 whitespace-normal break-words">
        {review.comentario}
      </p>
    ),
    Verificada: (
      <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${review.compraVerificada ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-500'}`}>
        {review.compraVerificada ? 'Compra verificada' : 'No verificada'}
      </span>
    ),
    Estado: (
      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${estadoStyles[review.estado]}`}>
        {review.estado}
      </span>
    ),
    Fecha: (
      <span className="text-xs text-slate-500">
        {new Date(review.creadoEn).toLocaleDateString('es-PE')}
      </span>
    ),
    Acciones: (
      <div className="flex items-center gap-2">
        {review.estado !== 'APROBADO' && (
          <button
            onClick={() => cambiarEstado(review.id, 'APROBADO')}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-600"
          >
            <Icon icon="solar:check-circle-bold" /> Aprobar
          </button>
        )}
        {review.estado !== 'RECHAZADO' && (
          <button
            onClick={() => cambiarEstado(review.id, 'RECHAZADO')}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-rose-50 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-100"
          >
            <Icon icon="solar:close-circle-bold" /> Rechazar
          </button>
        )}
        {review.estado === 'APROBADO' && (
          <button
            onClick={() => cambiarEstado(review.id, 'OCULTO')}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            <Icon icon="solar:eye-closed-bold" /> Ocultar
          </button>
        )}
      </div>
    ),
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Comentarios y rating</h1>
          <p className="text-sm text-slate-500">Modera las reseñas públicas de tu tienda virtual.</p>
        </div>
        <div className="w-full md:w-56">
          <Select
            name="estado"
            label="Estado"
            options={estados}
            value={estados.find((item) => item.id === estado)?.value || 'Pendientes'}
            onChange={(value) => setEstado(String(value))}
            error={null}
          />
        </div>
      </div>

      <KpiHero
        cards={[
          { label: 'Total vista', value: String(stats.total), mini: 'line' },
          { label: 'Pendientes', value: String(stats.pendientes), mini: 'wave' },
          { label: 'Aprobadas', value: String(stats.aprobadas), mini: 'bars' },
        ]}
      />

      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent relative z-0 overflow-hidden">
        <div className="p-4 overflow-x-auto">
          <DataTable
            headerColumns={['Producto', 'Cliente', 'Rating', 'Comentario', 'Verificada', 'Estado', 'Fecha', 'Acciones']}
            bodyData={bodyData}
            pageSize={100}
          />
        </div>
      </div>
    </div>
  );
}
