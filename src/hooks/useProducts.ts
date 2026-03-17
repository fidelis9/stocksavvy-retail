import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProductType = 'product' | 'printing' | 'service';

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  buying_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock_level: number;
  category: string | null;
  unit: string | null;
  product_type: ProductType;
  created_at: string;
  updated_at: string;
}

export interface ProductInsert {
  name: string;
  sku?: string;
  description?: string;
  buying_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock_level: number;
  category?: string;
  unit?: string;
  product_type?: ProductType;
}

export function isStockTracked(type: ProductType): boolean {
  return type === 'product';
}

export function getProductTypeFromCategory(category?: string): ProductType {
  if (!category) return 'product';
  const lower = category.toLowerCase();
  if (lower.includes('printing') || lower.includes('finishing')) return 'printing';
  if (lower.includes('cyber') || lower.includes('service')) return 'service';
  return 'product';
}

export function useProducts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('stock_quantity');
      
      if (error) throw error;
      
      // Only inventory products track stock
      return (data as Product[]).filter(p => p.product_type === 'product' && p.stock_quantity <= p.minimum_stock_level);
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: ProductInsert) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
