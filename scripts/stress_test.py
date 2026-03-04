#!/usr/bin/env python3
"""
Singularity Stress Test — C-Suite + POA Combined Heavy Workload
================================================================
Uses the inbox file-drop mechanism to dispatch to the RUNNING Singularity.
Monitors CPU/RAM/temp/load throughout.

Tests the live system end-to-end: inbox → coordinator → executives → results.
"""

import asyncio
import json
import os
import sys
import time
import uuid
import subprocess
from datetime import datetime
from pathlib import Path

try:
    import psutil
except ImportError:
    print("Installing psutil...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil", "-q"])
    import psutil

# Paths
WORKSPACE = Path.home() / "workspace"
SG_DIR = WORKSPACE / ".singularity" / "csuite"
INBOX = SG_DIR / "inbox"
RESULTS = SG_DIR / "results"


class SystemMonitor:
    """Track CPU/RAM/temps throughout the test."""
    
    def __init__(self):
        self.snapshots = []
        self._running = False
        self._task = None
        self.singularity_pid = self._find_pid('singularity --run')
        self.mach6_pid = self._find_pid('mach6.*daemon')
    
    def _find_pid(self, pattern):
        import re
        for proc in psutil.process_iter(['pid', 'cmdline']):
            try:
                cmd = ' '.join(proc.info['cmdline'] or [])
                if re.search(pattern, cmd):
                    return proc.info['pid']
            except:
                pass
        return None
    
    async def start(self, interval=3.0):
        self._running = True
        self._task = asyncio.create_task(self._monitor_loop(interval))
    
    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    async def _monitor_loop(self, interval):
        while self._running:
            snap = self._take_snapshot()
            self.snapshots.append(snap)
            await asyncio.sleep(interval)
    
    def _take_snapshot(self):
        cpu_percent = psutil.cpu_percent(interval=0)
        cpu_per_core = psutil.cpu_percent(interval=0, percpu=True)
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        load = os.getloadavg()
        
        # Temps
        temps = {}
        try:
            for i, tz in enumerate(sorted(Path('/sys/class/thermal/').glob('thermal_zone*'))):
                t = int((tz / 'temp').read_text().strip()) / 1000
                temps[f'zone{i}'] = t
        except:
            pass
        
        # Per-process stats
        def proc_stats(pid):
            if not pid:
                return {}
            try:
                p = psutil.Process(pid)
                return {
                    'cpu_percent': p.cpu_percent(interval=0),
                    'rss_mb': p.memory_info().rss / (1024*1024),
                    'threads': p.num_threads(),
                }
            except:
                return {}
        
        return {
            'time': time.time(),
            'elapsed': 0,
            'cpu_total': cpu_percent,
            'cpu_cores': cpu_per_core,
            'cpu_max_core': max(cpu_per_core) if cpu_per_core else 0,
            'ram_used_gb': mem.used / (1024**3),
            'ram_percent': mem.percent,
            'ram_available_gb': mem.available / (1024**3),
            'swap_used_mb': swap.used / (1024**2),
            'load_1m': load[0],
            'load_5m': load[1],
            'load_15m': load[2],
            'temps': temps,
            'temp_max': max(temps.values()) if temps else 0,
            'singularity': proc_stats(self.singularity_pid),
            'mach6': proc_stats(self.mach6_pid),
        }
    
    def summary(self):
        if not self.snapshots:
            return {}
        
        t0 = self.snapshots[0]['time']
        for s in self.snapshots:
            s['elapsed'] = s['time'] - t0
        
        cpu_vals = [s['cpu_total'] for s in self.snapshots]
        ram_vals = [s['ram_used_gb'] for s in self.snapshots]
        ram_avail = [s['ram_available_gb'] for s in self.snapshots]
        load_vals = [s['load_1m'] for s in self.snapshots]
        temp_vals = [s['temp_max'] for s in self.snapshots if s['temp_max'] > 0]
        core_max_vals = [s['cpu_max_core'] for s in self.snapshots]
        
        sing_cpu = [s['singularity'].get('cpu_percent', 0) for s in self.snapshots]
        sing_ram = [s['singularity'].get('rss_mb', 0) for s in self.snapshots]
        m6_cpu = [s['mach6'].get('cpu_percent', 0) for s in self.snapshots]
        m6_ram = [s['mach6'].get('rss_mb', 0) for s in self.snapshots]
        
        return {
            'duration_s': self.snapshots[-1]['elapsed'],
            'samples': len(self.snapshots),
            'cpu': {
                'avg': round(sum(cpu_vals) / len(cpu_vals), 1),
                'max': round(max(cpu_vals), 1),
                'min': round(min(cpu_vals), 1),
                'peak_core_max': round(max(core_max_vals), 1),
                'over_80_pct': round(sum(1 for c in cpu_vals if c > 80) / len(cpu_vals) * 100, 1),
                'over_95_pct': round(sum(1 for c in cpu_vals if c > 95) / len(cpu_vals) * 100, 1),
            },
            'ram': {
                'avg_gb': round(sum(ram_vals) / len(ram_vals), 1),
                'max_gb': round(max(ram_vals), 1),
                'min_available_gb': round(min(ram_avail), 1),
                'baseline_gb': round(ram_vals[0], 1),
            },
            'load': {
                'avg': round(sum(load_vals) / len(load_vals), 2),
                'max': round(max(load_vals), 2),
                'baseline': round(load_vals[0], 2),
            },
            'temp': {
                'max': round(max(temp_vals), 1) if temp_vals else 0,
                'avg': round(sum(temp_vals) / len(temp_vals), 1) if temp_vals else 0,
            },
            'singularity': {
                'cpu_avg': round(sum(sing_cpu) / len(sing_cpu), 1),
                'cpu_max': round(max(sing_cpu), 1),
                'ram_max_mb': round(max(sing_ram), 0),
            },
            'mach6': {
                'cpu_avg': round(sum(m6_cpu) / len(m6_cpu), 1),
                'cpu_max': round(max(m6_cpu), 1),
                'ram_max_mb': round(max(m6_ram), 0),
            },
            'ceiling_hit': max(cpu_vals) > 95,
            'sustained_high': sum(1 for c in cpu_vals if c > 80) > len(cpu_vals) * 0.5,
            'thermal_throttle_risk': max(temp_vals) > 90 if temp_vals else False,
            'swap_pressure': any(s['swap_used_mb'] > 500 for s in self.snapshots),
            'ram_exhaustion_risk': min(ram_avail) < 1.0,
        }


def drop_dispatch(target: str, description: str, priority: str = "high", 
                  max_iterations: int = 8) -> str:
    """Drop a dispatch request into inbox. Returns dispatch_id."""
    INBOX.mkdir(parents=True, exist_ok=True)
    dispatch_id = str(uuid.uuid4())[:8]
    
    request = {
        "dispatch_id": dispatch_id,
        "target": target,
        "description": description,
        "priority": priority,
        "max_iterations": max_iterations,
        "requester": "stress-test",
        "timestamp": datetime.now().isoformat(),
    }
    
    request_file = INBOX / f"{dispatch_id}.json"
    request_file.write_text(json.dumps(request, indent=2))
    return dispatch_id


def wait_for_result(dispatch_id: str, timeout: float = 180.0) -> dict:
    """Poll for a result file."""
    start = time.time()
    result_file = RESULTS / f"{dispatch_id}.json"
    
    while time.time() - start < timeout:
        if result_file.exists():
            try:
                data = json.loads(result_file.read_text())
                return data
            except:
                pass
        time.sleep(2)
    
    return {"status": "timeout", "dispatch_id": dispatch_id, "elapsed": timeout}


async def run_poa_audit():
    """Run POA audit script."""
    script = '/home/adam/workspace/poa/scripts/poa-audit.sh'
    if not os.path.exists(script):
        return {"status": "missing", "script": script}
    
    try:
        proc = await asyncio.create_subprocess_exec(
            'bash', script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, 'TERM': 'dumb'},
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        return {
            "status": "pass" if proc.returncode == 0 else "fail",
            "exit_code": proc.returncode,
            "output_lines": len(stdout.decode().strip().split('\n')) if stdout else 0,
        }
    except asyncio.TimeoutError:
        return {"status": "timeout"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def main():
    print("=" * 70)
    print("  SINGULARITY STRESS TEST — C-Suite + POA Combined Workload")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} PKT")
    print(f"  Host: dragonfly (i3-1005G1, 4 cores, 16GB RAM, no GPU)")
    print("=" * 70)
    
    # Verify Singularity is running
    monitor = SystemMonitor()
    if not monitor.singularity_pid:
        print("❌ Singularity not running! Aborting.")
        sys.exit(1)
    print(f"\n[INIT] Singularity PID: {monitor.singularity_pid}")
    print(f"[INIT] Mach6 PID: {monitor.mach6_pid or 'not found'}")
    
    # Start monitoring
    await monitor.start(interval=3)
    print("[MONITOR] System monitoring active (3s intervals)")
    
    results = {
        'test_start': datetime.now().isoformat(),
        'host': 'dragonfly',
        'cpu': 'i3-1005G1 (4 cores)',
    }
    test_start = time.time()
    
    # ======================================
    # PHASE 1: CONCURRENT — Everything at once
    # ======================================
    print(f"\n{'#'*70}")
    print(f"  PHASE 1: CONCURRENT FIRE")
    print(f"  4x C-Suite dispatches + POA audit — all at once")
    print(f"{'#'*70}")
    
    phase1_start = time.time()
    
    # Drop all C-Suite dispatches simultaneously
    csuite_tasks = [
        ("cto", "Analyze the current Singularity codebase. How many Python files, total lines of code? Check git status. Report the architecture — how many subsystems boot, what are the key modules? Check for any stale imports or dead code in the csuite/ directory."),
        ("cfo", "Estimate the monthly operational cost of running Singularity and Mach6 on this i3 server. Factor in: API costs for Opus (~$15/M input, $75/M output) vs Sonnet (~$3/M input, $15/M output), electricity for a 15W TDP CPU running 24/7, and bandwidth for Discord+WhatsApp adapters. How many API calls per hour does the current heartbeat schedule generate?"),
        ("coo", "Audit the current deployment SOPs. Check: is there a documented rollback procedure? Are there health checks configured? What monitoring is in place (PULSE, IMMUNE)? Draft a 5-point deployment checklist based on what exists. Check the cron schedule for conflicts or gaps."),
        ("ciso", "Security audit: Check file permissions on credential files in the workspace. Are there any plaintext secrets outside the vault? Check what ports are listening on this machine. Review the copilot-proxy configuration for authentication. Check if Discord bot token rotation is documented."),
    ]
    
    dispatch_ids = []
    for target, desc in csuite_tasks:
        did = drop_dispatch(target, desc, priority="high", max_iterations=8)
        dispatch_ids.append((target, did))
        print(f"  📤 Dispatched to {target.upper()}: {did}")
    
    # Start POA audit concurrently
    poa_task = asyncio.create_task(run_poa_audit())
    
    # Wait for all C-Suite results
    print(f"\n  ⏳ Waiting for results (timeout: 180s per dispatch)...")
    
    csuite_results = []
    for target, did in dispatch_ids:
        t0 = time.time()
        result = await asyncio.to_thread(wait_for_result, did, timeout=180)
        elapsed = time.time() - t0
        
        status = result.get('status', 'unknown')
        is_success = status not in ('timeout', 'error', 'failed')
        icon = "✅" if is_success else "❌" if status == 'failed' else "⏰" if status == 'timeout' else "⚠️"
        
        # Extract task details from result
        tasks_in_result = result.get('tasks', [])
        iters = sum(t.get('iterations_used', 0) for t in tasks_in_result) if tasks_in_result else '?'
        response_len = sum(len(t.get('response', '')) for t in tasks_in_result) if tasks_in_result else 0
        
        csuite_results.append({
            'target': target,
            'dispatch_id': did,
            'status': status,
            'wait_time_s': round(elapsed, 1),
            'iterations': iters,
            'response_chars': response_len,
            'success': is_success,
        })
        
        print(f"  {icon} {target.upper()} ({did}): {status} in {elapsed:.1f}s wait, {iters} iters, {response_len} chars")
    
    # Get POA result
    poa_result = await poa_task
    poa_icon = "✅" if poa_result['status'] == 'pass' else "❌"
    print(f"  {poa_icon} POA AUDIT: {poa_result['status']}")
    
    phase1_elapsed = time.time() - phase1_start
    
    results['phase1'] = {
        'name': 'concurrent_fire',
        'elapsed_s': round(phase1_elapsed, 1),
        'csuite': {
            'total': len(csuite_results),
            'succeeded': sum(1 for r in csuite_results if r['success']),
            'failed': sum(1 for r in csuite_results if not r['success']),
            'details': csuite_results,
        },
        'poa': poa_result,
    }
    
    print(f"\n  Phase 1 total: {phase1_elapsed:.1f}s")
    
    # Brief pause to let system settle
    print(f"\n  ⏸️  Settling (10s)...")
    await asyncio.sleep(10)
    
    # ======================================
    # PHASE 2: SEQUENTIAL — One at a time
    # ======================================
    print(f"\n{'#'*70}")
    print(f"  PHASE 2: SEQUENTIAL DISPATCH")
    print(f"  2x individual dispatches for comparison")
    print(f"{'#'*70}")
    
    phase2_start = time.time()
    
    seq_tasks = [
        ("cto", "Run 'df -h' and report disk usage. Which partitions are most full? Is there cleanup needed?"),
        ("ciso", "Run 'ss -tlnp' and list all listening ports. Are any unexpected services exposed?"),
    ]
    
    seq_results = []
    for target, desc in seq_tasks:
        t0 = time.time()
        did = drop_dispatch(target, desc, priority="medium", max_iterations=8)
        print(f"  📤 {target.upper()} ({did}): dispatched")
        
        result = await asyncio.to_thread(wait_for_result, did, timeout=120)
        elapsed = time.time() - t0
        
        status = result.get('status', 'unknown')
        is_success = status not in ('timeout', 'error', 'failed')
        icon = "✅" if is_success else "❌"
        
        tasks_in_result = result.get('tasks', [])
        iters = sum(t.get('iterations_used', 0) for t in tasks_in_result) if tasks_in_result else '?'
        
        seq_results.append({
            'target': target,
            'dispatch_id': did,
            'status': status,
            'elapsed_s': round(elapsed, 1),
            'iterations': iters,
            'success': is_success,
        })
        print(f"  {icon} {target.upper()}: {elapsed:.1f}s, {iters} iters")
    
    phase2_elapsed = time.time() - phase2_start
    
    results['phase2'] = {
        'name': 'sequential',
        'elapsed_s': round(phase2_elapsed, 1),
        'details': seq_results,
    }
    
    print(f"\n  Phase 2 total: {phase2_elapsed:.1f}s")
    
    # Stop monitoring
    await monitor.stop()
    
    total_elapsed = time.time() - test_start
    results['total_elapsed_s'] = round(total_elapsed, 1)
    results['test_end'] = datetime.now().isoformat()
    
    # System summary
    sys_summary = monitor.summary()
    results['system'] = sys_summary
    
    # ======================================
    # REPORT
    # ======================================
    print(f"\n{'='*70}")
    print(f"  STRESS TEST REPORT")
    print(f"{'='*70}")
    print(f"  Duration:           {total_elapsed:.1f}s ({total_elapsed/60:.1f} min)")
    print(f"  Monitoring samples: {sys_summary.get('samples', 0)}")
    
    cpu = sys_summary.get('cpu', {})
    ram = sys_summary.get('ram', {})
    load = sys_summary.get('load', {})
    temp = sys_summary.get('temp', {})
    sing = sys_summary.get('singularity', {})
    m6 = sys_summary.get('mach6', {})
    
    print(f"\n  --- CPU ---")
    print(f"  Average:            {cpu.get('avg', 0)}%")
    print(f"  Peak:               {cpu.get('max', 0)}%")
    print(f"  Peak single core:   {cpu.get('peak_core_max', 0)}%")
    print(f"  Time >80%:          {cpu.get('over_80_pct', 0)}% of test")
    print(f"  Time >95%:          {cpu.get('over_95_pct', 0)}% of test")
    
    print(f"\n  --- Memory ---")
    print(f"  Baseline:           {ram.get('baseline_gb', 0)} GB")
    print(f"  Peak:               {ram.get('max_gb', 0)} GB")
    print(f"  Min available:      {ram.get('min_available_gb', 0)} GB")
    
    print(f"\n  --- Load ---")
    print(f"  Baseline:           {load.get('baseline', 0)}")
    print(f"  Average:            {load.get('avg', 0)}")
    print(f"  Peak:               {load.get('max', 0)}")
    
    print(f"\n  --- Temperature ---")
    print(f"  Peak:               {temp.get('max', 0)}°C")
    print(f"  Average:            {temp.get('avg', 0)}°C")
    
    print(f"\n  --- Process: Singularity ---")
    print(f"  CPU avg:            {sing.get('cpu_avg', 0)}%")
    print(f"  CPU peak:           {sing.get('cpu_max', 0)}%")
    print(f"  RAM peak:           {sing.get('ram_max_mb', 0)} MB")
    
    print(f"\n  --- Process: Mach6 ---")
    print(f"  CPU avg:            {m6.get('cpu_avg', 0)}%")
    print(f"  CPU peak:           {m6.get('cpu_max', 0)}%")
    print(f"  RAM peak:           {m6.get('ram_max_mb', 0)} MB")
    
    # Workload results
    p1 = results.get('phase1', {})
    p2 = results.get('phase2', {})
    cs1 = p1.get('csuite', {})
    
    print(f"\n  --- Workload Results ---")
    print(f"  Phase 1 (concurrent): {p1.get('elapsed_s', 0)}s")
    print(f"    C-Suite: {cs1.get('succeeded', 0)}/{cs1.get('total', 0)} succeeded")
    print(f"    POA:     {p1.get('poa', {}).get('status', '?')}")
    print(f"  Phase 2 (sequential): {p2.get('elapsed_s', 0)}s")
    for d in p2.get('details', []):
        print(f"    {d['target'].upper()}: {d['status']} in {d['elapsed_s']}s")
    
    # Verdict
    print(f"\n  {'='*50}")
    print(f"  VERDICT")
    print(f"  {'='*50}")
    
    issues = []
    if sys_summary.get('ceiling_hit'):
        issues.append("🔴 CPU CEILING — hit >95%")
    if sys_summary.get('sustained_high'):
        issues.append("🟡 CPU SUSTAINED HIGH — >80% for >50% of test")
    if sys_summary.get('thermal_throttle_risk'):
        issues.append("🔴 THERMAL RISK — >90°C detected")
    if sys_summary.get('swap_pressure'):
        issues.append("🟡 SWAP PRESSURE — >500MB swap used")
    if sys_summary.get('ram_exhaustion_risk'):
        issues.append("🔴 RAM CRITICAL — <1GB available")
    
    csuite_failures = cs1.get('failed', 0)
    if csuite_failures > 0:
        issues.append(f"🔴 C-SUITE FAILURES — {csuite_failures} dispatch(es) failed")
    
    if not issues:
        print(f"  🟢 ALL CLEAR — System handled the workload within safe margins")
    else:
        for issue in issues:
            print(f"  {issue}")
    
    # Headroom estimate
    if cpu.get('max', 0) < 60:
        print(f"  💪 HEADROOM: Significant — could handle 2-3x this workload")
    elif cpu.get('max', 0) < 80:
        print(f"  💪 HEADROOM: Moderate — ~50% more capacity available")
    elif cpu.get('max', 0) < 95:
        print(f"  ⚠️ HEADROOM: Thin — approaching ceiling under sustained load")
    else:
        print(f"  🚫 HEADROOM: None — at ceiling")
    
    # Save results
    report_path = WORKSPACE / 'memory' / 'stress-test-2026-03-04.json'
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n  Full results: {report_path}")
    print(f"{'='*70}")
    
    return results


if __name__ == '__main__':
    asyncio.run(main())
