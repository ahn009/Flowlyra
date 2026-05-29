export interface VisitorGeoInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  localTime: string;
  os: string;
  browser: string;
  device: string;
  isp: string;
}

function parseUserAgent(): { os: string; browser: string; device: string } {
  const ua = navigator.userAgent;

  let os = "Unknown";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Unknown";
  const edgeMatch = ua.match(/Edg\/([\d.]+)/);
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
  const firefoxMatch = ua.match(/Firefox\/([\d.]+)/);
  const safariMatch = ua.match(/Version\/([\d.]+).*Safari/);
  if (edgeMatch) browser = `Edge ${edgeMatch[1]}`;
  else if (chromeMatch) browser = `Chrome ${chromeMatch[1]}`;
  else if (firefoxMatch) browser = `Firefox ${firefoxMatch[1]}`;
  else if (safariMatch) browser = `Safari ${safariMatch[1]}`;

  let device = "Desktop";
  if (/Mobile/i.test(ua) && !/iPad/i.test(ua)) device = "Mobile";
  else if (/Tablet|iPad/i.test(ua)) device = "Tablet";

  return { os, browser, device };
}

export async function getVisitorInfo(): Promise<VisitorGeoInfo> {
  const { os, browser, device } = parseUserAgent();
  const fallbackTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date());

  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const { ip } = (await ipRes.json()) as { ip: string };

    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
    const geo = (await geoRes.json()) as {
      city?: string;
      region?: string;
      country_name?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
      org?: string;
      error?: boolean;
    };

    if (geo.error) throw new Error("ipapi error");

    const localTime = geo.timezone
      ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: true, timeZone: geo.timezone }).format(new Date())
      : fallbackTime;

    return {
      ip,
      city: geo.city ?? "",
      region: geo.region ?? "",
      country: geo.country_name ?? "",
      latitude: geo.latitude ?? 0,
      longitude: geo.longitude ?? 0,
      timezone: geo.timezone ?? "",
      localTime,
      os,
      browser,
      device,
      isp: geo.org ?? "",
    };
  } catch {
    return { ip: "unavailable", city: "", region: "", country: "", latitude: 0, longitude: 0, timezone: "", localTime: fallbackTime, os, browser, device, isp: "" };
  }
}
