# CryptoHashes repository instructions

## Build, test, and lint

- `pnpm lint` runs Biome checks.
- `pnpm format` applies Biome formatting fixes.
- `pnpm test` runs the full Vitest suite in jsdom.
- `pnpm test -- tests/hash-engine.test.ts` runs a single test file.
- `pnpm test -- tests/app.test.ts -t "updates deterministic digests and copies digest values"` runs a single named test.
- `pnpm test:ci` matches CI by generating coverage and JUnit output.
- `pnpm build` runs `tsc --noEmit` and then `vite build`.
- Before marking work complete, run `pnpm lint`; if Biome reports formatting drift, run `pnpm format` and re-run `pnpm lint`.

## High-level architecture

- This is a client-only Vite + TypeScript SPA deployed to Cloudflare Pages.
- `src/main.ts` is only the bootstrap entrypoint; `src/app.ts` owns the rendered markup, in-memory UI state, event wiring, debounced recomputation, clipboard toasts, theme persistence, and Pwned Passwords status lookups.
- `src/hash-engine/` is the hashing boundary. The UI calls `generateDeterministicHash()` instead of using `hash-wasm` directly. NTLM is implemented separately by UTF-16LE encoding the input before hashing with MD4.
- Theme handling is split across `index.html` and `src/app.ts`: `index.html` sets `document.documentElement.dataset.theme` before the bundle loads, and the app keeps the same `localStorage` key (`cryptohashes:theme`) in sync afterward.
- Static assets in `public/` are part of the deployed behavior, not just build artifacts. `public/_headers` defines the Cloudflare Pages response headers and `public/robots.txt` is shipped verbatim.
- Deployment is aligned across `wrangler.jsonc`, `README.md`, and `.github/workflows/deploy-pages.yml`: build `dist` and deploy it to the Cloudflare Pages project named `cryptohashes`.

## Key conventions

- Keep supported hashing algorithms in sync across `src/app.ts` (`DETERMINISTIC_ALGORITHMS` labels/order), `src/hash-engine/types.ts`, `src/hash-engine/deterministic.ts`, and `tests/hash-engine.test.ts`.
- The UI is intentionally framework-free. Extend the existing imperative DOM/state pattern in `src/app.ts` instead of introducing a component framework or a second rendering model.
- Any new outbound browser fetches need matching CSP updates in `public/_headers`, and header changes should stay covered by `tests/headers.test.ts`.
- Tests mock the hash engine at the module boundary (`vi.mock('../src/hash-engine/deterministic.ts', ...)`) rather than stubbing lower-level `hash-wasm` calls.
- `public/_headers` and `public/robots.txt` are imported with `?raw` in tests, so their plain-text contents matter exactly. Preserve LF line endings when editing those files.
- Biome only checks the paths listed in `biome.json`; if you add new source or config files that should be linted/formatted, update that include list too.
