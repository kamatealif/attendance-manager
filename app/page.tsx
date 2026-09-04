"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, RotateCcw, UserCheck, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";

type AttendanceStatus = "present" | "absent" | "late" | "unmarked";
type MarkedAttendance = Record<number, AttendanceStatus>;
type Student = {
  id: number;
  name: string;
  roll: string;
  className: string;
};

const STORAGE_KEY_PREFIX = "attendance-manager:daily:";
const validStatuses = new Set<AttendanceStatus>([
  "present",
  "absent",
  "late",
  "unmarked",
]);

const students: Student[] = [
  { id: 1, name: "Aarav Patil", roll: "01", className: "12-A" },
  { id: 2, name: "Aisha Shaikh", roll: "02", className: "12-A" },
  { id: 3, name: "Rohan More", roll: "03", className: "11-B" },
  { id: 4, name: "Sana Khan", roll: "04", className: "11-B" },
  { id: 5, name: "Kabir Jadhav", roll: "05", className: "10-A" },
  { id: 6, name: "Meera Joshi", roll: "06", className: "10-A" },
  { id: 7, name: "Aditya Pawar", roll: "07", className: "09-C" },
  { id: 8, name: "Zoya Ansari", roll: "08", className: "09-C" },
];

const statusConfig: Record<
  Exclude<AttendanceStatus, "unmarked">,
  { label: string; className: string; icon: typeof Check }
> = {
  present: {
    label: "Present",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    icon: Check,
  },
  absent: {
    label: "Absent",
    className: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    icon: UserX,
  },
  late: {
    label: "Late",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    icon: Clock3,
  },
};

function createEmptyAttendance(): MarkedAttendance {
  return Object.fromEntries(
    students.map((student) => [student.id, "unmarked"])
  );
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStorageKey(date: Date) {
  return `${STORAGE_KEY_PREFIX}${getLocalDateKey(date)}`;
}

function readStoredAttendance(date: Date): MarkedAttendance {
  const empty = createEmptyAttendance();

  try {
    const raw = window.localStorage.getItem(getStorageKey(date));
    if (!raw) return empty;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return empty;
    }

    const stored = parsed as Record<string, unknown>;

    for (const student of students) {
      const value = stored[String(student.id)];
      if (
        typeof value === "string" &&
        validStatuses.has(value as AttendanceStatus)
      ) {
        empty[student.id] = value as AttendanceStatus;
      }
    }
  } catch {
    return empty;
  }

  return empty;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function Home() {
  const [attendance, setAttendance] = useState<MarkedAttendance>(() =>
    createEmptyAttendance()
  );
  const [today, setToday] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const now = new Date();
    setToday(formatDate(now));
    setAttendance(readStoredAttendance(now));
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    try {
      window.localStorage.setItem(
        getStorageKey(new Date()),
        JSON.stringify(attendance)
      );
    } catch {
      // Persistence is best-effort; attendance still works in memory.
    }
  }, [attendance, storageReady]);

  const summary = useMemo(() => {
    const values = Object.values(attendance);

    return {
      total: students.length,
      present: values.filter((status) => status === "present").length,
      absent: values.filter((status) => status === "absent").length,
      late: values.filter((status) => status === "late").length,
      unmarked: values.filter((status) => status === "unmarked").length,
    };
  }, [attendance]);

  const setStatus = (
    studentId: number,
    status: Exclude<AttendanceStatus, "unmarked">
  ) => {
    setAttendance((current) => ({ ...current, [studentId]: status }));
  };

  const markAllPresent = () => {
    setAttendance(
      Object.fromEntries(students.map((student) => [student.id, "present"]))
    );
  };

  const resetAttendance = () => {
    setAttendance(createEmptyAttendance());
  };

  const completion = Math.round(
    ((summary.total - summary.unmarked) / summary.total) * 100
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
              Attendance Manager
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Daily Attendance
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {today || "Today"} · Mark each student once and keep the class record complete.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resetAttendance}>
              <RotateCcw />
              Reset
            </Button>
            <Button onClick={markAllPresent}>
              <UserCheck />
              Mark all present
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total students"
            value={summary.total}
            detail="Students on roster"
          />
          <SummaryCard
            label="Present"
            value={summary.present}
            detail={`${completion}% attendance marked`}
          />
          <SummaryCard
            label="Absent"
            value={summary.absent}
            detail="Requires follow-up"
          />
          <SummaryCard
            label="Late"
            value={summary.late}
            detail={`${summary.unmarked} still unmarked`}
          />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Class roster</h2>
              <p className="text-sm text-slate-500">
                Choose Present, Absent, or Late for each student.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {completion}% complete
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {students.map((student) => {
              const status = attendance[student.id];

              return (
                <div
                  key={student.id}
                  className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                      {student.roll}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {student.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Class {student.className}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(statusConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      const selected = status === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setStatus(
                              student.id,
                              key as Exclude<AttendanceStatus, "unmarked">
                            )
                          }
                          className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition ${config.className} ${
                            selected
                              ? "ring-2 ring-slate-900/10 ring-offset-1"
                              : "opacity-70 hover:opacity-100"
                          }`}
                        >
                          <Icon />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <UserCheck />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </article>
  );
}
