import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../api/client";

export default function TaskCandidates() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState([]);
  const [queue, setQueue] = useState(null);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  const loadTask = useCallback(async () => {
    const t = await api.getTask(id);
    setTask(t);
    return t;
  }, [id]);

  const loadQueue = useCallback(async () => {
    try {
      const q = await api.getQueueForTask(id);
      setQueue(q);
    } catch {
      setQueue(null);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const loadApplications = useCallback(async () => {
    try {
      const apps = await api.getApplications(id);
      setApplications(apps);
    } catch {
      setApplications([]);
    }
  }, [id]);

  useEffect(() => {
    let interval;
    (async () => {
      const t = await loadTask();
      if (t.status === "open") {
        const c = await api.getCandidates(id);
        setCandidates(c);
        await loadApplications();
        interval = setInterval(loadApplications, 4000);
      } else {
        loadQueue();
        interval = setInterval(async () => {
          const fresh = await loadTask();
          await loadQueue();
          if (fresh.status !== "matching") clearInterval(interval);
        }, 2500);
      }
    })();
    return () => interval && clearInterval(interval);
  }, [id, loadTask, loadQueue, loadApplications]);

  async function acceptApplicant(applicationId) {
    setError("");
    setAcceptingId(applicationId);
    try {
      await api.acceptApplication(id, applicationId);
      await loadTask();
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingId(null);
    }
  }

  function toggleSelect(workerId) {
    setSelected((prev) =>
      prev.includes(workerId) ? prev.filter((w) => w !== workerId) : prev.length < 3 ? [...prev, workerId] : prev
    );
  }

  async function confirmSelection() {
    setError("");
    setBusy(true);
    try {
      await api.selectWorkers(id, selected);
      const t = await loadTask();
      await loadQueue();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!task) {
    return (
      <div>
        <Navbar />
        <p className="mx-auto max-w-3xl px-6 py-16 text-ink/40">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <span className="eyebrow">{task.status.replace("_", " ")}</span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">{task.title}</h1>
        <p className="mt-2 text-sm text-ink/50">{task.description}</p>
        <p className="mt-4 font-mono text-2xl font-semibold text-ink">
          LKR {task.final_price ? task.final_price.toLocaleString() : "—"}
        </p>

        {task.status === "open" && (
          <div className="mt-10">
            <h2 className="font-display text-lg font-semibold text-ink">
              Choose up to 3 workers ({selected.length}/3 selected)
            </h2>
            <p className="mt-1 text-sm text-ink/45">
              Verified students are shown first. Your top pick is pinged first with a 60-second window to accept.
            </p>

            <div className="mt-5 grid gap-3">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleSelect(c.id)}
                  className={`card flex items-center justify-between text-left transition ${
                    selected.includes(c.id) ? "border-signal ring-2 ring-signal/20" : "hover:border-ink/20"
                  }`}
                >
                  <div>
                    <p className="font-display text-sm font-semibold text-ink">{c.full_name}</p>
                    <p className="text-xs text-ink/45">
                      {c.is_verified_student ? "Verified student" : "Standard worker"} · ★ {c.rating}
                      {c.distance_km != null ? ` · ${c.distance_km} km away` : ""}
                    </p>
                  </div>
                  {selected.includes(c.id) && (
                    <span className="font-mono text-xs text-signal">
                      #{selected.indexOf(c.id) + 1}
                    </span>
                  )}
                </button>
              ))}
              {candidates.length === 0 && <p className="text-sm text-ink/40">No matching workers found yet.</p>}
            </div>

            {error && <p className="mt-4 rounded-lg bg-alert-dim px-3 py-2 text-sm text-alert-deep">{error}</p>}

            <button
              onClick={confirmSelection}
              disabled={selected.length === 0 || busy}
              className="btn-primary mt-6 w-full disabled:opacity-40"
            >
              {busy ? "Starting queue…" : "Ping selected workers"}
            </button>
          </div>
        )}

        {task.status === "open" && (
          <div className="mt-10">
            <h2 className="font-display text-lg font-semibold text-ink">
              Applicants {applications.length > 0 && `(${applications.length})`}
            </h2>
            <p className="mt-1 text-sm text-ink/45">
              Workers can also apply directly. Accepting an applicant assigns the task to them
              immediately (skipping the curated queue) and still checks their weekly quota.
            </p>

            {applications.length === 0 ? (
              <p className="mt-4 text-sm text-ink/40">No applications yet.</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {applications.map((a) => (
                  <div key={a.id} className="card flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-ink/40">Worker {a.worker_id.slice(0, 8)}…</p>
                      {a.message && <p className="mt-1 text-sm text-ink/60">"{a.message}"</p>}
                    </div>
                    {a.status === "pending" ? (
                      <button
                        onClick={() => acceptApplicant(a.id)}
                        disabled={acceptingId === a.id}
                        className="btn-primary !px-4 !py-2 text-xs"
                      >
                        {acceptingId === a.id ? "Assigning…" : "Accept"}
                      </button>
                    ) : (
                      <span
                        className={`font-mono text-xs uppercase ${
                          a.status === "accepted" ? "text-signal" : "text-ink/30"
                        }`}
                      >
                        {a.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {task.status === "matching" && queue && (
          <div className="mt-10 card">
            <span className="eyebrow">Matching in progress</span>
            <div className="mt-4 space-y-3">
              {queue.pings
                .sort((a, b) => a.position - b.position)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-ink/8 px-4 py-3">
                    <span className="font-mono text-xs text-ink/40">Choice #{p.position + 1}</span>
                    <span
                      className={`font-mono text-xs uppercase ${
                        p.status === "pending"
                          ? "text-alert"
                          : p.status === "accepted"
                          ? "text-signal"
                          : "text-ink/30"
                      }`}
                    >
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {(task.status === "assigned" || task.status === "in_progress" || task.status === "completed") && (
          <div className="mt-10 card">
            <p className="font-display text-sm font-semibold text-ink">
              {task.status === "completed" ? "Task completed." : "Worker assigned and on the job."}
            </p>
            <p className="mt-1 text-xs text-ink/40">Assigned worker ID: {task.assigned_worker_id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
