-- Écran « Messages » (maquette du 11 novembre 2026) : le fil des échanges avec un recruteur ou une
-- startup. L'application ne lit aucune boîte e-mail et n'envoie rien : un message « envoyé » est
-- celui que j'ai fait partir de ma messagerie, un message « reçu » est une réponse que j'ai collée.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- Candidature liée : sa suppression garde la conversation.
  application_id uuid references public.applications (id) on delete set null,
  contact_nom text not null,
  contact_role text,
  contact_email text,
  entreprise text,
  pays text check (pays ~ '^[A-Z]{2}$'),
  -- Vrai tant qu'une réponse reçue n'a pas été ouverte.
  non_lu boolean not null default false,
  created_at timestamptz not null default now()
);

create index conversations_application_idx on public.conversations (application_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sens text not null check (sens in ('envoye', 'recu')),
  corps text not null,
  -- Noms des documents joints au message (CV, lettre).
  pieces jsonb not null default '[]',
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, date);

do $$
declare
  t text;
begin
  foreach t in array array['conversations', 'messages']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated '
      'using ((select public.is_owner())) with check ((select public.is_owner()))',
      t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end;
$$;
