# ModelMix - Multi-Model AI Comparison Platform

> Compare AI responses side-by-side across multiple models in real-time.

**Beta Launch Date:** January 1st, 2026

---

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Features](#features)
5. [Database Schema](#database-schema)
6. [Edge Functions](#edge-functions)
7. [Authentication & Credits](#authentication--credits)
8. [Environment Variables](#environment-variables)
9. [Setup Instructions](#setup-instructions)
10. [Key Components](#key-components)
11. [Styling & Design System](#styling--design-system)

---

## Overview

ModelMix is a multi-panel chat interface that allows users to query up to 10 AI models simultaneously and compare their responses side-by-side. It features a credit-based usage system, waitlist management for beta access, and comprehensive analytics tracking.

### Core Value Proposition

- **Side-by-side comparison** of AI model responses
- **Credit-based freemium model** with daily refreshes
- **Privacy-first analytics** using shadow tagging (observe patterns, not people)
- **Real-time waitlist** with social proof counter

---

## Tech Stack

| Layer          | Technology                   |
| -------------- | ---------------------------- |
| Frontend       | React 18, TypeScript, Vite   |
| Styling        | Tailwind CSS, shadcn/ui      |
| State          | TanStack Query (React Query) |
| Routing        | React Router DOM v6          |
| Backend        | Supabase (Lovable Cloud)     |
| Database       | PostgreSQL (via Supabase)    |
| Auth           | Supabase Auth                |
| Edge Functions | Deno (Supabase Functions)    |
| Email          | Resend                       |
| Analytics      | Plausible (privacy-friendly) |

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── admin/                 # Admin panel components
│   │   ├── ChatPanel.tsx          # Main chat interface
│   │   ├── ModelSelector.tsx      # Model selection dropdown
│   │   ├── ModelPickerModal.tsx   # Model picker with details
│   │   ├── ModelInfoModal.tsx     # Model information display
│   │   ├── ModelThreadView.tsx    # Conversation history view
│   │   ├── ResponseLightbox.tsx   # Full response viewer
│   │   ├── RoundNavigator.tsx     # Navigate response rounds
│   │   ├── MarkdownRenderer.tsx   # Markdown with syntax highlighting
│   │   ├── WaitlistCounter.tsx    # Real-time waitlist count
│   │   ├── SocialShareButtons.tsx # Social sharing
│   │   ├── FrictionReporter.tsx   # Inline feedback widget
│   │   ├── PrivacyBanner.tsx      # Cookie consent
│   │   ├── SettingsDrawer.tsx     # User settings panel
│   │   └── ...
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx            # Authentication context
│   │   ├── useCredits.ts          # Credit balance management
│   │   ├── useOpenRouterModels.ts # Fetch available models
│   │   ├── useWaitlistCount.ts    # Real-time waitlist counter
│   │   ├── useAdmin.ts            # Admin role check
│   │   └── useActionTracker.ts    # Shadow event tracking
│   │
│   ├── pages/
│   │   ├── Index.tsx              # Home redirect
│   │   ├── Landing.tsx            # Marketing landing page
│   │   ├── ModelMix.tsx           # Main application
│   │   ├── Waitlist.tsx           # Beta signup form
│   │   ├── Auth.tsx               # Login/Signup
│   │   ├── Admin.tsx              # Admin dashboard
│   │   ├── Pricing.tsx            # Pricing plans
│   │   ├── Privacy.tsx            # Privacy policy
│   │   ├── Terms.tsx              # Terms of service
│   │   └── ShadowDashboard.tsx    # Analytics dashboard
│   │
│   ├── integrations/supabase/
│   │   ├── client.ts              # Supabase client (auto-generated)
│   │   └── types.ts               # Database types (auto-generated)
│   │
│   ├── lib/
│   │   ├── utils.ts               # Utility functions (cn, etc.)
│   │   └── fingerprint.ts         # Browser fingerprinting
│   │
│   └── index.css                  # Global styles & design tokens
│
├── supabase/
│   ├── config.toml                # Supabase configuration
│   ├── functions/
│   │   ├── chat/                  # Main AI chat endpoint
│   │   ├── credits/               # Credit balance API
│   │   ├── track-action/          # Analytics tracking
│   │   ├── shadow-analyze/        # Conversation analysis
│   │   ├── create-test-user/      # Admin: create test accounts
│   │   ├── provision-founders/    # Admin: provision founder accounts
│   │   └── send-waitlist-invite/  # Email invites to waitlist
│   │
│   └── migrations/                # Database migrations
│
├── public/
│   └── robots.txt
│
├── index.html                     # Entry point with meta tags
├── tailwind.config.ts             # Tailwind configuration
├── vite.config.ts                 # Vite configuration
└── .env                           # Environment variables (auto-managed)
```

---

## Features

### 1. Multi-Model Chat Interface

- **Up to 10 model slots** for simultaneous comparison
- **Zoom levels**: Basic (abstracts), In-Depth (previews), Detailed (full responses)
- **Responsive grid**: 4-column compact, 1-2 column for reading
- **Per-panel controls**: Copy, text-to-speech, settings

### 2. Model Selection

- **Top 150 OpenRouter models** for performance
- **Model info modal** with personas, alignment, thinking styles, pricing
- **Model picker landing** for guided slot assignment

### 3. Conversation History

- **Multi-turn history** per model
- **Round Navigator** for browsing previous response rounds
- **Model Thread View** for chat-like history per model

### 4. Credit System

- **Fingerprint-based** for anonymous users
- **User-based** for authenticated users
- **Daily refresh** of credits
- **Referral bonuses** for inviting users

### 5. Waitlist & Launch

- **Beta registration** for January 1st, 2026 launch
- **Real-time counter** showing signups
- **Social sharing** for viral growth
- **Admin bulk actions**: Mark notified, export CSV, send invites

### 6. Shadow Analytics (Privacy-First)

- **Intent detection**: exploration, decision, creative, problem-solving
- **Cognitive depth**: surface, structured, multi-step, recursive, meta
- **Friction signals**: rephrase, clarify, abandon, tone shift
- **Upgrade triggers**: based on usage patterns

### 7. Admin Dashboard

- **User management**: View users, adjust credits
- **Waitlist management**: View entries, send invites, export
- **Analytics**: Shadow events, session data
- **Financials**: Credit transactions, usage stats

---

## Database Schema

### Core Tables

#### `user_credits`

```sql
id              UUID PRIMARY KEY
user_id         UUID (nullable, for authenticated users)
fingerprint     TEXT (nullable, for anonymous users)
balance         INTEGER DEFAULT 0
lifetime_earned INTEGER DEFAULT 0
lifetime_spent  INTEGER DEFAULT 0
referral_code   TEXT UNIQUE
referred_by     TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `credit_transactions`

```sql
id                UUID PRIMARY KEY
credit_account_id UUID REFERENCES user_credits(id)
amount            INTEGER
balance_after     INTEGER
source            credit_source ENUM
description       TEXT
usage_type        TEXT
metadata          JSONB
created_at        TIMESTAMPTZ
```

#### `credit_source` Enum

- `signup_bonus`, `referral_earned`, `referral_bonus`, `daily_refresh`
- `purchase`, `admin_grant`, `usage`, `refund`, `trial`

#### `waitlist`

```sql
id                UUID PRIMARY KEY
email             TEXT UNIQUE NOT NULL
full_name         TEXT NOT NULL
use_case          TEXT NOT NULL
profession        TEXT
preferred_models  TEXT[]
referral_source   TEXT
notified          BOOLEAN DEFAULT false
converted_to_user BOOLEAN DEFAULT false
created_at        TIMESTAMPTZ
```

#### `profiles`

```sql
id                  UUID PRIMARY KEY
user_id             UUID UNIQUE NOT NULL
email               TEXT
display_name        TEXT
tier                TEXT
model_assignments   JSONB
onboarding_complete BOOLEAN DEFAULT false
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

#### `user_roles`

```sql
id      UUID PRIMARY KEY
user_id UUID NOT NULL
role    app_role ENUM ('admin', 'user', 'tester')
```

### Analytics Tables

#### `shadow_events`

```sql
id          UUID PRIMARY KEY
session_id  TEXT NOT NULL
user_id     UUID
fingerprint TEXT
event_type  shadow_event_type ENUM
event_value TEXT
confidence  FLOAT DEFAULT 1.0
metadata    JSONB
created_at  TIMESTAMPTZ
```

#### `shadow_sessions`

```sql
id                   UUID PRIMARY KEY
session_id           TEXT UNIQUE NOT NULL
user_id              UUID
fingerprint          TEXT
started_at           TIMESTAMPTZ
last_activity_at     TIMESTAMPTZ
message_count        INTEGER
total_tokens         INTEGER
total_credits_spent  INTEGER
dominant_intent      TEXT
max_depth            TEXT
friction_count       INTEGER
clarity_moments      INTEGER
upgrade_signal_score INTEGER
upgrade_triggered    BOOLEAN
```

#### `audit_log`

```sql
id            UUID PRIMARY KEY
session_id    TEXT NOT NULL
user_id       UUID
fingerprint   TEXT
action_type   TEXT NOT NULL
action_target TEXT
action_value  TEXT
metadata      JSONB
created_at    TIMESTAMPTZ
```

#### `consent_records`

```sql
id           UUID PRIMARY KEY
user_id      UUID
fingerprint  TEXT
consent_type TEXT NOT NULL
granted      BOOLEAN DEFAULT false
granted_at   TIMESTAMPTZ
revoked_at   TIMESTAMPTZ
user_agent   TEXT
ip_address   TEXT
metadata     JSONB
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

#### `user_feedback`

```sql
id            UUID PRIMARY KEY
user_id       UUID
fingerprint   TEXT
session_id    TEXT
feedback_type TEXT NOT NULL
message       TEXT
context       TEXT
severity      TEXT
metadata      JSONB
resolved      BOOLEAN DEFAULT false
resolved_by   UUID
resolved_at   TIMESTAMPTZ
created_at    TIMESTAMPTZ
```

### Support Tables

#### `credit_config`

```sql
id          UUID PRIMARY KEY
key         TEXT UNIQUE NOT NULL
value       INTEGER NOT NULL
description TEXT
updated_at  TIMESTAMPTZ
```

#### `credit_holds`

```sql
id                UUID PRIMARY KEY
credit_account_id UUID REFERENCES user_credits(id)
amount            INTEGER NOT NULL
reason            TEXT
expires_at        TIMESTAMPTZ
released          BOOLEAN DEFAULT false
created_at        TIMESTAMPTZ
```

#### `rate_limits`

```sql
id                UUID PRIMARY KEY
credit_account_id UUID REFERENCES user_credits(id)
window_start      TIMESTAMPTZ
request_count     INTEGER DEFAULT 0
credits_spent     INTEGER DEFAULT 0
```

#### `upgrade_triggers`

```sql
id           UUID PRIMARY KEY
trigger_name TEXT UNIQUE NOT NULL
conditions   JSONB NOT NULL
message      TEXT NOT NULL
priority     INTEGER DEFAULT 0
active       BOOLEAN DEFAULT true
created_at   TIMESTAMPTZ
```

---

## Edge Functions

### `chat/index.ts`

Main AI chat endpoint handling:

- Credit estimation and deduction
- Rate limiting
- OpenRouter API calls (with Lovable AI fallback)
- Streaming responses
- Shadow analysis triggers

### `credits/index.ts`

Credit management:

- `balance`: Get current balance
- `history`: Get transaction history
- `referral-code`: Get/generate referral code

### `track-action/index.ts`

Analytics tracking:

- Action tracking (clicks, navigation, form submits)
- Consent recording
- Feedback submission
- Batch event support

### `shadow-analyze/index.ts`

Conversation analysis:

- Intent detection
- Cognitive depth analysis
- Friction detection
- Outcome assessment
- Upgrade trigger evaluation

### `send-waitlist-invite/index.ts`

Email invites:

- Bulk invite support
- Resend integration
- Status tracking

### `create-test-user/index.ts`

Admin utility:

- Create test accounts with password
- Assign tester role
- Grant starting credits

### `provision-founders/index.ts`

Founder provisioning:

- Create/update founder accounts
- Grant admin role
- Send welcome emails

---

## Authentication & Credits

### Anonymous Users

1. Browser fingerprint generated on first visit
2. Credit account created with `fingerprint` field
3. Daily credit refresh available

### Authenticated Users

1. Supabase Auth handles signup/login
2. Credit account linked to `user_id`
3. Profile created with additional info
4. Referral system enabled

### Credit Flow

1. **Estimate** credits needed for request
2. **Check** rate limits
3. **Create hold** for estimated amount
4. **Process** AI request
5. **Release hold** with actual usage
6. **Record** transaction

### Referral System

- Each user gets unique `referral_code`
- Referrer earns bonus when referee signs up
- Referee gets signup bonus

---

## Environment Variables

### Local Mode (Offline/Private)

To run ModelMix in local mode (e.g., with LMStudio), add the following to your `.env`:

```env
VITE_EXECUTION_MODE="local"
VITE_LOCAL_OPENAI_BASE_URL="http://localhost:1234" # Default LMStudio port
VITE_LOCAL_OPENAI_MODEL="local-model"
VITE_LOCAL_OPENAI_MODEL_LABEL="LMStudio Model"
VITE_LOCAL_ALLOW_REMOTE="true"
```

**Setup for LMStudio:**
1. Download and install [LMStudio](https://lmstudio.ai/).
2. Load any model (e.g., Llama 3, Mistral).
3. Go to the **Local Server** tab (double-arrow icon).
4. Start the server on port `1234` (default).
5. Ensure CORS is enabled if you encounter connection issues (usually enabled by default).

### Cloud Mode (Default)

These are auto-managed by Lovable Cloud:

```env
VITE_SUPABASE_URL=https://xurujhesittlojxfpvjl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=xurujhesittlojxfpvjl
```

### Edge Function Secrets (Configure in Lovable Cloud)

| Secret               | Purpose                  |
| -------------------- | ------------------------ |
| `OPENROUTER_API_KEY` | OpenRouter API access    |
| `RESEND_API_KEY`     | Email sending via Resend |
| `LOVABLE_API_KEY`    | Lovable AI fallback      |

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone <repo-url>
cd modelmix
npm install
```

### 2. Start Development

```bash
npm run dev
```

### 3. Configure Secrets

In Lovable Cloud, add the required secrets:

- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`

### 4. Database Setup

Migrations are auto-applied. Key tables:

- Enable RLS on all tables
- Realtime enabled for `waitlist`

### 5. Create Admin User

Use the `provision-founders` edge function or manually:

1. Create user via Auth
2. Add row to `user_roles` with `role: 'admin'`

---

## Key Components

### ChatPanel.tsx

Main chat interface with:

- Message input with attachments
- Model response display
- Zoom level controls
- Copy/TTS actions
- Inline feedback

### ModelSelector.tsx

Dropdown for model selection:

- Search/filter models
- Model info preview
- Slot assignment

### MarkdownRenderer.tsx

Rich text rendering:

- GitHub Flavored Markdown
- Syntax-highlighted code blocks
- Copy code button

### WaitlistCounter.tsx

Real-time counter:

- Supabase Realtime subscription
- Animated number display
- Social proof messaging

### SettingsDrawer.tsx

User preferences:

- Theme toggle
- Model defaults
- Privacy settings

---

## Styling & Design System

### Design Tokens (index.css)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  /* ... dark mode variants */
}
```

### Tailwind Config

- Custom colors mapped to CSS variables
- Animation utilities
- Container queries

### Component Library

shadcn/ui components in `src/components/ui/`:

- Button, Card, Dialog, Drawer
- Form, Input, Select, Tabs
- Toast, Tooltip, etc.

---

## Deployment

### Lovable Publish

1. Click "Publish" in Lovable editor
2. Frontend deploys to Lovable CDN
3. Edge functions deploy automatically

### Custom Domain

1. Go to Project > Settings > Domains
2. Add custom domain
3. Configure DNS records

---

## Analytics

### Plausible (Public)

```html
<script defer data-domain="your-domain.com" src="https://plausible.io/js/script.js"></script>
```

### Shadow Analytics (Internal)

- Non-intrusive pattern detection
- Privacy-first: "observe patterns, not people"
- Stored in `shadow_events` and `shadow_sessions`

---

## Support

- **Docs**: https://docs.lovable.dev
- **Discord**: Lovable Community
- **Email**: Support via waitlist

---

_Last Updated: December 30, 2024_
