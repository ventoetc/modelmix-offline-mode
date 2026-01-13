# Prompt for Trae.AI

Use this prompt with trae.ai after you've created your new Supabase project and gathered the credentials.

---

## Prompt to Give Trae.AI:

```
I need help setting up a new Supabase project for my ModelMix application.

Please read the SUPABASE_SETUP_GUIDE.md file in the repository and help me complete the setup.

Here are my new Supabase project credentials:
- Project ID: [PASTE YOUR PROJECT ID HERE]
- Anon Key: [PASTE YOUR ANON KEY HERE]
- Project URL: [PASTE YOUR PROJECT URL HERE]

Please:
1. Update the `.env` file with my new credentials
2. Update the `supabase/config.toml` file with my new project ID
3. Guide me through running the CLI commands to deploy the database and Edge Functions
4. Help me verify everything is working correctly

Walk me through each step and confirm before proceeding to the next one.
```

---

## What to Provide to Trae.AI:

### Before starting, gather these from your new Supabase project:

**From Supabase Dashboard → Settings → API:**

1. **Project URL** (looks like):
   ```
   https://abcdefghijklmnop.supabase.co
   ```

2. **Project Reference ID** (the part before .supabase.co):
   ```
   abcdefghijklmnop
   ```

3. **anon public key** (long JWT token, starts with `eyJ`):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

### API Keys to Set in Supabase Dashboard:

Also prepare these API keys to set as environment variables in Supabase:

- **OPENAI_API_KEY** - Your OpenAI API key (optional, for fallback)
- **ANTHROPIC_API_KEY** - Your Anthropic API key (optional, for fallback)
- **OPENROUTER_API_KEY** - Your OpenRouter API key (optional, for fallback)
- **GOOGLE_API_KEY** - Your Google AI API key (optional, for fallback)

These are fallback keys for non-BYOK users. BYOK users will provide their own keys via the UI.

---

## Example Filled Prompt:

```
I need help setting up a new Supabase project for my ModelMix application.

Please read the SUPABASE_SETUP_GUIDE.md file in the repository and help me complete the setup.

Here are my new Supabase project credentials:
- Project ID: abcdefghijklmnop
- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
- Project URL: https://abcdefghijklmnop.supabase.co

Please:
1. Update the `.env` file with my new credentials
2. Update the `supabase/config.toml` file with my new project ID
3. Guide me through running the CLI commands to deploy the database and Edge Functions
4. Help me verify everything is working correctly

Walk me through each step and confirm before proceeding to the next one.
```

---

## After Trae.AI Updates the Files:

You'll need to manually run these commands in your terminal:

```bash
# 1. Login to Supabase
supabase login

# 2. Link to new project (use your Project ID)
supabase link --project-ref YOUR_PROJECT_ID

# 3. Deploy database schema
supabase db push

# 4. Deploy Edge Functions
npm run deploy:functions
```

Then set environment variables in Supabase Dashboard and test BYOK!
