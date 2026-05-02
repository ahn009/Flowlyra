export class OfflineForm {
  element: HTMLFormElement;

  constructor(onSubmit: (data: { email: string; message: string }) => void) {
    this.element = document.createElement("form");
    this.element.className = "cf-form";
    this.element.innerHTML = `
      <div class="cf-form-title">Leave a message</div>
      <p class="cf-muted">The team is offline. Send your email and we will reply as soon as someone is available.</p>
      <label>Email<input name="email" type="email" placeholder="you@company.com" required /></label>
      <label>Message<textarea name="message" rows="5" placeholder="How can we help?" required></textarea></label>
      <button class="cf-btn cf-submit" type="submit">Send message</button>
    `;
    this.element.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(this.element);
      onSubmit({ email: String(data.get("email") ?? ""), message: String(data.get("message") ?? "") });
      this.element.innerHTML = `<div class="cf-success"><strong>Thanks.</strong><span>We will get back to you.</span></div>`;
    });
  }
}
