import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    ramp_up: {
      executor: "ramping-vus",
      stages: [
        { duration: "2m", target: 200 },
        { duration: "3m", target: 500 },
        { duration: "5m", target: 1000 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800", "p(99)<1500"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const ORG_SLUG = __ENV.ORG_SLUG || "test-org";

export default function () {
  const payload = JSON.stringify({
    org_slug: ORG_SLUG,
    session_token: `k6-${__VU}-${__ITER}`,
    url: "https://example.com/pricing",
    visitor: { name: "Load Test", email: `load-${__VU}-${__ITER}@example.com` },
  });
  const res = http.post(`${BASE_URL}/api/v1/widget/init`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  check(res, {
    "widget init 200": (r) => r.status === 200,
    "widget init has session": (r) => (r.json("session_token") || "").length > 0,
  });
  sleep(0.5);
}
