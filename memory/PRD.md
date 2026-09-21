# VCA — Verified Card Authority (Mobile) — PRD

## Original problem statement
Complete platform overhaul of VCA into a professional, futuristic collectible-card
authentication, grading, valuation, collection, verification, social and NFC ecosystem.
Brand: deep professional blue + white + authority red; premium sports/authentication feel.
Delivered as a native Expo mobile app (iOS/Android/Expo Go) with FastAPI + MongoDB backend.

## User choices
- Auth: Emergent-managed Google Sign-In
- AI: Gemini models (card scanner uses `gemini-3-flash-preview` via emergentintegrations)

## Architecture
- Frontend: Expo Router SDK 57, React 19, react-query, reanimated, gesture-handler,
  expo-camera/image-picker/image-manipulator, react-native-svg, react-native-qrcode-svg,
  @react-native-vector-icons/material-design-icons. Theme system in `src/theme.ts`.
- Backend: FastAPI (`/app/backend/server.py`), MongoDB (motor). All routes under `/api`.
  Emergent Google session auth (`/auth/session`, `/auth/me`, `/auth/logout`). First user = admin.
- Storage: `@/src/utils/storage` (SecureStore native / localStorage web) for the session token.

## Personas
- Collector — builds a digital vault, tracks portfolio value, certifies cards.
- Dealer/Creator — shares slabs on Slabook, showcases grades.
- Admin — auto-assigned to first user (foundation for forensic/admin tools).

## Implemented (2026-06)
- Auth: Google sign-in flow, session gate, redirect-based routing.
- Home dashboard: portfolio value + sparkline, quick actions, stat cards, grade donut,
  top valued cards rail, recently graded.
- AI Card Scanner: camera + library upload → Gemini identification, confidence,
  authenticity review status, condition, raw/VCA/PSA value grid, market range + sources.
- Vault (collection): grid, filters, add/edit, certify → slab, FAB add.
- VCA Slab / Certificate: interactive 3D slab, "VCA VERIFIED" banner, subgrades, QR,
  slab/NFC ids, certified value, certification-history timeline.
- Verify Certification: cert-number lookup, QR/NFC method cards, live sample.
- Slabook social feed: composer, posts, like toggle, inline comments.
- Submissions: tiers (Standard/Express/Premium/Bulk), card selection, contact + shipping
  address (Edmonton, admin-configurable via settings), submission number + status.
- Top Valued Cards: category + grade filters, ranked grid.
- Profile: cover, avatar, editable bio, stats, submissions, certified slabs, logout, admin badge.
- Card catalog seeded (Pokémon + Yu-Gi-Oh with real images/values).

## Backlog / remaining
### P0
- Real payment on submissions (Stripe) — currently records total only.
- Object storage for user-uploaded post/card images (currently URL/catalog images only).
### P1
- Admin Command Center + Forensic Lab (case management, image overlay/compare, audit logs).
- Configurable grading-weight engine + animated grade-reveal.
- Marketplace (list/buy/watchlist, verify listed certs).
- Live pricing provider abstraction (eBay/PriceCharting/PSA/YGOPRODeck) + caching.
- Global search with autocomplete.
### P2
- Native NFC read/write layer (dev build only), push notifications.
- Followers/following, trending, top collectors on Slabook.
- Watchlist + price-movement alerts.

## Next tasks
1. Stripe checkout for submissions + revenue dashboard.
2. Object storage for image uploads (posts, manual card photos).
3. Admin/Forensic module with RBAC-gated tools and audit trail.
