# Security Policy

## The model (important)

- **`auth/` is a live WhatsApp session** (Baileys `useMultiFileAuthState`) —
  treat it exactly like a private key. It's gitignored and must never be
  committed, copied into the Nix store, or shared. Anyone with these files
  can impersonate the linked WhatsApp number.
- **Secrets are never read from Nix.** `OPENAI_API_KEY` / `SERPER_API_KEY` /
  `LANGCHAIN_API_KEY` come from an `environmentFile` outside the Nix store
  (required on Linux) or, on Darwin, from login-Keychain lookups at service
  start — never hardcoded into `nix/module.nix` or committed anywhere.
- **`ALLOWED_NUMBERS`** is the only access gate on who the bot replies to.
  Unset, it replies to anyone who messages the linked number — fine for a
  private prototype pairing, not once the number could plausibly leak.
- **This is an unofficial WhatsApp client** (Baileys, not the WhatsApp
  Business API) — see the README's pairing section. Use a spare number, not
  a primary one; a ban risk exists by design of using this transport at all.
- The bot only ever answers from retrieved IRCC/canada.ca content or an
  honest "I don't know" — the system prompt (`src/llm.js`) forbids falling
  back to the model's own parametric knowledge, precisely so a bad retrieval
  can't turn into confidently wrong immigration information.

## Reporting a vulnerability

Please open a **private** security advisory via GitHub
("Security" → "Report a vulnerability"), or contact the maintainer directly.
Do not file public issues for undisclosed vulnerabilities.
