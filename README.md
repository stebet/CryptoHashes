# CryptoHashes

## Cloudflare Pages dashboard setup

Use Cloudflare Pages **Git integration** for `stebet/CryptoHashes`.

1. In Cloudflare, go to **Workers & Pages** and create a new Pages project from Git.
2. Select this repository.
3. Configure the project with these dashboard values, then select **Save and Deploy**:

| Setting | Value |
| --- | --- |
| Project name | `cryptohashes` |
| Production branch | `master` |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | repo root (`/`) |

### Version pinning

- Node is pinned by `.node-version`, currently `20.19.0`.
- In **Settings** -> **Environment variables**, set `PNPM_VERSION=11.3.0` for both Production and Preview so Pages uses the repo's pinned pnpm version.

### Custom domain

After the first successful deploy:

1. Open the `cryptohashes` Pages project.
2. Go to **Custom domains** -> **Set up a domain**.
3. Add `hashes.stebet.net`.
4. Because `stebet.net` is already managed in the same Cloudflare account, let Cloudflare create and verify the DNS record automatically.

Once the domain shows as active, production traffic for `master` should serve from `https://hashes.stebet.net`.
