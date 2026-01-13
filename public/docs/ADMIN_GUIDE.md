# ModelMix Admin Guide

> Complete administration documentation for managing users, enforcing policies, and maintaining platform integrity.

---

## Table of Contents

1. [Admin Access](#admin-access)
2. [User Tier System](#user-tier-system)
3. [Ban & Enforcement System](#ban--enforcement-system)
4. [Abuse Detection](#abuse-detection)
5. [Admin Dashboard Tabs](#admin-dashboard-tabs)
6. [Database Tables Reference](#database-tables-reference)
7. [Edge Functions](#edge-functions)
8. [Action Checklist](#action-checklist)

---

## Admin Access

### How to Become an Admin
1. An existing admin must add your email via **Admin → Users & Roles → Add Admin**
2. Your `user_id` is added to the `user_roles` table with `role = 'admin'`
3. Refresh the page to see the Admin menu in the Settings drawer

### Admin Capabilities
- View all user profiles and credit balances
- Adjust user credits with audit trail
- Manage user tiers (free, paid, byok)
- Create/remove admin and tester roles
- Create test accounts with auto-generated passwords
- Manage waitlist and send invite emails
- View usage logs, sessions, and analytics
- **Create, view, and remove user bans**
- **Review and resolve abuse reports**

---

## User Tier System

| Tier | Panels | Models | Questions | Features |
|------|--------|--------|-----------|----------|
| **Anonymous** | 2 | Limited (8 models) | 1 free trial | Basic comparison |
| **Free (Authenticated)** | 4 | Limited (8 models) | 50/day tracked | Usage tracking |
| **BYOK** | 5 | All via OpenRouter | Unlimited* | Uses own API key |
| **Paid** | 6+ | All models | Higher limits | Premium features |
| **Tester** | 6 | All models | Unlimited | Full debug tools |
| **Admin** | 10 | All models | Unlimited | Full access + management |

### Model Access by Tier

**Free/Anonymous Models (8):**
- `google/gemini-2.5-flash`
- `google/gemini-2.0-flash-lite`
- `anthropic/claude-3.5-haiku`
- `openai/gpt-4o-mini`
- `meta-llama/llama-3.3-70b-instruct`
- `mistralai/mistral-small-24b-instruct-2501`
- `qwen/qwen-2.5-72b-instruct`
- `deepseek/deepseek-chat`

**Tester/Admin Models:** All 100+ OpenRouter models

---

## Ban & Enforcement System

### Ban Types

| Severity | Duration | Effect |
|----------|----------|--------|
| **Warning** | Configurable (default 24h) | User sees warning, limited access |
| **Temporary** | Configurable hours | Full block for duration |
| **Permanent** | Never expires | Complete permanent block |

### How Bans Work

1. **User-based bans:** Match by `user_id` (for authenticated users)
2. **Fingerprint bans:** Match by device fingerprint (for anonymous/evasion)
3. **Session bans:** Can target specific session IDs

### Creating a Ban (Admin UI)

1. Go to **Admin → Moderation**
2. Click **Create Ban**
3. Choose target type:
   - **Email:** Looks up user and bans by `user_id`
   - **Fingerprint:** Directly bans the device fingerprint
4. Enter reason (required for audit)
5. Select severity and duration
6. Submit

### Programmatic Ban Check

The `is_user_banned()` database function checks ban status:

```sql
SELECT * FROM is_user_banned(
  _user_id := 'uuid-here',
  _fingerprint := 'fp_xxxxx'
);
-- Returns: is_banned, ban_reason, ban_severity, expires_at
```

This is called by edge functions before processing requests.

### Removing a Ban

1. Go to **Admin → Moderation → User Bans**
2. Find the ban in the table
3. Click the trash icon to remove

---

## Abuse Detection

### Privacy-First Approach

ModelMix tracks **patterns**, not **content**:
- ❌ We do NOT log message content
- ❌ We do NOT store personal conversations
- ✅ We DO track behavioral signals (rate, patterns, friction)
- ✅ We DO log metadata for abuse detection

### Detected Abuse Types

| Type | Description | Auto-Detection | Severity |
|------|-------------|----------------|----------|
| `rate_limit_exceeded` | User hit rate limit | Yes | Medium |
| `rate_abuse` | Excessive requests per minute | Yes | Medium |
| `credit_exploit` | Attempting to bypass credit system | Yes | High |
| `fingerprint_rotation` | Rapid fingerprint changes | Yes | High |
| `content_dangerous_content` | Asked about harmful topics | Yes | Low |
| `content_medical_advice` | Asked for medical advice | Yes | Low |
| `content_legal_advice` | Asked for legal advice | Yes | Low |
| `content_financial_advice` | Asked for financial advice | Yes | Low |
| `content_self_harm` | Self-harm related content | Yes | Low |
| `manual_report` | Admin-submitted report | No | Varies |

### Content Moderation (Steering)

ModelMix uses **steering** rather than **blocking** for inappropriate content:

- **No credits deducted** for steered responses
- User receives helpful redirection message
- Incident logged as low-severity abuse report
- Admin can review patterns without penalizing users

**Steering Categories:**
- `dangerous_content` - Weapons, explosives, hacking
- `medical_advice` - Medication questions
- `legal_advice` - Lawsuits, legal questions
- `financial_advice` - Investment recommendations
- `self_harm` - Self-harm or suicide content

**Philosophy:** We steer users toward appropriate use cases (ideation, comparison, creativity) rather than outright blocking. This maintains a positive experience while keeping the platform focused.

### Abuse Report Workflow

1. **Detection:** System or admin creates report in `abuse_reports`
2. **Review:** Admin sees pending reports in Moderation tab
3. **Action:** Admin can:
   - **Dismiss:** False positive, no action
   - **Ban:** Create ban from report
4. **Resolution:** Report marked resolved with action taken

### Confidence Scores

Reports include a confidence score (0.0 - 1.0):
- **0.9+:** High confidence, likely legitimate abuse
- **0.5-0.9:** Medium, requires review
- **<0.5:** Low confidence, likely false positive

---

## Admin Dashboard Tabs

### Insights
- **Overview:** Real-time stats (users, credits, activity)
- **Usage Logs:** Token consumption, costs, friction scores

### Management
- **Users & Roles:** Manage profiles, tiers, admins
- **Test Accounts:** Create tester users with passwords
- **Waitlist:** Send invites, export signups
- **Moderation:** Bans and abuse reports (NEW)

### Configuration
- **Credit Config:** Adjust credit costs and limits
- **Financials:** Revenue and cost analysis

---

## Database Tables Reference

### `user_bans`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User to ban (null for fingerprint bans) |
| `fingerprint` | TEXT | Device fingerprint to ban |
| `reason` | TEXT | Required: why banned |
| `severity` | TEXT | 'warning', 'temporary', 'permanent' |
| `expires_at` | TIMESTAMP | Null = never expires |
| `banned_at` | TIMESTAMP | When ban was created |
| `banned_by` | UUID | Admin who created ban |
| `metadata` | JSONB | Additional context |

**RLS Policies:**
- Admins: Full access
- Service role: Full access (for edge functions)
- Others: No access

### `abuse_reports`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reported user (optional) |
| `fingerprint` | TEXT | Reported fingerprint (optional) |
| `session_id` | TEXT | Reported session (optional) |
| `abuse_type` | TEXT | Type of abuse detected |
| `severity` | TEXT | 'low', 'medium', 'high', 'critical' |
| `confidence` | NUMERIC | Detection confidence (0-1) |
| `detected_by` | TEXT | 'system', 'admin', 'user' |
| `resolved` | BOOLEAN | Whether addressed |
| `resolved_at` | TIMESTAMP | When resolved |
| `resolved_by` | UUID | Admin who resolved |
| `action_taken` | TEXT | 'banned', 'dismissed', etc. |
| `pattern_signature` | TEXT | Unique pattern identifier |
| `metadata` | JSONB | Detection context |

### `audit_log`

All admin actions are logged:
- Action type (ban_created, credits_adjusted, etc.)
- Target user/fingerprint
- Timestamp
- Admin who performed action

---

## Edge Functions

### `chat` Function

Before processing any request:
1. Checks `is_user_banned()` for user_id and fingerprint
2. If banned, returns `403` with ban reason
3. If not banned, proceeds with rate limit check
4. Logs usage to `usage_logs`

### `track-action` Function

Receives behavioral signals:
- Batch action tracking (clicks, navigation)
- Consent records
- User feedback (friction reports)

### `shadow-analyze` Function

Analyzes session patterns:
- Calculates upgrade signal scores
- Detects unusual patterns
- Can trigger abuse reports

---

## Action Checklist

### Setting Up Enforcement

- [x] `user_bans` table created with RLS
- [x] `abuse_reports` table created with RLS
- [x] `is_user_banned()` function created
- [x] Admin Moderation UI component created
- [ ] Integrate ban check into `chat` edge function
- [ ] Add fingerprint ban check to anonymous flows
- [ ] Create automated abuse detection triggers

### Daily Admin Tasks

1. Check **Moderation → Abuse Reports** for pending reviews
2. Review **Usage Logs** for unusual patterns
3. Check **Dashboard** for system health
4. Export data as needed for analysis

### Responding to Abuse

1. Identify pattern in Usage Logs or Abuse Reports
2. Determine scope (single user vs. fingerprint rotation)
3. Create appropriate ban (temp vs. permanent)
4. Document reason thoroughly
5. Monitor for evasion attempts

---

## Security Notes

- **Never share admin credentials**
- **Ban reasons are logged** and visible in audit trail
- **Fingerprint bans** are more effective against anonymous abuse
- **Permanent bans** should be reserved for serious violations
- **Always document** the reason for enforcement actions

---

*Last updated: January 2026*
