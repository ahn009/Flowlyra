import type { PreChatData, PreChatFieldDef, PreChatFormConfig } from "./types";
import type { I18n } from "./i18n";

const RESERVED = new Set(["name", "email", "phone", "subject", "message"]);

function normalizeField(field: string | PreChatFieldDef): PreChatFieldDef {
  if (typeof field === "string") return { name: field };
  return field;
}

function fieldType(field: PreChatFieldDef): NonNullable<PreChatFieldDef["type"]> {
  if (field.type) return field.type;
  if (field.name === "email") return "email";
  if (field.name === "phone") return "phone";
  if (field.name === "message") return "textarea";
  if (field.options?.length) return "select";
  return "text";
}

export class PreChatForm {
  element: HTMLFormElement;

  constructor(onSubmit: (data: PreChatData) => void, config: PreChatFormConfig | undefined, i18n: I18n) {
    const rawFields = (config?.fields?.length ? config.fields : ["name", "email", "subject", "message"]).map(normalizeField);
    this.element = document.createElement("form");
    this.element.className = "cf-form";
    this.element.setAttribute("novalidate", "true");
    this.element.setAttribute("aria-labelledby", "cf-prechat-title");

    const title = document.createElement("div");
    title.className = "cf-form-title";
    title.id = "cf-prechat-title";
    title.textContent = i18n.t("form.start");
    this.element.append(title);

    const grid = document.createElement("div");
    grid.className = "cf-field-grid";
    const stacked: HTMLElement[] = [];

    for (const field of rawFields) {
      const node = this.buildField(field, i18n);
      if (!node) continue;
      const type = fieldType(field);
      if (type === "textarea" || type === "select" || type === "checkbox") {
        stacked.push(node);
      } else {
        grid.append(node);
      }
    }

    this.element.append(grid);
    for (const node of stacked) this.element.append(node);

    const submit = document.createElement("button");
    submit.className = "cf-btn cf-submit";
    submit.type = "submit";
    submit.textContent = i18n.t("form.send");
    this.element.append(submit);

    this.bindConditional(rawFields);
    this.element.addEventListener("submit", (event) => {
      event.preventDefault();
      const errors = this.validate(rawFields, i18n);
      if (errors > 0) return;
      const data = new FormData(this.element);
      onSubmit({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? ""),
        subject: String(data.get("subject") ?? ""),
        message: String(data.get("message") ?? ""),
        custom_fields: this.collectCustomFields(data, rawFields),
      });
    });
  }

  private buildField(field: PreChatFieldDef, i18n: I18n): HTMLElement | null {
    const wrapper = document.createElement("label");
    wrapper.dataset.field = field.name;
    const labelText = field.label || i18n.t(`form.${field.name}` as never, capitalize(field.name));
    const labelSpan = document.createElement("span");
    labelSpan.textContent = field.required ? `${labelText} *` : labelText;
    wrapper.append(labelSpan);

    const type = fieldType(field);
    let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    switch (type) {
      case "textarea": {
        const ta = document.createElement("textarea");
        ta.rows = 4;
        input = ta;
        break;
      }
      case "select": {
        const select = document.createElement("select");
        if (!field.required) {
          const empty = document.createElement("option");
          empty.value = "";
          empty.textContent = "—";
          select.append(empty);
        }
        for (const option of field.options ?? []) {
          const opt = document.createElement("option");
          opt.value = option.value;
          opt.textContent = option.label;
          select.append(opt);
        }
        input = select;
        break;
      }
      case "checkbox": {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        input = checkbox;
        break;
      }
      case "email": {
        const i = document.createElement("input");
        i.type = "email";
        i.autocomplete = "email";
        input = i;
        break;
      }
      case "phone": {
        const i = document.createElement("input");
        i.type = "tel";
        i.autocomplete = "tel";
        input = i;
        break;
      }
      default: {
        const i = document.createElement("input");
        i.type = "text";
        if (field.name === "name") i.autocomplete = "name";
        input = i;
      }
    }
    input.name = field.name;
    input.id = `cf-field-${field.name}`;
    if (field.placeholder) (input as HTMLInputElement).placeholder = field.placeholder;
    if (field.required) input.required = true;
    if (field.pattern && "pattern" in input) (input as HTMLInputElement).pattern = field.pattern;
    wrapper.htmlFor = input.id;
    wrapper.append(input);

    const error = document.createElement("span");
    error.className = "cf-field-error";
    error.dataset.error = field.name;
    wrapper.append(error);

    return wrapper;
  }

  private bindConditional(fields: PreChatFieldDef[]): void {
    const updates: Array<() => void> = [];
    for (const field of fields) {
      if (!field.show_if) continue;
      const target = field.show_if.field;
      const equals = field.show_if.equals;
      const allowed = field.show_if.in;
      const node = this.element.querySelector<HTMLElement>(`label[data-field="${field.name}"]`);
      if (!node) continue;
      const apply = () => {
        const targetEl = this.element.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${target}"]`);
        const value = targetEl ? (targetEl as HTMLInputElement).value : "";
        const visible = equals !== undefined ? value === equals : allowed ? allowed.includes(value) : true;
        node.hidden = !visible;
        const inputEl = node.querySelector<HTMLInputElement>("input, select, textarea");
        if (inputEl) inputEl.disabled = !visible;
      };
      updates.push(apply);
      const targetEl = this.element.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${target}"]`);
      targetEl?.addEventListener("change", apply);
      targetEl?.addEventListener("input", apply);
    }
    for (const fn of updates) fn();
  }

  private validate(fields: PreChatFieldDef[], i18n: I18n): number {
    let errors = 0;
    for (const field of fields) {
      const input = this.element.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${field.name}"]`);
      const errorEl = this.element.querySelector<HTMLSpanElement>(`[data-error="${field.name}"]`);
      if (!input || !errorEl) continue;
      errorEl.textContent = "";
      input.removeAttribute("aria-invalid");
      const value = (input as HTMLInputElement).value;
      const visible = !input.disabled;
      if (!visible) continue;
      if (field.required && !value) {
        errorEl.textContent = i18n.t("validation.required");
        input.setAttribute("aria-invalid", "true");
        errors += 1;
        continue;
      }
      if (fieldType(field) === "email" && value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        errorEl.textContent = i18n.t("validation.email");
        input.setAttribute("aria-invalid", "true");
        errors += 1;
      }
    }
    return errors;
  }

  private collectCustomFields(data: FormData, fields: PreChatFieldDef[]): Record<string, string> {
    const values: Record<string, string> = {};
    for (const field of fields) {
      if (RESERVED.has(field.name)) continue;
      const raw = data.get(field.name);
      if (raw !== null) values[field.name] = String(raw);
    }
    return values;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
