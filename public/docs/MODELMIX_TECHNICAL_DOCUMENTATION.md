# ModelMix Technical Documentation
> AI Model Comparison Platform - Complete Technical Specification
> Generated: December 2024

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Flows](#user-flows)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Authentication](#authentication)
7. [Credit System](#credit-system)
8. [Analytics](#analytics)
9. [Configuration](#configuration)

---

## Overview

**ModelMix** is a multi-panel AI chat interface that enables users to compare responses from up to 10 AI models simultaneously. Built with React, TypeScript, and Lovable Cloud (Supabase).

### Core Value Propositions
- **Side-by-side Comparison**: Query multiple AI models with one prompt
- **Credit-based Freemium**: 1 free question, then credits required
- **Privacy-first Analytics**: Pattern detection without personal tracking
- **Cross-model Context**: Models can see and reference each other's responses

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack Query, React Context |
| Routing | React Router DOM v6 |
| Backend | Lovable Cloud (Supabase) |
| Functions | Deno Edge Functions |
| Email | Resend |
| AI | Lovable AI, OpenRouter |

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
├─────────────┬─────────────┬─────────────┬──────────┬───────────┤
│  Landing    │  ModelMix   │    Auth     │  Admin   │ Waitlist  │
│    Page     │    App      │   Pages     │Dashboard │   Page    │
└──────┬──────┴──────┬──────┴──────┬──────┴────┬─────┴─────┬─────┘
       │             │             │           │           │
       ▼             ▼             ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STATE MANAGEMENT                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   localStorage  │  TanStack Query │     React Context           │
│  (session data) │  (server state) │    (auth, settings)         │
└────────┬────────┴────────┬────────┴────────────┬────────────────┘
         │                 │                     │
         ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOVABLE CLOUD BACKEND                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────── EDGE FUNCTIONS ────────────────────┐     │
│  │  chat  │  credits  │  track-action  │  shadow-analyze  │     │
│  │        │           │                │                  │     │
│  │  send-waitlist-invite  │  create-test-user  │          │     │
│  └────────────────────────────────────────────────────────┘     │
│                              │                                   │
│  ┌──────────────────── DATABASE ──────────────────────────┐     │
│  │  user_credits    │  profiles      │  waitlist          │     │
│  │  credit_transactions │ shadow_events │ audit_log       │     │
│  │  user_roles      │  user_sessions │  user_feedback     │     │
│  └────────────────────────────────────────────────────────┘     │
│                              │                                   │
│  ┌──────────────────── AUTH SERVICE ──────────────────────┐     │
│  │  Email/Password  │  Magic Link  │  Session Management  │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Lovable AI    │  │   OpenRouter    │  │     Resend      │
│  (Primary API)  │  │   (Fallback)    │  │    (Email)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Directory Structure

```
modelmix/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── admin/           # Admin dashboard components
│   │   ├── ChatPanel.tsx    # Main chat interface
│   │   ├── ModelSelector.tsx # Model picker
│   │   ├── MarkdownRenderer.tsx
│   │   ├── OnboardingTour.tsx
│   │   ├── PromptSuggestions.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.tsx      # Authentication hook
│   │   ├── useCredits.ts    # Credit management
│   │   ├── useOpenRouterModels.ts
│   │   └── ...
│   ├── pages/
│   │   ├── Landing.tsx      # Homepage
│   │   ├── ModelMix.tsx     # Main app
│   │   ├── Auth.tsx         # Login/Signup
│   │   ├── Admin.tsx        # Admin dashboard
│   │   └── ...
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # Supabase client
│   │       └── types.ts     # Generated types
│   └── lib/
│       ├── utils.ts
│       └── fingerprint.ts
├── supabase/
│   ├── functions/
│   │   ├── chat/
│   │   ├── credits/
│   │   ├── track-action/
│   │   └── ...
│   └── config.toml
└── public/
```

---

## User Flows

### Primary User Journey

```
┌──────────────┐
│ Visit Site   │
│   (/)        │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ Has Account? │─No─▶│ Try 1 Free   │
└──────┬───────┘     │   Question   │
       │Yes          └──────┬───────┘
       ▼                    │
┌──────────────┐            │
│   Sign In    │            │
└──────┬───────┘            │
       │                    │
       ▼                    ▼
┌─────────────────────────────────┐
│      ModelMix Interface         │
│  ┌───────────────────────────┐  │
│  │   Select 1-10 AI Models   │  │
│  └─────────────┬─────────────┘  │
│                ▼                │
│  ┌───────────────────────────┐  │
│  │     Enter Your Prompt     │  │
│  └─────────────┬─────────────┘  │
│                ▼                │
│  ┌───────────────────────────┐  │
│  │  Credits   ──No──▶ Upgrade │  │
│  │ Available?        Prompt  │  │
│  └─────────────┬─────────────┘  │
│                │Yes             │
│                ▼                │
│  ┌───────────────────────────┐  │
│  │   Parallel AI Responses   │  │
│  │   (streaming display)     │  │
│  └─────────────┬─────────────┘  │
│                ▼                │
│  ┌───────────────────────────┐  │
│  │   Compare & Analyze       │  │
│  │   ├─ Follow-up question   │  │
│  │   ├─ @mention specific    │  │
│  │   ├─ Export conversation  │  │
│  │   └─ Start new session    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Credit System Flow

```
User Submits Prompt
        │
        ▼
┌───────────────────┐
│ credits function  │
│ Check Balance     │──────────────┐
└─────────┬─────────┘              │
          │                        │
          ▼                        ▼
    Balance ≥ Cost?          Balance < Cost
          │                        │
          │Yes                     │
          ▼                        ▼
┌───────────────────┐    ┌───────────────────┐
│ Create Credit     │    │ Show Upgrade      │
│ Hold (5 min TTL)  │    │ Prompt            │
└─────────┬─────────┘    └───────────────────┘
          │
          ▼
┌───────────────────┐
│ chat function     │
│ Stream Response   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Deduct Credits    │
│ Release Hold      │
│ Log Transaction   │
└───────────────────┘
```

### Authentication States

```
                    ┌─────────────┐
                    │  Anonymous  │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │ Free Trial │ │  Sign Up   │ │  Sign In   │
     │(1 question)│ │            │ │            │
     └──────┬─────┘ └──────┬─────┘ └──────┬─────┘
            │              │              │
            │              ▼              │
            │       ┌────────────┐        │
            │       │   Email    │        │
            │       │ Confirmed  │        │
            │       └──────┬─────┘        │
            │              │              │
            └──────────────┼──────────────┘
                           ▼
                    ┌─────────────┐
                    │Authenticated│
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │ Free Tier  │ │  Pro Tier  │ │   Admin    │
     │ (default)  │ │ (upgraded) │ │ (has role) │
     └────────────┘ └────────────┘ └────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐
│     auth.users  │     │    profiles     │
│─────────────────│     │─────────────────│
│ id (PK)         │◄────│ user_id (FK)    │
│ email           │     │ display_name    │
│ ...             │     │ email           │
└────────┬────────┘     │ tier            │
         │              │ onboarding_done │
         │              │ model_assignments│
         │              └─────────────────┘
         │
         │    ┌─────────────────┐     ┌─────────────────────┐
         │    │  user_credits   │     │ credit_transactions │
         │    │─────────────────│     │─────────────────────│
         ├───▶│ user_id (FK)    │◄────│ credit_account_id   │
         │    │ fingerprint     │     │ amount              │
         │    │ balance         │     │ balance_after       │
         │    │ lifetime_earned │     │ source (enum)       │
         │    │ lifetime_spent  │     │ usage_type          │
         │    │ referral_code   │     │ description         │
         │    └────────┬────────┘     └─────────────────────┘
         │             │
         │             │    ┌─────────────────┐
         │             └───▶│  credit_holds   │
         │                  │─────────────────│
         │                  │ credit_account_id│
         │                  │ amount          │
         │                  │ expires_at      │
         │                  │ released        │
         │                  └─────────────────┘
         │
         │    ┌─────────────────┐
         ├───▶│   user_roles    │
         │    │─────────────────│
         │    │ user_id (FK)    │
         │    │ role (enum)     │
         │    │  - admin        │
         │    │  - user         │
         │    │  - tester       │
         │    └─────────────────┘
         │
         │    ┌─────────────────┐
         └───▶│  user_sessions  │
              │─────────────────│
              │ user_id (FK)    │
              │ session_token   │
              │ is_active       │
              │ expires_at      │
              └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  shadow_events  │     │ shadow_sessions │
│─────────────────│     │─────────────────│
│ session_id      │────▶│ session_id (PK) │
│ event_type      │     │ user_id         │
│ event_value     │     │ fingerprint     │
│ fingerprint     │     │ message_count   │
│ confidence      │     │ dominant_intent │
│ metadata        │     │ max_depth       │
└─────────────────┘     │ friction_count  │
                        │ upgrade_score   │
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│   audit_log     │     │  user_feedback  │
│─────────────────│     │─────────────────│
│ session_id      │     │ user_id         │
│ action_type     │     │ feedback_type   │
│ action_target   │     │ message         │
│ action_value    │     │ severity        │
│ fingerprint     │     │ context         │
│ metadata        │     │ resolved        │
└─────────────────┘     └─────────────────┘

┌─────────────────┐
│    waitlist     │
│─────────────────│
│ email           │
│ full_name       │
│ use_case        │
│ profession      │
│ preferred_models│
│ referral_source │
│ notified        │
│ converted       │
└─────────────────┘
```

### Table Specifications

#### user_credits
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Nullable - linked to auth.users |
| fingerprint | TEXT | Device fingerprint for anonymous users |
| balance | INTEGER | Current credit balance |
| lifetime_earned | INTEGER | Total credits ever received |
| lifetime_spent | INTEGER | Total credits ever used |
| referral_code | TEXT | Unique referral code |
| referred_by | UUID | Who referred this user |

#### credit_transactions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| credit_account_id | UUID | FK to user_credits |
| amount | INTEGER | +/- credit change |
| balance_after | INTEGER | Balance after transaction |
| source | ENUM | signup_bonus, usage, refund, etc. |
| usage_type | TEXT | 'chat', 'export', etc. |
| description | TEXT | Human-readable description |

#### shadow_events
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | TEXT | Conversation session ID |
| event_type | ENUM | See shadow_event_type enum |
| event_value | TEXT | Additional event data |
| confidence | NUMERIC | 0-1 confidence score |
| fingerprint | TEXT | Device fingerprint |
| metadata | JSONB | Flexible additional data |

### Enums

```sql
-- User roles
CREATE TYPE app_role AS ENUM ('admin', 'user', 'tester');

-- Credit transaction sources
CREATE TYPE credit_source AS ENUM (
  'signup_bonus',
  'referral_earned',
  'referral_bonus',
  'daily_refresh',
  'purchase',
  'admin_grant',
  'usage',
  'refund',
  'trial'
);

-- Shadow analytics event types
CREATE TYPE shadow_event_type AS ENUM (
  -- Intent signals
  'intent_exploration',
  'intent_decision',
  'intent_reflection',
  'intent_creative',
  'intent_problem_solving',
  'intent_meta_reasoning',
  
  -- Cognitive depth
  'depth_surface',
  'depth_structured',
  'depth_multi_step',
  'depth_recursive',
  'depth_meta',
  
  -- Friction signals
  'friction_rephrase',
  'friction_clarify',
  'friction_abandon',
  'friction_tone_shift',
  'friction_retry',
  
  -- Outcomes
  'outcome_clarity',
  'outcome_decision',
  'outcome_idea',
  'outcome_abandoned',
  'outcome_escalated',
  
  -- User actions
  'action_click',
  'action_navigation',
  'action_model_select',
  'action_copy',
  'action_export',
  'action_settings_change',
  'action_attachment',
  'action_follow_up',
  
  -- Consent & Feedback
  'consent_privacy',
  'consent_analytics',
  'feedback_friction',
  'feedback_helpful',
  'feedback_not_helpful',
  'feedback_report'
);
```

---

## API Reference

### Edge Functions

#### `POST /functions/v1/chat`

Main chat endpoint for AI model queries.

**Request:**
```json
{
  "model": "openai/gpt-4",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "sessionId": "uuid-session-id",
  "fingerprint": "device-fingerprint",
  "crossModelContext": [
    {"model": "anthropic/claude-3", "content": "Previous response..."}
  ]
}
```

**Response:** Server-Sent Events stream
```
data: {"content": "Hello", "done": false}
data: {"content": "!", "done": false}
data: {"content": "", "done": true, "usage": {"prompt_tokens": 10, "completion_tokens": 5}}
```

#### `POST /functions/v1/credits`

Credit balance and transaction management.

**Actions:**
- `check` - Get current balance
- `deduct` - Use credits
- `grant` - Admin grant credits

**Request:**
```json
{
  "action": "check",
  "fingerprint": "device-fingerprint"
}
```

**Response:**
```json
{
  "balance": 50,
  "lifetime_earned": 100,
  "lifetime_spent": 50
}
```

#### `POST /functions/v1/track-action`

Privacy-first analytics tracking.

**Request:**
```json
{
  "sessionId": "uuid",
  "eventType": "action_model_select",
  "eventValue": "gpt-4",
  "fingerprint": "device-fingerprint",
  "metadata": {}
}
```

#### `POST /functions/v1/shadow-analyze`

Analyze session patterns for insights.

**Request:**
```json
{
  "sessionId": "uuid"
}
```

**Response:**
```json
{
  "dominantIntent": "problem_solving",
  "maxDepth": "multi_step",
  "frictionCount": 2,
  "upgradeScore": 0.7
}
```

#### `POST /functions/v1/send-waitlist-invite`

Send invitation email to waitlist member.

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

---

## Authentication

### Flow Types

1. **Anonymous Users**
   - Identified by browser fingerprint
   - Limited to 1 free question
   - Credits tracked in user_credits with null user_id

2. **Email/Password**
   - Standard signup with email confirmation
   - Auto-confirm enabled for streamlined onboarding
   - Profile created automatically via trigger

3. **Single Session Enforcement**
   - Only one active session per user
   - New login invalidates previous sessions
   - Managed by `enforce_single_session` trigger

### Security Policies

All tables implement Row-Level Security (RLS):

- **User data**: Only accessible by owner or admins
- **Credits**: Service role for mutations, user for reads
- **Analytics**: Service role only, admin read access
- **Waitlist**: Public insert, admin-only read

---

## Credit System

### Credit Sources

| Source | Amount | Trigger |
|--------|--------|---------|
| signup_bonus | 50 | Account creation |
| referral_earned | 25 | Someone uses your code |
| referral_bonus | 10 | You use someone's code |
| daily_refresh | 5 | Daily login (coming) |
| purchase | Varies | Payment completed |
| admin_grant | Varies | Manual adjustment |
| trial | 1 | Anonymous first use |

### Cost Structure

| Action | Cost |
|--------|------|
| Chat message (per model) | 1 credit |
| Premium model surcharge | +1-3 credits |
| Export conversation | 0 credits |

### Hold System

Credits are temporarily held during streaming:
1. Hold created with 5-minute TTL
2. Actual cost deducted on completion
3. Hold released after deduction
4. Expired holds auto-released by `cleanup_expired_holds()`

---

## Analytics

### Shadow Analytics Philosophy

> "Patterns, not people" - Privacy-first approach

**What we track:**
- Conversation intent patterns
- Cognitive depth signals
- Friction indicators
- Feature usage

**What we DON'T track:**
- Actual conversation content
- Personal identifiers
- IP addresses (beyond initial fingerprint)

### Key Metrics

| Metric | Description |
|--------|-------------|
| Upgrade Signal Score | 0-1 likelihood to convert |
| Friction Count | Rephrases, clarifications, abandons |
| Dominant Intent | Primary use case pattern |
| Max Depth | Highest cognitive complexity reached |

---

## Configuration

### Environment Variables

**Auto-configured (Lovable Cloud):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

**Edge Function Secrets:**
- `OPENROUTER_API_KEY` - Fallback AI provider
- `LOVABLE_API_KEY` - Primary AI provider
- `RESEND_API_KEY` - Email service

### Credit Configuration

Stored in `credit_config` table:

| Key | Default | Description |
|-----|---------|-------------|
| signup_bonus | 50 | Credits on registration |
| referral_reward | 25 | Credits for referrer |
| referral_bonus | 10 | Credits for referred |
| daily_refresh | 5 | Daily free credits |

---

## Deployment

### Frontend
- Deployed via Lovable Publish
- Automatic SSL and CDN
- Custom domain support

### Backend
- Edge functions auto-deploy on code change
- Database migrations require approval
- Secrets managed in Lovable Cloud

---

## Support & Resources

- **Documentation**: This file
- **GitHub**: Connected repository
- **Admin Dashboard**: /admin (requires admin role)

---

*Last updated: December 2024*
*Version: 1.0.0*
