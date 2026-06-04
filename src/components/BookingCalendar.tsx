import { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiCalendar } from "react-icons/fi";
import type { TrainingBooking } from "@/services/db-service";

interface BookingCalendarProps {
  /** "user" mode shows availability only; "admin" mode shows booking details */
  mode: "user" | "admin";
  /** For user mode: array of fully-booked date strings (YYYY-MM-DD) */
  bookedDates?: string[];
  /** For user mode: count of bookings per date */
  dateCounts?: Record<string, number>;
  /** For admin mode: full booking objects */
  bookings?: TrainingBooking[];
  /** Maximum bookings allowed per day before marking as full */
  maxPerDay?: number;
  /** Called when user clicks an available date (user mode) */
  onDateSelect?: (dateStr: string) => void;
  /** Currently selected date string */
  selectedDate?: string;
  /** Called when admin deletes a booking */
  onDeleteBooking?: (id: string) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function BookingCalendar({
  mode,
  bookedDates = [],
  dateCounts = {},
  bookings = [],
  maxPerDay = 3,
  onDateSelect,
  selectedDate,
  onDeleteBooking,
}: BookingCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [adminSelectedDay, setAdminSelectedDay] = useState<string | null>(null);

  const todayStr = toDateStr(today);

  // Navigate months
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setAdminSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setAdminSelectedDay(null);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  // Admin: compute per-day booking counts
  const adminDateCounts: Record<string, number> = {};
  if (mode === "admin") {
    for (const b of bookings) {
      adminDateCounts[b.preferredDate] = (adminDateCounts[b.preferredDate] || 0) + 1;
    }
  }

  const effectiveCounts = mode === "admin" ? adminDateCounts : dateCounts;

  const getBookingsForDay = (dateStr: string): TrainingBooking[] => {
    return bookings.filter((b) => b.preferredDate === dateStr);
  };

  const renderCell = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isPast = dateStr < todayStr;
    const isToday = dateStr === todayStr;
    const isSelected = mode === "user" ? selectedDate === dateStr : adminSelectedDay === dateStr;
    const count = effectiveCounts[dateStr] || 0;
    const isFull = mode === "user" ? bookedDates.includes(dateStr) : count >= maxPerDay;

    let cellClass =
      "relative flex flex-col items-center justify-center rounded-xl w-full aspect-square text-sm font-semibold transition-all duration-200 cursor-pointer ";

    if (isPast) {
      cellClass += "text-muted-foreground/40 bg-muted/20 cursor-not-allowed";
    } else if (isSelected) {
      cellClass += "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105";
    } else if (isFull) {
      cellClass += "bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20";
    } else if (count > 0) {
      cellClass +=
        "bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20";
    } else {
      cellClass +=
        "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 hover:shadow-sm";
    }

    if (isToday && !isSelected) {
      cellClass += " ring-2 ring-primary/50 ring-offset-1 ring-offset-background";
    }

    const handleClick = () => {
      if (isPast) return;
      if (mode === "user") {
        if (!isFull && onDateSelect) {
          onDateSelect(dateStr);
        }
      } else {
        setAdminSelectedDay(adminSelectedDay === dateStr ? null : dateStr);
      }
    };

    return (
      <button key={day} type="button" onClick={handleClick} disabled={isPast} className={cellClass}>
        <span>{day}</span>
        {/* Booking count badge for non-empty, non-past days */}
        {count > 0 && !isPast && (
          <span
            className={`absolute -top-1 -right-1 flex items-center justify-center w-4.5 h-4.5 rounded-full text-[9px] font-bold ${
              isFull ? "bg-red-500 text-white" : "bg-amber-500 text-white"
            }`}
            style={{ minWidth: "18px", minHeight: "18px" }}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  // Admin day detail
  const dayBookings = adminSelectedDay ? getBookingsForDay(adminSelectedDay) : [];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-5 py-4 bg-primary text-primary-foreground">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <FiChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <FiCalendar size={18} />
            <span className="font-display text-xl font-bold">
              {MONTHS[viewMonth]} {viewYear}
            </span>
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <FiChevronRight size={20} />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-border bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500/60" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500/60" />
            Partially Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500/60" />
            Fully Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-muted/60 border border-border" />
            Past
          </span>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 px-4 pt-3 pb-1">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 gap-1.5 px-4 pb-4">
          {/* Empty cells for offset */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {/* Day cells */}
          {Array.from({ length: totalDays }).map((_, i) => renderCell(i + 1))}
        </div>
      </div>

      {/* Admin: Selected Day Detail Panel */}
      {mode === "admin" && adminSelectedDay && (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm animate-slide-down space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xl text-foreground">
              Bookings on{" "}
              {new Date(adminSelectedDay + "T00:00:00").toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h4>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                dayBookings.length >= maxPerDay
                  ? "bg-red-500/10 text-red-500"
                  : dayBookings.length > 0
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              {dayBookings.length} / {maxPerDay} slots
            </span>
          </div>

          {dayBookings.length === 0 ? (
            <div className="text-sm text-muted-foreground italic py-4 text-center">
              No bookings for this day yet.
            </div>
          ) : (
            <div className="space-y-3">
              {dayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl border border-border bg-background p-4 flex flex-col sm:flex-row sm:items-start gap-4"
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{booking.ownerName}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          booking.trainingType === "Basic"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : booking.trainingType === "Moderate"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        {booking.trainingType}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>
                        Pet: <strong className="text-foreground">{booking.petName}</strong> (
                        {booking.breed}, {booking.age})
                      </div>
                      <div>
                        Medical:{" "}
                        <strong className="text-foreground">
                          {booking.medicalConditions || "N/A"}
                        </strong>
                      </div>
                      {booking.selectedCommands.length > 0 && (
                        <div>
                          Commands:{" "}
                          <strong className="text-foreground">
                            {booking.selectedCommands.join(", ")}
                          </strong>
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground/70 pt-1">
                        Booked: {new Date(booking.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {onDeleteBooking && (
                    <button
                      type="button"
                      onClick={() => onDeleteBooking(booking.id)}
                      className="self-start rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 px-3 py-1.5 text-xs font-bold transition cursor-pointer shrink-0"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
