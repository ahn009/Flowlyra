import type { I18n } from "./i18n";

export class CSATForm {
  element: HTMLDivElement;

  constructor(onSubmit: (score: number, comment: string) => void, i18n: I18n) {
    this.element = document.createElement("div");
    this.element.className = "cf-success";
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-labelledby", "cf-csat-title");

    const title = document.createElement("div");
    title.id = "cf-csat-title";
    title.className = "cf-form-title";
    title.textContent = i18n.t("csat.title");

    const stars = document.createElement("div");
    stars.className = "cf-stars";
    let chosen = 0;
    for (let value = 1; value <= 5; value += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cf-star";
      button.textContent = "★";
      button.setAttribute("aria-label", `${value}/5`);
      button.addEventListener("click", () => {
        chosen = value;
        stars.querySelectorAll<HTMLButtonElement>(".cf-star").forEach((node, index) => {
          node.classList.toggle("active", index < value);
        });
      });
      stars.append(button);
    }

    const comment = document.createElement("textarea");
    comment.className = "cf-input";
    comment.placeholder = i18n.t("csat.comment");
    comment.rows = 3;

    const submit = document.createElement("button");
    submit.type = "button";
    submit.className = "cf-btn cf-submit";
    submit.textContent = i18n.t("csat.submit");
    submit.addEventListener("click", () => {
      if (chosen < 1) return;
      onSubmit(chosen, comment.value.trim());
      const thanks = document.createElement("div");
      thanks.className = "cf-form-title";
      thanks.textContent = i18n.t("csat.thanks");
      this.element.replaceChildren(thanks);
    });

    this.element.append(title, stars, comment, submit);
  }
}
