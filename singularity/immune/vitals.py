"""
IMMUNE — System Vitals Collection
====================================

Pure system-level resource monitoring.
Separated from gamified health so it can be used independently.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field


import logging
logger = logging.getLogger("singularity.immune.vitals")

@dataclass
class SystemVitals:
    """Point-in-time system resource snapshot."""
    disk_used_pct: float = 0.0
    disk_free_gb: float = 0.0
    memory_used_pct: float = 0.0
    memory_available_mb: float = 0.0
    load_average_1m: float = 0.0
    uptime_seconds: float = 0.0
    timestamp: float = field(default_factory=time.time)


def collect_vitals() -> SystemVitals:
    """Collect current system resource stats."""
    vitals = SystemVitals()

    try:
        stat = os.statvfs(os.path.expanduser("~"))
        total = stat.f_blocks * stat.f_frsize
        free = stat.f_bavail * stat.f_frsize
        if total > 0:
            vitals.disk_used_pct = (1 - free / total) * 100
            vitals.disk_free_gb = free / (1024**3)
    except Exception as e:
        logger.debug(f"Suppressed: {e}")

    try:
        with open("/proc/meminfo") as f:
            meminfo = {}
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    meminfo[key] = int(val)
            total = meminfo.get("MemTotal", 1)
            available = meminfo.get("MemAvailable", 0)
            vitals.memory_used_pct = (1 - available / total) * 100
            vitals.memory_available_mb = available / 1024
    except Exception as e:
        logger.debug(f"Suppressed: {e}")

    try:
        vitals.load_average_1m = os.getloadavg()[0]
    except Exception as e:
        logger.debug(f"Suppressed: {e}")

    try:
        with open("/proc/uptime") as f:
            vitals.uptime_seconds = float(f.read().split()[0])
    except Exception as e:
        logger.debug(f"Suppressed: {e}")

    vitals.timestamp = time.time()
    return vitals
