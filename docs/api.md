# HTTP API

> Singularity exposes an HTTP API on port 8450 for programmatic interaction.

## Base URL

```
http://localhost:8450
```

In production, accessed via reverse proxy or Cloudflare Tunnel.

---

## Endpoints

### Health Check

```
GET /health
```

Returns runtime health status.

**Response:**
```json
{
  "status": "ok",
  "runtime": "singularity",
  "uptime": 3620.2,
  "totalRequests": 42,
  "totalErrors": 0,
  "pendingRequests": 1,
  "timestamp": 1773390726.61
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"ok"` or `"degraded"` |
| `runtime` | string | Always `"singularity"` |
| `uptime` | float | Seconds since start |
| `totalRequests` | int | Total requests served |
| `totalErrors` | int | Total error responses |
| `pendingRequests` | int | Currently processing |
| `timestamp` | float | Unix timestamp |

---

### Chat

```
POST /api/v1/chat
Content-Type: application/json
```

Send a message to Singularity and receive a response.

**Request Body:**
```json
{
  "message": "What is the current system status?",
  "context": {
    "user_id": "193011943382974466",
    "channel": "api",
    "source": "erp"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | The user message |
| `context.user_id` | string | No | Discord user ID for identity |
| `context.channel` | string | No | Source channel identifier |
| `context.source` | string | No | Integration source (e.g., `"erp"`, `"api"`) |

**Response:**
```json
{
  "response": "All systems operational. 11 POAs active, 0 degraded.",
  "metadata": {
    "iterations_used": 3,
    "tools_called": ["poa_manage"],
    "processing_time_ms": 2450
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `response` | string | Singularity's response text |
| `metadata.iterations_used` | int | Agent loop iterations consumed |
| `metadata.tools_called` | array | Tools invoked during processing |
| `metadata.processing_time_ms` | int | Total processing time |

**Error Response:**
```json
{
  "error": "Internal processing error",
  "code": 500
}
```

---

## Integration Example

### ERP Integration

The Artifact ERP backend integrates via this API:

```typescript
// backend/src/config/ai.ts
const response = await fetch('http://localhost:8450/api/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    context: {
      user_id: userId,
      channel: 'erp-chat',
      source: 'artifact-erp'
    }
  })
});

const data = await response.json();
return data.response;
```

### cURL

```bash
# Health check
curl http://localhost:8450/health

# Chat
curl -X POST http://localhost:8450/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Run a system status check"}'
```

### Python

```python
import httpx

async with httpx.AsyncClient() as client:
    resp = await client.post(
        "http://localhost:8450/api/v1/chat",
        json={"message": "What POAs are active?"}
    )
    print(resp.json()["response"])
```

---

## Rate Limits

No hard rate limits are enforced at the API level. Each request consumes agent loop iterations (typically 3-15 per request depending on complexity). The LLM provider chain may impose its own rate limits.

## Authentication

The HTTP API does not currently implement authentication. It is designed to be accessed only from trusted internal services (localhost or private network). In production, access control is enforced at the reverse proxy / tunnel layer.

---

*See [Configuration](configuration.md) for port settings, [Deployment](deployment.md) for reverse proxy setup.*
