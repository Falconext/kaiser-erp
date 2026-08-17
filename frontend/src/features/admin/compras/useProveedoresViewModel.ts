import { ChangeEvent, useEffect, useState } from 'react';
import { useClientsStore } from '@/zustand/clients';
import useAlertStore from '@/zustand/alert';
import { IClient } from '@/interfaces/clients';
import { useDebounce } from '@/hooks/useDebounce';
import {
    INITIAL_PROVEEDOR_ERRORS,
    INITIAL_PROVEEDOR_FORM,
    IProveedoresViewModelState,
} from './ComprasModel';

const CODIGO_TO_TIPO_DOC: Record<string, string> = { '1': 'DNI', '6': 'RUC', '4': 'CE', '7': 'PASAPORTE', '0': 'OTRO' };
const DOC_LABELS: Record<string, string> = { DNI: 'DNI', RUC: 'RUC', CE: 'C.E.', PASAPORTE: 'Pasaporte', OTRO: 'Otro' };
const mapCodigoToTipoDoc = (data: IClient): string => {
    const tipoDoc = String((data as any).tipoDoc || '').toUpperCase();
    if (tipoDoc && DOC_LABELS[tipoDoc]) return tipoDoc;
    const codigo = data.tipoDocumento?.codigo;
    if (codigo && CODIGO_TO_TIPO_DOC[codigo]) return CODIGO_TO_TIPO_DOC[codigo];
    if (data.nroDoc?.length === 8) return 'DNI';
    if (data.nroDoc?.length === 11) return 'RUC';
    return 'RUC';
};
const getDocLabel = (data: IClient): string => {
    const tipo = mapCodigoToTipoDoc(data);
    return DOC_LABELS[tipo] || tipo || '';
};

export const useProveedoresViewModel = () => {
    const { getAllClients, clients, totalClients, toggleStateClient, deleteClient } = useClientsStore();
    const { success } = useAlertStore();

    const [state, setState] = useState<IProveedoresViewModelState>({
        currentPage: 1,
        itemsPerPage: 50,
        searchClient: '',
        isOpenModal: false,
        isOpenModalConfirm: false,
        formValues: INITIAL_PROVEEDOR_FORM,
        isEdit: false,
        errors: INITIAL_PROVEEDOR_ERRORS,
        openAccionesId: null,
        anchorEl: null,
    });

    const debounce = useDebounce(state.searchClient, 600);

    const indexOfLastItem = state.currentPage * state.itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - state.itemsPerPage;
    const pages = Array.from(
        { length: Math.ceil(totalClients / state.itemsPerPage) },
        (_, i) => i + 1
    );

    // Fetch proveedores
    useEffect(() => {
        getAllClients({ page: state.currentPage, limit: state.itemsPerPage, search: debounce, persona: 'PROVEEDOR' });
    }, [debounce, state.currentPage, state.itemsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    // Close modal on success
    useEffect(() => {
        if (success === true) setState(prev => ({ ...prev, isOpenModal: false, isEdit: false }));
    }, [success]);

    // Close dropdown on document click
    useEffect(() => {
        const handleDocClick = () => {
            if (state.openAccionesId !== null) setState(prev => ({ ...prev, openAccionesId: null, anchorEl: null }));
        };
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, [state.openAccionesId]);

    // Table data
    const proveedoresTable = clients?.map((item: IClient) => ({
        id: item.id,
        'Razón Social / Nombre': item.nombre,
        'Documento': getDocLabel(item),
        'Nro. Doc': item.nroDoc,
        'Celular': item.telefono,
        'Dirección': item.direccion,
        'Estado': item.estado,
        _raw: item,
    }));

    const actions = {
        openNewModal: () =>
            setState(prev => ({ ...prev, formValues: INITIAL_PROVEEDOR_FORM, errors: INITIAL_PROVEEDOR_ERRORS, isOpenModal: true, isEdit: false })),
        openEditModal: (data: IClient) =>
            setState(prev => ({ ...prev, formValues: { ...data as any, tipoDoc: mapCodigoToTipoDoc(data) }, isOpenModal: true, isEdit: true, openAccionesId: null })),
        closeModal: () =>
            setState(prev => ({ ...prev, isOpenModal: false, isEdit: false })),
        setFormValues: (values: any) =>
            setState(prev => ({ ...prev, formValues: values })),
        setErrors: (errors: any) =>
            setState(prev => ({ ...prev, errors })),
        openConfirmToggle: (data: IClient) =>
            setState(prev => ({ ...prev, formValues: data as any, isOpenModalConfirm: true, openAccionesId: null })),
        confirmToggleState: () => {
            toggleStateClient(Number(state.formValues?.id));
            setState(prev => ({ ...prev, isOpenModalConfirm: false }));
        },
        // Eliminación con candado: el backend rechaza si el proveedor tiene historial.
        deleteClient: (id: number) => deleteClient(id),
        closeMenu: () => setState(prev => ({ ...prev, openAccionesId: null, anchorEl: null })),
        setIsOpenModalConfirm: (v: boolean) =>
            setState(prev => ({ ...prev, isOpenModalConfirm: v })),
        setcurrentPage: (page: number) =>
            setState(prev => ({ ...prev, currentPage: page })),
        setitemsPerPage: (items: number) =>
            setState(prev => ({ ...prev, itemsPerPage: items })),
        handleSearchChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setState(prev => ({ ...prev, searchClient: e.target.value })),
        setOpenAccionesId: (id: number | null) =>
            setState(prev => ({ ...prev, openAccionesId: id })),
        setAnchorEl: (el: HTMLElement | null) =>
            setState(prev => ({ ...prev, anchorEl: el })),
    };

    return {
        ...state,
        clients,
        totalClients,
        proveedoresTable,
        indexOfLastItem,
        indexOfFirstItem,
        pages,
        actions,
    };
};
