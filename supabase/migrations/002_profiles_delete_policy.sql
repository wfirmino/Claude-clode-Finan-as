-- Allow users to delete their own profile row (defense-in-depth;
-- auth.users cascade handles actual account deletion from the Supabase dashboard)
create policy "own profile delete" on public.profiles for delete using (auth.uid() = id);
