# Gida

**A social marketplace where clients consult verified construction professionals, pay by the minute, and release funds only when the work is proven, all settled on the Stellar Network.**

![License: MIT](https://img.shields.io/badge/License-MIT-green) ![Network: Stellar](https://img.shields.io/badge/Network-Stellar-blue) ![Contracts: Soroban](https://img.shields.io/badge/Contracts-Soroban-purple) ![Monorepo: pnpm](https://img.shields.io/badge/Monorepo-pnpm-orange) ![Build: Turborepo](https://img.shields.io/badge/Build-Turborepo-black)

> *Gida* is the Hausa word for "home". Everyone who builds is really building a home, and Gida makes sure the trust behind it is solid.

---

## What is Gida?

Building something, whether a house, a shop, or a renovation, is one of the biggest financial decisions most people ever make. It is also one of the easiest places to get cheated: fake credentials, inflated quotes, contractors who vanish after a deposit, and no honest way to get a quick expert opinion before committing.

Gida is a social app that connects **clients** with **construction professionals** (architects, structural engineers, quantity surveyors, electricians, plumbers, masons, project managers). Clients post projects, ask questions in public or private threads, and book paid consultations. AI helps both sides move faster, and Stellar makes the money and the reputation trustworthy.

| Problem in construction today | Gida's answer |
|---|---|
| Hard to know who is genuinely qualified | Credentials issued as non-transferable Stellar assets, checked on-chain |
| Cross-border or small consultations are too costly to pay for | Pay-per-minute micro-payments in XLM or Stellar USDC |
| Contractors paid upfront, then disappear | Soroban milestone escrow, released only on peer-verified proof |
| Clients can't judge quotes or site problems | AI estimating, defect diagnosis, and plain-language explainers |
| Cannot afford big projects in one go | Community build circles (rotating savings and group buying) |
| Banking barriers | Works with any Stellar wallet on a basic smartphone, with local-currency on/off-ramps |

---

## Feature Overview

### Core social features
- Public **project feeds** where clients post briefs, photos, and questions
- **Professional profiles** with verified credentials, portfolio, and on-chain reputation
- Threaded Q&A, follows, saved projects, and neighbourhood groups
- **Live consultations** (chat, voice, video) billed per minute

### AI features
| Feature | What it does |
|---|---|
| **Site Snap** | Upload a photo of a crack, damp patch, or wiring job. The AI flags likely causes, a severity level, and which type of professional to call. |
| **Brief Builder** | Turns a rough description ("2-bedroom bungalow, 120 m²") into a structured brief with a draft bill of quantities and a cost range. |
| **Pro Matchmaker** | Ranks professionals by trade, location, verified credentials, response time, and past outcomes. |
| **Quote Checker** | Compares a contractor's quote against the Brief Builder estimate and local price signals, and highlights suspicious line items. |
| **Consult Notes** | Summarises each consultation into action items. The summary hash is anchored on Stellar so neither side can later dispute what was advised. |

> AI output is advisory only. It never replaces a licensed professional, and every AI estimate is labelled as such in the UI.

### Three unique features

#### 1. Pour-by-Pour Escrow (milestone-verified payments)
Project funds are locked in a Soroban escrow contract and split into milestones (foundation, roofing, wiring, finishing). A milestone is released only when:
1. The contractor uploads geotagged, timestamped proof (the file hash is recorded on-chain), **and**
2. An independent **peer inspector** (a verified professional who stakes a small deposit) confirms it.

Disputes freeze remaining funds and go to a randomly selected panel of staked inspectors.

#### 2. Proof-of-Craft Credentials (non-transferable reputation)
Licenses, certifications, and completed jobs are issued as **authorization-required, clawback-enabled Stellar assets** that cannot be traded. Issuers (trade bodies, training centres, or past clients) sign them. Each professional gets a transparent **Craft Score** computed from:
- Verified credentials
- Milestones completed and verified
- Dispute outcomes
- Client ratings weighted by the client's own on-chain history

Credentials can be revoked by the issuer, so expired or fraudulent licenses stop counting immediately.

#### 3. Build Circles (community savings and group buying)
Inspired by rotating savings groups such as *ajo*, *esusu*, and *chama*. A group of neighbours or family members contributes a fixed amount of USDC per cycle into a Soroban pool. Each cycle, one member receives the pot to fund their build, repair, or material purchase. Circles can also:
- **Group-buy materials** (cement, roofing sheets, tiles) for bulk pricing
- **Split a consultation fee** among members with the same problem (for example, a shared drainage issue)
- Use on-chain contribution history as a trust signal for future circles

---

## Monorepo Structure

```
gida/
├── packages/
│   ├── contracts/     # @gida/contracts  — Soroban smart contracts (Rust)
│   ├── brain/         # @gida/brain      — AI services (TypeScript + Python workers)
│   ├── relay/         # @gida/relay      — Backend API, realtime chat and call billing (Node.js)
│   └── site/          # @gida/site       — Client and professional app (Next.js / PWA)
├── docs/              # Architecture, whitepaper, scoring methodology, API reference
├── scripts/           # Testnet bootstrap, seed data, deploy helpers
├── audits/            # Smart contract audit reports
├── pnpm-workspace.yaml
├── turbo.json
└── README.md          ← you are here
```

---

## Packages

### @gida/contracts
Soroban smart contracts written in Rust, deployable to Stellar Testnet and Mainnet.

| Contract | Purpose |
|---|---|
| `ConsultMeter` | Opens a payment session for a live consultation and streams per-minute micro-payments, with a prepaid cap |
| `PourEscrow` | Holds project funds, tracks milestones, and releases payments on verified proof |
| `InspectorPool` | Manages inspector staking, assignment, voting, and slashing |
| `CraftRegistry` | Records credential issuers, revocations, and the Craft Score inputs |
| `CircleVault` | Runs Build Circles: contribution cycles, payout order, and group-buy pools |
| `NoteAnchor` | Stores hashes of consultation notes and milestone evidence |

```
packages/contracts/
├── src/
│   ├── consult_meter.rs
│   ├── pour_escrow.rs
│   ├── inspector_pool.rs
│   ├── craft_registry.rs
│   ├── circle_vault.rs
│   └── note_anchor.rs
├── tests/
├── Cargo.toml
└── README.md
```

**Stack:** Rust · Soroban SDK · Stellar CLI

### @gida/brain
The AI layer, kept separate so models can be swapped without touching the app.

```
packages/brain/
├── src/
│   ├── site_snap/        # Image analysis for defects and site issues
│   ├── brief_builder/    # Brief and bill-of-quantities generation
│   ├── matchmaker/       # Professional ranking
│   ├── quote_checker/    # Quote anomaly detection
│   └── consult_notes/    # Transcription, summaries, hash anchoring
├── package.json
└── README.md
```

**Stack:** TypeScript · Python · Anthropic Claude API (reasoning, vision, summaries) · pgvector

### @gida/relay
Backend services: authentication, realtime messaging, call signalling, and metering that talks to `ConsultMeter`.

**Key endpoints**

```
POST /v1/auth/challenge                 SEP-10 wallet challenge
POST /v1/projects                       Create a project brief
GET  /v1/professionals?trade=&near=     Search professionals
POST /v1/consults                       Start a metered consultation
POST /v1/projects/:id/milestones/proof  Submit milestone evidence
GET  /v1/professionals/:id/craft-score  Public Craft Score
POST /v1/ai/site-snap                   Analyse a site photo
POST /v1/ai/brief                       Generate a brief and estimate
```

**Stack:** Node.js · Fastify · WebSockets · WebRTC signalling · PostgreSQL · Redis · @stellar/stellar-sdk

### @gida/site
The user-facing app, built as a mobile-first PWA for low-bandwidth devices.

| Route | Description |
|---|---|
| `/` | Social feed of projects, questions, and trending professionals |
| `/pros` | Search and filter verified professionals |
| `/pro/:id` | Profile, credentials, Craft Score, portfolio |
| `/project/new` | Brief Builder with AI estimate |
| `/project/:id` | Milestones, escrow status, evidence, chat |
| `/consult/:id` | Live consultation room with per-minute meter |
| `/snap` | Site Snap AI diagnosis |
| `/circles` | Build Circles and group buys |
| `/wallet` | Balances, payments, on-ramp and off-ramp |

**Stack:** Next.js · TailwindCSS · @stellar/stellar-sdk · Freighter / LOBSTR / xBull · PWA offline support

---

## How It Works

```
Client                Stellar / Soroban                 Professional / Inspector
  │                          │                                    │
  ├─ Post brief (AI-assisted)│                                    │
  │                          │                                    │
  ├─ Open consult ──────────▶ ConsultMeter.open()                 │
  │◀──── live session ───────┼───────── per-minute XLM/USDC ─────▶│
  │                          │ NoteAnchor.store(summary hash)     │
  │                          │                                    │
  ├─ Fund project ──────────▶ PourEscrow.lock(milestones)         │
  │                          │◀──── milestone proof (hash) ───────┤
  │                          │ InspectorPool.assign()             │
  │                          │◀──── inspector verifies ───────────┤
  │                          │ PourEscrow.release()  ────────────▶│ paid
  │                          │                                    │
  │                  CraftRegistry updates Craft Score            │
```

---

## Why Stellar?

- **Micro-payments that make sense:** Stellar's very low fees make per-minute consultation billing practical, which is not true on higher-fee networks.
- **Built-in asset controls:** Authorization flags and clawback let Gida issue non-transferable credentials that issuers can revoke.
- **Soroban smart contracts:** Escrow, staking, and savings circles need programmable logic with predictable costs.
- **Real-world on and off ramps:** Stellar anchors (SEP-24 / SEP-31) let users move between local currency and USDC.
- **Wallet reach:** SEP-10 authentication and mobile wallets mean no bank account is needed.

---

## Token Economics

Gida uses **no proprietary token**. Everything runs on XLM and Stellar USDC.

| Action | Asset | Notes |
|---|---|---|
| Consultation | USDC or XLM | Rate set by the professional, billed per minute |
| Platform fee | USDC | Small percentage on consultations and escrow releases |
| Peer inspection | USDC | Paid to the inspector on each verified milestone |
| Inspector stake | XLM | Slashed for provably dishonest verification |
| Build Circle contribution | USDC | Fixed per cycle, held in `CircleVault` |
| Credential issuing | XLM | Small fee covering reserve and issuance |

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9
- Rust stable + Stellar CLI
- Python ≥ 3.11 (for AI workers)
- A funded Stellar Testnet account (use Friendbot or Stellar Laboratory)

### Install
```bash
git clone https://github.com/gida-protocol/gida.git
cd gida
pnpm install
```

### Environment
```bash
cp .env.example .env
# Set STELLAR_NETWORK=testnet, HORIZON_URL, SOROBAN_RPC_URL,
# DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY
```

### Run in development
```bash
pnpm dev
# or run a single package
pnpm --filter @gida/site dev
pnpm --filter @gida/relay dev
```

### Build and test
```bash
pnpm turbo build
pnpm turbo test
cd packages/contracts && cargo test
```

### Deploy contracts to Testnet
```bash
cd packages/contracts
stellar contract build
bash ../../scripts/deploy_testnet.sh
```

---

## Roadmap

| Phase | Focus |
|---|---|
| **1. Foundation** | Wallet login, profiles, project feed, `ConsultMeter`, Brief Builder |
| **2. Trust** | Proof-of-Craft credentials, Craft Score, Quote Checker |
| **3. Protected Building** | Pour-by-Pour Escrow, inspector network, Site Snap |
| **4. Community** | Build Circles, group buying, local-currency anchors |
| **5. Mainnet** | Security audit, bug bounty, public launch |

---

## Security and Responsible AI

- Smart contracts will be audited before Mainnet; reports will be published in `audits/`.
- Evidence files are stored off-chain; only hashes are recorded on-chain.
- AI estimates and diagnoses are advisory, clearly labelled, and never presented as engineering sign-off.
- Responsible disclosure: security@gida.example

---

## Contributing

```bash
git checkout -b feat/your-feature
pnpm turbo test
pnpm turbo lint
# Open a PR against `main`
```

See `CONTRIBUTING.md` and `docs/architecture.md` for details.

---

## License

MIT © 2026 Gida Contributors

---

*Built on Stellar · Powered by Soroban · Trust above every build.*