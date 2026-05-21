-- installments
create table public.installments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  total_amount numeric(12,2) not null check (total_amount > 0),
  installment_count integer not null check (installment_count > 0),
  installment_amount numeric(12,2) not null check (installment_amount > 0),
  first_due_date date not null,
  paid_count integer not null default 0 check (paid_count >= 0),
  category text,
  notes text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.installments enable row level security;

create policy "users can manage own installments"
  on public.installments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on public.installments to authenticated;
