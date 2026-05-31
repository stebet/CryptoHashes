# CryptoHashes

## Deployment

Production deploys run from `.github/workflows/deploy-pages.yml` on pushes to `master`.
The workflow uploads the built `dist` directory to the Cloudflare Pages project
`cryptohashes`.

### GitHub configuration

Add these repository settings before relying on the deploy workflow:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_KEY` | Cloudflare API token with Pages edit access |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID for the `cryptohashes` Pages project |

The workflow uses:

- Node from `.node-version` (`20.19.0`)
- pnpm `11.3.0`
- `pnpm test`
- `pnpm build`
- `wrangler pages deploy ./dist --project-name=cryptohashes`

### Cloudflare Pages project

- Keep the Pages project named `cryptohashes`.
- Keep the project as a **Direct Upload** project when using the GitHub Actions
  workflow. Enabling Cloudflare Git integration as well can create duplicate
  deployments.
- `hashes.stebet.net` is the production custom domain. Because `stebet.net` is
  managed in the same Cloudflare account, DNS can be managed from the Pages
  project.

## Development checks

- Use `pnpm` to install and manage dependencies.
- Before pushing changes, run:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
