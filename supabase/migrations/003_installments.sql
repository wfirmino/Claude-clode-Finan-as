-- installments
create table public.installments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  total_amount numeric(12,2) not null check (total_amount > 0),
  original_amount numeric(12,2),
  interest_amount numeric(12,2) default 0,
  installment_amount numeric(12,2) not null check (installment_amount > 0),
  total_installments integer not null check (total_installments > 0),
  paid_installments integer not null default 0 check (paid_installments >= 0),
  first_payment_date date not null,
  category text,
  notes text,
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.installments enable row level security;

create policy "users can select own installments"
  on public.installments for select
  using (auth.uid() = user_id);

create policy "users can insert own installments"
  on public.installments for insert
  with check (auth.uid() = user_id);

create policy "users can update own installments"
  on public.installments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own installments"
  on public.installments for delete
  using (auth.uid() = user_id);

grant all on public.installments to authenticated;
