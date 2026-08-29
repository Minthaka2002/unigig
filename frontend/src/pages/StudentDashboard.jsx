import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

function useCountdown(expiresAt) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return secondsLeft;
}

function PingCard({ queue, userId, onResponded }) {
  const currentPing = queue.pings.find((p) => p.position === queue.current_index);
  const secondsLeft = useCountdown(currentPing?.expires_at);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function respond(accept) {
    setBusy(true);
    setError("");
    try {
      await api.respondToPing(queue.id, userId, accept);
      onResponded();
    } catch (err) {
      setError(err.message);
      onResponded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card border-alert/30">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-alert">Incoming task ping</span>
        <span className="font-mono text-lg font-semibold text-alert">{secondsLeft ?? "…"}s</span>
      </div>
      <p className="mt-3 font-mono text-xs text-ink/40">Task ID: {queue.task_id}</p>
      {error && <p className="mt-2 text-xs text-alert-deep">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button onClick={() => respond(true)} disabled={busy} className="btn-primary flex-1">
          Accept
        </button>
        <button onClick={() => respond(false)} disabled={busy} className="btn-secondary flex-1">
          Decline
        </button>
      </div>
    </div>
  );
}

function ApplyButton({ taskId, applied, onApplied }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (applied) {
    return <span className="font-mono text-xs uppercase text-signal">{applied}</span>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary !px-3 !py-1.5 text-xs">
        Apply
      </button>
    );
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api.applyToTask(taskId, message || undefined);
      setOpen(false);
      onApplied();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <input
        className="input !py-1.5 text-xs"
        placeholder="Optional note to the client…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {error && <p className="text-xs text-alert-deep">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="text-xs text-ink/40 hover:text-ink/60">
          Cancel
        </button>
        <button onClick={submit} disabled={busy} className="btn-primary !px-3 !py-1.5 text-xs">
          {busy ? "Applying…" : "Send application"}
        </button>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, setUser } = useAuth();
  const [pending, setPending] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [openTasks, setOpenTasks] = useState([]);
  const [myApplications, setMyApplications] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [pendingQueues, mine, open, freshMe, applications] = await Promise.all([
      api.getPendingForWorker(user.id),
      api.listTasks("?mine=true"),
      api.listTasks("?status=open"),
      api.me(),
      api.getMyApplications(),
    ]);
    setPending(pendingQueues);
    setMyTasks(mine);
    setOpenTasks(open);
    setUser(freshMe);
    setMyApplications(applications);
  }, [user?.id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  const remaining = user ? Math.max(0, (user.weekly_hour_cap || 20) - (user.weekly_hours_used || 0)) : 0;
  const pct = user ? Math.min(100, ((user.weekly_hours_used || 0) / (user.weekly_hour_cap || 20)) * 100) : 0;
  const isStudent = user?.role === "student";

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <span className="eyebrow">{isStudent ? "Student" : "Worker"} dashboard</span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
          Hi {user?.full_name?.split(" ")[0]}.
        </h1>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.4fr]">
          {isStudent ? (
            <div className="card">
              <span className="eyebrow">Weekly quota</span>
              <p className="mt-3 font-mono text-3xl font-semibold text-ink">
                {remaining.toFixed(1)}h <span className="text-base font-normal text-ink/40">remaining</span>
              </p>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-ink/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-signal to-alert transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink/40">
                {(user?.weekly_hours_used || 0).toFixed(1)}h / {user?.weekly_hour_cap || 20}h used · resets Monday
              </p>
            </div>
          ) : (
            <div className="card">
              <span className="eyebrow">Standard worker</span>
              <p className="mt-3 text-sm text-ink/50">
                No weekly hour cap applies to your account — you serve as overflow capacity when
                students are unavailable or at their limit.
              </p>
            </div>
          )}

          <div className="card">
            <span className="eyebrow">Live pings</span>
            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-ink/40">No pending job offers right now.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {pending.map((q) => (
                  <PingCard key={q.id} queue={q} userId={user.id} onResponded={refresh} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold text-ink">My tasks</h2>
          {myTasks.length === 0 ? (
            <p className="mt-2 text-sm text-ink/40">Nothing assigned to you yet.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {myTasks.map((t) => (
                <div key={t.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-display text-sm font-semibold text-ink">{t.title}</p>
                    <p className="text-xs text-ink/45">{t.status.replace("_", " ")} · {t.estimated_duration_hours}h</p>
                  </div>
                  <span className="font-mono text-sm text-ink">LKR {t.final_price?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold text-ink">Open tasks nearby</h2>
          <p className="mt-1 text-xs text-ink/40">
            Apply directly, or wait to be picked through a client's curated shortlist — get verified
            and list your skills to appear on more of those.
          </p>
          {openTasks.length === 0 ? (
            <p className="mt-2 text-sm text-ink/40">No open tasks right now.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {openTasks.map((t) => {
                const myApp = myApplications.find((a) => a.task_id === t.id && a.status !== "withdrawn");
                return (
                  <div key={t.id} className="card flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-sm font-semibold text-ink">{t.title}</p>
                      <p className="text-xs text-ink/45">
                        {t.category.replace("_", " ")} · {t.estimated_duration_hours}h
                        {t.location_label ? ` · ${t.location_label}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-ink">LKR {t.final_price?.toLocaleString() ?? "—"}</span>
                      <ApplyButton
                        taskId={t.id}
                        applied={myApp ? myApp.status : null}
                        onApplied={refresh}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold text-ink">My applications</h2>
          {myApplications.filter((a) => a.status !== "withdrawn").length === 0 ? (
            <p className="mt-2 text-sm text-ink/40">You haven't applied to anything yet.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {myApplications
                .filter((a) => a.status !== "withdrawn")
                .map((a) => (
                  <div key={a.id} className="card flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs text-ink/40">Task {a.task_id.slice(0, 8)}…</p>
                      {a.message && <p className="mt-1 text-sm text-ink/60">"{a.message}"</p>}
                    </div>
                    <span
                      className={`font-mono text-xs uppercase ${
                        a.status === "accepted"
                          ? "text-signal"
                          : a.status === "rejected"
                          ? "text-ink/30"
                          : "text-alert"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
