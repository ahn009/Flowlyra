export function sessionToken(): string | null {
  return localStorage.getItem("cf_session_token");
}

export function setSessionToken(token: string): void {
  localStorage.setItem("cf_session_token", token);
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer = 0;
  return ((...args: Parameters<T>) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  }) as T;
}

export function deviceType(): string {
  if (/Mobi|Android/i.test(navigator.userAgent)) return "mobile";
  if (/Tablet|iPad/i.test(navigator.userAgent)) return "tablet";
  return "desktop";
}

export function trackRouteChanges(onChange: () => void): void {
  const wrap = (name: "pushState" | "replaceState") => {
    const original = history[name];
    history[name] = function patched(this: History, ...args: Parameters<History[typeof name]>) {
      const result = original.apply(this, args);
      onChange();
      return result;
    };
  };
  wrap("pushState");
  wrap("replaceState");
  window.addEventListener("popstate", onChange);
}
