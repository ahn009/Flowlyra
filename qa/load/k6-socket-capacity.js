import { check, sleep } from "k6";
import ws from "k6/ws";

export const options = {
  scenarios: {
    sockets: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 500),
      duration: __ENV.DURATION || "5m",
    },
  },
};

const WS_URL = __ENV.WS_URL || "ws://localhost:8000/socket.io/?EIO=4&transport=websocket";

export default function () {
  const response = ws.connect(WS_URL, {}, (socket) => {
    socket.on("open", () => {
      socket.send("40"); // Socket.IO open namespace
      socket.setTimeout(() => socket.close(), 3000);
    });
    socket.on("error", () => {
      // no-op
    });
    socket.on("close", () => {
      // no-op
    });
  });
  check(response, { "socket connected": (r) => r && r.status === 101 });
  sleep(1);
}
