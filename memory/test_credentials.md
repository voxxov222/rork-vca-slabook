# VCA — Test Credentials & Identities

## Authentication method
- **Emergent-managed Google Sign-In** (OAuth). No app-managed passwords exist.
- Real login requires a Google account through `https://auth.emergentagent.com`. This
  cannot be automated headlessly.

## Automated-testing session (dev seed)
For backend API + web-frontend automated testing, a pre-seeded session exists:

- **Bearer token**: `testtoken_abc123`
- **User**: `tester@vca.example` (name: "Trent Collector")
- **user_id**: `user_testseed001`
- **Role**: `admin`
- Has 6 seeded collection items (1 certified after first certify call).

### Backend API testing
Send header: `Authorization: Bearer testtoken_abc123`
Example: `curl $URL/api/dashboard/stats -H "Authorization: Bearer testtoken_abc123"`

### Web frontend testing (Playwright)
Inject the token into localStorage before the app boots:
```js
await page.add_init_script("window.localStorage.setItem('vca_session_token','testtoken_abc123')")
```
Then navigate to `/`. The app will treat the session as logged in.

If the token is missing/expired, re-seed with the script in the main-agent history
(inserts users + user_sessions + collection_items into `vca_database`).

## Notes
- First real Google user to sign up automatically becomes `admin`.
- Image scanner (`POST /api/scan`) uses Gemini (`gemini-3-flash-preview`). Test with a
  real base64 JPEG/PNG card image per `/app/image_testing.md`.
