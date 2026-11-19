# Học tiếng Tày — Production

## Release scope

Launch the public website before the initial course is ready. The website offers the learning outline, sources, and a live catalog with a truthful empty state. No unverified lessons, audio, or test fixtures may be published. Bình Liêu remains the first planned collection. Keep desktop and mobile support, no learner accounts, local-only progress and no upload of learner audio. Use a separate repository, Supabase project, and Cloudflare Worker, never the genealogy resources.

## Approaches

- **Selected:** Keep static Astro, fetch the published catalog at runtime through Supabase Data API, and deploy built assets through GitHub Actions to Cloudflare Workers. This preserves an accessible public shell during a database outage and avoids bundling revocable course content.
- **Alternative:** Cloudflare Pages Direct Upload also serves Astro static output but offers no material advantage for this new project. Worker SSR is unnecessary until server-rendered public lesson URLs or gated audio need it.

## Data boundary

The browser only receives the project URL and publishable key. The public published catalog is read-only via explicit grants and RLS. Editorial data is in a non-exposed schema, and web clients cannot publish or retract records. No drafts, consent records, private files, test data, or personal data in the public projection. Handle loading, empty catalog, and temporary failure separately. Leave audio disabled until rights and a withdrawal process exist.

## Delivery

GitHub Actions is the only production deploy path. Run checks and build on pull requests; deploy a verified artifact from the designated production branch with dedicated environment credentials. Build with root base path. Database migrations are separate and tested locally before hosted application. Prefer the default Cloudflare URL initially; do not change DNS. Verify HTTPS, routes and assets, live Supabase permissions and empty catalog, and exclusion of the internal fixture. Record a rollback procedure; reverting site code must not restore withdrawn content.
