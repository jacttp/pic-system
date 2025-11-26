/* src/modules/Products/stores/productStore.ts */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/axios';
import type { Product, ProductResponse } from '@/types/products';

export const useProductStore = defineStore('products', () => {
    // Estado
    const products = ref<Product[]>([]);
    const totalRecords = ref(0);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Acciones
    async function fetchProducts(page = 1, limit = 10, search = '') {
        isLoading.value = true;
        error.value = null;
        try {
            // Construimos query params
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });
            if (search) params.append('search', search);

            const { data } = await api.get<ProductResponse>(`/products?${params.toString()}`);
            
            if (data.success) {
                products.value = data.data;
                totalRecords.value = data.total;
            }
        } catch (e: any) {
            error.value = 'Error al cargar productos';
            console.error(e);
        } finally {
            isLoading.value = false;
        }
    }

    async function createProduct(product: Partial<Product>) {
        isLoading.value = true;
        try {
            await api.post('/products', product);
            // No recargamos todo, idealmente el usuario sigue creando.
            // Pero por consistencia podríamos refrescar la tabla actual.
            return true;
        } catch (e: any) {
            throw e.response?.data?.message || 'Error al crear producto';
        } finally {
            isLoading.value = false;
        }
    }

    async function updateProduct(id: number, product: Partial<Product>) {
        isLoading.value = true;
        try {
            await api.put(`/products/${id}`, product);
            return true;
        } catch (e: any) {
            throw e.response?.data?.message || 'Error al actualizar';
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteProduct(id: number) {
        try {
            await api.delete(`/products/${id}`);
            return true;
        } catch (e: any) {
            throw e.response?.data?.message || 'Error al eliminar';
        }
    }

    return {
        products,
        totalRecords,
        isLoading,
        error,
        fetchProducts,
        createProduct,
        updateProduct,
        deleteProduct
    };
});