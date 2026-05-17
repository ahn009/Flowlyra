/** Minimal emoji picker (no external deps). */

const EMOJI_GROUPS: { label: string; items: string[] }[] = [
  { label: "Smileys", items: ["😀","😄","😆","😉","😊","😍","🤔","😎","😢","😡","😴","🤝","🙏","👋","👍","👎","💪","👏","🙌","🤞"] },
  { label: "Hearts", items: ["❤️","💔","💕","💖","💗","💙","💚","💛","💜","🤍","🖤","🤎","💯","🔥","⭐","✨","🎉","🎊","🎈","🎁"] },
  { label: "Objects", items: ["📞","📧","📱","💻","⌨️","🖱️","🖥️","📂","📁","🗂️","📅","📆","🗓️","📌","📍","📎","🔗","🔒","🔓","🔑"] },
  { label: "Symbols", items: ["✅","❌","⚠️","ℹ️","❓","❗","➡️","⬅️","⬆️","⬇️","🔄","🔁","💡","💭","⏰","⏱️","💲","📈","📉","📊"] },
];

export function createEmojiPicker(onPick: (emoji: string) => void): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "cf-emoji-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Emoji picker");
  for (const group of EMOJI_GROUPS) {
    const heading = document.createElement("div");
    heading.className = "cf-emoji-group-label";
    heading.textContent = group.label;
    panel.append(heading);
    const grid = document.createElement("div");
    grid.className = "cf-emoji-grid";
    for (const emoji of group.items) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cf-emoji";
      button.textContent = emoji;
      button.setAttribute("aria-label", emoji);
      button.addEventListener("click", () => onPick(emoji));
      grid.append(button);
    }
    panel.append(grid);
  }
  return panel;
}
