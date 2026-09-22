# Frontend Customization Guide

This guide gives a team everything needed to customize the Live Voice Practice
frontend from scratch — layout, branding, theming, content, flows, and API
wiring. It targets the code that lives under [frontend/](../frontend) and is
based on the current shipped structure.

> Audience: React + TypeScript developers who want to fork/rebrand this app
> (for example for a new customer, product line, or specialty).

---

## 1. Tech Stack Snapshot

| Area | Choice | Where |
| --- | --- | --- |
| Framework | React 19 | [frontend/src/main.tsx](../frontend/src/main.tsx) |
| Language | TypeScript 5.9 (strict) | [frontend/tsconfig.json](../frontend/tsconfig.json) |
| Build | Vite 7 | [frontend/vite.config.ts](../frontend/vite.config.ts) |
| UI kit | Fluent UI React v9 (+ v8 for admin) | [frontend/package.json](../frontend/package.json) |
| Routing | react-router-dom v6 | [frontend/src/main.tsx](../frontend/src/main.tsx) |
| Charts | recharts | [frontend/src/components/charts/](../frontend/src/components/charts) |
| Linting | ESLint 9 + Prettier 3 | [frontend/eslint.config.js](../frontend/eslint.config.js) |

Common commands (run from `frontend/`):

```bash
npm install
npm run dev        # local dev server, proxies /api and /ws to :8000
npm run build      # tsc + vite build -> ../frontend/static
npm run lint
npm run format
```

The Vite dev server proxies backend calls to `http://localhost:8000`, and the
build output lands in `frontend/static/` (served by Flask in production). See
[frontend/vite.config.ts](../frontend/vite.config.ts#L4-L30).

---

## 2. Repository Map

```
frontend/
|-- index.html                        # Page shell: <title>, favicon, theme-color
|-- vite.config.ts                    # Build output + dev proxy
|-- package.json                      # Scripts and dependencies
|-- eslint.config.js                  # Lint rules
|-- public/
|   `-- images/                       # Static images served at /images/*
|-- src/
    |-- main.tsx                      # Entry: FluentProvider + Router
    |-- app/App.tsx                   # Main practice flow (setup/practice/results/history)
    |-- components/                   # Reusable UI pieces
    |   `-- admin/                    # /admin surface (Fluent UI v8 shell)
    |-- hooks/                        # Audio, recorder, realtime, auth, scenarios
    |-- services/                     # Backend HTTP clients
    |-- styles/global.css             # Global CSS reset + base font
    |-- types/index.ts                # Shared TypeScript types + option lists
    `-- utils/                        # Small pure helpers
```

Two React roots are wired inside a single `BrowserRouter`:

- `/*` → [App.tsx](../frontend/src/app/App.tsx) (trainee/clinician experience)
- `/admin/*` → [AdminShell](../frontend/src/components/admin/AdminShell.tsx) (trainer/admin views)

Both are wrapped by a single Fluent UI theme in
[frontend/src/main.tsx](../frontend/src/main.tsx#L14-L24).

---

## 3. Branding (Name, Logo, Title, Colors)

### 3.1 App name

The visible product name comes from two places:

1. **Runtime override from backend** — `GET /api/config` returns `app_name`,
   read in [App.tsx](../frontend/src/app/App.tsx#L175-L182). This is the
   preferred override for deployed environments and is driven by the
   `APP_DISPLAY_NAME` (or `app_display_name`) backend config value.
2. **Frontend default** — the fallback string used until (or if) the config
   call resolves. Update both:
   - [App.tsx](../frontend/src/app/App.tsx#L149) — `useState<string>('Special Olympics MedBuddy')`
   - [ScenarioList.tsx](../frontend/src/components/ScenarioList.tsx#L205) — the `alt` and label fallbacks

### 3.2 Browser tab title, favicon, theme-color

Edit [frontend/index.html](../frontend/index.html):

- `<title>` — browser tab title
- `<link rel="icon" ...>` — favicon path (currently `/images/special-olympics-logo.svg`)
- `<meta name="theme-color" content="#1d5b9f">` — mobile browser chrome color

### 3.3 Logo image

- Drop your SVG/PNG under [frontend/public/images/](../frontend/public/images).
  Anything in `public/` is served verbatim (no import needed).
- Update the `src` attributes:
  - [App.tsx](../frontend/src/app/App.tsx#L646) (branding bar)
  - [ScenarioList.tsx](../frontend/src/components/ScenarioList.tsx#L204) (setup screen)
  - [index.html](../frontend/index.html) (favicon)

### 3.4 Colors and theme

The app uses a **Fluent UI theme** for tokens, plus a few explicit hex values
for accent color and background.

- Global theme is set in
  [frontend/src/main.tsx](../frontend/src/main.tsx#L16). Swap
  `webLightTheme` for a custom brand theme built with `createLightTheme` and
  `BrandVariants` from `@fluentui/react-components`:

  ```tsx
  import { createLightTheme, BrandVariants } from '@fluentui/react-components'

  const brand: BrandVariants = {
    10: '#020305',
    20: '#111a2c',
    // ...fill all 16 steps for your brand ramp
    160: '#e6f0fb',
  }

  const brandTheme = createLightTheme(brand)
  ```

  Then pass `theme={brandTheme}` to `<FluentProvider>`. Every component that
  reads `tokens.colorBrand*` will pick this up automatically.

- Hard-coded accent hex `#1d5b9f` still appears in
  [ScenarioList.tsx](../frontend/src/components/ScenarioList.tsx#L31)
  ([and here](../frontend/src/components/ScenarioList.tsx#L40),
  [here](../frontend/src/components/ScenarioList.tsx#L82),
  [here](../frontend/src/components/ScenarioList.tsx#L130)). Replace those
  with `tokens.colorBrandForeground1` / `tokens.colorBrandStroke1` once the
  Fluent brand ramp is in place.

- The setup screen background gradient lives in
  [App.tsx](../frontend/src/app/App.tsx#L50):
  `background: 'linear-gradient(180deg, #f4f9ff 0%, #edf5ff 100%)'` — change
  the two stops for a different mood or use tokens for full theming.

- Global body font family and CSS reset are in
  [frontend/src/styles/global.css](../frontend/src/styles/global.css). Update
  the `body` `font-family` here (a single place) to change site-wide typography.

### 3.5 Release badge

The small version badge in the bottom-right corner is
`RELEASE_VERSION` in [App.tsx](../frontend/src/app/App.tsx#L41). Update the
string per release or drive it from `import.meta.env.VITE_APP_VERSION` if you
want it managed at build time.

---

## 4. Runtime Configuration From the Backend

The frontend intentionally reads a small config document from
`GET /api/config` (see
[backend/src/app.py](../backend/src/app.py#L203-L215)). Today it exposes:

| Field | Purpose | Frontend consumer |
| --- | --- | --- |
| `app_name` | Product display name | [App.tsx](../frontend/src/app/App.tsx#L177) |
| `proxy_enabled` | Whether voice traffic uses backend proxy | [useRealtime.ts](../frontend/src/hooks/useRealtime.ts#L120) |
| `ws_endpoint` | WebSocket path for voice bridge | [useRealtime.ts](../frontend/src/hooks/useRealtime.ts#L120) |

To add a new configurable setting (for example, a footer link, support email,
or default patient language):

1. Extend the JSON in `get_config` in
   [backend/src/app.py](../backend/src/app.py#L203-L215).
2. Extend the return type in
   [frontend/src/services/api.ts](../frontend/src/services/api.ts#L72-L75).
3. Consume it from `App.tsx` (or a dedicated `useAppConfig` hook if usage
   grows).

Prefer this path over Vite `.env` for values you want to change per
environment without a rebuild.

---

## 5. Page Layout and Views

`App.tsx` is the single trainee experience and switches between views via
`currentView`:

```ts
type AppView = 'setup' | 'practice' | 'results' | 'conversations' | 'conversationDetail'
```

See [App.tsx](../frontend/src/app/App.tsx#L38). The main visual regions are:

- **Branding bar** (top-left logo + name) — `styles.brandingBar` in
  [App.tsx](../frontend/src/app/App.tsx#L54)
- **Setup dialog** — `ScenarioList` inside a Fluent `Dialog`
- **Practice layout** — `styles.mainLayout` (chat + video + patient summary)
- **Results layout** — `styles.resultsLayout` (two-column grid)
- **Release badge** — `styles.releaseBadge`

To customize layout:

- Adjust widths in `styles.mainLayout` / `styles.resultsLayout`
  ([App.tsx](../frontend/src/app/App.tsx#L67-L112)) — `width`, `maxWidth`,
  `gap`, `gridTemplateColumns`.
- Reorder or hide panels by editing the JSX blocks inside each view branch of
  `App.tsx`. Keep the panel components stable; wrap or replace them rather
  than embedding new behavior in `App.tsx` (see
  [.github/copilot-instructions.md](../.github/copilot-instructions.md)).

If you need a new top-level view (for example a "Trainer dashboard" tab that
is not under `/admin`), add it to the `AppView` union and a new branch in the
`return` statement.

---

## 6. Components You Will Likely Customize

All under [frontend/src/components/](../frontend/src/components):

| Component | Purpose |
| --- | --- |
| [ScenarioList.tsx](../frontend/src/components/ScenarioList.tsx) | Setup dialog: logo, app name, visit type cards, patient metadata, consent, language, reading level, Start Visit button |
| [ChatPanel.tsx](../frontend/src/components/ChatPanel.tsx) | Live conversation panel + mic controls |
| [VideoPanel.tsx](../frontend/src/components/VideoPanel.tsx) | Avatar / WebRTC video panel and connection stage UI |
| [PatientTranscriptPanel.tsx](../frontend/src/components/PatientTranscriptPanel.tsx) | Patient-facing simplified transcript |
| [PatientSummaryPanel.tsx](../frontend/src/components/PatientSummaryPanel.tsx) | Post-visit patient summary |
| [ProviderRubricPanel.tsx](../frontend/src/components/ProviderRubricPanel.tsx) | Provider-side scoring/feedback |
| [AssessmentPanel.tsx](../frontend/src/components/AssessmentPanel.tsx) | Detailed assessment view |
| [ConversationList.tsx](../frontend/src/components/ConversationList.tsx) | History list |
| [ConversationDetail.tsx](../frontend/src/components/ConversationDetail.tsx) | Single conversation detail view |
| [UserHeader.tsx](../frontend/src/components/UserHeader.tsx) | Signed-in user chip + sign-in/out |
| [CustomScenarioEditor.tsx](../frontend/src/components/CustomScenarioEditor.tsx) | Trainer scenario editor |
| [admin/](../frontend/src/components/admin) | `/admin` surface (Fluent v8 shell + content/statistics tabs) |
| [charts/](../frontend/src/components/charts) | Recharts wrappers + chart theme |

Guidelines when customizing:

- Keep API/data-fetching logic out of components. Use services and hooks
  (Sections 7 and 8).
- Use `makeStyles` + `tokens` from `@fluentui/react-components` so brand
  changes propagate through the theme.
- If a component grows past ~200 lines with mixed concerns, extract a hook or
  a sub-component — this is called out in
  [.github/copilot-instructions.md](../.github/copilot-instructions.md).

---

## 7. Hooks (Behavior)

Under [frontend/src/hooks/](../frontend/src/hooks):

| Hook | Role |
| --- | --- |
| `useScenarios` | Loads scenarios via `/api/scenarios`, tracks selection |
| `useRealtime` | Opens `/ws/voice`, streams messages, drives conversation state |
| `useRecorder` | Microphone capture (MediaRecorder / audio worklet) |
| `useAudioPlayer` | Playback of TTS chunks |
| `useWebRTC` | Avatar WebRTC connection setup and diagnostics |
| `useAuth` | Reads `/api/me`, exposes `authenticated`, `user`, `isTrainer` |
| `useConversations` | Practice history list + detail |
| `useAdminContent` | Content admin data (scenarios, rubrics, materials, transcripts) |
| `useStatistics*` | Filters + KPIs + cohort/trainee statistics |

Common customizations:

- **Change default language / reading level** → edit the initial state in
  [App.tsx](../frontend/src/app/App.tsx#L142-L146) (`patientLanguage`,
  `readingLevel`).
- **Change WebSocket path** → update `ws_endpoint` served by
  `GET /api/config` (backend). No frontend code change should be needed.
- **Swap the recorder implementation** → replace `useRecorder`; keep the
  public shape (`start`, `stop`, chunk callback) so `App.tsx` does not need
  to change.

If adding a new hook, keep it single-purpose and colocate its types near the
hook file (or add them to
[frontend/src/types/index.ts](../frontend/src/types/index.ts) if shared).

---

## 8. Services (Network Calls)

Under [frontend/src/services/](../frontend/src/services):

| Service | Endpoints it wraps |
| --- | --- |
| [api.ts](../frontend/src/services/api.ts) | `/api/config`, `/api/scenarios`, `/api/agents/create`, `/api/analyze`, `/api/conversations`, `/api/client-log` |
| [admin.ts](../frontend/src/services/admin.ts) | Admin content endpoints |
| [customScenarios.ts](../frontend/src/services/customScenarios.ts) | Custom scenarios CRUD |
| [statistics.ts](../frontend/src/services/statistics.ts) | Trainer statistics endpoints |

Rules of thumb:

- All `fetch` calls should live here. Do not call `fetch` from components.
- Preserve endpoint routes and response shapes unless you are also updating
  the backend (see the backend routes referenced in
  [AGENTS.md](../AGENTS.md)).
- When you add a new endpoint, add a matching TypeScript type in
  [frontend/src/types/index.ts](../frontend/src/types/index.ts) and reuse it
  from the service and consumers.
- Errors are surfaced via `throw new Error(...)` (see
  [api.ts](../frontend/src/services/api.ts#L60-L74)); keep this pattern so the
  UI can render error state uniformly.

---

## 9. Types and Option Lists You Will Edit

Most product-configurable option lists live in
[frontend/src/types/index.ts](../frontend/src/types/index.ts):

- `AVATAR_OPTIONS`, `DEFAULT_AVATAR` — voice/video avatars offered on setup.
- `VISIT_TYPES` — cards shown in the ScenarioList setup dialog. Add/remove
  entries to change the visit choices.
- `PATIENT_LANGUAGES` — languages the patient transcript/summary can be
  rendered in.
- `ReadingLevel` — supported reading level tokens (`plain | grade_5 | grade_8`).

`Scenario`, `Assessment`, `PatientSummary`, and `SimplifiedTranscriptEntry`
are the data contracts crossing the API boundary. Coordinate any changes
with backend types.

---

## 10. Routing and Adding New Pages

Routing is set in
[frontend/src/main.tsx](../frontend/src/main.tsx#L17-L23):

```tsx
<Routes>
  <Route path="/admin/*" element={<AdminShell />} />
  <Route path="/*" element={<App />} />
</Routes>
```

To add a top-level route (for example `/reports`):

1. Create the page component under `frontend/src/components/` or a new
   `frontend/src/pages/` folder.
2. Add a `<Route path="/reports/*" element={<ReportsShell />} />` above the
   catch-all `/*` route.
3. If the route needs auth, gate it with the `useAuth` hook the same way
   `AdminShell` gates trainer surfaces.

Views inside the main practice flow (`setup`, `practice`, `results`,
`conversations`, `conversationDetail`) are switched via internal state in
`App.tsx`, not react-router. Keep that pattern unless you have a strong
reason to change it — it avoids browser-history churn during a live voice
session.

---

## 11. Authentication and Roles

- The frontend calls `/api/me` from
  [useAuth.ts](../frontend/src/hooks/useAuth.ts) and exposes
  `authenticated`, `user`, `isTrainer`.
- Trainer-only UI (All Practices button, admin routes) reads `isTrainer`.
- Auth is enforced by Azure Container Apps Easy Auth (see
  [docs/authentication.md](authentication.md)); the frontend should never
  send credentials directly.
- To add new roles or gate additional UI, extend `useAuth` and use its
  booleans in the affected components — do not sprinkle role checks across
  services.

---

## 12. Static Assets

- Put images, PDFs, and other static files under
  [frontend/public/](../frontend/public). They are served from the site root,
  so a file at `public/images/logo.svg` is available at `/images/logo.svg`.
- The production build copies these into `frontend/static/`, which Flask
  serves. Do not check in generated files under `frontend/static/`; treat
  `static/` as a build output (see the `outDir` in
  [vite.config.ts](../frontend/vite.config.ts#L6-L9)).

---

## 13. Environment Variables

Vite exposes any variable prefixed with `VITE_` at build time via
`import.meta.env`. Today the app does not require any, but useful additions
you can wire in:

- `VITE_APP_VERSION` → replace the hard-coded `RELEASE_VERSION` in
  [App.tsx](../frontend/src/app/App.tsx#L41).
- `VITE_TELEMETRY_CONNECTION_STRING` → optional App Insights connection
  string for browser telemetry.

Do not put secrets in `VITE_*` variables — they ship inside the bundle.

---

## 14. Local Development Loop

1. Start the backend (`cd backend && python src/app.py`) on port 8000.
2. Start the frontend (`cd frontend && npm run dev`).
3. Vite dev server runs on port 5173 by default and proxies `/api` and `/ws`
   to `http://localhost:8000` (see
   [vite.config.ts](../frontend/vite.config.ts#L23-L32)).
4. Sign-in flows require Container Apps Easy Auth, so locally you may run
   unauthenticated flows only. Trainer views can be exercised behind a real
   Azure deployment (see [docs/deployment.md](deployment.md)).

Before opening a PR:

```bash
cd frontend
npm run format
npm run lint
npm run build
```

---

## 15. Rebranding From Scratch — Suggested Order

If a team wants to fork this frontend for a new product:

1. **Identity**
   - Replace the logo asset in
     [frontend/public/images/](../frontend/public/images).
   - Update `<title>`, favicon, and `theme-color` in
     [frontend/index.html](../frontend/index.html).
   - Update the fallback name in
     [App.tsx](../frontend/src/app/App.tsx#L149) and
     [ScenarioList.tsx](../frontend/src/components/ScenarioList.tsx#L205).
   - Set backend `APP_DISPLAY_NAME` to the new product name.
2. **Theme**
   - Build a `BrandVariants` ramp and wire `createLightTheme` in
     [frontend/src/main.tsx](../frontend/src/main.tsx#L16).
   - Replace the remaining `#1d5b9f` occurrences in
     [ScenarioList.tsx](../frontend/src/components/ScenarioList.tsx#L31)
     with brand tokens.
   - Tune the gradient in
     [App.tsx](../frontend/src/app/App.tsx#L50).
   - Update the body font in
     [global.css](../frontend/src/styles/global.css).
3. **Content**
   - Reshape `VISIT_TYPES`, `PATIENT_LANGUAGES`, and `AVATAR_OPTIONS` in
     [types/index.ts](../frontend/src/types/index.ts).
   - Adjust setup dialog copy in
     [ScenarioList.tsx](../frontend/src/components/ScenarioList.tsx).
   - Adjust practice panel copy and empty-states in the relevant components.
4. **Flow**
   - If your product does not need patient transcript / summary, remove
     those panels from the `practice` and `results` branches in
     [App.tsx](../frontend/src/app/App.tsx#L200-L900) and delete unused
     hooks/services.
   - If the assessment shape differs, evolve `Assessment` in
     [types/index.ts](../frontend/src/types/index.ts) with the backend team.
5. **Ship**
   - Verify `npm run build` succeeds.
   - Deploy via `azd deploy` (see [docs/deployment.md](deployment.md)).

---

## 16. Do / Don't

**Do**

- Keep API calls in `services/` and UI in `components/`; put behavior in
  `hooks/`.
- Reuse Fluent tokens (`tokens.colorBrand*`, `tokens.spacing*`,
  `tokens.borderRadius*`) instead of raw pixels/hex.
- Add tests when extracting non-trivial logic; keep them deterministic.
- Update
  [.github/copilot-instructions.md](../.github/copilot-instructions.md) if
  you introduce new conventions that others (and Copilot) should follow.

**Don't**

- Don't add new architectural patterns unless the current ones are
  insufficient.
- Don't weaken TypeScript strict settings or spread `any` across the
  codebase.
- Don't hardcode secrets, tenant IDs, or environment-specific URLs.
- Don't commit generated `frontend/static/` contents produced by a local
  build.

---

## 17. Related Documents

- [AGENTS.md](../AGENTS.md) — full stack, features, and project structure.
- [.github/copilot-instructions.md](../.github/copilot-instructions.md) —
  contribution conventions.
- [docs/how-it-works.md](how-it-works.md) — end-to-end runtime flow.
- [docs/authentication.md](authentication.md) — auth model and roles.
- [docs/deployment.md](deployment.md) — deploying via `azd`.
