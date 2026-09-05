import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { num, todayISO, tripStatus } from "@/lib/utils";
import { optionalAuthMiddleware } from "./optional-auth";
import { ensureBoardSeeded } from "./seed";
import type {
  Activity,
  AdminOverview,
  Destination,
  Expense,
  JournalStats,
  MemberRole,
  Note,
  PackingItem,
  Profile,
  Stay,
  Trip,
  TripDetail,
  TripMember,
  TripVisibility,
} from "./types";

type TripRow = {
  id: number;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  budget: string | number;
  currency: string;
  created_at: string;
  visibility: string;
  summary: string;
  max_companions: number;
  cover: string;
  owner_name: string | null;
  spent: string | number;
  stop_count: number;
  activity_count: number;
  packed_count: number;
  packing_count: number;
  member_count: number;
  cities: string | null;
};

const idInput = z.object({ id: z.coerce.number().int().positive() });

function asIso(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function asTime(value: string | null | undefined) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function mapTrip(row: TripRow, role: MemberRole): Trip {
  const cities = row.cities
    ? String(row.cities)
        .split(" · ")
        .map((c) => c.trim())
        .filter(Boolean)
    : [];
  return {
    id: Number(row.id),
    userId: row.user_id,
    title: row.title,
    startDate: asIso(row.start_date),
    endDate: asIso(row.end_date),
    budget: num(row.budget),
    currency: row.currency || "INR",
    createdAt: String(row.created_at),
    spent: num(row.spent),
    stopCount: Number(row.stop_count ?? 0),
    activityCount: Number(row.activity_count ?? 0),
    packedCount: Number(row.packed_count ?? 0),
    packingCount: Number(row.packing_count ?? 0),
    visibility: (row.visibility === "private" ? "private" : "open") as TripVisibility,
    summary: row.summary ?? "",
    maxCompanions: Number(row.max_companions ?? 8),
    memberCount: Number(row.member_count ?? 1),
    ownerName: row.owner_name || "Traveler",
    cities,
    role,
    cover: row.cover || "",
  };
}

const TRIP_SELECT = `
  select
    t.id,
    t.user_id,
    t.title,
    t.start_date,
    t.end_date,
    t.budget,
    t.currency,
    t.created_at,
    t.visibility,
    t.summary,
    t.max_companions,
    t.cover,
    coalesce(p.full_name, 'Traveler') as owner_name,
    (select coalesce(sum(e.amount), 0) from expenses e where e.trip_id = t.id) as spent,
    (select count(*)::int from trip_stops s where s.trip_id = t.id) as stop_count,
    (
      select count(*)::int
      from itinerary_activities a
      join trip_stops s on s.id = a.trip_stop_id
      where s.trip_id = t.id
    ) as activity_count,
    (select count(*)::int from packing_items pk where pk.trip_id = t.id and pk.packed) as packed_count,
    (select count(*)::int from packing_items pk where pk.trip_id = t.id) as packing_count,
    (select count(*)::int from trip_members m where m.trip_id = t.id) as member_count,
    (
      select string_agg(s.city, ' · ' order by s.start_date nulls last, s.id)
      from trip_stops s
      where s.trip_id = t.id
    ) as cities
  from trips t
  left join profiles p on p.user_id = t.user_id
`;

async function fetchTrips(sql: Sql, where: string, params: unknown[], userId: string | null) {
  const rows = await sql.query<TripRow>(`${TRIP_SELECT} ${where} order by t.start_date asc, t.id desc`, params);
  const roles = new Map<number, MemberRole>();
  if (userId) {
    const members = await sql.query<{ trip_id: number; role: string }>(
      `select trip_id, role from trip_members where user_id = $1`,
      [userId],
    );
    for (const m of members) {
      roles.set(Number(m.trip_id), m.role === "owner" ? "owner" : "companion");
    }
  }
  return rows.map((row) => mapTrip(row, roles.get(Number(row.id)) ?? "viewer"));
}

async function displayName(sql: Sql, userId: string) {
  const fromProfile = await sql<{ full_name: string }>`
    select full_name from profiles where user_id = ${userId}
  `;
  if (fromProfile[0]?.full_name) return fromProfile[0].full_name;
  const fromUser = await sql<{ name: string }>`select name from "user" where id = ${userId}`;
  return fromUser[0]?.name || "Traveler";
}

async function ensureProfile(sql: Sql, userId: string) {
  const existing = await sql<{ is_active: boolean; is_admin: boolean; full_name: string }>`
    select is_active, is_admin, full_name from profiles where user_id = ${userId}
  `;
  if (existing[0]) {
    if (!existing[0].is_active) {
      throw new Error("This account has been deactivated. Contact an administrator.");
    }
    return existing[0];
  }
  const name = await displayName(sql, userId);
  const admins = await sql<{ n: number }>`select count(*)::int as n from profiles where is_admin = true`;
  const isAdmin = Number(admins[0]?.n ?? 0) === 0;
  await sql`
    insert into profiles (user_id, full_name, is_admin, is_active)
    values (${userId}, ${name}, ${isAdmin}, ${true})
    on conflict (user_id) do nothing
  `;
  return { is_active: true, is_admin: isAdmin, full_name: name };
}

async function membership(sql: Sql, tripId: number, userId: string | null) {
  if (!userId) return null;
  const rows = await sql<{ role: string }>`
    select role from trip_members where trip_id = ${tripId} and user_id = ${userId}
  `;
  return rows[0]?.role === "owner" ? ("owner" as const) : rows[0] ? ("companion" as const) : null;
}

async function loadTripDetail(sql: Sql, tripId: number, userId: string | null): Promise<TripDetail> {
  const trips = await fetchTrips(sql, "where t.id = $1", [tripId], userId);
  const trip = trips[0];
  if (!trip) throw new Error("Trip not found.");

  if (trip.visibility === "private" && trip.role === "viewer") {
    throw new Error("This trip is private.");
  }

  const destinations = (
    await sql<{
      id: number;
      trip_id: number;
      city: string;
      country: string;
      start_date: string | null;
      end_date: string | null;
      notes: string | null;
    }>`
      select id, trip_id, city, country, start_date, end_date, notes
      from trip_stops
      where trip_id = ${tripId}
      order by start_date nulls last, id
    `
  ).map(
    (row): Destination => ({
      id: Number(row.id),
      tripId: Number(row.trip_id),
      city: row.city,
      country: row.country,
      startDate: row.start_date ? asIso(row.start_date) : null,
      endDate: row.end_date ? asIso(row.end_date) : null,
      notes: row.notes,
    }),
  );

  const activities = (
    await sql<{
      id: number;
      trip_stop_id: number;
      title: string;
      activity_date: string;
      start_time: string | null;
      end_time: string | null;
      description: string | null;
      city: string;
      country: string;
    }>`
      select a.id, a.trip_stop_id, a.title, a.activity_date, a.start_time, a.end_time, a.description,
             s.city, s.country
      from itinerary_activities a
      join trip_stops s on s.id = a.trip_stop_id
      where s.trip_id = ${tripId}
      order by a.activity_date, a.start_time nulls last, a.id
    `
  ).map(
    (row): Activity => ({
      id: Number(row.id),
      tripStopId: Number(row.trip_stop_id),
      tripId,
      city: row.city,
      country: row.country,
      title: row.title,
      activityDate: asIso(row.activity_date),
      startTime: asTime(row.start_time),
      endTime: asTime(row.end_time),
      description: row.description,
    }),
  );

  const expenses = (
    await sql<{
      id: number;
      trip_id: number;
      trip_stop_id: number | null;
      category: string;
      amount: string | number;
      spent_on: string;
      note: string | null;
      city: string | null;
    }>`
      select e.id, e.trip_id, e.trip_stop_id, e.category, e.amount, e.spent_on, e.note, s.city
      from expenses e
      left join trip_stops s on s.id = e.trip_stop_id
      where e.trip_id = ${tripId}
      order by e.spent_on, e.id
    `
  ).map(
    (row): Expense => ({
      id: Number(row.id),
      tripId: Number(row.trip_id),
      tripStopId: row.trip_stop_id == null ? null : Number(row.trip_stop_id),
      category: row.category,
      amount: num(row.amount),
      spentOn: asIso(row.spent_on),
      note: row.note,
      city: row.city,
    }),
  );

  const stays = (
    await sql<{
      id: number;
      trip_stop_id: number;
      property_name: string;
      address: string | null;
      check_in: string | null;
      check_out: string | null;
      booking_ref: string | null;
      contact: string | null;
      city: string;
      country: string;
    }>`
      select a.id, a.trip_stop_id, a.property_name, a.address, a.check_in, a.check_out,
             a.booking_ref, a.contact, s.city, s.country
      from accommodations a
      join trip_stops s on s.id = a.trip_stop_id
      where s.trip_id = ${tripId}
      order by a.check_in nulls last, a.id
    `
  ).map(
    (row): Stay => ({
      id: Number(row.id),
      tripStopId: Number(row.trip_stop_id),
      tripId,
      city: row.city,
      country: row.country,
      propertyName: row.property_name,
      address: row.address,
      checkIn: row.check_in ? asIso(row.check_in) : null,
      checkOut: row.check_out ? asIso(row.check_out) : null,
      bookingRef: row.booking_ref,
      contact: row.contact,
    }),
  );

  const notes = (
    await sql<{
      id: number;
      trip_id: number;
      title: string;
      body: string;
      created_at: string;
      updated_at: string;
    }>`
      select id, trip_id, title, body, created_at, updated_at
      from notes where trip_id = ${tripId}
      order by updated_at desc, id desc
    `
  ).map(
    (row): Note => ({
      id: Number(row.id),
      tripId: Number(row.trip_id),
      title: row.title,
      body: row.body,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }),
  );

  const packing = (
    await sql<{ id: number; trip_id: number; name: string; packed: boolean; slot: string }>`
      select id, trip_id, name, packed, slot from packing_items
      where trip_id = ${tripId}
      order by slot, id
    `
  ).map(
    (row): PackingItem => ({
      id: Number(row.id),
      tripId: Number(row.trip_id),
      name: row.name,
      packed: Boolean(row.packed),
      slot: row.slot || "gear",
    }),
  );

  const members = (
    await sql<{ user_id: string; role: string; joined_at: string; name: string | null }>`
      select m.user_id, m.role, m.joined_at, coalesce(p.full_name, u.name, 'Traveler') as name
      from trip_members m
      left join profiles p on p.user_id = m.user_id
      left join "user" u on u.id = m.user_id
      where m.trip_id = ${tripId}
      order by case when m.role = 'owner' then 0 else 1 end, m.joined_at
    `
  ).map(
    (row): TripMember => ({
      userId: row.user_id,
      name: row.name || "Traveler",
      role: row.role === "owner" ? "owner" : "companion",
      joinedAt: String(row.joined_at),
    }),
  );

  return { trip, destinations, activities, expenses, stays, notes, packing, members, role: trip.role };
}

async function requireMember(sql: Sql, tripId: number, userId: string) {
  await ensureProfile(sql, userId);
  const role = await membership(sql, tripId, userId);
  if (!role) throw new Error("Join this trip to make changes.");
  return role;
}

async function requireOwner(sql: Sql, tripId: number, userId: string) {
  const role = await requireMember(sql, tripId, userId);
  if (role !== "owner") throw new Error("Only the trip owner can do that.");
  return role;
}

async function ownedStop(sql: Sql, stopId: number, tripId: number) {
  const rows = await sql<{ id: number }>`
    select id from trip_stops where id = ${stopId} and trip_id = ${tripId}
  `;
  if (!rows[0]) throw new Error("Destination not found on this trip.");
}

function assertDates(start: string, end: string, label = "Dates") {
  if (!start || !end) throw new Error(`${label} are required.`);
  if (end < start) throw new Error(`${label}: end cannot be before start.`);
}

export const listOpenTrips = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureBoardSeeded(sql);
    return fetchTrips(sql, "where t.visibility = $1", ["open"], context.userId);
  });

export const listMyTrips = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const trips = await fetchTrips(
      sql,
      "where t.id in (select trip_id from trip_members where user_id = $1)",
      [context.userId],
      context.userId,
    );
    const stats: JournalStats = {
      upcoming: trips.filter((t) => tripStatus(t.startDate, t.endDate) === "upcoming").length,
      ongoing: trips.filter((t) => tripStatus(t.startDate, t.endDate) === "ongoing").length,
      completed: trips.filter((t) => tripStatus(t.startDate, t.endDate) === "completed").length,
      budget: trips.reduce((s, t) => s + t.budget, 0),
      spent: trips.reduce((s, t) => s + t.spent, 0),
      companions: trips.reduce((s, t) => s + Math.max(0, t.memberCount - 1), 0),
    };
    return { trips, stats };
  });

export const getTrip = createServerFn({ method: "GET" })
  .validator((input: unknown) => idInput.parse(input))
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureBoardSeeded(sql);
    return loadTripDetail(sql, data.id, context.userId);
  });

const createTripInput = z.object({
  title: z.string().trim().min(2).max(80),
  startDate: z.string().min(8),
  endDate: z.string().min(8),
  budget: z.coerce.number().min(0),
  currency: z.string().min(3).max(8).default("INR"),
  summary: z.string().trim().max(600).optional().default(""),
  visibility: z.enum(["open", "private"]).default("open"),
  maxCompanions: z.coerce.number().int().min(1).max(20).default(8),
});

export const createTrip = createServerFn({ method: "POST" })
  .validator((input: unknown) => createTripInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    assertDates(data.startDate, data.endDate);
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const rows = await sql<{ id: number }>`
      insert into trips (
        user_id, title, start_date, end_date, budget, currency,
        visibility, summary, max_companions
      )
      values (
        ${context.userId}, ${data.title}, ${data.startDate}, ${data.endDate},
        ${data.budget}, ${data.currency}, ${data.visibility}, ${data.summary ?? ""},
        ${data.maxCompanions}
      )
      returning id
    `;
    const id = Number(rows[0]?.id);
    await sql`
      insert into trip_members (trip_id, user_id, role)
      values (${id}, ${context.userId}, ${"owner"})
    `;
    return loadTripDetail(sql, id, context.userId);
  });

const updateTripInput = createTripInput.extend({ id: z.coerce.number().int().positive() });

export const updateTrip = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateTripInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    assertDates(data.startDate, data.endDate);
    const sql = await getSql();
    await requireOwner(sql, data.id, context.userId);
    await sql`
      update trips
      set title = ${data.title},
          start_date = ${data.startDate},
          end_date = ${data.endDate},
          budget = ${data.budget},
          currency = ${data.currency},
          visibility = ${data.visibility},
          summary = ${data.summary ?? ""},
          max_companions = ${data.maxCompanions},
          updated_at = now()
      where id = ${data.id}
    `;
    return loadTripDetail(sql, data.id, context.userId);
  });

export const deleteTrip = createServerFn({ method: "POST" })
  .validator((input: unknown) => idInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireOwner(sql, data.id, context.userId);
    await sql`delete from trips where id = ${data.id}`;
    return { ok: true as const };
  });

export const joinTrip = createServerFn({ method: "POST" })
  .validator((input: unknown) => idInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const detail = await loadTripDetail(sql, data.id, context.userId);
    if (detail.role !== "viewer") return detail;
    if (detail.trip.visibility !== "open") throw new Error("This trip is not open to join.");
    if (tripStatus(detail.trip.startDate, detail.trip.endDate) === "completed") {
      throw new Error("This journey has already ended.");
    }
    if (detail.trip.memberCount >= detail.trip.maxCompanions) {
      throw new Error("This trip is full.");
    }
    await sql`
      insert into trip_members (trip_id, user_id, role)
      values (${data.id}, ${context.userId}, ${"companion"})
      on conflict do nothing
    `;
    return loadTripDetail(sql, data.id, context.userId);
  });

export const leaveTrip = createServerFn({ method: "POST" })
  .validator((input: unknown) => idInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const role = await membership(sql, data.id, context.userId);
    if (role === "owner") throw new Error("Owners cannot leave — delete the trip instead.");
    if (!role) return { ok: true as const };
    await sql`delete from trip_members where trip_id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

const destinationInput = z.object({
  tripId: z.coerce.number().int().positive(),
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(80),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().trim().max(800).nullable().optional(),
});

export const addDestination = createServerFn({ method: "POST" })
  .validator((input: unknown) => destinationInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.startDate && data.endDate) assertDates(data.startDate, data.endDate, "Destination dates");
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await sql`
      insert into trip_stops (trip_id, city, country, start_date, end_date, notes)
      values (
        ${data.tripId}, ${data.city}, ${data.country},
        ${data.startDate || null}, ${data.endDate || null}, ${data.notes || null}
      )
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const updateDestination = createServerFn({ method: "POST" })
  .validator((input: unknown) => destinationInput.extend({ id: z.coerce.number().int().positive() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.startDate && data.endDate) assertDates(data.startDate, data.endDate, "Destination dates");
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await ownedStop(sql, data.id, data.tripId);
    await sql`
      update trip_stops
      set city = ${data.city},
          country = ${data.country},
          start_date = ${data.startDate || null},
          end_date = ${data.endDate || null},
          notes = ${data.notes || null}
      where id = ${data.id} and trip_id = ${data.tripId}
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const deleteDestination = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.coerce.number().int().positive(), tripId: z.coerce.number().int().positive() }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await ownedStop(sql, data.id, data.tripId);
    await sql`delete from trip_stops where id = ${data.id} and trip_id = ${data.tripId}`;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

const activityInput = z.object({
  tripId: z.coerce.number().int().positive(),
  tripStopId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(120),
  activityDate: z.string().min(8),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  description: z.string().trim().max(800).nullable().optional(),
});

export const addActivity = createServerFn({ method: "POST" })
  .validator((input: unknown) => activityInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.startTime && data.endTime && data.endTime < data.startTime) {
      throw new Error("Activity end time cannot be before start time.");
    }
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await ownedStop(sql, data.tripStopId, data.tripId);
    await sql`
      insert into itinerary_activities (trip_stop_id, title, activity_date, start_time, end_time, description)
      values (
        ${data.tripStopId}, ${data.title}, ${data.activityDate},
        ${data.startTime || null}, ${data.endTime || null}, ${data.description || null}
      )
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const updateActivity = createServerFn({ method: "POST" })
  .validator((input: unknown) => activityInput.extend({ id: z.coerce.number().int().positive() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.startTime && data.endTime && data.endTime < data.startTime) {
      throw new Error("Activity end time cannot be before start time.");
    }
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await ownedStop(sql, data.tripStopId, data.tripId);
    await sql`
      update itinerary_activities
      set title = ${data.title},
          activity_date = ${data.activityDate},
          start_time = ${data.startTime || null},
          end_time = ${data.endTime || null},
          description = ${data.description || null},
          trip_stop_id = ${data.tripStopId}
      where id = ${data.id}
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.coerce.number().int().positive(), tripId: z.coerce.number().int().positive() }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await sql`
      delete from itinerary_activities
      where id = ${data.id}
        and trip_stop_id in (select id from trip_stops where trip_id = ${data.tripId})
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

const expenseInput = z.object({
  tripId: z.coerce.number().int().positive(),
  tripStopId: z.coerce.number().int().positive().nullable().optional(),
  category: z.string().trim().min(1).max(40),
  amount: z.coerce.number().positive(),
  spentOn: z.string().min(8),
  note: z.string().trim().max(240).nullable().optional(),
});

export const addExpense = createServerFn({ method: "POST" })
  .validator((input: unknown) => expenseInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    if (data.tripStopId) await ownedStop(sql, data.tripStopId, data.tripId);
    await sql`
      insert into expenses (trip_id, trip_stop_id, category, amount, spent_on, note)
      values (
        ${data.tripId}, ${data.tripStopId ?? null}, ${data.category},
        ${data.amount}, ${data.spentOn}, ${data.note || null}
      )
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const updateExpense = createServerFn({ method: "POST" })
  .validator((input: unknown) => expenseInput.extend({ id: z.coerce.number().int().positive() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    if (data.tripStopId) await ownedStop(sql, data.tripStopId, data.tripId);
    await sql`
      update expenses
      set trip_stop_id = ${data.tripStopId ?? null},
          category = ${data.category},
          amount = ${data.amount},
          spent_on = ${data.spentOn},
          note = ${data.note || null}
      where id = ${data.id} and trip_id = ${data.tripId}
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.coerce.number().int().positive(), tripId: z.coerce.number().int().positive() }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await sql`delete from expenses where id = ${data.id} and trip_id = ${data.tripId}`;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

const stayInput = z.object({
  tripId: z.coerce.number().int().positive(),
  tripStopId: z.coerce.number().int().positive(),
  propertyName: z.string().trim().min(1).max(120),
  address: z.string().trim().max(200).nullable().optional(),
  checkIn: z.string().nullable().optional(),
  checkOut: z.string().nullable().optional(),
  bookingRef: z.string().trim().max(80).nullable().optional(),
  contact: z.string().trim().max(80).nullable().optional(),
});

export const addStay = createServerFn({ method: "POST" })
  .validator((input: unknown) => stayInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.checkIn && data.checkOut) assertDates(data.checkIn, data.checkOut, "Stay dates");
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await ownedStop(sql, data.tripStopId, data.tripId);
    await sql`
      insert into accommodations (
        trip_stop_id, property_name, address, check_in, check_out, booking_ref, contact
      )
      values (
        ${data.tripStopId}, ${data.propertyName}, ${data.address || null},
        ${data.checkIn || null}, ${data.checkOut || null},
        ${data.bookingRef || null}, ${data.contact || null}
      )
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const updateStay = createServerFn({ method: "POST" })
  .validator((input: unknown) => stayInput.extend({ id: z.coerce.number().int().positive() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.checkIn && data.checkOut) assertDates(data.checkIn, data.checkOut, "Stay dates");
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await ownedStop(sql, data.tripStopId, data.tripId);
    await sql`
      update accommodations
      set property_name = ${data.propertyName},
          address = ${data.address || null},
          check_in = ${data.checkIn || null},
          check_out = ${data.checkOut || null},
          booking_ref = ${data.bookingRef || null},
          contact = ${data.contact || null},
          trip_stop_id = ${data.tripStopId}
      where id = ${data.id}
        and trip_stop_id in (select id from trip_stops where trip_id = ${data.tripId})
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const deleteStay = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.coerce.number().int().positive(), tripId: z.coerce.number().int().positive() }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await sql`
      delete from accommodations
      where id = ${data.id}
        and trip_stop_id in (select id from trip_stops where trip_id = ${data.tripId})
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

const noteInput = z.object({
  tripId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(4000).default(""),
});

export const addNote = createServerFn({ method: "POST" })
  .validator((input: unknown) => noteInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await sql`insert into notes (trip_id, title, body) values (${data.tripId}, ${data.title}, ${data.body})`;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const updateNote = createServerFn({ method: "POST" })
  .validator((input: unknown) => noteInput.extend({ id: z.coerce.number().int().positive() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await sql`
      update notes
      set title = ${data.title}, body = ${data.body}, updated_at = now()
      where id = ${data.id} and trip_id = ${data.tripId}
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const deleteNote = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.coerce.number().int().positive(), tripId: z.coerce.number().int().positive() }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await sql`delete from notes where id = ${data.id} and trip_id = ${data.tripId}`;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

const packingInput = z.object({
  tripId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  slot: z.string().trim().min(1).max(20).default("gear"),
});

export const addPackingItem = createServerFn({ method: "POST" })
  .validator((input: unknown) => packingInput.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await sql`
      insert into packing_items (trip_id, name, packed, slot)
      values (${data.tripId}, ${data.name}, ${false}, ${data.slot})
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const togglePackingItem = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.coerce.number().int().positive(), tripId: z.coerce.number().int().positive() }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await sql`
      update packing_items set packed = not packed
      where id = ${data.id} and trip_id = ${data.tripId}
    `;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

export const deletePackingItem = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.coerce.number().int().positive(), tripId: z.coerce.number().int().positive() }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireMember(sql, data.tripId, context.userId);
    await sql`delete from packing_items where id = ${data.id} and trip_id = ${data.tripId}`;
    return loadTripDetail(sql, data.tripId, context.userId);
  });

async function loadProfile(sql: Sql, userId: string): Promise<Profile> {
  const profile = await ensureProfile(sql, userId);
  const user = await sql<{ email: string | null; name: string }>`
    select email, name from "user" where id = ${userId}
  `;
  return {
    userId,
    fullName: profile.full_name || user[0]?.name || "Traveler",
    email: user[0]?.email ?? null,
    isAdmin: Boolean(profile.is_admin),
    isActive: Boolean(profile.is_active),
  };
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return loadProfile(sql, context.userId);
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ fullName: z.string().trim().min(2).max(80) }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    await sql`
      update profiles set full_name = ${data.fullName}, updated_at = now()
      where user_id = ${context.userId}
    `;
    await sql`update "user" set name = ${data.fullName} where id = ${context.userId}`;
    return loadProfile(sql, context.userId);
  });

async function requireAdmin(sql: Sql, userId: string) {
  const profile = await ensureProfile(sql, userId);
  if (!profile.is_admin) throw new Error("Administrator access required.");
}

async function loadAdminOverview(sql: Sql): Promise<AdminOverview> {
  const counts = await sql<{
    travelers: number;
    active_travelers: number;
    trips: number;
    active_trips: number;
    spend: string | number;
  }>`
    select
      (select count(*)::int from "user") as travelers,
      (select count(*)::int from profiles where is_active = true) as active_travelers,
      (select count(*)::int from trips) as trips,
      (select count(*)::int from trips where end_date >= ${todayISO()}) as active_trips,
      (select coalesce(sum(amount), 0) from expenses) as spend
  `;
  const users = await sql<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    is_admin: boolean | null;
    is_active: boolean | null;
    trip_count: number;
  }>`
    select u.id, u.name, u.email, u."createdAt" as "createdAt",
           coalesce(p.is_admin, false) as is_admin,
           coalesce(p.is_active, true) as is_active,
           (select count(*)::int from trips t where t.user_id = u.id) as trip_count
    from "user" u
    left join profiles p on p.user_id = u.id
    order by u."createdAt" desc
  `;
  const recentTrips = await sql<{
    id: number;
    title: string;
    start_date: string;
    end_date: string;
    owner_name: string;
    owner_email: string;
  }>`
    select t.id, t.title, t.start_date, t.end_date,
           coalesce(p.full_name, u.name, 'Traveler') as owner_name,
           coalesce(u.email, '') as owner_email
    from trips t
    left join profiles p on p.user_id = t.user_id
    left join "user" u on u.id = t.user_id
    order by t.created_at desc
    limit 8
  `;
  return {
    travelers: Number(counts[0]?.travelers ?? 0),
    activeTravelers: Number(counts[0]?.active_travelers ?? 0),
    trips: Number(counts[0]?.trips ?? 0),
    activeTrips: Number(counts[0]?.active_trips ?? 0),
    spend: num(counts[0]?.spend),
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: String(u.createdAt),
      isAdmin: Boolean(u.is_admin),
      isActive: u.is_active !== false,
      tripCount: Number(u.trip_count ?? 0),
    })),
    recentTrips: recentTrips.map((t) => ({
      id: Number(t.id),
      title: t.title,
      startDate: asIso(t.start_date),
      endDate: asIso(t.end_date),
      ownerName: t.owner_name,
      ownerEmail: t.owner_email,
    })),
  };
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    return loadAdminOverview(sql);
  });

export const setUserActive = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ userId: z.string().min(1), isActive: z.boolean() }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    if (data.userId === context.userId) throw new Error("You cannot change your own access.");
    await sql`
      insert into profiles (user_id, full_name, is_active)
      values (${data.userId}, ${"Traveler"}, ${data.isActive})
      on conflict (user_id) do update set is_active = ${data.isActive}, updated_at = now()
    `;
    return loadAdminOverview(sql);
  });
