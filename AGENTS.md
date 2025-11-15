# SpringBonk Agent Guidelines

## Scope

These instructions apply to the entire repository.

## Style & Theme

- Use Angular Material components with a clean Pip-Boy inspired aesthetic: green-on-black palette,
  thin rectangular borders, and modern spacing.
- Avoid heavy 80s decoration; emphasize clarity, accessibility, and readable typography.

## Angular & NgRx

- Use strict TypeScript typing, `OnPush` change detection, and NgRx with `inject`-based effects and
  creators.
- Prefer selector-based subscriptions and let pipes to manage store data flow.
- Provide concise console logging within effects and critical services to aid local debugging.

## Testing

- Run `npm install` when dependencies change.
- Run `npm run build` and `npm test` after modifying source code or tests. Documentation-only
  changes may skip tests.

## Commit Standards

- Keep commit history linear and do not amend existing commits.
- Ensure the working tree is clean and code is formatted before committing.
# Frontend Status – November 14 2025

## What changed
- Recreated a full Angular (v20) client at `angular-client/akira-ng` styled with Tailwind. All UI work references the screenshots in `screenshots/` (especially `Home.png`, `bug-1.png`, `shelves-widget-mobile.png`). When implementing layouts I copied the same spacing, typography, and neon Pip-Boy aesthetic from the screenshots instead of Material components.
- Dashboard widgets now load real data. Shelves/Elections both have signal-based stores that call the Spring resource server via `ShelfHttpService`, `BookHttpService`, and `ElectionHttpService`. The widget toolbars are hidden until you tap “Show controls”, mirroring Tailwind’s collapsible tool layouts.
- Toast notifications were refined: they use a shared 15s timeout plus an animated lifespan bar inside `ToastContainer`, so success/error/info states feel alive but non-blocking.
- Implemented full shelf flows: list (`shelves-page.store.ts`), detail page with OpenLibrary search + custom book modal (`shelf-detail.store.ts`, `book-search.store.ts`), optimistic add/remove, and inline filtering/paging. Added `/books/:id` details as well.
- Implemented election detail page with candidate list and three nomination paths: OpenLibrary search, custom book modal, and nomination from existing shelves (shelf list fetched via `/shelf`). All actions are optimistic and reuse the Tailwind look. Closing an election now hits a dedicated `/election/{id}/close` endpoint which locks the tabulation and sets the closure timestamp.
- The standalone elections landing page mirrors the dashboard polish: hero actions, workflow timeline, AKIRA link grid, and Bonk! resource callouts keep everything on-brand even before backend wiring lands.
- Added specs for every store/component plus `npm test -- --watch=false --browsers=ChromeHeadless` and `npm run build` guards. Angular’s zoneless testing requires providing `provideZonelessChangeDetection()` in each spec.

## How to extend it
1. **Shelves/Elections dashboards** – the new `shelves-page.store.ts` and `election-detail.store.ts` already expose view models. Build richer dashboards by layering Tailwind cards on top of those signals. Use PaginatedList to stay on brand.
2. **Election lifecycle** – the close+reopen endpoints are wired. Next, surface a `/elections` list backed by the API so organizers can filter by status, and add creation/editing modals that reuse the Pip-Boy command menus.
3. **Optimistic UX** – keep using the pattern in `shelf-detail.store.ts`: push placeholder data into the signal state, call the API via `firstValueFrom`, and roll back on error while firing toast notifications. The new toast bar makes long operations easy to track.
4. **Styling guidance** – everything is Tailwind (see `src/styles.css` for fonts). No external CSS beyond Tailwind. Use the same green/black palette as screenshots. The elections landing page is the visual benchmark for other marketing/overview routes.

## Testing workflow
```bash
cd angular-client/akira-ng
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```
