export class CSATForm {
  element: HTMLFormElement;
  private score = 0;

  constructor(onSubmit: (score: number, comment: string) => void) {
    this.element = document.createElement("form");
    this.element.className = "cf-form";
    this.element.innerHTML = `
      <div class="cf-form-title">How was this chat?</div>
      <div class="cf-stars">${[1, 2, 3, 4, 5].map((value) => `<button class="cf-star" type="button" data-score="${value}">☆</button>`).join("")}</div>
      <label>Comment<textarea name="comment" rows="3" placeholder="Optional feedback"></textarea></label>
      <button class="cf-btn cf-submit" type="submit">Submit rating</button>
    `;
    this.element.querySelectorAll<HTMLButtonElement>(".cf-star").forEach((button) => {
      button.addEventListener("click", () => {
        this.score = Number(button.dataset.score);
        this.paint();
      });
    });
    this.element.addEventListener("submit", (event) => {
      event.preventDefault();
      const comment = String(new FormData(this.element).get("comment") ?? "");
      onSubmit(this.score || 5, comment);
    });
  }

  private paint(): void {
    this.element.querySelectorAll<HTMLButtonElement>(".cf-star").forEach((button) => {
      button.textContent = Number(button.dataset.score) <= this.score ? "★" : "☆";
    });
  }
}
