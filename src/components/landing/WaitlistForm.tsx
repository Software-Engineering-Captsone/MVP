"use client";

import { useState, type FormEvent } from "react";

export default function WaitlistForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const role = String(fd.get("role") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    try {
      const res = await fetch("/api/contact-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company: role || "Waitlist",
          message: [`Waitlist signup${role ? ` (${role})` : ""}.`, message].filter(Boolean).join("\n\n"),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong.");
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="sales-form-success" role="status">
        <h2 className="sales-form-success__title">You&apos;re on the waitlist</h2>
        <p className="sales-form-success__text">
          Thanks for your interest. We&apos;ll share updates as the prototype moves toward a fuller product.
        </p>
        <button
          type="button"
          className="btn-pill btn-outline sales-form-reset"
          onClick={() => setStatus("idle")}
        >
          Add another person
        </button>
      </div>
    );
  }

  return (
    <form className="sales-form" onSubmit={onSubmit} noValidate>
      <div className="sales-form-row">
        <label className="sales-form-label" htmlFor="waitlist-name">
          Name <span className="sales-form-required">*</span>
        </label>
        <input
          id="waitlist-name"
          name="name"
          type="text"
          className="sales-form-input"
          autoComplete="name"
          required
          maxLength={200}
          disabled={status === "loading"}
        />
      </div>
      <div className="sales-form-row">
        <label className="sales-form-label" htmlFor="waitlist-email">
          Email <span className="sales-form-required">*</span>
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          className="sales-form-input"
          autoComplete="email"
          required
          maxLength={320}
          disabled={status === "loading"}
        />
      </div>
      <div className="sales-form-row">
        <label className="sales-form-label" htmlFor="waitlist-role">
          I&apos;m interested as
        </label>
        <select
          id="waitlist-role"
          name="role"
          className="sales-form-input"
          defaultValue=""
          disabled={status === "loading"}
        >
          <option value="">Select one</option>
          <option value="Athlete">Athlete</option>
          <option value="Brand">Brand</option>
          <option value="School or agency">School or agency</option>
          <option value="Investor or advisor">Investor or advisor</option>
        </select>
      </div>
      <div className="sales-form-row">
        <label className="sales-form-label" htmlFor="waitlist-message">
          What would you want NILINK to solve?
        </label>
        <textarea
          id="waitlist-message"
          name="message"
          className="sales-form-textarea"
          rows={4}
          maxLength={5000}
          placeholder="Optional context about your NIL workflow."
          disabled={status === "loading"}
        />
      </div>
      {status === "error" ? (
        <p className="sales-form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="sales-form-actions">
        <button
          type="submit"
          className="btn-pill btn-nilink-primary sales-form-submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Joining..." : "Join waitlist"}
        </button>
      </div>
    </form>
  );
}
