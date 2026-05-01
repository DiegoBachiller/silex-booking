import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Worker = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  color: string;
  avatar_url: string | null;
  active: boolean;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  active: boolean;
};

export type Appointment = {
  id: string;
  worker_id: string;
  service_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  source: string;
};

export type Holiday = {
  id: string;
  worker_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
};

export type Schedule = {
  id: string;
  worker_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type AiProfile = {
  id: string;
  agent_name: string;
  voice: string;
  tone: string;
  language: string;
  greeting: string;
  business_name: string;
  business_hours_note: string | null;
};

export type ApiKey = {
  id: string;
  name: string;
  key: string;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
};

export function useWorkers() {
  return useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workers").select("*").order("name");
      if (error) throw error;
      return data as Worker[];
    },
  });
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data as Service[];
    },
  });
}

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data as Appointment[];
    },
  });
}

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("start_date");
      if (error) throw error;
      return data as Holiday[];
    },
  });
}

export function useSchedules() {
  return useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schedules").select("*");
      if (error) throw error;
      return data as Schedule[];
    },
  });
}

export function useAiProfile() {
  return useQuery({
    queryKey: ["ai_profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_profile")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as AiProfile;
    },
  });
}

export function useWorkerServices() {
  return useQuery({
    queryKey: ["worker_services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker_services").select("*");
      if (error) throw error;
      return data as { worker_id: string; service_id: string }[];
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useMut<T>(opts: { fn: () => Promise<T>; success: string; invalidate: string[] }) {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: opts.fn,
    onSuccess: () => {
      toast.success(opts.success);
      inv(opts.invalidate);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
