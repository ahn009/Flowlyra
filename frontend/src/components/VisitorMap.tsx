import { ExternalLink, MapPin } from "lucide-react";

interface VisitorMapProps {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  height?: number;
  accuracyMeters?: number | null;
  source?: string | null;
}

const TILE_SIZE = 256;
const ZOOM = 12;
const TILE_COUNT = 2 ** ZOOM;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lonToTileX(longitude: number): number {
  return ((longitude + 180) / 360) * TILE_COUNT;
}

function latToTileY(latitude: number): number {
  const latRad = (clamp(latitude, -85.05112878, 85.05112878) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * TILE_COUNT;
}

function wrapTileX(x: number): number {
  return ((x % TILE_COUNT) + TILE_COUNT) % TILE_COUNT;
}

function formatAccuracy(value?: number | null): string | null {
  if (!value || !Number.isFinite(value)) return null;
  if (value >= 1000) return `~${Math.round(value / 1000)} km`;
  return `~${Math.round(value)} m`;
}

export function VisitorMap({
  latitude,
  longitude,
  city,
  country,
  height = 180,
  accuracyMeters,
  source,
}: VisitorMapProps): JSX.Element {
  const valid = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const label = [city, country].filter(Boolean).join(", ") || "Visitor location";
  const accuracyLabel = formatAccuracy(accuracyMeters);
  const sourceLabel = source === "browser" ? "Precise browser location" : "Approximate IP location";
  const mapHref = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${ZOOM}/${latitude}/${longitude}`;

  if (!valid) {
    return (
      <div className="grid w-full place-items-center bg-navy-50 text-center dark:bg-navy-900" style={{ height }}>
        <div>
          <MapPin size={18} className="mx-auto mb-1 text-danger-500" />
          <div className="text-xs font-medium text-navy-500 dark:text-navy-300">{label}</div>
          <div className="mt-0.5 text-[10px] text-navy-400">No valid coordinates available</div>
        </div>
      </div>
    );
  }

  const fractionalX = lonToTileX(longitude);
  const fractionalY = latToTileY(latitude);
  const centerTileX = Math.floor(fractionalX);
  const centerTileY = Math.floor(fractionalY);
  const centerPixelX = (fractionalX - centerTileX + 1) * TILE_SIZE;
  const centerPixelY = (fractionalY - centerTileY + 1) * TILE_SIZE;
  const tiles = [-1, 0, 1].flatMap((dy) =>
    [-1, 0, 1].map((dx) => {
      const x = wrapTileX(centerTileX + dx);
      const y = clamp(centerTileY + dy, 0, TILE_COUNT - 1);
      return { key: `${x}-${y}`, x, y, dx, dy };
    }),
  );

  return (
    <div
      className="relative w-full overflow-hidden bg-navy-100 dark:bg-navy-900"
      style={{ height }}
      title={label}
      role="img"
      aria-label={`${label} map`}
    >
      <div
        className="absolute grid h-[768px] w-[768px] grid-cols-3 grid-rows-3"
        style={{
          left: `calc(50% - ${centerPixelX}px)`,
          top: `calc(50% - ${centerPixelY}px)`,
        }}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={`https://tile.openstreetmap.org/${ZOOM}/${tile.x}/${tile.y}.png`}
            alt=""
            className="h-64 w-64 select-none"
            draggable={false}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div className="relative grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-white shadow-lift ring-4 ring-white/90 dark:ring-navy-950/90">
          <MapPin size={18} fill="currentColor" />
          <span className="absolute -bottom-1 h-2 w-2 rotate-45 bg-brand-500" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/95 via-white/80 to-transparent px-3 pb-2 pt-8 dark:from-navy-950/95 dark:via-navy-950/80">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-navy-700 dark:text-navy-100">{label}</div>
            <div className="text-[10px] text-navy-400">
              {sourceLabel}{accuracyLabel ? `, ${accuracyLabel}` : ""}
            </div>
          </div>
          <a
            href={mapHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-brand-600 shadow-xs hover:bg-brand-50 dark:bg-navy-900/90 dark:text-brand-300"
          >
            Open <ExternalLink size={11} />
          </a>
        </div>
        <div className="mt-1 text-[9px] text-navy-300">
          © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
}
