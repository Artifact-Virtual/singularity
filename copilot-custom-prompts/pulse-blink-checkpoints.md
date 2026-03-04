# TASK: Add PULSE-aware BLINK checkpoints to Singularity (port from Mach6)

Three changes across 2 files. Do them all in one pass.

## FILE 1: `singularity/cortex/blink.py`

### 1. Add to `BlinkConfig` dataclass (after `cooldown_seconds`):
```python
checkpoint_interval: int = 25  # Inject checkpoint message every N iterations
```

### 2. Add to `BlinkState` dataclass (after `prepared`):
```python
last_checkpoint_at: int = 0       # Iteration of last checkpoint
cap_expansions: int = 0           # How many times PULSE expanded the cap
```

### 3. Add this constant after `BLINK_RESUME_MESSAGE`:
```python
BLINK_CHECKPOINT_MESSAGE = """🔖 CHECKPOINT — You have been running for a while. This is a periodic safety save.

**What to do NOW (in this order):**
1. If you have critical work-in-progress state, call `comb_stage` with a brief summary of what you're doing and where you are
2. Then continue working normally — this is NOT a shutdown, just a save point
3. If you have nothing critical to save, ignore this and keep working

This checkpoint exists so that if the session is interrupted externally, your progress is recoverable."""
```

### 4. Add these 3 methods to `BlinkController` class (after `should_prepare` method):

```python
def should_checkpoint(self, current_iteration: int) -> bool:
    """Should we inject a periodic checkpoint message?
    Checkpoints ensure state is saved regularly during long runs,
    so external kills (SIGTERM, OOM, crash) don't lose everything.
    """
    if not self.config.enabled:
        return False
    if self.config.checkpoint_interval <= 0:
        return False
    if current_iteration < self.config.checkpoint_interval:
        return False
    if self.state.prepared:
        return False  # Don't checkpoint when prepare is active
    iters_since = current_iteration - self.state.last_checkpoint_at
    return iters_since >= self.config.checkpoint_interval

def get_checkpoint_message(self, current_iteration: int) -> str:
    """Get checkpoint message and record that we checkpointed."""
    self.state.last_checkpoint_at = current_iteration
    return BLINK_CHECKPOINT_MESSAGE

def notify_cap_expanded(self, old_cap: int, new_cap: int) -> None:
    """PULSE expanded the iteration cap. Re-arm prepare for the new wall.
    
    Without this, BLINK fires prepare at iter 17 (for cap 20), PULSE
    expands to 100 at iter 18, and BLINK never fires again — leaving
    82 iterations with no safety net.
    """
    self.state.prepared = False
    self.state.cap_expansions += 1
    logger.info(
        f"[{self.session_id}] Cap expanded {old_cap} → {new_cap}. "
        f"Prepare re-armed. Expansion #{self.state.cap_expansions}"
    )
```

### 5. In `record_blink` method, add after the existing `self.state.prepared = False` line:
```python
self.state.last_checkpoint_at = 0  # Reset checkpoint counter for new blink cycle
```

---

## FILE 2: `singularity/cortex/agent.py`

### 1. In `AgentLoop.run()`, modify the PULSE auto-expand block:

Find this block:
```python
if (remaining <= (self._max_iterations - self.config.expansion_threshold)
    and not self._expanded):
    self._max_iterations = self.config.expanded_iterations
    self._expanded = True
```

Change to:
```python
if (remaining <= (self._max_iterations - self.config.expansion_threshold)
    and not self._expanded):
    old_max = self._max_iterations
    self._max_iterations = self.config.expanded_iterations
    self._expanded = True
    logger.info(
        f"[{self._turn_id}] PULSE expanded budget to "
        f"{self._max_iterations} iterations"
    )
    if self.bus:
        await self.bus.emit_nowait("cortex.budget.expanded", {
            "turn_id": self._turn_id,
            "new_max": self._max_iterations,
        }, source="cortex")
    # Notify BLINK that the wall moved
    if self.blink:
        self.blink.notify_cap_expanded(old_max, self._max_iterations)
```

(Note: the `old_max` capture needs to happen BEFORE the assignment. The logger.info and bus.emit may already exist — just add the BLINK notification after them.)

### 2. Modify the BLINK injection block to include checkpoint:

Find:
```python
if self.blink:
    remaining_after = self._max_iterations - self._iteration
    if self.blink.should_prepare(remaining_after):
        prep_msg = self.blink.get_prepare_message()
        messages.append(ChatMessage(
            role="user",
            content=prep_msg,
        ))
        logger.info(
            f"[{self._turn_id}] BLINK prepare injected "
            f"({remaining_after} iterations remaining)"
        )
```

Replace with:
```python
if self.blink:
    remaining_after = self._max_iterations - self._iteration
    if self.blink.should_prepare(remaining_after):
        prep_msg = self.blink.get_prepare_message()
        messages.append(ChatMessage(
            role="user",
            content=prep_msg,
        ))
        logger.info(
            f"[{self._turn_id}] BLINK prepare injected "
            f"({remaining_after} iterations remaining)"
        )
    elif self.blink.should_checkpoint(self._iteration):
        cp_msg = self.blink.get_checkpoint_message(self._iteration)
        messages.append(ChatMessage(
            role="user",
            content=cp_msg,
        ))
        logger.info(
            f"[{self._turn_id}] BLINK checkpoint at iteration "
            f"{self._iteration}/{self._max_iterations}"
        )
```

---

## Summary

| Concept | What | Why |
|---------|------|-----|
| `checkpoint_interval` | Periodic comb_stage nudge every 25 iterations | External kills don't lose everything |
| `notify_cap_expanded` | PULSE tells BLINK the wall moved | BLINK re-arms prepare for the new cap |
| `should_checkpoint` | Fires between prepare signals | Fills the safety gap during long runs |

**That's it. 2 files, 3 concepts.**
