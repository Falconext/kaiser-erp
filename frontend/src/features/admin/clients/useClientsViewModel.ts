import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useClientsStore } from '@/zustand/clients';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import { IClient } from '@/interfaces/clients';
import {
    ALL_COLUMNS,
    INITIAL_ERRORS,
    INITIAL_FORM,
    IClientsViewModelState,
    GrupoFarmacia,
} from './ClientsModel';

const CODIGO_TO_TIPO_DOC: Record<string, string> = { '1': 'DNI', '6': 'RUC', '4': 'CE', '7': 'PASAPORTE', '0': 'OTRO' };
const DOC_LABELS: Record<string, string> = { DNI: 'DNI', RUC: 'RUC', CE: 'C.E.', PASAPORTE: 'Pasaporte', OTRO: 'Otro' };
const mapCodigoToTipoDoc = (data: IClient): string => {
    const tipoDoc = String((data as any).tipoDoc || '').toUpperCase();
    if (tipoDoc && DOC_LABELS[tipoDoc]) return tipoDoc;
    const codigo = data.tipoDocumento?.codigo;
    if (codigo && CODIGO_TO_TIPO_DOC[codigo]) return CODIGO_TO_TIPO_DOC[codigo];
    if (data.nroDoc?.length === 8) return 'DNI';
    if (data.nroDoc?.length === 11) return 'RUC';
    return 'DNI';
};
const getDocLabel = (data: IClient): string => {
    const tipo = mapCodigoToTipoDoc(data);
    return DOC_LABELS[tipo] || tipo || '';
};

export const useClientsViewModel = () => {
    const { getAllClients, clients, totalClients, toggleStateClient, deleteClient, exportClients, importClients } = useClientsStore();
    const { success } = useAlertStore();
    const { auth } = useAuthStore();

    const isFarmacia = useMemo(() => {
        const r = auth?.empresa?.rubro?.nombre?.toLowerCase() ?? '';
        return r.includes('farmacia') || r.includes('botica') || r.includes('medicament') || r.includes('drogueria') || r.includes('droguería');
    }, [auth?.empresa?.rubro?.nombre]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [state, setState] = useState<IClientsViewModelState>({
        currentPage: 1,
        itemsPerPage: 50,
        isOpenModal: false,
        isOpenModalConfirm: false,
        searchClient: '',
        formValues: INITIAL_FORM,
        isEdit: false,
        errors: INITIAL_ERRORS,
        openAccionesId: null,
        anchorEl: null,
        visibleColumns: ALL_COLUMNS,
        showColumnFilter: false,
        isHoveredExp: false,
        isHoveredImp: false,
        grupoFarmacia: 'pacientes',
    });

    const debounce = useDebounce(state.searchClient, 600);

    // Pagination helpers
    const indexOfLastItem = state.currentPage * state.itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - state.itemsPerPage;
    const pages = Array.from({ length: Math.ceil(totalClients / state.itemsPerPage) }, (_, i) => i + 1);

    const columnsStorageKey = `datatable:${auth?.empresaId || 'default'}:clientes:visibleColumns`;

    // --- Effects ---

    // Load column preferences from localStorage
    useEffect(() => {
        if (!auth?.empresaId) return;
        try {
            const defaultKey = columnsStorageKey.replace(`${auth.empresaId}`, 'default');
            let parsed: any = null;
            for (const k of [columnsStorageKey, defaultKey]) {
                const raw = localStorage.getItem(k);
                if (raw) { try { parsed = JSON.parse(raw); } catch { parsed = null; } }
                if (Array.isArray(parsed)) break;
            }
            if (Array.isArray(parsed)) {
                let restored = ALL_COLUMNS.filter((c) => parsed.includes(c));
                if (!restored.includes('Acciones')) restored = [...restored, 'Acciones'];
                setState(prev => ({ ...prev, visibleColumns: restored }));
            }
        } catch (_e) { /* noop */ }
    }, [auth?.empresaId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Persist column preferences to localStorage
    useEffect(() => {
        try {
            const toSave = state.visibleColumns.includes('Acciones')
                ? state.visibleColumns
                : [...state.visibleColumns, 'Acciones'];
            localStorage.setItem(columnsStorageKey, JSON.stringify(toSave));
        } catch (_e) { /* noop */ }
    }, [state.visibleColumns]); // eslint-disable-line react-hooks/exhaustive-deps

    // Close dropdown on document click
    useEffect(() => {
        const handleDocClick = () => {
            if (state.openAccionesId !== null) setState(prev => ({ ...prev, openAccionesId: null }));
            if (state.showColumnFilter) setState(prev => ({ ...prev, showColumnFilter: false }));
        };
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, [state.openAccionesId, state.showColumnFilter]);

    // Close modal on success
    useEffect(() => {
        if (success === true) {
            setState(prev => ({ ...prev, isOpenModal: false, isEdit: false }));
        }
    }, [success]);

    // Fetch clients on search/pagination/tab changes
    useEffect(() => {
        const personaFilter = isFarmacia && state.grupoFarmacia !== 'medicos'
            ? state.grupoFarmacia === 'pacientes' ? 'CLIENTE' : 'EMPRESA'
            : undefined;
        getAllClients({ page: state.currentPage, limit: state.itemsPerPage, search: debounce, ...(personaFilter ? { persona: personaFilter } : {}) });
    }, [debounce, state.currentPage, state.itemsPerPage, state.grupoFarmacia, isFarmacia]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Table data ---
    const clientsTable = clients?.map((item: IClient) => {
        const allData: any = {
            id: item?.id,
            'Nombre o Razon social': item?.nombre,
            'Documento': getDocLabel(item),
            'Num. doc': item?.nroDoc,
            'Direccion': item?.direccion,
            'Correo principal': item.email,
            'Persona': item.persona === 'CLIENTE' ? 'CLIENTE' : item?.persona === 'PROVEEDOR' ? 'PROVEEDOR' : 'CLIENTE-PROVEEDOR',
            'Celular': item?.telefono,
            'Estado': item.estado,
        };

        const rowBase: any = {};
        ALL_COLUMNS.forEach(col => {
            if (state.visibleColumns.includes(col) && Object.prototype.hasOwnProperty.call(allData, col)) {
                rowBase[col] = allData[col];
            }
        });
        rowBase.id = item?.id;
        return rowBase;
    });

    // --- Actions ---
    const actions = {
        openNewModal: () => {
            const isEmpresa = isFarmacia && state.grupoFarmacia === 'empresas';
            setState(prev => ({
                ...prev,
                formValues: {
                    ...INITIAL_FORM,
                    persona: isFarmacia
                        ? state.grupoFarmacia === 'pacientes' ? 'CLIENTE' : 'EMPRESA'
                        : 'CLIENTE',
                    tipoDoc: isEmpresa ? 'RUC' : 'DNI',
                },
                errors: INITIAL_ERRORS,
                isOpenModal: true,
                isEdit: false,
            }));
        },
        openEditModal: (data: IClient) => {
            setState(prev => ({
                ...prev,
                formValues: { ...data as any, tipoDoc: mapCodigoToTipoDoc(data) },
                isOpenModal: true,
                isEdit: true,
                openAccionesId: null,
                anchorEl: null,
            }));
        },
        closeModal: () => {
            setState(prev => ({ ...prev, isOpenModal: false, isEdit: false }));
        },
        setFormValues: (values: any) => {
            setState(prev => ({ ...prev, formValues: values }));
        },
        setErrors: (errors: any) => {
            setState(prev => ({ ...prev, errors }));
        },
        openConfirmToggle: (data: IClient) => {
            setState(prev => ({
                ...prev,
                formValues: data as any,
                isOpenModalConfirm: true,
                openAccionesId: null,
                anchorEl: null,
            }));
        },
        confirmToggleState: () => {
            toggleStateClient(Number(state.formValues?.id));
            setState(prev => ({ ...prev, isOpenModalConfirm: false }));
        },
        setIsOpenModalConfirm: (v: boolean) => {
            setState(prev => ({ ...prev, isOpenModalConfirm: v }));
        },
        setcurrentPage: (page: number) => setState(prev => ({ ...prev, currentPage: page })),
        setitemsPerPage: (items: number) => setState(prev => ({ ...prev, itemsPerPage: items })),
        handleSearchChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setState(prev => ({ ...prev, searchClient: e.target.value }));
        },
        toggleColumn: (column: string) => {
            if (column === 'Acciones') return;
            setState(prev => {
                const prev_cols = prev.visibleColumns;
                if (prev_cols.includes(column)) {
                    return { ...prev, visibleColumns: prev_cols.filter(c => c !== column) };
                } else {
                    const newVisible = ALL_COLUMNS.filter(col => prev_cols.includes(col) || col === column);
                    return { ...prev, visibleColumns: newVisible };
                }
            });
        },
        // Eliminación con candado: el backend rechaza si el cliente/proveedor tiene historial.
        deleteClient: (id: number) => deleteClient(id),
        closeMenu: () => setState(prev => ({ ...prev, openAccionesId: null, anchorEl: null })),
        setShowColumnFilter: (v: boolean) => setState(prev => ({ ...prev, showColumnFilter: v })),
        setOpenAccionesId: (id: number | null) => setState(prev => ({ ...prev, openAccionesId: id })),
        setAnchorEl: (el: HTMLElement | null) => setState(prev => ({ ...prev, anchorEl: el })),
        setIsHoveredExp: (v: boolean) => setState(prev => ({ ...prev, isHoveredExp: v })),
        setIsHoveredImp: (v: boolean) => setState(prev => ({ ...prev, isHoveredImp: v })),
        setGrupoFarmacia: (grupo: GrupoFarmacia) => setState(prev => ({ ...prev, grupoFarmacia: grupo, currentPage: 1 })),
        handleImportExcel: async (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const allowedTypes = [
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ];
            if (!allowedTypes.includes(file.type)) {
                useAlertStore.getState().alert('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)', 'error');
                return;
            }

            await importClients(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
            await getAllClients({ page: state.currentPage, limit: state.itemsPerPage, search: debounce });
        },
        exportClients: () => exportClients(debounce),
    };

    return {
        // State
        ...state,
        // Store data
        clients,
        totalClients,
        clientsTable,
        // Refs
        fileInputRef,
        // Pagination
        indexOfLastItem,
        indexOfFirstItem,
        pages,
        // Constants
        ALL_COLUMNS,
        // Context
        isFarmacia,
        // Actions
        actions,
    };
};
