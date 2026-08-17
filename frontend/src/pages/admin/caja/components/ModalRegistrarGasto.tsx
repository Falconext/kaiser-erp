import React, { useState } from 'react';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import Button from '@/components/Button';
import { Icon } from '@iconify/react';
import { useCajaStore, CATEGORIAS_GASTO } from '@/zustand/caja';
import useAlertStore from '@/zustand/alert';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const METODOS_PAGO = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta'];

const INITIAL_FORM = {
  monto: '' as string | number,
  categoriaGasto: '',
  descripcionGasto: '',
  metodoPago: 'Efectivo',
};

const ModalRegistrarGasto: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { registrarEgreso, loading } = useCajaStore();
  const { alert } = useAlertStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    const monto = parseFloat(String(form.monto));
    if (!form.monto || isNaN(monto) || monto <= 0) e.monto = 'Ingresa un monto válido';
    if (!form.categoriaGasto) e.categoriaGasto = 'Selecciona una categoría';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const result = await registrarEgreso({
      monto: parseFloat(String(form.monto)),
      categoriaGasto: form.categoriaGasto,
      descripcionGasto: form.descripcionGasto || undefined,
      metodoPago: form.metodoPago,
    });
    if (result.success) {
      alert('Gasto registrado correctamente', 'success');
      setForm(INITIAL_FORM);
      setErrors({});
      onSuccess?.();
      onClose();
    } else {
      alert(result.message || 'Error al registrar gasto', 'error');
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpenModal={isOpen}
      closeModal={handleClose}
      title="Registrar Gasto"
      width="480px"
      icon="solar:wallet-money-bold-duotone"
      iconClass="text-orange-500"
      height="auto"
    >
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Select
              label="Categoría *"
              name="categoriaGasto"
              error={errors.categoriaGasto || ''}
              defaultValue={form.categoriaGasto || 'Seleccionar categoría'}
              onChange={(_id: any, value: string) => {
                setForm(prev => ({ ...prev, categoriaGasto: value }));
                setErrors(prev => ({ ...prev, categoriaGasto: '' }));
              }}
              options={CATEGORIAS_GASTO.map((c, i) => ({ id: i + 1, value: c }))}
            />
          </div>

          <div>
            <InputPro
              label="Monto (S/) *"
              name="monto"
              type="number"
              value={form.monto}
              onChange={(e: any) => {
                setForm(prev => ({ ...prev, monto: e.target.value }));
                setErrors(prev => ({ ...prev, monto: '' }));
              }}
              isLabel
              error={errors.monto}
              autoFocus
            />
          </div>

          <div>
            <Select
              label="Método de pago"
              name="metodoPago"
              error=""
              defaultValue={form.metodoPago}
              onChange={(_id: any, value: string) =>
                setForm(prev => ({ ...prev, metodoPago: value }))
              }
              options={METODOS_PAGO.map((m, i) => ({ id: i + 1, value: m }))}
            />
          </div>

          <div className="col-span-2">
            <InputPro
              label="Descripción"
              name="descripcionGasto"
              type="textarea"
              rows={2}
              value={form.descripcionGasto}
              onChange={(e: any) =>
                setForm(prev => ({ ...prev, descripcionGasto: e.target.value }))
              }
              isLabel
              placeholder="Detalle del gasto (opcional)"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white border-none"
          >
            {loading
              ? <Icon icon="eos-icons:loading" className="mr-2" />
              : <Icon icon="solar:arrow-right-up-bold" className="mr-2" />
            }
            Registrar Gasto
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalRegistrarGasto;
