import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const STATUS_STYLES = {
  open: "bg-ink/8 text-ink/60",
  matching: "bg-alert-dim text-alert-deep",
  assigned: "bg-signal-dim text-signal-deep",
  in_progress: "bg-signal-dim text-signal-deep",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-ink/8 text-ink/40",
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listTasks("?mine=true");
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Client dashboard</span>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
              Hi {user?.full_name?.split(" ")[0]}, here's what's posted.
            </h1>
          </div>
          <Link to="/client/post" className="btn-primary">
            + Post a new task
          </Link>
        </div>

        {loading ? (
          <p className="text-ink/40">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <div className="card text-center">
            <p className="text-ink/50">You haven't posted any tasks yet.</p>
            <Link to="/client/post" className="btn-primary mt-4 inline-flex">
              Post your first task
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((t) => (
              <Link
                to={`/client/tasks/${t.id}`}
                key={t.id}
                className="card flex flex-col justify-between gap-4 transition hover:border-ink/20 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-ink">{t.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${STATUS_STYLES[t.status]}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink/50">
                    {t.category.replace("_", " ")} · {t.estimated_duration_hours}h · {t.location_label || "No location set"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-semibold text-ink">
                    {t.final_price ? `LKR ${t.final_price.toLocaleString()}` : "—"}
                  </p>
                  <p className="text-xs text-ink/40">Hardness {t.hardness_score ?? "—"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
