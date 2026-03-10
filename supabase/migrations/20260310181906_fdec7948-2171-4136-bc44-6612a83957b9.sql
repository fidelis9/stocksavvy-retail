
-- Drop existing FK constraints and re-add with CASCADE
ALTER TABLE public.sale_items DROP CONSTRAINT sale_items_product_id_fkey;
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.stock_adjustments DROP CONSTRAINT stock_adjustments_product_id_fkey;
ALTER TABLE public.stock_adjustments ADD CONSTRAINT stock_adjustments_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
