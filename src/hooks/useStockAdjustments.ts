import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StockAdjustment {
  id: string;
  product_id: string;
  user_id: string;
  adjustment_type: 'delivery' | 'damaged' | 'expired' | 'theft' | 'correction';
  quantity_change: number;
  reason: string | null;
  created_at: string;
  products?: {
    name: string;
  } | null;
  profiles?: {
    full_name: string;
  } | null;
}

export interface StockAdjustmentInsert {
  product_id: string;
  adjustment_type: 'delivery' | 'damaged' | 'expired' | 'theft' | 'correction';
  quantity_change: number;
  reason?: string;
}

export function useStockAdjustments() {
  return useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .select(`
          *,
          products (name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      return data.map(adj => ({
        ...adj,
        profiles: profiles?.find(p => p.user_id === adj.user_id) || null
      })) as StockAdjustment[];
    },
  });
}

export function useCreateStockAdjustment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (adjustment: StockAdjustmentInsert) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('stock_adjustments')
        .insert({
          ...adjustment,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', adjustment.product_id)
        .single();
      
      if (product) {
        await supabase
          .from('products')
          .update({ 
            stock_quantity: product.stock_quantity + adjustment.quantity_change 
          })
          .eq('id', adjustment.product_id);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
