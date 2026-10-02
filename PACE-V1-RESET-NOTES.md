# PACE V1 — Fresh Baseline

This package is the clean manual-finalization baseline for PACE V1.

## Included direction
- Real-account-only flow; no demo mode or demo seed/fallback code.
- New users start with zero financial records and zero monthly budget.
- Monthly budget is user-owned server data in the Budget collection; it is never hardcoded as ₹20,000 or ₹25,000.
- Login/reload syncs transactions, goals, events, loans, budget, category budgets, and guard threshold from the authenticated backend.
- Backend API response envelopes are normalized into the frontend state model.
- Transaction create/edit/delete is wired to the authenticated API.
- Goals create/edit/delete are wired to the authenticated API.
- Events and loans use server-created IDs when authenticated.
- Financial calculations remain centralized in financialEngine.js.
- OCR is treated as V2 and should not create transactions unless explicitly enabled.
- Statement import remains an explicit V1 import path.

## Important
- `.env` files and `node_modules` are intentionally excluded from the clean archive.
- Keep your existing local `server/.env` and root `.env` values separately.
- This archive is intended to be tested from a clean install before deployment.

## Manual QA order
1. Auth
2. Profile / Settings
3. Budget persistence
4. Transactions CRUD
5. Financial engine
6. Goals
7. Events
8. Loans / EMI
9. Monthly Review
10. Reports / Insights
11. Import / Export
12. Production / PWA / security

Do not redesign the UI before functional testing is complete.
