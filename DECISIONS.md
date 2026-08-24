# Decision record

Rationale lives here so `CLAUDE.md` can stay short — it's loaded into every AI
context, so it holds instructions, not essays. Read this when a decision gets
questioned (by me, the group, or the panel).

---

## Tech stack is Laravel/PHP, not the JS stack in the proposal

The group's paper specifies a JS stack, but they confirmed the choice is free
("free naman palitan"). Laravel/PHP is my strength, so the whole system is built
on it. **Consequence:** their paper's Technical Background (says Node.js) and
Table 6.0 (says PHP) contradict each other and both must be updated to match
what actually ships. Panels compare the document against the live system.

## PayMongo in test mode, on a live deployment

**Decision:** deploy publicly with a real URL, but keep PayMongo on test API
keys forever. The GCash QR flow renders and behaves genuinely; no real money
moves.

**Why this over the alternatives:**
- It's free and legal.
- It satisfies the proposal's "GCash QR payment" objective with a *real gateway
  integration* — not a faked status change, which a panel can spot immediately.
- Live payments would require the **shop owner** to register their own PayMongo
  business account (DTI/SEC documents + KYC). That's the merchant's legal
  identity, not the developer's — I will not run their transactions through my
  account.

**If the shop ever wants real payments:** the owner registers, provides live
keys, and it's a key swap. No code change. Out of scope for the capstone.

## Money stored as integer centavos

PayMongo's API denominates in centavos. Storing pesos as `decimal`/float means a
conversion at every boundary plus rounding drift across order totals. Integer
centavos removes both. Columns are `*_centavos`, `unsignedBigInteger`, formatted
only at display time.

## No realtime stock updates

The original plan named Laravel Reverb. **Reverb requires Laravel 11 and PHP
8.2**; this project is Laravel 9 on PHP 8.0. Not a preference — it cannot be
installed. If live stock updates become a requirement, the options are polling
(fine at this scale) or Pusher's free tier.

## Raw 3D assets excluded from git

`board.glb` (61.7 MB) + `wheels.glb` (74.6 MB) = 136 MB.

- Committed raw, those blobs are in history permanently; slimming later needs a
  history rewrite and force-push.
- Git LFS on a free account gives 1 GB bandwidth/month — ~7 clones.
- Both points are secondary to the real problem: **136 MB is not shippable to a
  shopper.** The version that belongs in git is the compressed one, which
  doesn't exist yet.

So: `*.glb` is git-ignored, raw files are backed up outside the project, and
compressed models get committed once produced. See `public/models/README.md`.

## Build backbone before 3D

The 3D customizer is what gets attention in a demo, but the failure mode at
defense is a management system that doesn't work. Inventory, orders, roles, and
reporting are the graded substance and the harder engineering. 3D is Phase 5 on
purpose.
