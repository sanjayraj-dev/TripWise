export type Profile = {
  userId: string;
  fullName: string;
  email: string | null;
  isAdmin: boolean;
  isActive: boolean;
};

export type TripStatus = "upcoming" | "ongoing" | "completed";
export type TripVisibility = "open" | "private";
export type MemberRole = "owner" | "companion" | "viewer";

export type TripMember = {
  userId: string;
  name: string;
  role: "owner" | "companion";
  joinedAt: string;
};

export type Trip = {
  id: number;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  createdAt: string;
  spent: number;
  stopCount: number;
  activityCount: number;
  packedCount: number;
  packingCount: number;
  visibility: TripVisibility;
  summary: string;
  maxCompanions: number;
  memberCount: number;
  ownerName: string;
  cities: string[];
  role: MemberRole;
  cover: string;
};

export type Destination = {
  id: number;
  tripId: number;
  city: string;
  country: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

export type Activity = {
  id: number;
  tripStopId: number;
  tripId: number;
  city: string;
  country: string;
  title: string;
  activityDate: string;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
};

export type Expense = {
  id: number;
  tripId: number;
  tripStopId: number | null;
  category: string;
  amount: number;
  spentOn: string;
  note: string | null;
  city: string | null;
};

export type Stay = {
  id: number;
  tripStopId: number;
  tripId: number;
  city: string;
  country: string;
  propertyName: string;
  address: string | null;
  checkIn: string | null;
  checkOut: string | null;
  bookingRef: string | null;
  contact: string | null;
};

export type Note = {
  id: number;
  tripId: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type PackingItem = {
  id: number;
  tripId: number;
  name: string;
  packed: boolean;
  slot: string;
};

export type TripDetail = {
  trip: Trip;
  destinations: Destination[];
  activities: Activity[];
  expenses: Expense[];
  stays: Stay[];
  notes: Note[];
  packing: PackingItem[];
  members: TripMember[];
  role: MemberRole;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
  isActive: boolean;
  tripCount: number;
};

export type AdminOverview = {
  travelers: number;
  activeTravelers: number;
  trips: number;
  activeTrips: number;
  spend: number;
  users: AdminUser[];
  recentTrips: {
    id: number;
    title: string;
    startDate: string;
    endDate: string;
    ownerName: string;
    ownerEmail: string;
  }[];
};

export type JournalStats = {
  upcoming: number;
  ongoing: number;
  completed: number;
  budget: number;
  spent: number;
  companions: number;
};
