# knowAIedge

An educational experiment in agent-assisted AI content publishing. Includes AI news, category-aware GitHub repository rankings, an AI YouTube Watchlist, and an admin Model Radar.

## Runtime

The application uses React, TypeScript, Vinext and Cloudflare Workers, with D1 and R2 storage. It was built for ChatGPT Sites. Hosting, identity headers, owner-authorized publishing tools and scheduled agents require a compatible environment; uploading this repository does not deploy a website or enable automations.

Use Node.js 22.13 or later. Install dependencies with `npm ci`, then use `npm run dev` or `npm run build`. The included build integration expects Sites runtime configuration. Configure your own project ID in `.openai/hosting.json`, D1/R2 bindings and trusted authentication integration before deployment. Never trust identity headers supplied directly by public clients.

## Configuration and privacy

Set `SITE_ADMIN_EMAIL` and optionally `SITE_ADDITIONAL_ADMIN_EMAILS` in the hosting secret store. The admin allowlist defaults to empty. An optional server-side `GITHUB_TOKEN` increases GitHub API capacity. Never commit these values. Public YouTube discovery does not require a YouTube Premium token.

This source export excludes personal biographies, portraits, contact details, original deployment identifiers, Git history, local runtime files and live database/storage contents. Public editorial seed data is included. Reading history, votes and activity are runtime features; configure appropriate access controls and disclosures before deployment.

Agent schedules must be configured separately with the owner-authorized publishing connection. Existing schedule labels describe the original intended cadence and are not proof that an agent is enabled in a new deployment.

## Checks

- `npx tsc --noEmit`
- `node scripts/tests/watchlist.mjs`

Third-party license notices are retained. No new license is granted for project-owned code by this export.
