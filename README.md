# Battle Quest

A tiny browser battle game built with Vite and JavaScript. It includes a turn-based battle loop and optional Supabase integration for saving leaderboard scores.

## Run locally

```bash
npm install
npm run dev
```

## Supabase setup

1. Copy `.env.example` to `.env`.
2. Fill in your Supabase project URL and publishable key. Never put a Supabase secret or service-role key in a `VITE_` variable or browser app; those keys grant privileged access.
3. In Supabase SQL editor, run this schema and access policy setup. It permits public leaderboard reads and limits score creation, edits, and deletion to the signed-in owner:

```sql
create table if not exists battle_scores (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  score integer not null,
  created_at timestamptz default now(),
  owner_id uuid references auth.users(id) on delete cascade
);

alter table public.battle_scores
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.battle_scores enable row level security;

drop policy if exists "Anyone can read battle scores" on public.battle_scores;
create policy "Anyone can read battle scores"
  on public.battle_scores for select
  using (true);

drop policy if exists "Players can create their own scores" on public.battle_scores;
create policy "Players can create their own scores"
  on public.battle_scores for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Players can update their own scores" on public.battle_scores;
create policy "Players can update their own scores"
  on public.battle_scores for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Players can delete their own scores" on public.battle_scores;
create policy "Players can delete their own scores"
  on public.battle_scores for delete to authenticated
  using (auth.uid() = owner_id);

grant select on public.battle_scores to anon, authenticated;
grant insert, update, delete on public.battle_scores to authenticated;
```

4. In Supabase Authentication settings, enable email sign-up. Refresh the page to connect. Players can sign up or sign in, save completed battle scores, and edit or delete only their own saved battles. The leaderboard remains readable without signing in.

## Game features

- Turn-based combat with attack, heavy strike, heal, and retreat actions
- Live health bars and battle log
- Supabase leaderboard saving and display
- Supabase email authentication and owner-scoped score CRUD
- Graceful fallback when Supabase is not configured
