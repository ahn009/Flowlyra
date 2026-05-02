export class PreChatForm {
  element: HTMLFormElement;

  constructor(onSubmit: (data: { name: string; email: string; subject: string; message: string }) => void) {
    this.element = document.createElement("form");
    this.element.className = "cf-form";
    this.element.innerHTML = `
      <div class="cf-form-title">Start a conversation</div>
      <div class="cf-field-grid">
        <label>Name<input name="name" autocomplete="name" placeholder="Jane Cooper" required /></label>
        <label>Email<input name="email" type="email" autocomplete="email" placeholder="jane@company.com" required /></label>
      </div>
      <label>Topic<input name="subject" placeholder="What is this about?" /></label>
      <label>Message<textarea name="message" rows="4" placeholder="Tell us what you need help with..." required></textarea></label>
      <button class="cf-btn cf-submit" type="submit">Start chat</button>
    `;
    this.element.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(this.element);
      onSubmit({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        subject: String(data.get("subject") ?? ""),
        message: String(data.get("message") ?? "")
      });
    });
  }
}
