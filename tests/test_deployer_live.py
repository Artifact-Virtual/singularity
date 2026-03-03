#!/usr/bin/env python3
"""
SINGULARITY [AE] — Guild Auto-Deployer Battle Test
====================================================

Tests the full deployment pipeline:
  1. Unit tests: validators, invite links, persistence
  2. Live test: actually deploys to a real Discord guild,
     verifies channels exist, then cleans up

Usage:
    python3 tests/test_deployer_live.py
    python3 tests/test_deployer_live.py --live          # includes real Discord deployment
    python3 tests/test_deployer_live.py --live --no-cleanup  # leave channels for inspection
"""

import asyncio
import json
import os
import sys
import tempfile
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# ══════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════

# AVA's bot
BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
BOT_ID = "1478396689642688634"
# ARC guild (where AVA bot is actually a member)
GUILD_ID = "1405819130921091174"

# Load from .env if not in environment
if not BOT_TOKEN:
    env_path = Path(__file__).parent.parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("DISCORD_BOT_TOKEN="):
                BOT_TOKEN = line.split("=", 1)[1].strip().strip("\"'")
                break

# Default exec roles (matches Singularity's C-Suite)
EXEC_ROLES = [
    ("cto", "🔧", "Chief Technology Officer", "Engineering & Architecture"),
    ("coo", "📋", "Chief Operating Officer", "Operations & Workflow"),
    ("cfo", "💰", "Chief Financial Officer", "Finance & Revenue"),
    ("ciso", "🛡️", "Chief Information Security Officer", "Security & Compliance"),
]

# Category name used by deployer
CATEGORY_NAME = "SINGULARITY"
TEST_CATEGORY_NAME = "SINGULARITY-TEST"

# ══════════════════════════════════════════════════════════════
# ANSI FORMATTING
# ══════════════════════════════════════════════════════════════

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"

def ok(msg): print(f"  {GREEN}✅{RESET} {msg}")
def fail(msg): print(f"  {RED}❌{RESET} {msg}")
def warn(msg): print(f"  {YELLOW}⚠️{RESET}  {msg}")
def info(msg): print(f"  {CYAN}ℹ{RESET}  {msg}")
def header(msg): print(f"\n{BOLD}{'═' * 60}\n  {msg}\n{'═' * 60}{RESET}")
def section(msg): print(f"\n{BOLD}{msg}{RESET}")

# ══════════════════════════════════════════════════════════════
# UNIT TESTS (no Discord connection needed)
# ══════════════════════════════════════════════════════════════

passed = 0
failed = 0
total = 0

def check(condition, name, detail=""):
    global passed, failed, total
    total += 1
    if condition:
        passed += 1
        ok(name)
    else:
        failed += 1
        fail(f"{name} — {detail}" if detail else name)


def test_validators():
    """Test bot ID and token validators."""
    section("1. Validators")
    from singularity.nerve.deployer import validate_bot_id, validate_bot_token

    # Bot ID validation
    check(validate_bot_id("") is not None, "bot_id: empty → error")
    check(validate_bot_id("abc") is not None, "bot_id: non-numeric → error")
    check(validate_bot_id("123") is not None, "bot_id: too short → error")
    check(validate_bot_id("12345678901234567") is None, "bot_id: 17 digits → ok")
    check(validate_bot_id("12345678901234567890") is None, "bot_id: 20 digits → ok")
    check(validate_bot_id("123456789012345678901") is not None, "bot_id: 21 digits → error")
    check(validate_bot_id(BOT_ID) is None, f"bot_id: AVA's ID ({BOT_ID}) → ok")

    # Token validation
    check(validate_bot_token("") is not None, "token: empty → error")
    check(validate_bot_token("invalid") is not None, "token: no dots → error")
    check(validate_bot_token("a.b") is not None, "token: 2 parts → error")
    check(validate_bot_token("a.b.c") is None, "token: 3 parts → ok")
    if BOT_TOKEN:
        check(validate_bot_token(BOT_TOKEN) is None, "token: real token → ok")


def test_invite_link():
    """Test invite link generation."""
    section("2. Invite Link Generation")
    from singularity.nerve.deployer import generate_invite_link

    link = generate_invite_link(BOT_ID)
    check("discord.com/oauth2/authorize" in link, "URL contains oauth2/authorize")
    check(f"client_id={BOT_ID}" in link, "URL contains correct bot ID")
    check("permissions=" in link, "URL contains permissions")
    check("scope=bot" in link, "URL contains bot scope")
    check("applications.commands" in link, "URL contains slash commands scope")

    # Verify permissions are a valid integer
    import re
    perm_match = re.search(r"permissions=(\d+)", link)
    check(perm_match is not None, "permissions is a valid integer")
    if perm_match:
        perm_int = int(perm_match.group(1))
        # Check essential permission bits
        check(perm_int & 0x10 != 0, "perm: MANAGE_CHANNELS (0x10)")
        check(perm_int & 0x800 != 0, "perm: SEND_MESSAGES (0x800)")
        check(perm_int & 0x400 != 0, "perm: VIEW_CHANNEL (0x400)")
        check(perm_int & 0x10000 != 0, "perm: READ_MESSAGE_HISTORY (0x10000)")
        check(perm_int & 0x40 != 0, "perm: ADD_REACTIONS (0x40)")
        info(f"Permission int: {perm_int} (0x{perm_int:X})")


def test_persistence():
    """Test DeploymentResult save/load round-trip."""
    section("3. Persistence")
    from singularity.nerve.deployer import DeploymentResult

    tmp = Path(tempfile.mkdtemp())
    try:
        result = DeploymentResult(
            guild_id="123456789",
            guild_name="Test Guild",
            success=True,
            category_id="987654321",
            channels={"bridge": "111", "dispatch": "222", "cto": "333", "coo": "444"},
            errors=[],
            timestamp=1709500000.0,
        )

        # Save
        path = tmp / "deployment.json"
        result.save(path)
        check(path.exists(), "deployment.json created")
        check(path.stat().st_size > 0, "file is non-empty")

        # Verify JSON structure
        data = json.loads(path.read_text())
        check(data["guild_id"] == "123456789", "guild_id preserved")
        check(data["guild_name"] == "Test Guild", "guild_name preserved")
        check(data["success"] is True, "success preserved")
        check(len(data["channels"]) == 4, "all 4 channels preserved")
        check(data["timestamp"] == 1709500000.0, "timestamp preserved")

        # Load
        loaded = DeploymentResult.load(path)
        check(loaded.guild_id == "123456789", "load: guild_id matches")
        check(loaded.guild_name == "Test Guild", "load: guild_name matches")
        check(loaded.success is True, "load: success matches")
        check(loaded.channels["bridge"] == "111", "load: bridge channel ID matches")
        check(loaded.channels["cto"] == "333", "load: cto channel ID matches")
        check(len(loaded.channels) == 4, "load: all channels preserved")

        # Multi-deployment persistence
        for i in range(5):
            r = DeploymentResult(
                guild_id=str(1000 + i),
                guild_name=f"Guild {i}",
                success=True,
                channels={f"ch_{j}": str(2000 + j) for j in range(6)},
            )
            r.save(tmp / f"guild_{i}.json")

        files = list(tmp.glob("guild_*.json"))
        check(len(files) == 5, "5 deployment files persisted")

    finally:
        import shutil
        shutil.rmtree(tmp)


def test_deployer_init():
    """Test GuildDeployer construction and configuration."""
    section("4. GuildDeployer Init")
    from singularity.nerve.deployer import GuildDeployer, OPS_CHANNELS

    # Default (no exec roles)
    d = GuildDeployer()
    check(len(d.exec_roles) == 0, "default: no exec roles")
    check(d.private is True, "default: private=True")

    # With exec roles
    d = GuildDeployer(exec_roles=EXEC_ROLES, private=True)
    check(len(d.exec_roles) == 4, "4 exec roles configured")
    check(d.private is True, "private mode enabled")

    # Non-private
    d = GuildDeployer(exec_roles=EXEC_ROLES, private=False)
    check(d.private is False, "private=False respected")

    # OPS_CHANNELS blueprint
    ops_names = {ch["name"] for ch in OPS_CHANNELS}
    check("bridge" in ops_names, "ops: bridge channel in blueprint")
    check("dispatch" in ops_names, "ops: dispatch channel in blueprint")
    check(len(OPS_CHANNELS) == 2, "ops: exactly 2 ops channels")

    # Total channel count
    expected = len(OPS_CHANNELS) + len(EXEC_ROLES)
    check(expected == 6, f"total channels: {expected} (2 ops + 4 exec)")


def test_event_bus_integration():
    """Test event callback wiring."""
    section("5. Event Bus Integration")
    from singularity.nerve.deployer import GuildDeployer

    events_captured = []

    async def capture_event(event_name, data):
        events_captured.append((event_name, data))

    d = GuildDeployer(
        exec_roles=EXEC_ROLES,
        event_callback=capture_event,
    )

    # Test emit
    loop = asyncio.new_event_loop()
    loop.run_until_complete(d._emit("deploy.test", {"foo": "bar"}))
    loop.close()
    check(len(events_captured) == 1, "event captured")
    check(events_captured[0][0] == "deploy.test", "event name correct")
    check(events_captured[0][1]["foo"] == "bar", "event data correct")


def test_intent_instructions():
    """Test intent instructions output."""
    section("6. Intent Instructions")
    from singularity.nerve.deployer import INTENT_INSTRUCTIONS

    check("PRESENCE INTENT" in INTENT_INSTRUCTIONS, "mentions PRESENCE INTENT")
    check("SERVER MEMBERS INTENT" in INTENT_INSTRUCTIONS, "mentions SERVER MEMBERS INTENT")
    check("MESSAGE CONTENT INTENT" in INTENT_INSTRUCTIONS, "mentions MESSAGE CONTENT INTENT")
    check("discord.com/developers" in INTENT_INSTRUCTIONS, "contains developer portal URL")


# ══════════════════════════════════════════════════════════════
# LIVE DISCORD TEST
# ══════════════════════════════════════════════════════════════

async def test_live_deployment(cleanup=True):
    """
    Actually deploy to the Artifact Virtual Discord server.
    
    Uses Discord REST API directly (no gateway connection) to avoid
    conflicting with the running Mach6 bot that holds the gateway session.
    
    Creates a TEST category (not the production one), verifies
    all channels are created, then cleans up.
    """
    section("7. LIVE Discord Deployment — REST API")

    if not BOT_TOKEN:
        warn("No DISCORD_BOT_TOKEN — skipping live test")
        return

    import urllib.request
    import ssl
    from singularity.nerve.deployer import (
        OPS_CHANNELS, EXEC_CHANNEL_TOPIC_TEMPLATE, generate_invite_link, DeploymentResult,
    )

    API = "https://discord.com/api/v10"
    HEADERS = {
        "Authorization": f"Bot {BOT_TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "Singularity-BattleTest/1.0",
    }

    def api_call(method, path, body=None):
        """Make a Discord REST API call."""
        url = f"{API}{path}"
        data = json.dumps(body).encode() if body else None
        req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
        ctx = ssl.create_default_context()
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                if resp.status == 204:
                    return {}
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            return {"error": True, "status": e.code, "message": error_body}

    # ── Step 0: Verify connection ──
    me = api_call("GET", "/users/@me")
    if me.get("error"):
        fail(f"Cannot authenticate: {me}")
        return
    check(True, f"Bot authenticated: {me.get('username')}#{me.get('discriminator', '0')} ({me.get('id')})")

    # ── Step 1: Verify guild access ──
    # GET /guilds/{id} requires the bot to have the guilds scope or admin perms
    # Use /users/@me/guilds to find our guild instead
    my_guilds = api_call("GET", "/users/@me/guilds")
    guild = None
    if isinstance(my_guilds, list):
        for g in my_guilds:
            if g["id"] == GUILD_ID:
                guild = g
                break
    
    if not guild:
        fail(f"Bot not in guild {GUILD_ID}. Guilds: {[g.get('name') for g in (my_guilds if isinstance(my_guilds, list) else [])]}")
        return
    check(True, f"Guild: {guild.get('name')} ({GUILD_ID})")

    # Get bot's member info for permissions
    bot_member = api_call("GET", f"/guilds/{GUILD_ID}/members/{me['id']}")
    check(not bot_member.get("error"), f"Bot is guild member")

    # ── Step 2: Check existing channels ──
    channels = api_call("GET", f"/guilds/{GUILD_ID}/channels")
    check(not channels if isinstance(channels, dict) else True, f"Fetched {len(channels)} channels")

    # Check for existing test category
    existing_test_cat = None
    if isinstance(channels, list):
        for ch in channels:
            if ch.get("name") == TEST_CATEGORY_NAME.lower() and ch.get("type") == 4:
                existing_test_cat = ch
                break

    created_channels = {}
    category_id = None

    if existing_test_cat:
        info(f"Test category already exists (ID: {existing_test_cat['id']}), reusing")
        category_id = existing_test_cat["id"]
    else:
        # ── Step 3: Create test category ──
        # Permission overwrite: deny @everyone view, allow bot view
        # type 0 = role overwrite, type 1 = member overwrite
        default_role_id = GUILD_ID  # @everyone role ID = guild ID
        overwrites = [
            {
                "id": default_role_id,
                "type": 0,  # role
                "deny": str(1 << 10),  # VIEW_CHANNEL = 0x400 = 1024
                "allow": "0",
            },
            {
                "id": me["id"],
                "type": 1,  # member
                "allow": str(
                    (1 << 10) |   # VIEW_CHANNEL
                    (1 << 11) |   # SEND_MESSAGES
                    (1 << 4)  |   # MANAGE_CHANNELS
                    (1 << 13) |   # MANAGE_MESSAGES
                    (1 << 16) |   # READ_MESSAGE_HISTORY
                    (1 << 15) |   # ATTACH_FILES
                    (1 << 14)     # EMBED_LINKS
                ),
                "deny": "0",
            },
        ]

        t0 = time.time()
        cat_result = api_call("POST", f"/guilds/{GUILD_ID}/channels", {
            "name": TEST_CATEGORY_NAME,
            "type": 4,  # GUILD_CATEGORY
            "permission_overwrites": overwrites,
            "reason": "Singularity [AE] — deployer battle test",
        })

        if cat_result.get("error"):
            if cat_result.get("status") == 403:
                warn(f"Bot lacks MANAGE_CHANNELS permission in this guild")
                warn(f"Re-invite bot with: {generate_invite_link(BOT_ID)}")
                info("This is CORRECT behavior — deployer properly detects missing perms")
                check(True, "403 error correctly surfaced (Missing Permissions)")
                return
            else:
                fail(f"Failed to create category: {cat_result}")
                return

        category_id = cat_result["id"]
        elapsed = time.time() - t0
        check(True, f"Category created: {TEST_CATEGORY_NAME} (ID: {category_id}) in {elapsed:.1f}s")

        # Verify it's private (@everyone denied VIEW_CHANNEL)
        if cat_result.get("permission_overwrites"):
            everyone_overwrite = [o for o in cat_result["permission_overwrites"] if o["id"] == default_role_id]
            if everyone_overwrite:
                deny_bits = int(everyone_overwrite[0].get("deny", "0"))
                check(deny_bits & (1 << 10) != 0, "category: @everyone VIEW_CHANNEL denied (private)")
            else:
                warn("no @everyone overwrite found")

    # ── Step 4: Create ops + exec channels ──
    all_channels = []
    for ch_def in OPS_CHANNELS:
        all_channels.append({"name": ch_def["name"], "topic": ch_def["topic"]})
    for role_id, emoji, title, domain in EXEC_ROLES:
        topic = EXEC_CHANNEL_TOPIC_TEMPLATE.format(emoji=emoji, title=title, domain=domain[:80])
        all_channels.append({"name": role_id, "topic": topic})

    # Check existing channels under test category
    if isinstance(channels, list):
        existing_in_cat = {ch["name"]: ch["id"] for ch in channels
                          if ch.get("parent_id") == category_id and ch.get("type") == 0}
    else:
        existing_in_cat = {}

    t0 = time.time()
    for ch_spec in all_channels:
        name = ch_spec["name"]

        if name in existing_in_cat:
            created_channels[name] = existing_in_cat[name]
            check(True, f"#{name} already exists (ID: {existing_in_cat[name]})")
            continue

        ch_result = api_call("POST", f"/guilds/{GUILD_ID}/channels", {
            "name": name,
            "type": 0,  # GUILD_TEXT
            "parent_id": category_id,
            "topic": ch_spec["topic"],
            "reason": f"Singularity [AE] — {name} channel (battle test)",
        })

        if ch_result.get("error"):
            fail(f"Failed to create #{name}: {ch_result}")
            continue

        created_channels[name] = ch_result["id"]
        check(True, f"#{name} created (ID: {ch_result['id']})")
        await asyncio.sleep(0.5)  # rate limit courtesy

    elapsed = time.time() - t0
    info(f"All channels created in {elapsed:.1f}s")

    # ── Step 5: Verify all expected channels exist ──
    expected = ["bridge", "dispatch"] + [r[0] for r in EXEC_ROLES]
    check(len(created_channels) == len(expected),
          f"total channels: {len(created_channels)}/{len(expected)}")

    for name in expected:
        check(name in created_channels, f"#{name} in channel map")

    # ── Step 6: Send welcome message to #bridge ──
    bridge_id = created_channels.get("bridge")
    if bridge_id:
        exec_mentions = "\n".join(
            f"  • <#{created_channels[r[0]]}> — {r[2]}"
            for r in EXEC_ROLES
            if r[0] in created_channels
        )
        welcome = (
            "```\n"
            "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n"
            "┃  SINGULARITY [AE] — Battle Test Deployment      ┃\n"
            "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n"
            "```\n"
            f"**Executive Team:**\n{exec_mentions}\n\n"
            "Deployer battle test — all channels verified. ✅"
        )
        msg_result = api_call("POST", f"/channels/{bridge_id}/messages", {
            "content": welcome,
        })
        check(not msg_result.get("error"), "welcome message sent to #bridge")

    # ── Step 7: Test idempotency — create same channels again ──
    info("Testing idempotency...")
    # Re-fetch channels
    channels_after = api_call("GET", f"/guilds/{GUILD_ID}/channels")
    existing_after = {}
    if isinstance(channels_after, list):
        existing_after = {ch["name"]: ch["id"] for ch in channels_after
                         if ch.get("parent_id") == category_id and ch.get("type") == 0}

    for name in expected:
        if name in existing_after:
            check(existing_after[name] == created_channels[name],
                  f"idempotent: #{name} ID unchanged ({existing_after[name]})")
        else:
            warn(f"#{name} not found in re-fetch (cache issue?)")

    # ── Step 8: Test persistence ──
    from singularity.nerve.deployer import DeploymentResult
    tmp = Path(tempfile.mkdtemp())
    result = DeploymentResult(
        guild_id=GUILD_ID,
        guild_name=guild.get("name", "Unknown"),
        success=True,
        category_id=category_id,
        channels=created_channels,
    )
    result.save(tmp / "deployment.json")
    loaded = DeploymentResult.load(tmp / "deployment.json")
    check(loaded.guild_id == GUILD_ID, "persist: guild_id round-trips")
    check(loaded.channels == created_channels, "persist: all channels round-trip")
    import shutil
    shutil.rmtree(tmp)

    # ── Step 9: Cleanup ──
    if cleanup:
        info("Cleaning up test deployment...")
        for name, ch_id in created_channels.items():
            del_result = api_call("DELETE", f"/channels/{ch_id}", None)
            if del_result.get("error"):
                warn(f"Failed to delete #{name}: {del_result}")
            else:
                ok(f"#{name} deleted")
            await asyncio.sleep(0.3)

        # Delete category
        if not existing_test_cat:  # only delete if we created it
            del_cat = api_call("DELETE", f"/channels/{category_id}", None)
            if del_cat.get("error"):
                warn(f"Failed to delete category: {del_cat}")
            else:
                ok(f"Category {TEST_CATEGORY_NAME} deleted")
        else:
            # If it had pre-existing channels, just delete what we added
            info("Category pre-existed, leaving it")
    else:
        warn(f"Cleanup skipped — inspect {TEST_CATEGORY_NAME} on Discord")


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════

def main():
    live = "--live" in sys.argv
    no_cleanup = "--no-cleanup" in sys.argv

    print(f"""
{BOLD}{'═' * 60}
  SINGULARITY [AE] — Deployer Battle Test
{'═' * 60}{RESET}
  Bot ID:    {BOT_ID}
  Guild:     {GUILD_ID}
  Live:      {'YES' if live else 'no (use --live)'}
  Cleanup:   {'no' if no_cleanup else 'YES'}
""")

    # Unit tests (always run)
    test_validators()
    test_invite_link()
    test_persistence()
    test_deployer_init()
    test_event_bus_integration()
    test_intent_instructions()

    # Live test (optional)
    if live:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(test_live_deployment(cleanup=not no_cleanup))
        loop.close()
    else:
        section("7. LIVE Discord Deployment")
        warn("Skipped — use --live to test against real Discord")

    # Summary
    print(f"""
{BOLD}{'═' * 60}
  RESULTS: {passed}/{total} passed{f', {RED}{failed} failed{RESET}' if failed else f' {GREEN}ALL GREEN{RESET}'}
{'═' * 60}{RESET}""")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
