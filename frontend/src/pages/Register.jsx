import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "student", label: "University student", hint: "Priority matching, capped at 20h/week" },
  { value: "standard_worker", label: "Standard worker", hint: "No hour cap, overflow capacity" },
  { value: "client", label: "Client", hint: "Post tasks and hire nearby workers" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = params.get("role") === "client" ? "client" : params.get("role") === "student" ? "student" : "student";

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: initialRole,
    university_name: "",
    student_id_number: "",
    skills: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = { ...form };
      if (payload.role !== "student") {
        delete payload.university_name;
        delete payload.student_id_number;
      }
      if (payload.role === "client") delete payload.skills;

      const user = await register(payload);
      navigate(user.role === "client" ? "/client" : "/student");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Navbar />
      <div className="mx-auto flex max-w-md flex-col px-6 py-16">
        <span className="eyebrow">Join UniGig</span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">Create your account</h1>

        <div className="mt-6 grid gap-2">
          {ROLES.map((r) => (
            <button
              type="button"
              key={r.value}
              onClick={() => update("role", r.value)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                form.role === r.value ? "border-signal bg-signal-dim" : "border-ink/12 bg-white hover:border-ink/25"
              }`}
            >
              <p className="font-display text-sm font-semibold text-ink">{r.label}</p>
              <p className="text-xs text-ink/45">{r.hint}</p>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input required className="input" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
            {form.role === "student" && (
              <p className="mt-1 text-xs text-ink/40">A university email (e.g. .ac.lk / .edu) auto-verifies your student status.</p>
            )}
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </div>

          {form.role === "student" && (
            <>
              <div>
                <label className="label">University</label>
                <input className="input" value={form.university_name} onChange={(e) => update("university_name", e.target.value)} />
              </div>
              <div>
                <label className="label">Student ID (optional)</label>
                <input className="input" value={form.student_id_number} onChange={(e) => update("student_id_number", e.target.value)} />
              </div>
            </>
          )}

          {form.role !== "client" && (
            <div>
              <label className="label">Skills (comma separated)</label>
              <input
                className="input"
                placeholder="tutoring, delivery, graphic_design"
                value={form.skills}
                onChange={(e) => update("skills", e.target.value)}
              />
            </div>
          )}

          {error && <p className="rounded-lg bg-alert-dim px-3 py-2 text-sm text-alert-deep">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/50">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-signal">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
