
-- Add product_type column with default 'inventory'
ALTER TABLE public.products ADD COLUMN product_type text NOT NULL DEFAULT 'inventory';

-- Backfill existing products based on category
UPDATE public.products SET product_type = 'print' WHERE category IN ('Printing Services', 'Finishing Services');
UPDATE public.products SET product_type = 'service' WHERE category IN ('Cyber Services') AND product_type = 'inventory';
