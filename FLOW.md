# Singularity — Canonical Flow

**The complete linear path of a dispatch, from entry to exit.**

Every dispatch follows this exact sequence. No exceptions. If any step fails, the system is broken at that step.

---

## The Pipeline

```
CLI / AVA / Cron
      │
      ▼
┌─────────────┐
│   INBOX     │  .singularity/csuite/inbox/<request_id>.json
│  (fs drop)  │  { target, description, priority, requester }
└──────┬──────┘
       │ runtime._poll_dispatch_inbox() — 2s poll loop
       ▼
┌─────────────┐
│ DISPATCHER  │  singularity/csuite/dispatch.py → Dispatcher
│  (router)   │  dispatch() / dispatch_to() / dispatch_all()
└──────┬──────┘
       │ passes through to Coordinator
       ▼
┌──────────────┐
│ COORDINATOR  │  singularity/csuite/coordinator.py → Coordinator.dispatch()
│ (orchestrator)│
│              │  1. Generate dispatch_id (uuid[:8])
│              │  2. Emit "csuite.dispatch.started" on event bus
│              │  3. _resolve_targets() — keyword match or direct name
│              │  4. Create Task objects per executive
│              │  5. Execute: single → direct, multiple → asyncio.gather()
│              │  6. Collect TaskResults
│              │  7. _save_dispatch() — write to dispatches/ dir
│              │  8. _webhook_reporter.report_dispatch() — post to Discord
│              │  9. Emit "csuite.dispatch.completed" on event bus
│              │  10. Return DispatchResult
└──────┬──────┘
       │ _run_task() per executive
       ▼
┌──────────────┐
│  EXECUTIVE   │  singularity/csuite/executive.py → Executive.execute()
│  (agent loop)│
│              │  1. Build scoped system prompt (role persona + task + context)
│              │  2. AGENT LOOP (max_iterations, default 8):
│              │     a. Send messages + tool defs → LLM (provider_chain)
│              │     b. If LLM returns tool_calls → execute each tool
│              │        - Permission guard: only allowed tools per role
│              │        - Results appended as tool messages
│              │        - Track actions + file modifications
│              │     c. If LLM returns text only → break (final response)
│              │     d. If LAST ITERATION:
│              │        - Inject "summarize now" system message
│              │        - Pass tools=[] → forces text response (no escape)
│              │  3. Parse findings from response text
│              │  4. Return TaskResult { status, response, findings, actions, duration }
└──────┬──────┘
       │ provider_chain handles LLM routing
       ▼
┌──────────────┐
│   PROVIDER   │  singularity/voice/provider.py → ProviderChain
│  (LLM calls) │
│              │  Primary: Anthropic Sonnet (claude-sonnet-4-20250514)
│              │  Fallback: Ollama (local, if primary fails)
│              │  Circuit breaker: 3 failures → switch providers
│              │  Returns: ChatResponse { content, tool_calls, usage }
└──────────────┘

                    ┌──── results flow back up ────┐
                    ▼                               │
┌──────────────┐                          ┌────────┴───────┐
│   RESULTS    │                          │   WEBHOOKS     │
│  (fs write)  │                          │  (Discord)     │
│              │                          │                │
│ .singularity/│                          │ Per executive: │
│ csuite/      │                          │  → #cto, #coo, │
│ results/     │                          │    #cfo, #ciso │
│ <req_id>.json│                          │ Summary:       │
│              │                          │  → #dispatch   │
│ { request_id,│                          │                │
│   dispatch_id│                          │ Via deployment │
│   all_succeeded                         │ webhook URLs   │
│   duration,  │                          │ stored in      │
│   tasks[] }  │                          │ .singularity/  │
└──────────────┘                          │ deployments/   │
                                          └────────────────┘
                    ▼
┌──────────────┐
│  DISPATCHES  │  Permanent audit log
│  (archive)   │  .singularity/csuite/dispatches/
│              │  <timestamp>-<dispatch_id>.json
│              │  Full task results + findings + actions + files_modified
└──────────────┘
```

---

## Real Trace — CISO Security Audit (2026-03-04 23:22:47 PKT)

This is one actual dispatch, every log line in sequence. This happened.

### Step 1: Entry (CLI → Inbox)
```
CLI: python3 scripts/dispatch.py ciso "Run a security audit of all listening services" -p medium
  → writes .singularity/csuite/inbox/a03e3679.json
```

### Step 2: Inbox Pickup (Runtime, 2s poll)
```
23:22:47 [runtime] Inbox: dispatching a03e3679 → ciso (priority: medium)
  → request file deleted (claimed)
  → calls dispatcher.dispatch_to("ciso", description, priority="medium")
```

### Step 3: Coordinator Dispatch
```
23:22:47 [coordinator] ⚡ Dispatch 2b0c73e2: target=ciso, priority=medium
  → dispatch_id generated: 2b0c73e2
  → _resolve_targets("ciso") → [RoleType.CISO]
  → creates Task object (max_iterations=8)
  → calls _run_task(task, RoleType.CISO)
```

### Step 4: Executive Agent Loop (5 iterations)
```
ITER 1 — Tool call
23:22:50 [provider] chat() → content=0, tool_calls=1, usage={input: 1138, output: 55}
23:22:50 [executive] CISO iter 1/8: content=0 tool_calls=1
  → tool: exec("ss -tlnp") → discovers 21 listening services

ITER 2 — Tool call
23:22:52 [provider] chat() → content=0, tool_calls=1, usage={input: 1992, output: 83}
23:22:52 [executive] CISO iter 2/8: content=0 tool_calls=1
  → tool: exec("ps -ef | grep ...") → identifies process owners

ITER 3 — Tool call
23:22:57 [provider] chat() → content=0, tool_calls=1, usage={input: 2879, output: 143}
23:22:57 [executive] CISO iter 3/8: content=0 tool_calls=1
  → tool: exec("netstat -tlnp ...") → checks public-facing ports

ITER 4 — Tool call
23:22:59 [provider] chat() → content=0, tool_calls=1, usage={input: 3182, output: 98}
23:22:59 [executive] CISO iter 4/8: content=0 tool_calls=1
  → tool: exec("sudo netstat -tlnp | grep ...") → confirms SSH+HTTP exposure

ITER 5 — Final response (natural, not forced)
23:23:09 [provider] chat() → content=1423, tool_calls=0, finish=stop, usage={input: 3469, output: 415}
23:23:09 [executive] CISO iter 5/8: content=1423 tool_calls=0
  → LLM produced 1423 chars text response
  → Agent loop breaks (no tool_calls = done)
```

**Note:** Iteration 5 was NOT forced — the CISO finished naturally. The forced-summary mechanism (inject "summarize now" + tools=[]) only triggers on iteration 8/8. This exec completed in 5/8.

### Step 5: Task Completion
```
23:23:09 [runtime] C-Suite task completed: ciso → complete (22.1s)
  → TaskResult { status=COMPLETE, response=1423 chars, iterations=5, duration=22.1s }
  → Findings extracted: 8 items (listening services, public ports, SurrealDB exposure, etc.)
  → Actions logged: 4 tool calls (ss, ps, netstat, sudo netstat)
```

### Step 6: Webhook Reports → Discord
```
23:23:10 [webhooks] ✅ Webhook posted to #ciso     (full report → executive's channel)
23:23:11 [webhooks] ✅ Webhook posted to #dispatch  (summary → central dispatch channel)
```

### Step 7: Dispatch Persistence
```
23:23:11 [coordinator] 📋 Dispatch 2b0c73e2 — 1 task(s), 22.1s
  ✅ CISO: complete (5 iters, 22.1s)
23:23:11 [dispatch] Dispatch logged: ciso → 2b0c73e2 (medium)
  → .singularity/csuite/dispatches/2026-03-04T18-23-09Z-2b0c73e2.json
```

### Step 8: Result File (for CLI caller)
```
23:23:11 [runtime] Inbox: a03e3679 complete → a03e3679.json
  → .singularity/csuite/results/a03e3679.json
  → CLI reads this and prints result to terminal
```

---

## Timing Breakdown

| Step | Duration | Notes |
|------|----------|-------|
| Inbox pickup | <2s | 2s poll interval |
| Coordinator routing | ~0.01s | Keyword match or direct name |
| LLM iter 1 | ~3s | Initial reconnaissance tool call |
| LLM iter 2 | ~2s | Process identification |
| LLM iter 3 | ~5s | Deep port analysis |
| LLM iter 4 | ~2s | Privileged scan (sudo) |
| LLM iter 5 | ~10s | Final report generation (415 output tokens) |
| Webhook posting | ~2s | 2 HTTP POST calls to Discord |
| Dispatch save | ~0.01s | JSON write to filesystem |
| **Total** | **22.1s** | End-to-end |

---

## Safety Mechanisms

| Mechanism | Where | What it prevents |
|-----------|-------|------------------|
| Forced summary | executive.py, iter == max | Executive burning all iterations on tool calls, never responding |
| Timeout wrapper | coordinator._run_task() | asyncio.wait_for() with role-specific timeout |
| Reroute cooldown | self_heal.py, 120s | Cascade loop: timeout → reroute → timeout → reroute → ∞ |
| Permission guard | executive._execute_tool_with_guard() | Executives calling tools outside their role scope |
| Busy flag | executive.is_busy | Prevents double-booking an executive |
| Task queue | coordinator._task_queue | Queues tasks when executive is busy |
| Circuit breaker | provider_chain | 3 LLM failures → switch to fallback provider |
| Error file rename | runtime inbox loop | Bad JSON → .error extension, doesn't block queue |

---

## File Locations

```
singularity/
├── scripts/
│   └── dispatch.py              # CLI entry point (drops JSON → inbox)
├── singularity/
│   ├── runtime.py               # _poll_dispatch_inbox() — pickup + result write
│   ├── csuite/
│   │   ├── dispatch.py          # Dispatcher — high-level API (dispatch/dispatch_to/dispatch_all)
│   │   ├── coordinator.py       # Coordinator — orchestration (resolve targets, run tasks, save)
│   │   ├── executive.py         # Executive — agent loop (LLM + tools, forced summary)
│   │   ├── self_heal.py         # Self-heal — reroute/escalation (with 120s cooldown)
│   │   ├── webhooks.py          # WebhookReporter — Discord channel posting
│   │   ├── roles.py             # Role definitions (keywords, tools, escalation rules)
│   │   └── __init__.py
│   └── voice/
│       └── provider.py          # ProviderChain — LLM routing (Anthropic → Ollama fallback)
└── .singularity/
    └── csuite/
        ├── inbox/               # Request files (consumed on pickup)
        ├── results/             # Result files (keyed by request_id)
        └── dispatches/          # Permanent archive (keyed by dispatch_id + timestamp)
```

---

## What I Learned Building This

1. **Executives will tool-call forever** if you let them. They're curious. They'll chain 8 reads, 8 execs, never summarize. The forced-summary on the last iteration (inject prompt + remove tools) is not a hack — it's a hard boundary between exploration and delivery.

2. **Self-heal cascades are the real threat.** One timeout → reroute to Ollama → Ollama loads 5GB model → CPU throttles → Ollama crashes → reload → crash. The cooldown (120s per role) breaks the loop. Without it, the system eats itself.

3. **The filesystem IS the message bus.** inbox/ → pickup → results/. No Redis. No RabbitMQ. No gRPC. JSON files on disk. It works because the polling is fast (2s) and the operations are atomic (write file → rename → delete). Simple beats complex.

4. **Dispatch logs are separate from results.** Results are keyed by request_id (what the caller needs). Dispatches are keyed by dispatch_id + timestamp (what the system needs for audit). Two different questions, two different indexes.

5. **The LLM's token usage reveals the work.** CISO iter 1: 1138 input tokens (just system prompt). CISO iter 4: 3182 input tokens (accumulated tool results). CISO iter 5: 3469 input → 415 output (synthesizing everything into a report). You can read the shape of the investigation just from the token counts.

---

*Created Day 20 (2026-03-04) — first canonical flow trace of the C-Suite dispatch pipeline.*
*Method: traced actual journalctl logs, read every source file in the chain, followed a real dispatch end-to-end.*
