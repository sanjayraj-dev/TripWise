import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addActivity,
  addDestination,
  addExpense,
  addNote,
  addPackingItem,
  addStay,
  adminOverview,
  createTrip,
  deleteActivity,
  deleteDestination,
  deleteExpense,
  deleteNote,
  deletePackingItem,
  deleteStay,
  deleteTrip,
  getMyProfile,
  getTrip,
  joinTrip,
  leaveTrip,
  listMyTrips,
  listOpenTrips,
  setUserActive,
  togglePackingItem,
  updateActivity,
  updateDestination,
  updateExpense,
  updateMyProfile,
  updateNote,
  updateStay,
  updateTrip,
} from "./api";
import type { TripDetail, TripVisibility } from "./types";

function errMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong.";
}

function isUnauthorized(error: unknown) {
  return error instanceof Error && error.message === "Unauthorized";
}

export function useOpenTrips() {
  return useQuery({
    queryKey: ["open-trips"],
    queryFn: () => listOpenTrips(),
  });
}

export function useMyJournal() {
  return useQuery({
    queryKey: ["my-trips"],
    queryFn: () => listMyTrips(),
    retry: (count, error) => !isUnauthorized(error) && count < 1,
  });
}

export function useTrip(id: number) {
  return useQuery({
    queryKey: ["trip", id],
    queryFn: () => getTrip({ data: { id } }),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useMyProfile(enabled = true) {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => getMyProfile(),
    enabled,
    retry: (count, error) => !isUnauthorized(error) && count < 1,
  });
}

function useTripMutation<T>(fn: (input: T) => Promise<TripDetail>, ok?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (detail) => {
      qc.setQueryData(["trip", detail.trip.id], detail);
      void qc.invalidateQueries({ queryKey: ["open-trips"] });
      void qc.invalidateQueries({ queryKey: ["my-trips"] });
      if (ok) toast.success(ok);
    },
    onError: (error) => toast.error(errMessage(error)),
  });
}

export type TripWrite = {
  title: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  summary?: string;
  visibility: TripVisibility;
  maxCompanions: number;
};

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TripWrite) => createTrip({ data: input }),
    onSuccess: (detail) => {
      qc.setQueryData(["trip", detail.trip.id], detail);
      void qc.invalidateQueries({ queryKey: ["open-trips"] });
      void qc.invalidateQueries({ queryKey: ["my-trips"] });
      toast.success("Trip created.");
    },
    onError: (error) => toast.error(errMessage(error)),
  });
}

export function useJoinTrip() {
  return useTripMutation((id: number) => joinTrip({ data: { id } }), "You're on this trip.");
}

export function useLeaveTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => leaveTrip({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["open-trips"] });
      void qc.invalidateQueries({ queryKey: ["my-trips"] });
      toast.success("You left the trip.");
    },
    onError: (error) => toast.error(errMessage(error)),
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTrip({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["open-trips"] });
      void qc.invalidateQueries({ queryKey: ["my-trips"] });
      toast.success("Trip deleted.");
    },
    onError: (error) => toast.error(errMessage(error)),
  });
}

export function useUpdateTrip() {
  return useTripMutation((input: TripWrite & { id: number }) => updateTrip({ data: input }), "Trip updated.");
}

export function useAddDestination() {
  return useTripMutation(
    (input: {
      tripId: number;
      city: string;
      country: string;
      startDate?: string | null;
      endDate?: string | null;
      notes?: string | null;
    }) => addDestination({ data: input }),
    "Destination added.",
  );
}
export function useUpdateDestination() {
  return useTripMutation(
    (input: {
      id: number;
      tripId: number;
      city: string;
      country: string;
      startDate?: string | null;
      endDate?: string | null;
      notes?: string | null;
    }) => updateDestination({ data: input }),
    "Destination updated.",
  );
}
export function useDeleteDestination() {
  return useTripMutation(
    (input: { id: number; tripId: number }) => deleteDestination({ data: input }),
    "Destination removed.",
  );
}

export function useAddActivity() {
  return useTripMutation(
    (input: {
      tripId: number;
      tripStopId: number;
      title: string;
      activityDate: string;
      startTime?: string | null;
      endTime?: string | null;
      description?: string | null;
    }) => addActivity({ data: input }),
    "Activity added.",
  );
}
export function useUpdateActivity() {
  return useTripMutation(
    (input: {
      id: number;
      tripId: number;
      tripStopId: number;
      title: string;
      activityDate: string;
      startTime?: string | null;
      endTime?: string | null;
      description?: string | null;
    }) => updateActivity({ data: input }),
    "Activity updated.",
  );
}
export function useDeleteActivity() {
  return useTripMutation(
    (input: { id: number; tripId: number }) => deleteActivity({ data: input }),
    "Activity removed.",
  );
}

export function useAddExpense() {
  return useTripMutation(
    (input: {
      tripId: number;
      tripStopId?: number | null;
      category: string;
      amount: number;
      spentOn: string;
      note?: string | null;
    }) => addExpense({ data: input }),
    "Expense recorded.",
  );
}
export function useUpdateExpense() {
  return useTripMutation(
    (input: {
      id: number;
      tripId: number;
      tripStopId?: number | null;
      category: string;
      amount: number;
      spentOn: string;
      note?: string | null;
    }) => updateExpense({ data: input }),
    "Expense updated.",
  );
}
export function useDeleteExpense() {
  return useTripMutation(
    (input: { id: number; tripId: number }) => deleteExpense({ data: input }),
    "Expense removed.",
  );
}

export function useAddStay() {
  return useTripMutation(
    (input: {
      tripId: number;
      tripStopId: number;
      propertyName: string;
      address?: string | null;
      checkIn?: string | null;
      checkOut?: string | null;
      bookingRef?: string | null;
      contact?: string | null;
    }) => addStay({ data: input }),
    "Stay added.",
  );
}
export function useUpdateStay() {
  return useTripMutation(
    (input: {
      id: number;
      tripId: number;
      tripStopId: number;
      propertyName: string;
      address?: string | null;
      checkIn?: string | null;
      checkOut?: string | null;
      bookingRef?: string | null;
      contact?: string | null;
    }) => updateStay({ data: input }),
    "Stay updated.",
  );
}
export function useDeleteStay() {
  return useTripMutation((input: { id: number; tripId: number }) => deleteStay({ data: input }), "Stay removed.");
}

export function useAddNote() {
  return useTripMutation(
    (input: { tripId: number; title: string; body?: string }) => addNote({ data: input }),
    "Note saved.",
  );
}
export function useUpdateNote() {
  return useTripMutation(
    (input: { id: number; tripId: number; title: string; body?: string }) => updateNote({ data: input }),
    "Note updated.",
  );
}
export function useDeleteNote() {
  return useTripMutation((input: { id: number; tripId: number }) => deleteNote({ data: input }), "Note removed.");
}

export function useAddPackingItem() {
  return useTripMutation((input: { tripId: number; name: string; slot?: string }) =>
    addPackingItem({ data: input }),
  );
}
export function useTogglePackingItem() {
  return useTripMutation((input: { id: number; tripId: number }) => togglePackingItem({ data: input }));
}
export function useDeletePackingItem() {
  return useTripMutation((input: { id: number; tripId: number }) => deletePackingItem({ data: input }));
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fullName: string) => updateMyProfile({ data: { fullName } }),
    onSuccess: (profile) => {
      qc.setQueryData(["me"], profile);
      toast.success("Profile updated.");
    },
    onError: (error) => toast.error(errMessage(error)),
  });
}

export function useAdminOverview(enabled = true) {
  return useQuery({
    queryKey: ["admin"],
    queryFn: () => adminOverview(),
    enabled,
    retry: (count, error) => !isUnauthorized(error) && count < 1,
  });
}

export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; isActive: boolean }) => setUserActive({ data: input }),
    onSuccess: (data) => {
      qc.setQueryData(["admin"], data);
      toast.success("Account updated.");
    },
    onError: (error) => toast.error(errMessage(error)),
  });
}
