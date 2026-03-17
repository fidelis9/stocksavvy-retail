
-- Rename product_type values: inventory→product, print→printing
UPDATE public.products SET product_type = 'product' WHERE product_type = 'inventory';
UPDATE public.products SET product_type = 'printing' WHERE product_type = 'print';

-- Update the default
ALTER TABLE public.products ALTER COLUMN product_type SET DEFAULT 'product';

-- Update process_sale to skip stock deduction for printing/service items
CREATE OR REPLACE FUNCTION public.process_sale(p_user_id uuid, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sale_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_product_type text;
BEGIN
  -- Calculate total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total := v_total + (v_item->>'total_price')::numeric;
  END LOOP;

  -- Create sale
  INSERT INTO public.sales (user_id, total_amount)
  VALUES (p_user_id, v_total)
  RETURNING id INTO v_sale_id;

  -- Create sale items and conditionally deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, total_price)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric
    );

    -- Get product type
    SELECT product_type INTO v_product_type
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid;

    -- Only deduct stock for 'product' type items
    IF v_product_type = 'product' THEN
      UPDATE public.products
      SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer
      WHERE id = (v_item->>'product_id')::uuid
        AND stock_quantity >= (v_item->>'quantity')::integer;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for product %', (v_item->>'product_id');
      END IF;
    END IF;
  END LOOP;

  RETURN v_sale_id;
END;
$function$;
