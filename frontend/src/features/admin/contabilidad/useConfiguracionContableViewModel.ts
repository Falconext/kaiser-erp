import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, put } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { usePuedeEscribir } from '@/hooks/usePuedeEscribir';
import type { Cuenta } from './useLibroDiarioViewModel';

export interface FilaConfiguracion {
  clave: string;
  descripcion: string;
  /** VALOR es un ajuste que no es una cuenta (USA_CLASE_9): se pinta como toggle. */
  tipo: 'CUENTA' | 'VALOR';
  cuenta: { id: number; codigo: string; denominacion: string } | null;
  valor: string | null;
  porDefecto: string | null;
}

/**
 * Los bloques en los que se agrupa el mapeo. No es decoración: la contadora
 * revisa "lo de ventas" o "lo de planilla", no 38 claves en una lista plana.
 * Una clave que no esté aquí cae en "Otros", así que añadir una al backend no
 * la esconde.
 */
export const BLOQUES: ReadonlyArray<{ titulo: string; icono: string; claves: string[] }> = [
  {
    titulo: 'Ventas',
    icono: 'solar:cart-large-2-bold-duotone',
    claves: [
      'CLIENTES', 'IGV_VENTAS', 'VENTA_MERCADERIA', 'VENTA_PRODUCTO_TERMINADO',
      'DEVOLUCION_VENTA_MERCADERIA', 'DEVOLUCION_VENTA_PRODUCTO_TERMINADO',
      'COSTO_VENTA_MERCADERIA', 'COSTO_VENTA_PRODUCTO_TERMINADO',
    ],
  },
  {
    titulo: 'Compras y existencias',
    icono: 'solar:box-bold-duotone',
    claves: [
      'PROVEEDORES', 'IGV_COMPRAS', 'COMPRA_MERCADERIA', 'COMPRA_MATERIA_PRIMA',
      'EXISTENCIA_MERCADERIA', 'EXISTENCIA_PRODUCTO_TERMINADO', 'EXISTENCIA_MATERIA_PRIMA',
      'VARIACION_MERCADERIA', 'VARIACION_MATERIA_PRIMA',
    ],
  },
  {
    titulo: 'Tesorería',
    icono: 'solar:wallet-money-bold-duotone',
    claves: ['CAJA', 'BANCOS', 'DETRACCIONES'],
  },
  {
    titulo: 'Gastos e ingresos',
    icono: 'solar:bill-list-bold-duotone',
    claves: [
      'GASTO_PUBLICIDAD', 'GASTO_ENVIOS', 'GASTO_COMISIONES', 'GASTO_ALQUILER',
      'GASTO_OTROS', 'INGRESO_OTROS',
    ],
  },
  {
    titulo: 'Planilla',
    icono: 'solar:users-group-rounded-bold-duotone',
    claves: [
      'SUELDOS', 'COMISIONES_VENDEDORES', 'ESSALUD_GASTO', 'SUELDOS_POR_PAGAR',
      'ESSALUD_POR_PAGAR', 'ONP_POR_PAGAR', 'RENTA_QUINTA_POR_PAGAR', 'AFP_POR_PAGAR',
    ],
  },
  {
    titulo: 'Destino del gasto (clase 9)',
    icono: 'solar:routing-2-bold-duotone',
    claves: [
      'USA_CLASE_9', 'DESTINO_GASTO_ADMINISTRATIVO', 'DESTINO_GASTO_VENTAS',
      'CARGAS_IMPUTABLES',
    ],
  },
];

export const useConfiguracionContableViewModel = () => {
  const { alert } = useAlertStore();
  const puedeEscribir = usePuedeEscribir('contabilidad');

  const [filas, setFilas] = useState<FilaConfiguracion[]>([]);
  const [plan, setPlan] = useState<Cuenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  /** Lo tocado y aún sin guardar: clave → cuentaId (0 = sin cuenta) o 'true'/'false'. */
  const [cambios, setCambios] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    const [conf, cuentas] = await Promise.all([
      get<FilaConfiguracion[]>('contabilidad/configuracion'),
      get<Cuenta[]>('contabilidad/plan-cuentas?imputables=true'),
    ]);
    if (conf.success && conf.data) setFilas(conf.data);
    else alert(conf.error || 'No se pudo cargar la configuración contable', 'error');
    if (cuentas.success && cuentas.data) setPlan(cuentas.data);
    setCambios({});
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const porClave = useMemo(
    () => new Map(filas.map((f) => [f.clave, f])),
    [filas],
  );

  /** Valor actual de una fila: lo editado si se tocó, lo guardado si no. */
  const valorDe = (clave: string): string => {
    if (clave in cambios) return cambios[clave];
    const f = porClave.get(clave);
    if (!f) return '';
    return f.tipo === 'VALOR' ? (f.valor ?? 'false') : String(f.cuenta?.id ?? 0);
  };

  const cambiar = (clave: string, valor: string) =>
    setCambios((prev) => ({ ...prev, [clave]: valor }));

  const usaClase9 = valorDe('USA_CLASE_9') === 'true';
  const sinConfigurar = filas.filter(
    (f) => f.tipo === 'CUENTA' && !Number(valorDe(f.clave)),
  ).length;
  const hayCambios = Object.keys(cambios).length > 0;

  // Los bloques declarados, más un "Otros" con lo que no esté en ninguno: una
  // clave nueva en el backend aparece igual, no se queda invisible.
  const bloques = useMemo(() => {
    const asignadas = new Set(BLOQUES.flatMap((b) => b.claves));
    const sueltas = filas.filter((f) => !asignadas.has(f.clave)).map((f) => f.clave);
    const lista = BLOQUES.map((b) => ({
      ...b,
      filas: b.claves.map((c) => porClave.get(c)).filter((f): f is FilaConfiguracion => !!f),
    })).filter((b) => b.filas.length > 0);
    if (sueltas.length) {
      lista.push({
        titulo: 'Otros',
        icono: 'solar:settings-bold-duotone',
        claves: sueltas,
        filas: sueltas.map((c) => porClave.get(c)!) as FilaConfiguracion[],
      });
    }
    return lista;
  }, [filas, porClave]);

  const guardar = async () => {
    if (!hayCambios) return;
    setGuardando(true);
    const items = Object.entries(cambios).map(([clave, valor]) => {
      const f = porClave.get(clave);
      return f?.tipo === 'VALOR'
        ? { clave, valor }
        // 0 en el select significa "sin cuenta": se manda null para borrarla.
        : { clave, cuentaId: Number(valor) || null };
    });
    const r = await put<FilaConfiguracion[]>('contabilidad/configuracion', { items });
    setGuardando(false);
    if (r.success && r.data) {
      setFilas(r.data);
      setCambios({});
      alert('Configuración contable guardada', 'success');
    } else {
      alert(r.error || 'No se pudo guardar', 'error');
    }
  };

  const descartar = () => setCambios({});

  return {
    filas, plan, bloques, cargando, guardando, puedeEscribir,
    valorDe, cambiar, hayCambios, guardar, descartar, recargar: cargar,
    usaClase9, sinConfigurar,
  };
};
