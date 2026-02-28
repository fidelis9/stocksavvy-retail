
-- Allow owners to delete profiles (for user management)
CREATE POLICY "Owners can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_owner());
