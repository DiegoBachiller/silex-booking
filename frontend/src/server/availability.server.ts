// Compute available time slots for a given date, respecting schedules, holidays, and existing appointments.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Slot = { worker_id: string; worker_name: string; start: string; end: string };

export async function computeAvailability(opts: {
  date: string; // YYYY-MM-DD
  service_id?: string | null;
  worker_id?: string | null;
  duration_minutes?: number | null;
  step_minutes?: number;
}): Promise<Slot[]> {
  const step = opts.step_minutes ?? 15;
  let duration = opts.duration_minutes ?? 30;

  if (opts.service_id) {
    const { data: svc } = await supabaseAdmin
      .from("services")
      .select("duration_minutes")
      .eq("id", opts.service_id)
      .maybeSingle();
    if (svc?.duration_minutes) duration = svc.duration_minutes;
  }

  const day = new Date(opts.date + "T00:00:00");
  const dow = day.getDay();
  const dayStart = new Date(day);
  const dayEnd = new Date(day.getTime() + 86_400_000);

  // Workers (active)
  let workersQuery = supabaseAdmin.from("workers").select("id, name").eq("active", true);
  if (opts.worker_id) workersQuery = workersQuery.eq("id", opts.worker_id);
  const { data: workers = [] } = await workersQuery;
  if (!workers || workers.length === 0) return [];

  const workerIds = workers.map((w) => w.id);

  // Restrict to workers that offer this service
  let allowedWorkerIds = new Set(workerIds);
  if (opts.service_id) {
    const { data: ws = [] } = await supabaseAdmin
      .from("worker_services")
      .select("worker_id")
      .eq("service_id", opts.service_id)
      .in("worker_id", workerIds);
    allowedWorkerIds = new Set((ws ?? []).map((x) => x.worker_id));
  }

  // Schedules for that day
  const { data: schedules = [] } = await supabaseAdmin
    .from("schedules")
    .select("worker_id, start_time, end_time")
    .eq("day_of_week", dow)
    .in("worker_id", workerIds);

  // Holidays that cover this date (global or per-worker)
  const { data: holidays = [] } = await supabaseAdmin
    .from("holidays")
    .select("worker_id, start_date, end_date")
    .lte("start_date", opts.date)
    .gte("end_date", opts.date);

  const blockedAll = (holidays ?? []).some((h) => h.worker_id === null);
  const blockedPerWorker = new Set((holidays ?? []).filter((h) => h.worker_id).map((h) => h.worker_id!));
  if (blockedAll) return [];

  // Existing appointments on that day (not cancelled)
  const { data: appts = [] } = await supabaseAdmin
    .from("appointments")
    .select("worker_id, starts_at, ends_at, status")
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString())
    .in("worker_id", workerIds)
    .neq("status", "cancelled");

  const slots: Slot[] = [];
  for (const w of workers) {
    if (!allowedWorkerIds.has(w.id)) continue;
    if (blockedPerWorker.has(w.id)) continue;
    const wsch = (schedules ?? []).filter((s) => s.worker_id === w.id);
    if (wsch.length === 0) continue;
    const wAppts = (appts ?? []).filter((a) => a.worker_id === w.id);

    for (const block of wsch) {
      const [bh, bm] = block.start_time.split(":").map(Number);
      const [eh, em] = block.end_time.split(":").map(Number);
      const blockStart = new Date(day); blockStart.setHours(bh, bm, 0, 0);
      const blockEnd = new Date(day); blockEnd.setHours(eh, em, 0, 0);

      for (let t = blockStart.getTime(); t + duration * 60000 <= blockEnd.getTime(); t += step * 60000) {
        const sStart = new Date(t);
        const sEnd = new Date(t + duration * 60000);
        // skip past
        if (sStart.getTime() <= Date.now()) continue;
        const conflict = wAppts.some((a) => {
          const aS = new Date(a.starts_at).getTime();
          const aE = new Date(a.ends_at).getTime();
          return sStart.getTime() < aE && sEnd.getTime() > aS;
        });
        if (conflict) continue;
        slots.push({
          worker_id: w.id,
          worker_name: w.name,
          start: sStart.toISOString(),
          end: sEnd.toISOString(),
        });
      }
    }
  }

  return slots;
}
