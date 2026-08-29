import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import PingQueueWidget from "../components/PingQueueWidget";

const STATS = [
  { value: "20h", label: "Weekly cap per student" },
  { value: "60s", label: "Response window per ping" },
  { value: "4", label: "Inputs behind every price" },
];

const CLIENT_STEPS = [
  { title: "Post the task", body: "Describe what needs doing, where, and when. Takes under a minute." },
  { title: "Get a fair price instantly", body: "The Hardness Score engine prices it from skill, effort, urgency and timing — no back-and-forth." },
  { title: "Pick up to 3 workers", body: "Browse a curated, nearby shortlist. Verified students are surfaced first." },
  { title: "Get an answer in 60 seconds", body: "Your first choice is pinged with a live countdown. No response, no problem — it moves to the next." },
];

const STUDENT_STEPS = [
  { title: "Get verified", body: "Confirm your university and you're prioritized ahead of standard workers." },
  { title: "Set your skills", body: "Tutoring, deliveries, design, event help — list what you're willing to do." },
  { title: "Accept in one tap", body: "When a client picks you, you get 60 seconds to accept before it passes on." },
  { title: "Your hours are protected", body: "Every accepted task counts against a hard 20-hour weekly ceiling. The system won't let you over-commit." },
];

export default function Landing() {
  const [tab, setTab] = useState("client");
  const steps = tab === "client" ? CLIENT_STEPS : STUDENT_STEPS;

  return (
    <div>
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
        <div className="grid items-center gap-14 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="eyebrow">Built for NIBM & partner campuses</span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
              Local jobs, done by
              <br />
              verified students —
              <br />
              <span className="text-signal">without wrecking their week.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink/60">
              UniGig matches nearby clients with university students for short-term work, prices
              every task automatically, and hard-caps student hours so a gig never eats a grade.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register?role=client" className="btn-primary">
                I need a task done
              </Link>
              <Link to="/register?role=student" className="btn-secondary">
                I want to earn as a student
              </Link>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-ink/8 pt-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="font-mono text-2xl font-semibold text-ink">{s.value}</dt>
                  <dd className="mt-1 text-xs leading-snug text-ink/45">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex justify-center md:justify-end">
            <PingQueueWidget />
          </div>
        </div>
      </section>

      {/* Problem framing */}
      <section className="border-y border-ink/8 bg-ink py-16 text-paper">
        <div className="mx-auto max-w-6xl px-6">
          <span className="eyebrow text-alert">The gap</span>
          <div className="mt-4 grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="font-display text-lg font-semibold">Hours nobody's watching</h3>
              <p className="mt-2 text-sm leading-relaxed text-paper/60">
                Generic gig apps don't know a client is also mid-semester. Students over-commit and grades slip.
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Prices set by whoever blinks first</h3>
              <p className="mt-2 text-sm leading-relaxed text-paper/60">
                Without leverage, students accept whatever's offered. There's no consistent, defensible rate.
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Hiring takes too long</h3>
              <p className="mt-2 text-sm leading-relaxed text-paper/60">
                Manually messaging five profiles for a same-day job doesn't work when the job is, in fact, same-day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">How it works</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
              Two sides, one queue.
            </h2>
          </div>
          <div className="inline-flex self-start rounded-lg border border-ink/10 bg-white p-1">
            <button
              onClick={() => setTab("client")}
              className={`rounded-md px-4 py-2 font-display text-sm font-medium transition ${
                tab === "client" ? "bg-ink text-paper" : "text-ink/50"
              }`}
            >
              For clients
            </button>
            <button
              onClick={() => setTab("student")}
              className={`rounded-md px-4 py-2 font-display text-sm font-medium transition ${
                tab === "student" ? "bg-ink text-paper" : "text-ink/50"
              }`}
            >
              For students
            </button>
          </div>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="card">
              <span className="font-mono text-xs text-signal">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-base font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Quota engine */}
      <section id="quota" className="border-t border-ink/8 bg-signal-dim/40 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <span className="eyebrow">The 20-hour quota engine</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
              Academics come first. The system enforces it, so nobody has to.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/60">
              Every verified student has a hard 20-hour weekly ceiling. Accept a task and the hours
              are deducted immediately. Once a student is near their limit, tasks that would push
              them over simply route past them — no willpower required, and no client left waiting
              on someone who was never going to be available.
            </p>
            <div className="mt-6 flex gap-8 font-mono text-sm">
              <div>
                <p className="text-2xl font-semibold text-ink">14.5h</p>
                <p className="text-ink/40">used this week</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-alert">5.5h</p>
                <p className="text-ink/40">remaining</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between text-xs font-mono text-ink/40">
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-ink/8">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-signal to-alert" />
            </div>
            <p className="mt-3 text-xs text-ink/40">14.5 / 20 hours committed — resets Monday 00:00</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <span className="eyebrow">AI-driven pricing</span>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink">
          Every price is a Hardness Score, not a guess.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/60">
          Skill complexity, physical intensity, urgency and opportunity cost combine into one
          transparent multiplier on top of a category base rate — the same formula for every task.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Skill complexity", v: "35%", d: "How specialized the work is" },
            { k: "Physical intensity", v: "20%", d: "How demanding the labor is" },
            { k: "Urgency", v: "25%", d: "How soon it needs to start" },
            { k: "Opportunity cost", v: "20%", d: "Quota hours and client risk" },
          ].map((f) => (
            <div key={f.k} className="card">
              <p className="font-mono text-2xl font-semibold text-signal">{f.v}</p>
              <p className="mt-2 font-display text-sm font-semibold text-ink">{f.k}</p>
              <p className="mt-1 text-xs text-ink/45">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink/8 bg-ink py-16 text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Ready to post a task or start earning?
          </h2>
          <div className="flex gap-3">
            <Link to="/register" className="btn-primary !bg-signal hover:!bg-signal-deep">
              Create your account
            </Link>
            <Link to="/login" className="btn-secondary !border-paper/20 !bg-transparent !text-paper hover:!border-paper/50">
              Log in
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-ink/30">
        UniGig — a final-year HNDSE project · NIBM Kurunegala Campus
      </footer>
    </div>
  );
}
