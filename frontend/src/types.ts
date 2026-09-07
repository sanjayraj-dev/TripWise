export type User = {
  id: number;
  full_name: string;
  email: string;
  role: "traveler" | "admin";
  status: "active" | "deactivated";
  created_at?: string;
  trip_count?: number;
  bio?: string;
  home_city?: string;
  travel_style?: string;
};

export type Member = {
  id: number;
  user_id: number;
  role: string;
  status: string;
  full_name: string;
  email: string;
  home_city: string;
  travel_style: string;
};

export type ChatMsg = {
  id: number;
  user_id: number;
  full_name: string;
  body: string;
  created_at: string | null;
};

export type Readiness = {
  score: number;
  filled: number;
  total: number;
  checks: Record<string, boolean>;
};

export type TripCard = {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  estimated_budget: number;
  spent: number;
  remaining: number;
  status: "upcoming" | "ongoing" | "completed";
  cities: string[];
  destination_count: number;
  trip_type?: string;
  currency?: string;
  is_public?: boolean;
  share_token?: string | null;
  readiness?: Readiness;
  visibility?: string;
  join_mode?: string;
  seats?: number;
  looking_for_ride?: boolean;
  member_count?: number;
  my_role?: string | null;
  my_status?: string | null;
};

export type Activity = {
  id: number;
  destination_id: number;
  city: string;
  title: string;
  description: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  category: string;
};

export type Expense = {
  id: number;
  destination_id: number;
  city: string;
  amount: number;
  category: string;
  expense_date: string;
  description: string;
};

export type Stay = {
  id: number;
  destination_id: number;
  city: string;
  property_name: string;
  address: string;
  check_in: string;
  check_out: string;
  booking_reference: string;
  contact: string;
  price_per_night: number | null;
  notes: string;
};

export type Destination = {
  id: number;
  trip_id: number;
  sequence_no: number;
  city: string;
  country: string;
  arrival_date: string;
  departure_date: string;
  lat: number | null;
  lng: number | null;
  notes: string;
  activities: Activity[];
  expenses: Expense[];
  accommodations: Stay[];
};

export type Note = {
  id: number;
  title: string;
  content: string;
  created_at: string | null;
};

export type PackingItem = {
  id: number;
  item_name: string;
  category: string;
  is_packed: boolean;
};

export type TravelDoc = {
  id: number;
  title: string;
  kind: string;
  reference: string;
  expiry_date: string | null;
  notes: string;
};

export type TripDetail = TripCard & {
  destinations: Destination[];
  activities: Activity[];
  expenses: Expense[];
  accommodations: Stay[];
  notes: Note[];
  packing: PackingItem[];
  documents: TravelDoc[];
  packing_progress: { packed: number; total: number };
  members: Member[];
  owner_id: number;
};

export type WeekItem = {
  trip_id: number;
  trip_title: string;
  title: string;
  activity_date: string;
  start_time: string | null;
  city: string;
  category: string;
};

export type Dashboard = {
  upcoming: TripCard[];
  completed: TripCard[];
  active_budget: { estimated: number; spent: number; remaining: number; trip_count: number };
  trip_count: number;
  week: WeekItem[];
  avg_readiness: number;
};

export type Insights = {
  trip_count: number;
  nights: number;
  activities: number;
  cities: number;
  spent: number;
  budgeted: number;
  by_category: { name: string; value: number }[];
  by_month: { month: string; value: number }[];
  top_cities: { label: string; trips: number }[];
};

export type CalEvent = {
  id: string;
  kind: "trip" | "activity";
  trip_id: number;
  title: string;
  date: string;
  end?: string;
  start_time?: string | null;
  city: string;
  category?: string;
};

export const EXPENSE_CATEGORIES = ["Food", "Transport", "Stay", "Activities", "Shopping", "Other"] as const;
export const PACKING_CATEGORIES = ["Clothes", "Documents", "Toiletries", "Electronics", "Health", "Other"] as const;
