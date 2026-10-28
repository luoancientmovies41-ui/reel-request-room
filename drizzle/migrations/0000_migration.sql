create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create table public.allowed_emails (
  email text primary key,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.allowed_emails to authenticated;
grant all on public.allowed_emails to service_role;
alter table public.allowed_emails enable row level security;
create policy "admin manage emails" on public.allowed_emails for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.is_allowed()
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(auth.uid(),'admin') or exists (
  select 1 from public.allowed_emails where lower(email) = lower(coalesce(auth.jwt()->>'email',''))) $$;

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  poster_url text not null,
  genre text,
  year int,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.movies to authenticated;
grant all on public.movies to service_role;
alter table public.movies enable row level security;
create policy "allowed read movies" on public.movies for select to authenticated using (public.is_allowed());
create policy "admin write movies" on public.movies for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.download_requests (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  user_email text not null default (auth.jwt()->>'email'),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique(movie_id, user_id)
);
grant select, insert, update, delete on public.download_requests to authenticated;
grant all on public.download_requests to service_role;
alter table public.download_requests enable row level security;
create policy "read own or admin" on public.download_requests for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "allowed create request" on public.download_requests for insert to authenticated
  with check (public.is_allowed() and user_id = auth.uid() and status = 'pending'
    and user_email = (auth.jwt()->>'email'));
create policy "admin update requests" on public.download_requests for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin delete requests" on public.download_requests for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create table public.movie_links (
  movie_id uuid primary key references public.movies(id) on delete cascade,
  download_url text not null
);
grant select, insert, update, delete on public.movie_links to authenticated;
grant all on public.movie_links to service_role;
alter table public.movie_links enable row level security;
create policy "approved or admin read link" on public.movie_links for select to authenticated
  using (public.has_role(auth.uid(),'admin') or exists (
    select 1 from public.download_requests r where r.movie_id = movie_links.movie_id
      and r.user_id = auth.uid() and r.status = 'approved'));
create policy "admin write links" on public.movie_links for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
  for each row execute function public.handle_first_admin();