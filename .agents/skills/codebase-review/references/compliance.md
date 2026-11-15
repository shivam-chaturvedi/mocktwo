# Compliance (Web-Facing Applications)

Load this reference file for ANY web-facing application.

## Cookie Consent & Privacy

### Cookie Banner
- Is a cookie consent mechanism implemented? (OneTrust, Cookiebot, custom)
- Does the banner block tracking/analytics cookies BEFORE consent is given?
- Is there a "reject all" option (required by GDPR)?
- Is consent stored and respected across sessions?
- Does the banner reappear when consent expires?
- Is the Do Not Track (DNT) header respected?

### GDPR / Data Privacy
- Is there a privacy policy page? Is it linked from the footer?
- Is there a data retention policy? Is it documented?
- Are right-to-delete / right-to-export endpoints implemented (if applicable)?
- Is consent collected before processing personal data?
- Are data processing agreements in place for third-party services?
- Is personal data encrypted in transit (HTTPS) and at rest?
- Are analytics anonymised (IP anonymisation in GA)?

### Cookie Configuration
- Are cookies marked `Secure`? (HTTPS only)
- Are cookies marked `HttpOnly`? (no JS access for session cookies)
- Is `SameSite` set to `Strict` or `Lax`? (CSRF protection)
- Are cookie expiry times reasonable?
- Are third-party cookies minimised?

## Security Headers (Content Security Policy)

### Required Headers
- `Content-Security-Policy` — is it set? Is it restrictive?
- `X-Frame-Options: DENY` or `SAMEORIGIN` — clickjacking protection
- `X-Content-Type-Options: nosniff` — MIME type sniffing protection
- `Strict-Transport-Security` (HSTS) — HTTPS enforcement
- `Referrer-Policy` — is referrer information leaking?
- `Permissions-Policy` — are browser features (camera, mic, geolocation) restricted?

### CSP-Specific
- Is `unsafe-inline` avoided for scripts? (use nonces or hashes instead)
- Is `unsafe-eval` avoided?
- Are allowed sources restrictive (not `*`)?
- Are report-uri or report-to configured for violations?

## Accessibility (a11y)

### Automated Checks
Run if available: `npx pa11y <url>`, `axe-core`, or Lighthouse accessibility audit.

### Manual Checks
- All images have `alt` text (empty `alt=""` for decorative images)
- All form inputs have associated `<label>` elements
- Page has a logical heading hierarchy (h1 → h2 → h3, no skipped levels)
- Colour contrast meets WCAG AA (4.5:1 normal text, 3:1 large text)
- All interactive elements are keyboard accessible (Tab, Enter, Escape)
- Focus is visible on all interactive elements
- Skip-to-content link present
- ARIA roles used correctly (not overused)
- Error messages are announced to screen readers
- Language attribute set on `<html>` element

## Licence Compliance

### Dependency Licences
- Are all dependency licences compatible with the project's licence?
- Are there any copyleft licences (GPL, AGPL) in a proprietary project?
- Is there a LICENCE/LICENSE file in the project root?
- Are third-party attributions documented where required?

### Checks to Run
```bash
# Node
npx license-checker --summary
npx license-checker --failOn "GPL-2.0;GPL-3.0;AGPL-3.0"
# Python
pip install pip-licenses --break-system-packages
pip-licenses --summary
```
