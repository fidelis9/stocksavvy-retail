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
      
      const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
      
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
        })
        .select()
        .single();
      
      if (saleError) throw saleError;
      
      // Create sale items
      const saleItems = items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));
      
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);
      
      if (itemsError) throw itemsError;
      
      // Update stock quantities
      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();
        
        if (product) {
          await supabase
            .from('products')
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq('id', item.product_id);
        }
      }
      
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
