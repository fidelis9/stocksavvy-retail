
CREATE OR REPLACE FUNCTION public.process_sale(
  p_user_id uuid,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sale_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_current_stock integer;
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

  -- Create sale items and deduct stock atomically
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

    -- Atomic stock deduction
    UPDATE public.products
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer
    WHERE id = (v_item->>'product_id')::uuid
      AND stock_quantity >= (v_item->>'quantity')::integer;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for product %', (v_item->>'product_id');
    END IF;
  END LOOP;

  RETURN v_sale_id;
END;
$$;
