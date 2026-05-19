export interface GeoInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  localTime: string;
  isp: string;
  os: string;
  browser: string;
  device: string;
  source: "browser" | "ip";
  accuracyMeters: number | null;
}

function parseUserAgent(ua: string): { os: string; browser: string; device: string } {
  let os = "Unknown OS";
  if (/Windows NT 11\.0/.test(ua)) os = "Windows 11";
  else if (/Windows NT 10\.0/.test(ua)) os = "Windows 10";
  else if (/Windows NT 6\.3/.test(ua)) os = "Windows 8.1";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/.test(ua)) {
    const m = /Mac OS X ([\d_]+)/.exec(ua);
    os = m ? `macOS ${m[1].replace(/_/g, ".")}` : "macOS";
  } else if (/Android/.test(ua)) {
    const m = /Android ([\d.]+)/.exec(ua);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/iPhone|iPad/.test(ua)) {
    const m = /OS ([\d_]+)/.exec(ua);
    os = m ? `iOS ${m[1].replace(/_/g, ".")}` : "iOS";
  } else if (/Linux x86_64/.test(ua)) os = "Linux (x86_64)";
  else if (/Linux aarch64/.test(ua)) os = "Linux (aarch64)";
  else if (/Linux/.test(ua)) os = "Linux";

  let browser = "Unknown";
  let version = "";
  const edgeMeta = /Edg(?:e)?\/(\S+)/.exec(ua);
  const operaMeta = /OPR\/(\S+)/.exec(ua);
  const chromeMeta = /Chrome\/(\S+)/.exec(ua);
  const firefoxMeta = /Firefox\/(\S+)/.exec(ua);
  const safariMeta = /Version\/([\d.]+).*Safari/.exec(ua);
  if (edgeMeta) { browser = "Edge"; version = edgeMeta[1]; }
  else if (operaMeta) { browser = "Opera"; version = operaMeta[1]; }
  else if (chromeMeta) { browser = "Chrome"; version = chromeMeta[1]; }
  else if (firefoxMeta) { browser = "Firefox"; version = firefoxMeta[1]; }
  else if (safariMeta) { browser = "Safari"; version = safariMeta[1]; }

  let device = "Desktop";
  if (/Mobi|Android.*Mobile|iPhone/.test(ua)) device = "Mobile";
  else if (/Tablet|iPad|Android(?!.*Mobile)/.test(ua)) device = "Tablet";

  return {
    os,
    browser: version ? `${browser} (${version})` : browser,
    device,
  };
}

interface GeoLookupOptions {
  requestPreciseLocation?: boolean;
}

interface IpGeoPayload {
  ip?: string;
  city?: string;
  region?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  org?: string;
}

interface BrowserPosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

async function getIpGeo(): Promise<IpGeoPayload | null> {
  try {
    const geoRes = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(6000),
    });
    if (!geoRes.ok) return null;
    return (await geoRes.json()) as IpGeoPayload;
  } catch {
    return null;
  }
}

async function getBrowserPosition(allowPrompt: boolean): Promise<BrowserPosition | null> {
  if (!navigator.geolocation) return null;

  if (!allowPrompt && navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (permission.state !== "granted") return null;
    } catch {
      return null;
    }
  } else if (!allowPrompt) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 300_000, timeout: 5000 },
    );
  });
}

export async function getVisitorInfo(options: GeoLookupOptions = {}): Promise<GeoInfo | null> {
  try {
    const [geo, browserPosition] = await Promise.all([
      getIpGeo(),
      getBrowserPosition(Boolean(options.requestPreciseLocation)),
    ]);

    const hasIpCoordinates = typeof geo?.latitude === "number" && typeof geo.longitude === "number";
    const hasBrowserCoordinates = typeof browserPosition?.latitude === "number" && typeof browserPosition.longitude === "number";
    if (!hasIpCoordinates && !hasBrowserCoordinates) return null;

    const localTime = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: geo?.timezone ?? "UTC",
      hour12: true,
    }).format(new Date());

    const { os, browser, device } = parseUserAgent(navigator.userAgent);
    const source = browserPosition ? "browser" : "ip";

    return {
      ip: geo?.ip ?? "",
      city: geo?.city ?? "",
      region: geo?.region ?? "",
      country: geo?.country_name ?? "",
      latitude: browserPosition?.latitude ?? geo!.latitude!,
      longitude: browserPosition?.longitude ?? geo!.longitude!,
      timezone: geo?.timezone ?? "UTC",
      localTime,
      isp: geo?.org ?? "",
      os,
      browser,
      device,
      source,
      accuracyMeters: browserPosition?.accuracyMeters ?? 25_000,
    };
  } catch {
    return null;
  }
}
