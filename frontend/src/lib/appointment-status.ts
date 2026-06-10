// Shared appointment status map. The single source of truth used by the
// calendar, customer history and stats so colors + labels never drift.

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; color: string }> = {
  scheduled: { label: "Programada", color: "#6366f1" },
  completed: { label: "Completada", color: "#10b981" },
  cancelled: { label: "Cancelada", color: "#ef4444" },
  no_show: { label: "No asistió", color: "#f59e0b" },
};

export function getStatus(status: string) {
  return APPOINTMENT_STATUS[status as AppointmentStatus] ?? APPOINTMENT_STATUS.scheduled;
}

export function statusBadgeStyle(status: string): React.CSSProperties {
  const c = getStatus(status).color;
  return {
    background: `color-mix(in oklab, ${c} 14%, transparent)`,
    color: c,
  };
}
