import { useEffect, useState } from 'react';
import { useAuthStore } from '@/zustand/auth';
import { useSedesStore } from '@/zustand/sedes';

/**
 * Selección de sede para el Análisis Financiero. Mismo criterio que ya usa el
 * Flujo de Caja (useFinanceDashboardViewModel): el selector solo tiene sentido
 * para un administrador situado en la sede principal; parado en una sede
 * concreta, el análisis se limita a esa sede.
 *
 * `null` = todas las sedes, que es el comportamiento histórico y el valor por
 * defecto: quien no toque el selector ve exactamente lo mismo que antes.
 */
export function useSedeFinanzas() {
  const { auth, sedeActiva } = useAuthStore();
  const { sedes, listarSedes } = useSedesStore();

  const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';
  const esPrincipal = !sedeActiva || sedeActiva.esPrincipal === true;
  const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);

  const puedeElegirSede = isAdmin && esPrincipal && sedes.length > 1;
  const sedeId = esPrincipal ? selectedSedeId : (sedeActiva?.id ?? null);

  const sedesOptions = [
    { id: 0, value: 'Todas las sedes' },
    ...sedes.map((s: any) => ({ id: s.id, value: s.nombre })),
  ];

  useEffect(() => {
    if (isAdmin && esPrincipal) listarSedes();
  }, [isAdmin, esPrincipal]);

  const handleSelectSede = (id: any) => {
    const n = Number(id);
    setSelectedSedeId(Number.isFinite(n) && n > 0 ? n : null);
  };

  const sedeNombre = sedeId
    ? (sedes.find((s: any) => s.id === sedeId)?.nombre ?? '')
    : 'Todas las sedes';

  return {
    sedeId,
    sedeNombre,
    sedesOptions,
    puedeElegirSede,
    selectedSedeId,
    handleSelectSede,
  };
}
