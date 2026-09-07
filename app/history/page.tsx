"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, Clock3, Download, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "present" | "absent" | "late" | "unmarked";
type RecordMap = Record<number, Status>;
const PREFIX = "attendance-manager:daily:";
const students = [
  { id: 1, name: "Aarav Patil" }, { id: 2, name: "Aisha Shaikh" }, { id: 3, name: "Rohan More" }, { id: 4, name: "Sana Khan" },
  { id: 5, name: "Kabir Jadhav" }, { id: 6, name: "Meera Joshi" }, { id: 7, name: "Aditya Pawar" }, { id: 8, name: "Zoya Ansari" },
];
const valid = new Set<Status>(["present", "absent", "late", "unmarked"]);
function dateFromKey(key: string) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
function formatDate(date: Date) { return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date); }
function shortDate(date: Date) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date); }
function readHistory() {
  const result: { key: string; date: Date; attendance: RecordMap }[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const storageKey = window.localStorage.key(i);
    if (!storageKey?.startsWith(PREFIX)) continue;
    const key = storageKey.slice(PREFIX.length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    try {
      const raw: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const attendance: RecordMap = {};
      for (const student of students) {
        const value = (raw as Record<string, unknown>)[String(student.id)];
        attendance[student.id] = typeof value === "string" && valid.has(value as Status) ? value as Status : "unmarked";
      }
      result.push({ key, date: dateFromKey(key), attendance });
    } catch { /* Ignore malformed records. */ }
  }
  return result.sort((a, b) => b.date.getTime() - a.date.getTime());
}
function counts(record: RecordMap) { const values = Object.values(record); return { present: values.filter((x) => x === "present").length, absent: values.filter((x) => x === "absent").length, late: values.filter((x) => x === "late").length, unmarked: values.filter((x) => x === "unmarked").length }; }
function escapeCsv(value: string) { return `"${value.replaceAll('"', '""')}"`; }
function exportHistory(history: ReturnType<typeof readHistory>) {
  const rows = [
    ["Date", "Roll", "Student", "Status"],
    ...history.flatMap((entry) => students.map((student) => [entry.key, student.id.toString().padStart(2, "0"), student.name, entry.attendance[student.id]])),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `attendance-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const [history, setHistory] = useState<ReturnType<typeof readHistory>>([]);
  const [selected, setSelected] = useState("");
  useEffect(() => { const records = readHistory(); setHistory(records); setSelected(records[0]?.key ?? ""); }, []);
  const current = history.find((entry) => entry.key === selected);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-10"><div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between"><div>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" /> Daily attendance</Link>
        <p className="mt-5 text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Attendance Manager</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Attendance history</h1><p className="mt-2 text-sm text-slate-500">Review saved daily attendance records from this browser.</p>
      </div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600"><CalendarDays className="size-4" /> {history.length} {history.length === 1 ? "day" : "days"} saved</div>{history.length > 0 && <Button variant="outline" onClick={() => exportHistory(history)}><Download /> Export CSV</Button>}</div></header>
      {history.length === 0 ? <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm"><CalendarDays className="mx-auto size-10 text-slate-300" /><h2 className="mt-4 text-lg font-semibold">No attendance history yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Mark attendance on the daily page first. Saved days will automatically appear here.</p><Button asChild className="mt-6"><Link href="/">Go to daily attendance</Link></Button></section> :
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]"><section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="px-2 py-2"><h2 className="font-semibold">Saved days</h2><p className="mt-1 text-xs text-slate-500">Select a date to inspect the record.</p></div><div className="mt-3 space-y-2">{history.map((entry) => { const c = counts(entry.attendance); const complete = Math.round(((students.length - c.unmarked) / students.length) * 100); return <button key={entry.key} type="button" onClick={() => setSelected(entry.key)} className={`w-full rounded-2xl border p-4 text-left transition ${selected === entry.key ? "border-emerald-200 bg-emerald-50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}`}><div className="flex items-center justify-between"><span className="font-semibold">{shortDate(entry.date)}</span><span className="text-xs font-semibold text-slate-500">{complete}%</span></div><p className="mt-1 text-xs text-slate-500">{formatDate(entry.date)}</p><div className="mt-3 flex gap-3 text-xs font-medium"><span className="text-emerald-700">{c.present} present</span><span className="text-rose-700">{c.absent} absent</span><span className="text-amber-700">{c.late} late</span></div></button>; })}</div></section>
      {current && <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-600">Daily record</p><h2 className="mt-1 text-2xl font-bold tracking-tight">{formatDate(current.date)}</h2></div><div className="divide-y divide-slate-100">{students.map((student) => { const status = current.attendance[student.id]; const Icon = status === "present" ? Check : status === "absent" ? UserX : Clock3; const styles = { present: "bg-emerald-50 text-emerald-700", absent: "bg-rose-50 text-rose-700", late: "bg-amber-50 text-amber-700", unmarked: "bg-slate-100 text-slate-500" }[status]; return <div key={student.id} className="flex items-center justify-between gap-4 px-6 py-4"><div className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600">{student.id.toString().padStart(2, "0")}</div><p className="truncate font-medium">{student.name}</p></div><span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${styles}`}>{status !== "unmarked" && <Icon className="size-3.5" />}{status}</span></div>; })}</div></section>}</div>}
    </div></main>
  );
}
