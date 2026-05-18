# Phase 15 Load Tests

## 15.10 Chat Concurrency (1k)

```bash
k6 run qa/load/k6-chat-concurrency.js -e BASE_URL=http://localhost:8000 -e ORG_SLUG=test-org
```

This ramps to `1000` concurrent virtual users and repeatedly initializes widget sessions against `/api/v1/widget/init`.

## 15.11 Socket Capacity

```bash
k6 run qa/load/k6-socket-capacity.js -e WS_URL=ws://localhost:8000/socket.io/?EIO=4&transport=websocket -e VUS=500 -e DURATION=5m
```

Use multiple runs and increase `VUS` to estimate practical socket saturation on your deployment.
