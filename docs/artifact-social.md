# Artifact Social — Enterprise Social Intelligence

> Multi-platform social media management and intelligence. One CLI. All platforms. Zero cloud lock-in.

Part of the Singularity [AE] runtime. Managed by the CMO executive.

## Overview

Artifact Social is Singularity's social media management and intelligence subsystem. It unifies multi-platform publishing, content ingestion, ML analytics, and audience intelligence under the CMO executive's domain.

Three codebases power the stack:

- **NEXUS CLI** — unified command-line interface across all platforms
- **Arty Connectors** — platform adapters, ingest bots, ML pipeline
- **CMO Pipeline** — campaign production, review gates, publishing workflow

## Platforms (7 Active)

| Platform | Mode | Status |
|:---------|:-----|:-------|
| Twitter / X | API (Tweepy) + Selenium | ✅ Connector built |
| LinkedIn | API + Selenium | ✅ Connector built |
| Instagram | Selenium | ✅ Connector built |
| Facebook | Graph API + Selenium | ✅ Connector built |
| Telegram | Bot API + user session | ✅ Connector built |
| Discord | Bot API + webhooks | ✅ Connector built |
| Substack | Selenium | ✅ Connector built |

Each connector implements a unified interface: `post`, `feed`, `comment`, `like`, `thread`, `analytics`, `ingest`. Platform-specific features extend the base without breaking the common model.

### Dual-Mode Connectors

Every connector uses **API-first with Selenium fallback**. When a platform provides an API, we use it. When they don't (or charge enterprise pricing), headless Chrome takes over with:

- Cookie persistence — sessions survive restarts
- Anti-detection — human-like interaction patterns, randomized delays
- Rate limiting — per-platform configurable, automatic backoff
- Session recovery — expired sessions re-authenticate automatically

## NEXUS CLI

```bash
# Publishing
nexus twitter post "Shipping v2.0 today."
nexus linkedin post "New paper published." --image paper.png
nexus twitter thread "1/ Here's why..." "2/ Because..." "3/ ..."
nexus all post "Major release."

# Feed ingestion
nexus twitter feed
nexus twitter feed --search "AI agents"
nexus linkedin feed

# Engagement
nexus twitter like <tweet_id>
nexus linkedin comment <post_id> "Great insight."

# Analytics
nexus twitter analytics
nexus all analytics

# Scheduling
nexus twitter post "Drops at midnight." --schedule "2026-03-15 00:00"
```

### Flags

```
--image <path>        Attach image
--video <path>        Attach video
--schedule <datetime> Future publish
--dry-run             Preview without publishing
--format json         JSON output
--cookies <path>      Custom cookie jar
--headless false      Visible browser (debug)
```

## Intelligence Engine

### Content Ingestion Pipeline

```
Platform Feeds → Raw Content → Deduplication → Classification → Storage
                                    ↓
                            ML Processing
                                    ↓
                    Sentiment · Topics · Trends · Scores
                                    ↓
                         Analytics + Alerts
```

### ML Modules

| Module | Purpose |
|:-------|:--------|
| Sentiment Analysis | Score content positive/negative/neutral, track trends |
| Topic Extraction | TF-IDF + neural embedding hybrid, identify engagement drivers |
| Trend Detection | Surface emerging topics, time-series analysis on content velocity |
| Audience Clustering | Segment followers by behavior, interests, engagement patterns |
| Engagement Scoring | Predict content performance, score drafts before publishing |
| Async Training | Fine-tune models on engagement data, models improve with usage |

## CMO Pipeline

The CMO executive manages the campaign production pipeline:

```
Brief → Queue → CMO Production → Platform-specific content → Review → Approve → Publish → Archive
```

- **10 platform directories** with platform-specific templates and asset specs
- **Review gate** — nothing publishes without approval
- **Brand enforcement** — all content follows brand guidelines
- **One source, ten outputs** — one brief produces platform-native content for each channel

## Browser Engine

Shared headless Chrome factory via Selenium WebDriver:

- Single driver instance, reused across platforms
- Cookie persistence — login once, use forever
- Anti-detection — human-like scrolling, randomized delays
- Multi-account — separate cookie jars per account

## File Locations

| Component | Path |
|:----------|:-----|
| NEXUS CLI | `projects/social/` |
| Arty Connectors | `enterprise/divisions/departments/marketing/arty-connectors/` |
| CMO Pipeline | `executives/cmo/pipeline/` |
| Brand System | `executives/cmo/brand/` |
| Cookie Jars | `~/.social/` |

## Security

- API keys stored in Crypt vault, never in config files
- Cookie jars encrypted at rest
- Rate limiting prevents platform bans
- Anti-detection patterns for Selenium mode
- All data stored locally, zero cloud sync
- Dual-mode ensures resilience against API changes
