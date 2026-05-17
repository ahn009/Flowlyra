import type { I18n } from "./i18n";

export class OfflineForm {
  element: HTMLFormElement;

  constructor(onSubmit: (data: { email: string; name?: string; message: string }) => Promise<void> | void, i18n: I18n, nextOpenAt?: string | null) {
    const nextOpenText = nextOpenAt ? formatNextOpen(nextOpenAt, i18n) : "";
    this.element = document.createElement("form");
    this.element.className = "cf-form";
    this.element.setAttribute("aria-labelledby", "cf-offline-title");
    this.element.innerHTML = `
      <div class="cf-form-title" id="cf-offline-title">${escapeHtml(i18n.t("offline.title"))}</div>
      <p class="cf-muted">${escapeHtml(i18n.t("offline.message"))}</p>
      ${nextOpenText ? `<p class="cf-muted">${escapeHtml(nextOpenText)}</p>` : ""}
      <label>${escapeHtml(i18n.t("form.name"))}<input name="name" autocomplete="name" placeholder="${escapeHtml(i18n.t("form.name"))}" /></label>
      <label>${escapeHtml(i18n.t("offline.email"))}<input name="email" type="email" required autocomplete="email" placeholder="${escapeHtml(i18n.t("offline.email"))}" /></label>
      <label>${escapeHtml(i18n.t("form.message"))}<textarea name="message" rows="4" required placeholder="${escapeHtml(i18n.t("form.message"))}"></textarea></label>
      <button class="cf-btn cf-submit" type="submit">${escapeHtml(i18n.t("offline.submit"))}</button>
    `;
    this.element.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(this.element);
      try {
        const result = onSubmit({
          email: String(data.get("email") ?? "").trim(),
          name: String(data.get("name") ?? "").trim() || undefined,
          message: String(data.get("message") ?? "").trim(),
        });
        if (result instanceof Promise) await result;
      } catch {
        return;
      }
      this.element.innerHTML = `<div class="cf-success"><div class="cf-form-title">${escapeHtml(i18n.t("offline.success"))}</div></div>`;
    });
  }
}

function formatNextOpen(value: string, i18n: I18n): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return i18n.t("offline.next_open", "Next opening time is scheduled.");
  return `${i18n.t("offline.next_open", "Next opening")}: ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date)}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
