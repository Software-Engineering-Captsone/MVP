"use client";

import { useState, type FormEvent } from "react";

export default function TalkToSalesForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const company = String(fd.get("company") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    try {
      const res = await fetch("/api/contact-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, message }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
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
        <h2 className="sales-form-success__title">Thanks — we&apos;ll be in touch</h2>
        <p className="sales-form-success__text">
          Your message is in. A member of our team will reach out shortly.
        </p>
        <button
          type="button"
          className="btn-pill btn-outline sales-form-reset"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="sales-form" onSubmit={onSubmit} noValidate>
      <div className="sales-form-row">
        <label className="sales-form-label" htmlFor="sales-name">
          Name <span className="sales-form-required">*</span>
        </label>
        <input
          id="sales-name"
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
        <label className="sales-form-label" htmlFor="sales-email">
          Work email <span className="sales-form-required">*</span>
        </label>
        <input
          id="sales-email"
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
        <label className="sales-form-label" htmlFor="sales-company">
          Company or school
        </label>
        <input
          id="sales-company"
          name="company"
          type="text"
          className="sales-form-input"
          autoComplete="organization"
          maxLength={200}
          disabled={status === "loading"}
        />
      </div>
      <div className="sales-form-row">
        <label className="sales-form-label" htmlFor="sales-message">
          How can we help?
        </label>
        <textarea
          id="sales-message"
          name="message"
          className="sales-form-textarea"
          rows={5}
          maxLength={5000}
          placeholder="Team size, goals, timeline…"
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
          {status === "loading" ? "Sending…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
