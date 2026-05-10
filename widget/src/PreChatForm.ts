import type { PreChatData, WidgetInitResponse } from "./types";

export class PreChatForm {
  element: HTMLFormElement;

  constructor(onSubmit: (data: PreChatData) => void, config?: WidgetInitResponse["widget_config"]["pre_chat_form"]) {
    const fields = config?.fields?.length ? config.fields : ["name", "email", "subject", "message"];
    const has = (name: string) => fields.includes(name);
    this.element = document.createElement("form");
    this.element.className = "cf-form";
    this.element.innerHTML = `
      <div class="cf-form-title">Start a conversation</div>
      <div class="cf-field-grid">
        ${has("name") ? `<label>Name<input name="name" autocomplete="name" placeholder="Jane Cooper" required /></label>` : ""}
        ${has("email") ? `<label>Email<input name="email" type="email" autocomplete="email" placeholder="jane@company.com" required /></label>` : ""}
        ${has("phone") ? `<label>Phone<input name="phone" type="tel" autocomplete="tel" placeholder="+1 555 123 4567" /></label>` : ""}
      </div>
      ${has("subject") ? `<label>Topic<input name="subject" placeholder="What is this about?" /></label>` : ""}
      ${has("message") ? `<label>Message<textarea name="message" rows="4" placeholder="Tell us what you need help with..." required></textarea></label>` : ""}
      <button class="cf-btn cf-submit" type="submit">Start chat</button>
    `;
    this.element.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(this.element);
      onSubmit({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? ""),
        subject: String(data.get("subject") ?? ""),
        message: String(data.get("message") ?? ""),
        custom_fields: collectCustomFields(data)
      });
    });
  }
}

function collectCustomFields(data: FormData): Record<string, string> {
  const reserved = new Set(["name", "email", "phone", "subject", "message"]);
  const values: Record<string, string> = {};
  data.forEach((value, key) => {
    if (!reserved.has(key)) values[key] = String(value);
  });
  return values;
}
