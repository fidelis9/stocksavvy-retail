import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Sale {
  id: string;
  user_id: string;
  total_amount: number;
  sale_date: string;
  created_at: string;
  sale_items?: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    products: {
      name: string;
    } | null;
  }[];
  profiles?: {
    full_name: string;
  } | null;
}

export function useTodaySales() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return useQuery({
    queryKey: ['sales', 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            products (name)
          )
        `)
        .gte('sale_date', today.toISOString())
        .order('sale_date', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      return data.map(sale => ({
        ...sale,
        profiles: profiles?.find(p => p.user_id === sale.user_id) || null
      })) as Sale[];
    },
  });
}

export function useSalesByDateRange(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['sales', 'range', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            products (name)
          )
        `)
        .gte('sale_date', startDate.toISOString())
        .lte('sale_date', endDate.toISOString())
        .order('sale_date', { ascending: false });
      
      if (error) throw error;
      
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      return data.map(sale => ({
        ...sale,
        profiles: profiles?.find(p => p.user_id === sale.user_id) || null
      })) as Sale[];
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (items: SaleItem[]) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('process_sale', {
        p_user_id: user.id,
        p_items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
