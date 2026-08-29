import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../api/client";

const DEFAULT_FORM = {
  title: "",
  description: "",
  category: "tutoring",
  skill_complexity: 2,
  physical_intensity: 1,
  hours_until_start: 24,
  estimated_duration_hours: 2,
  is_peak_demand: false,
  location_label: "",
  latitude: 7.2083,
  longitude: 79.8358,
};

export default function PostTask() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState({});
  const [form, setForm] = useState(DEFAULT_FORM);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getCategories().then((r) => setCategories(r.rates)).catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setQuoting(true);
      try {
        const q = await api.getQuote({
          category: form.category,
          skill_complexity: Number(form.skill_complexity),
          physical_intensity: Number(form.physical_intensity),
          hours_until_start: Number(form.hours_until_start),
          estimated_duration_hours: Number(form.estimated_duration_hours),
          is_peak_demand: form.is_peak_demand,
        });
        setQuote(q);
      } catch (e) {
        setQuote(null);
      } finally {
        setQuoting(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [form.category, form.skill_complexity, form.physical_intensity, form.hours_until_start, form.estimated_duration_hours, form.is_peak_demand]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const task = await api.createTask({
        ...form,
        skill_complexity: Number(form.skill_complexity),
        physical_intensity: Number(form.physical_intensity),
        hours_until_start: Number(form.hours_until_start),
        estimated_duration_hours: Number(form.estimated_duration_hours),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      navigate(`/client/tasks/${task.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Navbar />
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <span className="eyebrow">Post a task</span>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
            Describe the job.
          </h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="label">Title</label>
              <input required className="input" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Help move furniture to new dorm" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea required rows={4} className="input" value={form.description} onChange={(e) => update("description", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={(e) => update("category", e.target.value)}>
                  {Object.keys(categories).length
                    ? Object.keys(categories).map((c) => (
                        <option key={c} value={c}>
                          {c.replace("_", " ")}
                        </option>
                      ))
                    : <option value="tutoring">tutoring</option>}
                </select>
              </div>
              <div>
                <label className="label">Location label</label>
                <input className="input" value={form.location_label} onChange={(e) => update("location_label", e.target.value)} placeholder="Negombo campus gate" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Skill complexity (1–5)</label>
                <input type="range" min={1} max={5} className="w-full accent-signal" value={form.skill_complexity} onChange={(e) => update("skill_complexity", e.target.value)} />
                <p className="text-xs text-ink/40">{form.skill_complexity}</p>
              </div>
              <div>
                <label className="label">Physical intensity (1–5)</label>
                <input type="range" min={1} max={5} className="w-full accent-alert" value={form.physical_intensity} onChange={(e) => update("physical_intensity", e.target.value)} />
                <p className="text-xs text-ink/40">{form.physical_intensity}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Hours until it must start</label>
                <input type="number" min={0} step={0.5} className="input" value={form.hours_until_start} onChange={(e) => update("hours_until_start", e.target.value)} />
              </div>
              <div>
                <label className="label">Estimated duration (hours)</label>
                <input type="number" min={0.5} step={0.5} className="input" value={form.estimated_duration_hours} onChange={(e) => update("estimated_duration_hours", e.target.value)} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink/60">
              <input type="checkbox" checked={form.is_peak_demand} onChange={(e) => update("is_peak_demand", e.target.checked)} />
              This falls during a peak-demand window (exam week, weekend evening)
            </label>

            {error && <p className="rounded-lg bg-alert-dim px-3 py-2 text-sm text-alert-deep">{error}</p>}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Posting…" : "Post task & continue"}
            </button>
          </form>
        </div>

        <div>
          <div className="card sticky top-24">
            <span className="eyebrow">Live price preview</span>
            {quoting && !quote && <p className="mt-4 text-sm text-ink/40">Calculating…</p>}
            {quote && (
              <>
                <p className="mt-4 font-mono text-4xl font-semibold text-ink">
                  {quote.currency} {quote.final_price.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-ink/45">Hardness Score: {quote.hardness_score}</p>

                <div className="mt-6 space-y-2 border-t border-ink/8 pt-4 text-xs">
                  <Row label="Base rate" value={`${quote.breakdown.base_rate} LKR/hr`} />
                  <Row label="Skill component" value={quote.breakdown.skill_component} />
                  <Row label="Physical component" value={quote.breakdown.physical_component} />
                  <Row label="Urgency component" value={quote.breakdown.urgency_component} />
                  <Row label="Opportunity cost" value={quote.breakdown.opportunity_cost_component} />
                  <Row label="Multiplier" value={`×${quote.breakdown.hardness_multiplier}`} />
                  {quote.breakdown.peak_demand_surcharge > 0 && (
                    <Row label="Peak surcharge" value={`+${quote.breakdown.peak_demand_surcharge}`} />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink/45">{label}</span>
      <span className="font-mono text-ink/70">{value}</span>
    </div>
  );
}
