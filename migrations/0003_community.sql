-- Open trips + companions (beyond personal planner SRS).

alter table trips add column if not exists visibility text not null default 'open';
alter table trips add column if not exists summary text not null default '';
alter table trips add column if not exists max_companions integer not null default 8;

create table if not exists trip_members (
  trip_id    integer not null references trips (id) on delete cascade,
  user_id    text not null,
  role       text not null default 'companion',
  joined_at  timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_members_user_idx on trip_members (user_id);

insert into trip_members (trip_id, user_id, role)
select id, user_id, 'owner' from trips
on conflict do nothing;
