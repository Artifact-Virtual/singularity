# VDB — Native Vector Database

> BM25 + TF-IDF hybrid search engine for enterprise memory.

## Overview

VDB (Vector Database) is Singularity's native search engine, providing persistent hybrid search across all enterprise knowledge. It combines BM25 (term frequency, probabilistic retrieval) with TF-IDF (term frequency–inverse document frequency) for high-relevance results without external dependencies.

**No cloud APIs. No vector embeddings. No GPU required.** Pure algorithmic search running locally with zero latency.

---

## Architecture

```
┌────────────────────────────────────────────┐
│                  VDB Engine                │
├──────────────────┬─────────────────────────┤
│   BM25 Scorer    │   TF-IDF Scorer         │
│  (probabilistic) │   (statistical)         │
├──────────────────┴─────────────────────────┤
│            Hybrid Fusion Layer             │
│    (weighted combination of both scores)   │
├────────────────────────────────────────────┤
│         Inverted Index + Doc Store         │
├────────────────────────────────────────────┤
│        Persistent Storage (JSON)           │
│        .singularity/vdb/                   │
└────────────────────────────────────────────┘
```

### How It Works

1. **Ingestion:** Documents are tokenized, stemmed, and indexed into an inverted index
2. **BM25 Scoring:** Probabilistic relevance scoring using term frequency, document length normalization, and inverse document frequency
3. **TF-IDF Scoring:** Statistical weighting — terms that are frequent in a document but rare across the corpus score highest
4. **Hybrid Fusion:** Both scores are combined with configurable weighting (default: 0.6 BM25 + 0.4 TF-IDF)
5. **Deduplication:** Document fingerprinting prevents re-indexing identical content

### BM25 Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `k1` | 1.5 | Term frequency saturation. Higher = more weight on term frequency |
| `b` | 0.75 | Document length normalization. 1.0 = full normalization, 0.0 = none |

### Why Not Vector Embeddings?

- **Zero dependencies:** No embedding models, no GPU, no API calls
- **Deterministic:** Same query always returns same results
- **Explainable:** You can trace exactly why a result was returned
- **Fast:** Sub-millisecond search on enterprise-scale corpora
- **Persistent:** Survives restarts, stored as simple JSON

For Singularity's use case (searching operational memory, conversation history, identity files), BM25+TF-IDF outperforms embedding-based search on precision for exact and partial keyword matches.

---

## Data Sources

VDB indexes content from multiple sources:

| Source | Description | Example Content |
|--------|-------------|-----------------|
| `discord` | Discord conversation history | Messages, commands, responses |
| `identity` | Identity and configuration files | SOUL.md, IDENTITY.md, AGENTS.md |
| `webchat` | HTTP API chat sessions | ERP chat, API interactions |
| `comb` | COMB staged memory | Operational state, session summaries |
| `memory` | Manually indexed memory files | Notes, reports, findings |

---

## Usage

### Search (via Tool)

```
memory_recall(query="ERP prisma fix", k=5, source="discord")
```

Parameters:
- `query` (required) — Search terms
- `k` (optional, default 5) — Number of results to return
- `source` (optional) — Filter by source type

### Ingest (via Tool)

```
memory_ingest()
```

Indexes all new content from conversations, identity files, and COMB. Deduplication prevents re-processing already-indexed documents.

### Stats (via Tool)

```
memory_stats()
```

Returns:
```
Documents: 132
Terms: 2472
Disk: 316,266 bytes (308.9 KB)
Sources:
  discord: 109
  identity: 11
  webchat: 11
  comb: 1
```

---

## Implementation Details

### Tokenization Pipeline

1. **Lowercase** — Case-insensitive matching
2. **Punctuation removal** — Strip non-alphanumeric characters
3. **Whitespace split** — Token boundary detection
4. **Stop word removal** — Common words filtered (the, is, at, etc.)
5. **Minimum length** — Tokens under 2 characters discarded

### Storage Format

VDB persists to `.singularity/vdb/` as JSON:

- `index.json` — Inverted index (term → document IDs + positions)
- `docs.json` — Document store (ID → content, metadata, source)
- `meta.json` — Index metadata (document count, term count, avg doc length)

### Performance

| Metric | Value |
|--------|-------|
| Index 100 documents | < 100ms |
| Search 2,500 terms | < 5ms |
| Disk usage per 100 docs | ~250KB |
| Memory footprint | ~10MB for 1,000 docs |

### Deduplication

Each document is fingerprinted using a hash of its content. On ingest, if the fingerprint already exists in the index, the document is skipped. This prevents re-indexing and index bloat.

---

## Comparison with HEKTOR

HEKTOR is the enterprise knowledge daemon that provides an alternative search path:

| Feature | VDB (Native) | HEKTOR (Daemon) |
|---------|-------------|-----------------|
| Architecture | In-process library | Standalone daemon |
| Search Method | BM25 + TF-IDF | BM25 + TF-IDF (same algorithms) |
| Latency | Sub-ms (in-process) | ~5-10ms (IPC) |
| Persistence | JSON files | SQLite |
| Independence | Zero dependencies | Requires daemon process |
| Use Case | Agent memory search | Enterprise-wide knowledge |

Both use the same hybrid search algorithms. VDB is embedded directly in Singularity's process for zero-latency memory operations. HEKTOR runs as a separate daemon for enterprise-scale knowledge indexing.

---

*See [Memory & COMB](memory.md) for persistence, [Architecture](architecture.md) for system design.*
