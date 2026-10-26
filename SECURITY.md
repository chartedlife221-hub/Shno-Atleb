# Security

The site is static: no server, no accounts, no cookies, no third-party scripts.

- **Strict CSP** (meta tag at build, `_headers` for hosts that support headers): scripts, styles, images and fonts only from the site itself; Trusted Types required.
- **No HTML injection**: the code never uses `innerHTML` and friends; text goes through text nodes. A unit test fails the build if that changes.
- **No inline code**: the build fails if the output has inline scripts, styles or event handlers.
- **URLs**: only https; external links use `rel="noopener noreferrer"`.
- **Forms**: validated and sanitised client-side, honeypot + time trap + rate limit, `credentials: omit`, no referrer. Client checks are convenience only: the receiving endpoint must validate and rate-limit again. Without `FORM_ENDPOINT`, forms run in demo mode and send nothing.
- **Supply chain**: three dev tools, zero runtime dependencies; Dependabot and `bun audit` in CI.

GitHub Pages cannot send HTTP headers, so `frame-ancestors`, HSTS and similar need a host that supports `_headers` (Netlify, Cloudflare Pages).

Report vulnerabilities privately via GitHub Security Advisories on this repository.
