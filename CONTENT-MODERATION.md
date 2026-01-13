# ModelMix Content Moderation & Abuse Prevention

**Status:** ✅ Implemented - Soft Steering with Abuse Tracking
**Approach:** Redirect harmful content, track violations, enable admin review
**Compliance:** Section 230 safe harbor compliant

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation](#current-implementation)
3. [Pattern Detection](#pattern-detection)
4. [Abuse Tracking System](#abuse-tracking-system)
5. [Ban System](#ban-system)
6. [Admin Monitoring](#admin-monitoring)
7. [Legal Compliance](#legal-compliance)
8. [Recommendations](#recommendations)
9. [Enhancement Options](#enhancement-options)

---

## Overview

### Philosophy: "Soft Steering"

ModelMix uses **soft steering** instead of hard blocking:

- ✅ **Redirect, don't block** - Provide helpful guidance instead of errors
- ✅ **Track everything** - Admins can review all attempts
- ✅ **No credits deducted** - Users don't pay for steered requests
- ✅ **Escalate if repeated** - Manual admin review → ban if needed

### Why This Approach?

1. **Better UX** - Users aren't frustrated by hard blocks
2. **Data Collection** - You see what users are trying (learning opportunity)
3. **Legal Safety** - Comprehensive logs of attempts + responses
4. **Flexibility** - Admins can review and adjust patterns

---

## Current Implementation

### Location
`supabase/functions/chat/index.ts` (lines 111-199)

### Workflow

```
User sends message
   ↓
Pattern detection (pre-AI call)
   ↓
Match found? → YES → Return steering response
   ↓              ↓
   NO            Log to abuse_reports
   ↓              ↓
Process          No credits deducted
normally         ↓
                Admin reviews later
```

---

## Pattern Detection

### Categories Monitored

#### 1. Dangerous Content
```javascript
{
  pattern: /\b(how to (make|build|create) (a )?(bomb|weapon|explosive))/i,
  category: "dangerous_content"
}
```

**Triggers on:**
- Bomb-making instructions
- Weapon creation
- Explosive manufacturing

**Response:**
> "I'm designed to help with creative ideation, brainstorming, and comparing AI perspectives. For safety-related questions, I'd recommend consulting official resources. How can I help you with a creative or analytical challenge instead?"

---

#### 2. Malicious Intent
```javascript
{
  pattern: /\b(hack|steal|crack) (into|from|password)/i,
  category: "malicious_intent"
}
```

**Triggers on:**
- Hacking attempts
- Password cracking
- Unauthorized access

**Response:**
> "ModelMix is built to help with ideation and exploring different AI perspectives. For cybersecurity learning, I'd suggest ethical hacking courses or official certifications. What creative or analytical topic can I help you explore?"

---

#### 3. Illegal Content
```javascript
{
  pattern: /\b(illegal (drugs?|substances?))/i,
  category: "illegal_content"
}
```

**Triggers on:**
- Drug manufacturing
- Illegal substance information

**Response:**
> "I'm here to help with creative thinking and comparing AI responses. For health-related questions, please consult qualified healthcare professionals. Is there a creative project or idea I can help you develop?"

---

#### 4. Medical Advice
```javascript
{
  pattern: /\b(should i (take|stop taking) (my )?(medication|medicine))/i,
  category: "medical_advice"
}
```

**Triggers on:**
- Medication decisions
- Medical treatment advice

**Response:**
> "I'm not able to provide medical advice - that's best handled by healthcare professionals who know your situation. ModelMix is great for brainstorming, research comparisons, and creative ideation. What can I help you explore in those areas?"

---

#### 5. Legal Advice
```javascript
{
  pattern: /\b(is (this|it) legal (to|if i))/i,
  category: "legal_advice"
},
{
  pattern: /\b(sue|lawsuit|legal action against)/i,
  category: "legal_advice"
}
```

**Triggers on:**
- Legal questions
- Lawsuit guidance

**Response:**
> "For legal questions, I'd recommend consulting with a qualified attorney who can review your specific situation. I'm better suited for creative ideation and comparing different perspectives. What ideas would you like to explore?"

---

#### 6. Financial Advice
```javascript
{
  pattern: /\b(should i (invest|buy|sell) (stocks?|crypto|bitcoin))/i,
  category: "financial_advice"
},
{
  pattern: /\b(guaranteed (returns?|profit|money))/i,
  category: "financial_advice"
}
```

**Triggers on:**
- Investment advice
- Financial decisions

**Response:**
> "Financial decisions are best made with a qualified financial advisor who understands your circumstances. I'm designed for ideation and comparing AI perspectives. What creative or analytical topic interests you?"

---

#### 7. Self-Harm
```javascript
{
  pattern: /\b(ways? to (hurt|harm|kill) (myself|yourself))/i,
  category: "self_harm"
},
{
  pattern: /\b(suicide methods?|how to end (my |it all))/i,
  category: "self_harm"
}
```

**Triggers on:**
- Self-harm methods
- Suicide-related content

**Response:**
> "I care about your wellbeing. If you're struggling, please reach out to a crisis helpline - they're available 24/7 and can provide real support. In the meantime, I'm here if you'd like to explore creative ideas or just chat about something that interests you."

**Additional Resources (Recommended to Add):**
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

---

## Abuse Tracking System

### Database Schema

#### Abuse Reports Table
```sql
CREATE TABLE public.abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  fingerprint TEXT,
  session_id TEXT NOT NULL,
  abuse_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence FLOAT DEFAULT 1.0,
  detected_by TEXT DEFAULT 'system',
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_abuse_reports_user_id ON abuse_reports(user_id);
CREATE INDEX idx_abuse_reports_fingerprint ON abuse_reports(fingerprint);
CREATE INDEX idx_abuse_reports_severity ON abuse_reports(severity);
CREATE INDEX idx_abuse_reports_created_at ON abuse_reports(created_at DESC);
```

#### Fields Explained

| Field | Description | Example |
|-------|-------------|---------|
| `user_id` | Authenticated user ID | `uuid` or `null` |
| `fingerprint` | Anonymous user fingerprint | `fp_abc123...` |
| `session_id` | User session identifier | `sess_xyz789` |
| `abuse_type` | Type of violation | `content_dangerous_content` |
| `severity` | Severity level | `low`, `medium`, `high`, `critical` |
| `confidence` | Detection confidence | `0.0` to `1.0` |
| `detected_by` | Detection method | `system`, `user_report`, `admin` |
| `metadata` | Additional context | `{"category": "dangerous_content", "steered": true}` |
| `resolved` | Admin reviewed? | `true` / `false` |

---

### Automatic Detection Patterns

#### 1. Content Violations (Soft Steering)
```javascript
// chat/index.ts:778-803
const moderationResult = checkContentModeration(messages);

if (moderationResult.shouldSteer) {
  // Log the attempt
  await reportAbuse(
    supabase,
    userId,
    fingerprint,
    contextId,
    `content_${moderationResult.category}`,
    "low", // Low severity = steering, not blocking
    0.8,
    { category: moderationResult.category, steered: true }
  );

  // Return steering response - NO AI CALL, NO CREDITS
  return Response(200, {
    content: moderationResult.response,
    steered: true,
    category: moderationResult.category
  });
}
```

---

#### 2. Rate Limit Abuse
```javascript
// chat/index.ts:213-230
const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const { data: recentRates } = await supabase
  .from("rate_limits")
  .select("*")
  .eq("credit_account_id", accountId)
  .gte("window_start", fiveMinAgo);

if (recentRates && recentRates.length >= 3) {
  const totalRequests = recentRates.reduce((sum, r) => sum + r.request_count, 0);

  if (totalRequests > config.max_credits_per_minute * 3) {
    await reportAbuse(
      supabase, userId, fingerprint, sessionId,
      "rate_abuse",
      "medium",
      0.7,
      { request_count: totalRequests, window_minutes: 5 }
    );
  }
}
```

**Triggers on:**
- 3+ rate limit hits in 5 minutes
- Total requests > 3x normal limit
- Automated scraping attempts

---

#### 3. Fingerprint Rotation (Credit Farming)
```javascript
// chat/index.ts:233-256
if (fingerprint && !userId) {
  const { data: similarSessions } = await supabase
    .from("shadow_sessions")
    .select("fingerprint")
    .neq("fingerprint", fingerprint)
    .gte("started_at", fiveMinAgo)
    .limit(10);

  if (similarSessions && similarSessions.length >= 5) {
    const uniqueFingerprints = new Set(similarSessions.map(s => s.fingerprint));

    if (uniqueFingerprints.size >= 3) {
      await reportAbuse(
        supabase, userId, fingerprint, sessionId,
        "fingerprint_rotation",
        "high",
        0.6,
        { unique_fingerprints: uniqueFingerprints.size }
      );
    }
  }
}
```

**Triggers on:**
- 3+ different fingerprints in 5 minutes
- Attempts to bypass credit limits
- Bot/script detection

---

## Ban System

### Database Schema

#### User Bans Table
```sql
CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  fingerprint TEXT,
  ban_reason TEXT NOT NULL,
  ban_severity TEXT NOT NULL CHECK (ban_severity IN ('warning', 'temporary', 'permanent')),
  banned_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_bans_user_id ON user_bans(user_id);
CREATE INDEX idx_user_bans_fingerprint ON user_bans(fingerprint);
```

#### Ban Severity Levels

| Severity | Duration | Use Case |
|----------|----------|----------|
| `warning` | No access restriction | First offense, logged warning |
| `temporary` | 1-30 days | Repeated violations, cooling off period |
| `permanent` | Forever | Severe violations, persistent abuse |

---

### Ban Check (Every Request)
```javascript
// chat/index.ts:758-776
const { data: banStatus } = await supabase.rpc('is_user_banned', {
  _user_id: userId || null,
  _fingerprint: fingerprint || null
});

if (banStatus && banStatus[0].is_banned) {
  const ban = banStatus[0];
  console.log(`Banned user attempted access: ${userId}, reason: ${ban.ban_reason}`);

  return Response(403, {
    error: "Access denied",
    reason: ban.ban_reason || "Account suspended",
    severity: ban.ban_severity,
    expires_at: ban.expires_at
  });
}
```

---

### Manual Ban Actions (Admin SQL)

#### Ban a User
```sql
-- Temporary ban (7 days)
INSERT INTO user_bans (user_id, ban_reason, ban_severity, expires_at, banned_by)
VALUES (
  'user-uuid-here',
  'Repeated harmful content attempts',
  'temporary',
  NOW() + INTERVAL '7 days',
  'admin-uuid-here'
);

-- Permanent ban
INSERT INTO user_bans (user_id, ban_reason, ban_severity, banned_by)
VALUES (
  'user-uuid-here',
  'Severe policy violations',
  'permanent',
  'admin-uuid-here'
);

-- Ban by fingerprint (anonymous user)
INSERT INTO user_bans (fingerprint, ban_reason, ban_severity, banned_by)
VALUES (
  'fp_abc123...',
  'Automated abuse attempts',
  'temporary',
  'admin-uuid-here'
);
```

#### Unban a User
```sql
DELETE FROM user_bans WHERE user_id = 'user-uuid-here';
```

#### View Ban History
```sql
SELECT
  ub.*,
  u.email,
  admin.email as banned_by_email
FROM user_bans ub
LEFT JOIN auth.users u ON u.id = ub.user_id
LEFT JOIN auth.users admin ON admin.id = ub.banned_by
ORDER BY ub.created_at DESC;
```

---

## Admin Monitoring

### Abuse Dashboard Queries

#### View Recent Violations
```sql
SELECT
  abuse_type,
  severity,
  COUNT(*) as occurrences,
  COUNT(DISTINCT COALESCE(user_id::text, fingerprint)) as unique_users,
  AVG(confidence) as avg_confidence,
  MAX(created_at) as last_occurrence
FROM abuse_reports
WHERE created_at > NOW() - INTERVAL '7 days'
  AND resolved = false
GROUP BY abuse_type, severity
ORDER BY occurrences DESC;
```

#### Repeat Offenders
```sql
SELECT
  COALESCE(u.email, ar.fingerprint) as identifier,
  ar.user_id,
  COUNT(*) as violation_count,
  ARRAY_AGG(DISTINCT ar.abuse_type) as violation_types,
  MAX(ar.severity) as max_severity,
  MIN(ar.created_at) as first_violation,
  MAX(ar.created_at) as last_violation
FROM abuse_reports ar
LEFT JOIN auth.users u ON u.id = ar.user_id
WHERE ar.created_at > NOW() - INTERVAL '30 days'
GROUP BY COALESCE(u.email, ar.fingerprint), ar.user_id
HAVING COUNT(*) >= 3
ORDER BY violation_count DESC;
```

#### Content Moderation Stats
```sql
SELECT
  DATE_TRUNC('day', created_at) as day,
  abuse_type,
  COUNT(*) as count
FROM abuse_reports
WHERE created_at > NOW() - INTERVAL '30 days'
  AND abuse_type LIKE 'content_%'
GROUP BY day, abuse_type
ORDER BY day DESC, count DESC;
```

#### False Positive Analysis
```sql
-- Patterns that might need adjustment
SELECT
  abuse_type,
  COUNT(*) as total,
  COUNT(CASE WHEN resolved = true THEN 1 END) as resolved,
  COUNT(CASE WHEN resolved = false THEN 1 END) as unresolved,
  AVG(confidence) as avg_confidence
FROM abuse_reports
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY abuse_type
ORDER BY unresolved DESC;
```

---

## Legal Compliance

### Safe Harbor Provisions (Section 230, US)

Your implementation provides:

✅ **Good Faith Effort**
- Proactive content moderation
- Clear steering away from harmful content
- Documented policies

✅ **Audit Trail**
- All attempts logged with timestamps
- User identification (user_id or fingerprint)
- Admin actions recorded

✅ **User Controls**
- Reporting mechanism (user_feedback table)
- Clear terms of service
- Privacy policy

✅ **Administrative Controls**
- Manual review capability
- Ban/unban functionality
- Severity escalation

---

### GDPR Compliance (EU)

#### Data Collected
- User ID (if authenticated)
- Fingerprint (if anonymous)
- Session ID
- Violation type & metadata
- Timestamps

#### User Rights Supported
- **Right to Access**: Users can request their abuse reports
- **Right to Erasure**: Users can request deletion
- **Right to Rectification**: False positives can be marked resolved
- **Data Minimization**: Only essential data stored

#### Retention Policy (Recommended)
```sql
-- Auto-delete resolved abuse reports after 90 days
DELETE FROM abuse_reports
WHERE resolved = true
  AND resolved_at < NOW() - INTERVAL '90 days';

-- Auto-delete expired temporary bans
DELETE FROM user_bans
WHERE ban_severity = 'temporary'
  AND expires_at < NOW();
```

---

## Recommendations

### Current State Assessment

| Feature | Status | Severity |
|---------|--------|----------|
| Pattern detection | ✅ Implemented | Low-Medium |
| Steering responses | ✅ Implemented | N/A |
| Abuse logging | ✅ Implemented | All levels |
| Ban system | ✅ Implemented | All levels |
| Admin dashboard | ✅ Implemented | N/A |
| Email alerts | ❌ Not implemented | High+ |
| Auto-escalation | ❌ Not implemented | High+ |
| Enhanced patterns | ⚠️  Basic only | Medium+ |

---

### Recommended Additions

#### Priority 1: High-Severity Alerts
```javascript
// Add to reportAbuse function
if (severity === "high" || severity === "critical") {
  await sendAdminAlert({
    to: process.env.ADMIN_EMAIL,
    subject: `⚠️  High-Severity Abuse Detected: ${abuse_type}`,
    body: `
      User: ${user_id || fingerprint}
      Type: ${abuse_type}
      Severity: ${severity}
      Confidence: ${confidence}
      Time: ${new Date().toISOString()}

      View details: https://your-app.com/admin/abuse-reports
    `
  });
}
```

#### Priority 2: Auto-Escalation (3-Strikes)
```javascript
// Before processing request
const strikes = await getStrikeCount(userId, fingerprint, '30 days');

if (strikes >= 3) {
  // Auto-ban
  await autoBan(userId, fingerprint, 'Automatic ban: 3 strikes in 30 days', 'temporary', '7 days');

  return Response(403, {
    error: "Account suspended",
    reason: "Multiple policy violations",
    appeals_email: "support@yourapp.com"
  });
}

async function getStrikeCount(userId, fingerprint, period) {
  const { data } = await supabase
    .from("abuse_reports")
    .select("id")
    .or(`user_id.eq.${userId},fingerprint.eq.${fingerprint}`)
    .gte("created_at", `NOW() - INTERVAL '${period}'`)
    .in("severity", ["high", "critical"]);

  return data?.length || 0;
}
```

#### Priority 3: Enhanced Pattern Detection
```javascript
// Add obfuscation detection
const OBFUSCATION_PATTERNS = [
  /b[o0]mb/i,           // b0mb, b0mb
  /h[a@]ck/i,           // h@ck, hack
  /dr[u\*]g/i,          // dr*g, drug
  /k[i1]ll/i,           // k1ll, kill
  /\w+\s+\.\s+\w+/i,    // word . word (spacing to evade)
];

// Add context-aware detection
function checkContentModeration(messages) {
  const fullConversation = messages.map(m => m.content).join(" ");

  // Check single message
  const lastMessage = messages[messages.length - 1].content;

  // Check conversation context
  // (e.g., "How do I make..." + "a bomb" across multiple messages)
}
```

#### Priority 4: Weekly Abuse Summary
```javascript
// Scheduled function (run weekly)
async function sendWeeklyAbuseSummary() {
  const summary = await supabase.rpc('get_weekly_abuse_summary');

  await sendAdminEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `📊 Weekly Abuse Summary - ${new Date().toLocaleDateString()}`,
    body: generateSummaryHTML(summary)
  });
}
```

---

## Enhancement Options

### Option A: Keep Current (Soft Steering) ✅ Recommended

**Behavior:**
```
User: "How to make a bomb?"
  ↓
System: Returns steering response
  ↓
Logs: abuse_reports (severity: low)
  ↓
Admin: Reviews later, can ban if repeated
```

**Pros:**
- ✅ Better user experience
- ✅ Full audit trail
- ✅ Flexibility to adjust
- ✅ Data for learning

**Cons:**
- ⚠️  Doesn't completely prevent
- ⚠️  Requires admin monitoring

---

### Option B: Hard Blocking

**Behavior:**
```
User: "How to make a bomb?"
  ↓
System: Error 403 "Content policy violation"
  ↓
Logs: abuse_reports (severity: critical)
  ↓
Auto: Ban after 3 strikes
```

**Implementation:**
```javascript
const moderationResult = checkContentModeration(messages);

if (moderationResult.shouldSteer) {
  await reportAbuse(..., "critical", ...);

  const strikes = await getStrikeCount(userId, fingerprint);
  if (strikes >= 2) {
    await autoBan(userId, fingerprint, `3 strikes: ${category}`, 'permanent');
  }

  return Response(403, {
    error: "Content policy violation",
    category: moderationResult.category,
    appeals: "support@yourapp.com"
  });
}
```

**Pros:**
- ✅ Stronger deterrent
- ✅ Clear policy enforcement
- ✅ Automated response

**Cons:**
- ❌ Worse UX
- ❌ False positives hurt legitimate users
- ❌ Less data collection

---

### Option C: Hybrid (Escalating) ⭐ Best Balance

**Behavior:**
```
Strike 1: Soft steering + logged
Strike 2: Warning + steering + logged
Strike 3+: Hard block + auto-ban
```

**Implementation:**
```javascript
const moderationResult = checkContentModeration(messages);

if (moderationResult.shouldSteer) {
  const strikes = await getStrikeCount(userId, fingerprint, '30 days');

  if (strikes === 0) {
    // First offense: Soft redirect
    await reportAbuse(..., "low", ...);
    return steeringResponse;

  } else if (strikes === 1) {
    // Second offense: Warning
    await reportAbuse(..., "medium", ...);
    return {
      warning: "⚠️  Previous policy violation detected. Continued violations may result in account suspension.",
      content: steeringResponse
    };

  } else if (strikes >= 2) {
    // Third offense: Auto-ban
    await autoBan(userId, fingerprint, `Automatic ban: ${strikes + 1} strikes`, 'temporary', '7 days');
    await reportAbuse(..., "critical", ...);

    return Response(403, {
      error: "Account suspended",
      reason: "Multiple content policy violations",
      duration: "7 days",
      appeals: "support@yourapp.com"
    });
  }
}
```

**Pros:**
- ✅ Progressive enforcement
- ✅ Gives users chances to correct
- ✅ Protects against persistent abuse
- ✅ Balances UX and safety

**Cons:**
- ⚠️  More complex logic
- ⚠️  Requires careful tuning

---

## Implementation Checklist

### Already Implemented ✅
- [x] Pattern detection (7 categories)
- [x] Steering responses
- [x] Abuse logging (`abuse_reports` table)
- [x] Ban system (`user_bans` table)
- [x] Ban checking (every request)
- [x] Admin queries (abuse dashboard)
- [x] Rate limit abuse detection
- [x] Fingerprint rotation detection
- [x] Legal compliance (audit trail)

### Recommended Additions ⚠️
- [ ] Email alerts (high/critical severity)
- [ ] Auto-escalation (3-strikes)
- [ ] Enhanced pattern detection
- [ ] Weekly abuse summary emails
- [ ] Appeals process
- [ ] False positive review workflow
- [ ] Automated ban expiration cleanup
- [ ] GDPR data retention policy

### Optional Enhancements 💡
- [ ] ML-based content detection
- [ ] Image/attachment moderation
- [ ] Multi-language pattern detection
- [ ] Real-time admin dashboard
- [ ] User reputation scoring
- [ ] Automated pattern learning
- [ ] Integration with external moderation APIs (Perspective API, etc.)

---

## Support & Resources

### Crisis Resources (To Include in Self-Harm Response)
- **National Suicide Prevention Lifeline**: 988 (US)
- **Crisis Text Line**: Text HOME to 741741 (US)
- **International Association for Suicide Prevention**: https://www.iasp.info/resources/Crisis_Centres/

### Moderation APIs (Optional Integration)
- **Perspective API** (Google): https://perspectiveapi.com/
- **OpenAI Moderation**: https://platform.openai.com/docs/guides/moderation
- **Azure Content Safety**: https://azure.microsoft.com/en-us/products/cognitive-services/content-safety/

### Legal Resources
- **Section 230 (US)**: https://www.eff.org/issues/cda230
- **GDPR Compliance**: https://gdpr.eu/
- **Terms of Service Generator**: https://www.termsofservicegenerator.net/

---

## Next Steps

1. **Review current patterns** - Are they catching what you expect?
2. **Monitor abuse reports** - Check `/admin` dashboard weekly
3. **Decide on escalation** - Soft steering, hard blocking, or hybrid?
4. **Add email alerts** - Get notified of high-severity violations
5. **Implement 3-strikes** - Auto-ban repeat offenders
6. **Document appeals process** - How users can appeal bans
7. **Set retention policy** - Auto-delete old resolved reports

---

**Last Updated:** January 5, 2026
**Version:** 2.0.0
**Status:** Production-ready with soft steering
