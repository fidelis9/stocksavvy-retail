-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can create sale items" ON public.sale_items;

-- Create a more specific policy that ties sale_items to existing sales
CREATE POLICY "Users can create sale items for their sales"
ON public.sale_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sales 
        WHERE sales.id = sale_items.sale_id 
        AND sales.user_id = auth.uid()
    )
);