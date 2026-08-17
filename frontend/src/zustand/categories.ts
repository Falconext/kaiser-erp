import { create } from 'zustand';
import { del, get, post, put } from '../utils/fetch';
import { IResponse } from '../interfaces/auth';
import { IFormCategories, ICategory } from '../interfaces/categories';
import useAlertStore from './alert';
import { devtools } from 'zustand/middleware';

export interface ICategoriesState {
    categories: ICategory[];
    category: string;
    totalCategories: number;
    // resetDocument: () => void;
    // getDocument: (data: IDocument) => void
    addCategory: (data: IFormCategories) => void
    editCategory: (data: IFormCategories) => void
    updateCategoryImage: (id: number, imageUrl: string) => void
    getAllCategories: (params: any, callback?: Function,
        allProperties?: boolean) => void
    // updateDocument: (data: any) => void
    deleteCategory: (data: IFormCategories) => void
    formValues: IFormCategories;
    isEdit: boolean;
    setFormValues: (data: IFormCategories) => void;
    setIsEdit: (value: boolean) => void;
}

export const useCategoriesStore = create<ICategoriesState>()(devtools((set, _get) => ({
    category: "",
    categories: [],
    formValues: {
        categoriaId: 0,
        nombre: ""
    },
    isEdit: false,
    setFormValues: (data: IFormCategories) => set({ formValues: data }),
    setIsEdit: (value: boolean) => set({ isEdit: value }),
    getAllCategories: async (params: any, callback?: Function,
        _allProperties?: boolean) => {
        try {
            // useAlertStore.setState({ loading: true })
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams as Record<string, string>).toString();
            const resp: any = await get(`categoria/listar${query ? `?${query}` : ''}`);
            console.log(resp)
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                set({
                    categories: resp.data,
                    totalCategories: resp.data.total
                }, false, "GET_categories");
                useAlertStore.setState({ loading: false })
            } else {
                set({
                    categories: []
                });
                useAlertStore.setState({ loading: false })
            }
        } catch (error) {
            useAlertStore.setState({ loading: false })
        } finally {
            if (callback) {
                callback();
            }
        }
    },
    addCategory: async (data: any) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await post(`categoria/crear`, data);
            console.log(resp);
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                set((state) => ({
                    categories: [{
                        ...data,
                        id: resp.data.id,
                        imagenUrl: resp.data.imagenUrl,
                    }, ...state.categories]
                }), false, "ADD_CATEGORIES");
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert("Se agrego la categoria correctamente", "success")
                return resp.data;
            }
        } catch (error: any) {
            return useAlertStore.getState().alert(`${error}`, "error")
        }
    },
    editCategory: async (data: any) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await put(`categoria/${data.categoriaId}`, data);
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                set((state) => ({
                    categories: state.categories.map((category: ICategory) =>
                        category.id === data?.categoriaId ? { ...category, ...data } : category
                    ),
                }), false, "UPDATE_CATEGORY");
                useAlertStore.setState({ loading: false })
                useAlertStore.getState().alert("Se actualizo la categoria correctamente", "success");
                return resp.data;
            } else {
                useAlertStore.setState({ loading: false })
                useAlertStore.getState().alert("Error al editar el categoria", "error");
            }
        } catch (error: any) {
            return useAlertStore.getState().alert(`${error}`, "error")
        }
    },
    updateCategoryImage: (id: number, imageUrl: string) => {
        set((state) => ({
            categories: state.categories.map((category: ICategory) =>
                category.id === id ? { ...category, imagenUrl: imageUrl } : category
            ),
        }), false, "UPDATE_CATEGORY_IMAGE");
    },
    deleteCategory: async (data: IFormCategories) => {
        try {
            const resp: any = await del(`categoria/${data.categoriaId}`);
            if (resp.code === 1) {
                set((state) => ({
                    categories: state.categories.filter((category: ICategory) =>
                        category.id !== data.categoriaId
                    ),
                }), false, "DELETE_STUDENT");
                useAlertStore.getState().alert("La categoria se elimino correctamente", "success");
            } else {
                useAlertStore.getState().alert("Error al eliminar el documento", "error");
            }
        } catch (error) {

        }
    }
})));


