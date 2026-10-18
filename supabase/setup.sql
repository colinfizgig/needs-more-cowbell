-- Online scoreboard for Needs More Cowbell.
-- Paste this whole file into Supabase > SQL Editor and click Run (safe to run again).
--
-- Players are anonymous: the game makes a random id + secret on each device. Scores can
-- only be written through the two functions below, which check that secret, so nobody can
-- rename another player or post scores under their name.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.players (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 24),
  secret_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.scores (
  player_id uuid not null references public.players (id) on delete cascade,
  board text not null check (char_length(board) <= 40),
  size int not null check (size between 4 and 16),
  points int not null,
  time_s int not null,
  mistakes int not null,
  hints int not null,
  updated_at timestamptz not null default now(),
  primary key (player_id, board)
);

alter table public.players enable row level security;
alter table public.scores enable row level security;

drop policy if exists "anyone can read players" on public.players;
create policy "anyone can read players" on public.players for select using (true);
drop policy if exists "anyone can read scores" on public.scores;
create policy "anyone can read scores" on public.scores for select using (true);

-- Reads only; the secret hash column stays hidden.
revoke all on public.players from anon, authenticated;
revoke all on public.scores from anon, authenticated;
grant select (id, name, created_at) on public.players to anon, authenticated;
grant select on public.scores to anon, authenticated;

create or replace view public.board_leaderboard with (security_invoker = true) as
  select s.board, s.player_id, p.name, s.size, s.points, s.time_s, s.mistakes, s.hints, s.updated_at
  from public.scores s join public.players p on p.id = s.player_id;

create or replace view public.overall_leaderboard with (security_invoker = true) as
  select p.id as player_id, p.name, sum(s.points)::int as total_points, count(*)::int as boards_solved
  from public.scores s join public.players p on p.id = s.player_id
  group by p.id, p.name;

grant select on public.board_leaderboard, public.overall_leaderboard to anon, authenticated;

-- Create a player, or rename one (only with the matching secret).
create or replace function public.register_player(p_id uuid, p_secret text, p_name text)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  clean text := left(btrim(regexp_replace(p_name, '\s+', ' ', 'g')), 24);
begin
  if clean is null or clean = '' then
    raise exception 'name required';
  end if;
  if char_length(p_secret) < 16 then
    raise exception 'bad secret';
  end if;
  insert into public.players (id, name, secret_hash)
  values (p_id, clean, crypt(p_secret, gen_salt('bf')))
  on conflict (id) do update set name = excluded.name
    where public.players.secret_hash = crypt(p_secret, public.players.secret_hash);
end;
$$;

-- Record a solve. Keeps each player's best score per board.
create or replace function public.submit_score(
  p_id uuid, p_secret text, p_board text, p_size int,
  p_points int, p_time int, p_mistakes int, p_hints int)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if not exists (select 1 from public.players where id = p_id and secret_hash = crypt(p_secret, secret_hash)) then
    raise exception 'unknown player';
  end if;
  -- Sanity limits: the game can't award more than 18 × size² points or solve faster than ~1s per row.
  if p_points < 0 or p_points > 18 * p_size * p_size or p_time < p_size or p_mistakes < 0 or p_hints < 0 then
    raise exception 'score out of range';
  end if;
  if p_board !~ '^(stage-[0-9]{1,5}|daily-[0-9]{4}-[0-9]{2}-[0-9]{2})$' then
    raise exception 'bad board';
  end if;
  insert into public.scores (player_id, board, size, points, time_s, mistakes, hints)
  values (p_id, p_board, p_size, p_points, p_time, p_mistakes, p_hints)
  on conflict (player_id, board) do update
    set size = excluded.size, points = excluded.points, time_s = excluded.time_s,
        mistakes = excluded.mistakes, hints = excluded.hints, updated_at = now()
    where excluded.points > public.scores.points;
end;
$$;

revoke all on function public.register_player(uuid, text, text) from public;
revoke all on function public.submit_score(uuid, text, text, int, int, int, int, int) from public;
grant execute on function public.register_player(uuid, text, text) to anon, authenticated;
grant execute on function public.submit_score(uuid, text, text, int, int, int, int, int) to anon, authenticated;
