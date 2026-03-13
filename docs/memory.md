# Memory & Persistence

Singularity wakes up blank every session. Its memory system ensures no knowledge is ever lost.

---

## Memory Systems

### 1. COMB — Lossless Session Bridge

COMB (Contextual Operational Memory Buffer) is the primary persistence mechanism. It stages critical information before shutdown and recalls it on boot.

**How it works:**

```
Session N                          Session N+1
    │                                  │
    ├── Work, discover, decide         ├── comb_recall()
    │                                  │   └── All staged entries loaded
    ├── comb_stage("key findings")     ├── Full context restored
    │                                  │
    └── Shutdown (blank slate)         └── Continue where N left off
```

**Best practices:**
- Stage high-signal information: key decisions, unfinished tasks, critical findings
- Don't stage verbose logs — distill to essential context
- Stage before shutdown, always
- The most dangerous thought: "I'll remember this." You literally reset.

**Storage:** JSON entries with timestamps, stored in `.singularity/comb/`

---

### 2. VDB — Native Vector Database

VDB is Singularity's native hybrid search engine. It combines BM25 (term frequency) and TF-IDF (inverse document frequency) for precise retrieval across all enterprise knowledge.

**What gets indexed:**
- Discord conversation history
- Identity files (SOUL.md, IDENTITY.md, AGENTS.md)
- COMB entries
- Memory files
- Webchat sessions

**Architecture:**

```
Document Ingestion
    │
    ▼
Tokenizer (lowercase, strip punctuation)
    │
    ├── BM25 Index (term frequency, doc length normalization)
    │   └── Parameters: k1=1.5, b=0.75
    │
    └── TF-IDF Index (inverse document frequency weighting)
    │
    ▼
Hybrid Scorer (weighted combination)
    │
    ▼
Results (ranked by relevance score)
```

**Search capabilities:**
- Full-text search across all indexed documents
- Source filtering (discord, identity, comb, memory)
- Configurable result count
- Deduplication on ingestion

**Stats example:**
```
Documents: 132
Terms: 2,472
Disk: 309 KB
Sources: discord (109), identity (11), webchat (11), comb (1)
```

**Why native, not a vector DB service?**
- Zero external dependencies
- Instant startup (no connection overhead)
- Full control over ranking algorithm
- Runs on any hardware without GPU
- BM25 + TF-IDF is proven for keyword-heavy enterprise search

---

### 3. Session Files

Raw conversation history stored as JSON files. Each session gets a unique file in `.singularity/sessions/`.

**Contents:**
- Message history (user + assistant turns)
- Tool calls and results
- Timestamps
- Token usage

---

## Search Protocol

Before investigating any problem, search memory first:

1. `comb_recall` — operational context from last session
2. `memory_recall "keywords"` — VDB hybrid search
3. `web_fetch` — current 2026 knowledge if needed

Found prior work → state it. Didn't find it → proceed fresh.

**Rediscovering known solutions is negligence, not competence.**

---

## Data Lifecycle

```
Raw Data → Ingest → Index → Search → Recall
                        │
                        ├── Deduplication (hash-based)
                        ├── Source tagging
                        └── Persistence to disk
```

**Ingestion triggers:**
- `memory_ingest` tool (manual)
- Automatic on session end
- COMB stage events

**Persistence:**
- VDB index files in `.singularity/vdb/`
- COMB entries in `.singularity/comb/`
- Sessions in `.singularity/sessions/`
- All backed up to COMB Cloud (comb.artifactvirtual.com)

---

*Next: [Self-Optimization (NEXUS) →](nexus.md)*
