# DevTools Monetization Designer — Memory

## Project: Interview Prep Mindmap
- Coding interview prep SPA (Vue 3 + Vite + Supabase)
- Core value: AI-generated custom exercises with business themes, in-browser Python execution
- AI cost: each generation = 4-7 Anthropic API calls (generate + review loop + tests + solution + diagnosis loop)
- Using claude-sonnet-4-6 via Anthropic or OpenRouter, max_tokens=4096
- Current gate: `is_subscribed` boolean in profiles table, free limit via env var (default 1)
- No payment integration yet (Stripe, Lemon Squeezy, etc.)
- Complexity analysis is fully subscriber-gated (redirects to auth if not subscribed)
- Target audience: individual devs prepping for FAANG interviews

## Pricing Benchmarks — Interview Prep Tools (2025-2026)
- LeetCode Premium: $35/mo or $159/yr
- AlgoExpert: $99/yr
- NeetCode Pro: $99/yr (lifetime $149)
- interviewing.io: $100-225/session
- Pramp: free (peer practice)
- Typical price anchor for this category: $8-15/mo individual
