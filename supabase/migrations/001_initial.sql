-- profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- categories
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null default '#6366f1',
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- transactions
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  date date not null,
  notes text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- goals
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  target numeric(12, 2) not null check (target > 0),
  current numeric(12, 2) not null default 0 check (current >= 0),
  deadline date not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;

-- profiles policies
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- categories policies
create policy "own categories select" on public.categories for select using (auth.uid() = user_id);
create policy "own categories insert" on public.categories for insert with check (auth.uid() = user_id);
create policy "own categories update" on public.categories for update using (auth.uid() = user_id);
create policy "own categories delete" on public.categories for delete using (auth.uid() = user_id);

-- transactions policies
create policy "own transactions select" on public.transactions for select using (auth.uid() = user_id);
create policy "own transactions insert" on public.transactions for insert with check (auth.uid() = user_id);
create policy "own transactions update" on public.transactions for update using (auth.uid() = user_id);
create policy "own transactions delete" on public.transactions for delete using (auth.uid() = user_id);

-- goals policies
create policy "own goals select" on public.goals for select using (auth.uid() = user_id);
create policy "own goals insert" on public.goals for insert with check (auth.uid() = user_id);
create policy "own goals update" on public.goals for update using (auth.uid() = user_id);
create policy "own goals delete" on public.goals for delete using (auth.uid() = user_id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- indexes for common query patterns
create index transactions_user_date on public.transactions (user_id, date desc);
create index transactions_category on public.transactions (category_id);
create index goals_user_deadline on public.goals (user_id, deadline);
