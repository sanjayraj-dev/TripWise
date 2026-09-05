-- TripWise domain schema (SRS entities). Per-user rows always carry user_id TEXT.

create table if not exists profiles (
  user_id    text primary key,
  full_name  text not null,
  is_admin   boolean not null default false,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trips (
  id         serial primary key,
  user_id    text not null,
  title      text not null,
  start_date date not null,
  end_date   date not null,
  budget     numeric(12, 2) not null default 0,
  currency   text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_dates_ok check (end_date >= start_date),
  constraint trips_budget_ok check (budget >= 0)
);
create index if not exists trips_user_id_idx on trips (user_id);
create index if not exists trips_dates_idx on trips (user_id, start_date);

create table if not exists trip_stops (
  id         serial primary key,
  trip_id    integer not null references trips (id) on delete cascade,
  city       text not null,
  country    text not null,
  start_date date,
  end_date   date,
  notes      text,
  created_at timestamptz not null default now(),
  constraint trip_stops_dates_ok check (
    start_date is null or end_date is null or end_date >= start_date
  )
);
create index if not exists trip_stops_trip_id_idx on trip_stops (trip_id);

create table if not exists itinerary_activities (
  id            serial primary key,
  trip_stop_id  integer not null references trip_stops (id) on delete cascade,
  title         text not null,
  activity_date date not null,
  start_time    time,
  end_time      time,
  description   text,
  created_at    timestamptz not null default now()
);
create index if not exists itinerary_activities_stop_idx on itinerary_activities (trip_stop_id);

create table if not exists expenses (
  id           serial primary key,
  trip_id      integer not null references trips (id) on delete cascade,
  trip_stop_id integer references trip_stops (id) on delete set null,
  category     text not null,
  amount       numeric(12, 2) not null,
  spent_on     date not null,
  note         text,
  created_at   timestamptz not null default now(),
  constraint expenses_amount_ok check (amount > 0)
);
create index if not exists expenses_trip_id_idx on expenses (trip_id);

create table if not exists accommodations (
  id            serial primary key,
  trip_stop_id  integer not null references trip_stops (id) on delete cascade,
  property_name text not null,
  address       text,
  check_in      date,
  check_out     date,
  booking_ref   text,
  contact       text,
  created_at    timestamptz not null default now(),
  constraint accommodations_dates_ok check (
    check_in is null or check_out is null or check_out >= check_in
  )
);
create index if not exists accommodations_stop_idx on accommodations (trip_stop_id);

create table if not exists notes (
  id         serial primary key,
  trip_id    integer not null references trips (id) on delete cascade,
  title      text not null,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_trip_id_idx on notes (trip_id);

create table if not exists packing_items (
  id         serial primary key,
  trip_id    integer not null references trips (id) on delete cascade,
  name       text not null,
  packed     boolean not null default false,
  slot       text not null default 'gear',
  created_at timestamptz not null default now()
);
create index if not exists packing_items_trip_id_idx on packing_items (trip_id);
