/* src/modules/Products/services/productApi.ts */
import api from '@/api/axios';
import type { Product, ProductResponse } from '@/types/products';

const V2 = import.meta.env.VITE_API_V2_PATH;

export const productApi = {
   async getProducts(params: URLSearchParams): Promise<ProductResponse> {
      const { data } = await api.get<ProductResponse>(`${V2}/products?${params.toString()}`);
      return data;
   },

   async createProduct(product: Partial<Product>): Promise<void> {
      await api.post(`${V2}/products`, product);
   },

   async updateProduct(id: number, product: Partial<Product>): Promise<void> {
      await api.put(`${V2}/products/${id}`, product);
   },

   async deleteProduct(id: number): Promise<void> {
      await api.delete(`${V2}/products/${id}`);
   }
};
