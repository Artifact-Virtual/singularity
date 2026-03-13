# Integrations Architecture

**Module:** Integrations  
**Version:** 1.0.0  
**Date:** 2026-02-02

---

## Overview

The Integrations module provides connectivity to external platforms, social media, data providers, and messaging services. These integrations serve as **triggers** (inputs) and **actions** (outputs) for the Workflow system.

---

## Integration Categories

### 1. Social Media Platforms

| Platform | Features | Auth Method |
|----------|----------|-------------|
| **Twitter/X** | Post tweets, read timeline, DMs, mentions | OAuth 2.0 |
| **Discord** | Send messages, manage servers, webhooks, bots | OAuth 2.0 / Bot Token |
| **LinkedIn** | Post updates, company pages, messaging | OAuth 2.0 |
| **Instagram** | Post media, stories, comments | OAuth 2.0 (Meta) |
| **Reddit** | Post, comment, read subreddits, monitor | OAuth 2.0 |

### 2. Data Providers

| Provider | Data Types | Auth Method |
|----------|-----------|-------------|
| **FRED** | Economic data, indicators, series | API Key |
| **Binance** | Crypto prices, trades, account | API Key + Secret |
| **Yahoo Finance** | Stocks, forex, options, news | API Key |
| **Alpha Vantage** | Stocks, forex, crypto, technicals | API Key |
| **CoinGecko** | Crypto prices, market data | API Key (optional) |

### 3. Communication

| Service | Features | Auth Method |
|---------|----------|-------------|
| **Slack** | Messages, channels, webhooks | OAuth 2.0 |
| **Telegram** | Messages, bots, channels | Bot Token |
| **Email (SMTP)** | Send emails | SMTP credentials |
| **Webhooks** | Custom HTTP endpoints | None/Custom |

### 4. Cloud & DevOps

| Service | Features | Auth Method |
|---------|----------|-------------|
| **GitHub** | Repos, issues, PRs, actions | OAuth 2.0 / PAT |
| **AWS** | S3, Lambda, EC2, etc. | Access Keys |
| **GCP** | Cloud services | Service Account |

---

## Integration Data Model

```typescript
type Integration = {
  id: string;
  organizationId: string;
  type: IntegrationType;
  name: string;
  description?: string;
  credentials: EncryptedCredentials;
  config: IntegrationConfig;
  status: 'active' | 'inactive' | 'error';
  lastHealthCheck: Date;
  createdAt: Date;
  updatedAt: Date;
};

type IntegrationType =
  | 'twitter'
  | 'discord'
  | 'linkedin'
  | 'instagram'
  | 'reddit'
  | 'fred'
  | 'binance'
  | 'yfinance'
  | 'slack'
  | 'telegram'
  | 'email'
  | 'webhook'
  | 'github';

type IntegrationConfig = {
  // Platform-specific settings
  [key: string]: unknown;
};

type EncryptedCredentials = {
  encryptedData: string;
  iv: string;
  tag: string;
};
```

---

## Platform Specifications

### Twitter/X Integration

**Triggers (Inputs):**
- New mention
- New DM
- Keyword search match
- New follower
- Scheduled poll

**Actions (Outputs):**
- Post tweet
- Reply to tweet
- Send DM
- Like tweet
- Retweet
- Follow/Unfollow user

**Required Scopes:**
```
tweet.read, tweet.write, users.read, dm.read, dm.write, follows.read, follows.write
```

---

### Discord Integration

**Triggers (Inputs):**
- New message in channel
- Message contains keyword
- New member joined
- Reaction added
- Slash command invoked
- Scheduled event

**Actions (Outputs):**
- Send message to channel
- Send embed message
- Create thread
- Add/remove role
- Kick/ban user
- Create channel
- Manage server settings

**Required Permissions:**
```
SEND_MESSAGES, MANAGE_MESSAGES, MANAGE_CHANNELS, MANAGE_ROLES, KICK_MEMBERS, BAN_MEMBERS
```

---

### LinkedIn Integration

**Triggers (Inputs):**
- New connection request
- New message
- Post engagement (likes, comments)
- Profile view

**Actions (Outputs):**
- Create post (text, image, article)
- Comment on post
- Send message
- Share post
- Company page post

---

### Instagram Integration

**Triggers (Inputs):**
- New comment on post
- New follower
- Story mention
- Hashtag mention

**Actions (Outputs):**
- Post image/video
- Post story
- Reply to comment
- Send DM
- Schedule post

---

### Reddit Integration

**Triggers (Inputs):**
- New post in subreddit
- Keyword match in subreddit
- Reply to comment
- Upvote threshold reached

**Actions (Outputs):**
- Create post (text, link, image)
- Comment on post
- Upvote/downvote
- Send private message

---

### Data Provider Integrations

#### FRED (Federal Reserve Economic Data)

**Data Available:**
- GDP, inflation, unemployment
- Interest rates
- Money supply
- Economic indicators

**Triggers:**
- Data series updated
- Scheduled fetch
- Value threshold crossed

**Actions:**
- Fetch series data
- Get multiple series
- Search series

---

#### Binance

**Data Available:**
- Real-time prices
- Order book
- Trade history
- Account balance
- Open orders

**Triggers:**
- Price crosses threshold
- New trade executed
- Order filled
- Account balance change

**Actions:**
- Place market order
- Place limit order
- Cancel order
- Get account info
- Get price data

---

#### Yahoo Finance

**Data Available:**
- Stock prices
- Options data
- Company financials
- News
- Historical data

**Triggers:**
- Price threshold
- Volume spike
- News alert
- Earnings release

**Actions:**
- Fetch current price
- Get historical data
- Get financials
- Search symbols

---

## API Endpoints

### Integration Management

```
GET    /api/integrations                    # List all integrations
GET    /api/integrations/:id                # Get integration details
POST   /api/integrations                    # Create new integration
PUT    /api/integrations/:id                # Update integration
DELETE /api/integrations/:id                # Delete integration
POST   /api/integrations/:id/test           # Test connection
GET    /api/integrations/:id/health         # Health check
```

### OAuth Flow

```
GET    /api/integrations/oauth/:type/authorize   # Start OAuth flow
GET    /api/integrations/oauth/:type/callback    # OAuth callback
POST   /api/integrations/oauth/:type/refresh     # Refresh token
```

### Integration Actions

```
POST   /api/integrations/:id/execute             # Execute action
GET    /api/integrations/:id/triggers            # List available triggers
GET    /api/integrations/:id/actions             # List available actions
```

---

## Security

### Credential Storage

- All credentials encrypted with AES-256-GCM
- Encryption key stored in secure vault (HashiCorp Vault / AWS KMS)
- Credentials never logged or exposed in API responses
- Token refresh handled automatically

### Rate Limiting

Per-integration rate limits respect platform limits:

| Platform | Rate Limit |
|----------|-----------|
| Twitter | 300 tweets/3hr |
| Discord | 50 msgs/sec per channel |
| LinkedIn | 100 posts/day |
| Binance | 1200/min |
| Reddit | 60 req/min |

---

## UI Components

### Integration Catalog

Grid view of available integrations with:
- Platform logo
- Connection status
- Quick connect button
- Last activity

### Integration Detail

- Connection settings
- Credential management
- Test connection
- Usage statistics
- Available triggers/actions

---

**Document Owner:** Integration Team
