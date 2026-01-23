-- Create role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'attendant');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (CRITICAL: separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'attendant',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    description TEXT,
    buying_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    minimum_stock_level INTEGER NOT NULL DEFAULT 5,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_items table
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_adjustments table
CREATE TABLE public.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('delivery', 'damaged', 'expired', 'theft', 'correction')),
    quantity_change INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'owner')
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_owner());

-- User roles policies
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_owner());

CREATE POLICY "Owners can manage roles"
ON public.user_roles FOR ALL
USING (public.is_owner());

-- Products policies (all authenticated users can view, owners can manage)
CREATE POLICY "All authenticated users can view products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_owner());

CREATE POLICY "Owners can update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_owner());

CREATE POLICY "Owners can delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.is_owner());

-- Sales policies
CREATE POLICY "Users can view all sales"
ON public.sales FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create sales"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete sales"
ON public.sales FOR DELETE
TO authenticated
USING (public.is_owner());

-- Sale items policies
CREATE POLICY "Users can view all sale items"
ON public.sale_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create sale items"
ON public.sale_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- Stock adjustments policies
CREATE POLICY "Users can view stock adjustments"
ON public.stock_adjustments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can create stock adjustments"
ON public.stock_adjustments FOR INSERT
TO authenticated
WITH CHECK (public.is_owner());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation (creates profile and assigns role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Insert profile
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    
    -- Count existing users to determine role
    SELECT COUNT(*) INTO user_count FROM public.user_roles;
    
    -- First user becomes owner, others become attendants
    IF user_count = 0 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'owner');
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'attendant');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user handling
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();