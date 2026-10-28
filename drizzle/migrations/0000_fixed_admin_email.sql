create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if lower(new.email) = 'luoancientmovies40@gmail.com' then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
insert into public.user_roles(user_id, role)
  select id, 'admin' from auth.users where lower(email) = 'luoancientmovies40@gmail.com'
  on conflict do nothing;