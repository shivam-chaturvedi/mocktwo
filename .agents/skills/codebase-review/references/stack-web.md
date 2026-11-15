# Stack: Web Frontend (React, Next.js, Vue, Angular)

## Framework-Specific Tools
- `next lint` (Next.js)
- `vue-tsc --noEmit` (Vue + TypeScript)
- `ng lint` (Angular)
- `npx pa11y <url>` or `axe-core` — accessibility audit
- `npx lighthouse <url> --output json` — performance + a11y + SEO

## Web-Specific Issues to Look For

### Rendering & Performance
- Components re-rendering unnecessarily (missing `React.memo`, `useMemo`, `useCallback`)
- Large bundle imports (importing entire lodash instead of `lodash/get`)
- Images without dimensions (causes layout shift)
- Missing lazy loading for below-fold content
- SSR hydration mismatches (client/server content differs)
- Missing `key` props on lists
- State stored in component that should be in URL/query params

### Accessibility (a11y)
- Images without `alt` text
- Form inputs without labels
- Missing ARIA roles on interactive elements
- Colour contrast below WCAG AA (4.5:1 for text)
- Keyboard navigation: can all interactive elements be reached via Tab?
- Focus management after route changes (SPA)
- Missing skip-to-content link
- `onClick` on non-button elements without keyboard handler

### Security
- `dangerouslySetInnerHTML` or `v-html` without sanitisation — XSS
- User input reflected in page without escaping
- Environment variables exposed to client (check prefix: `NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`)
- Sensitive data in localStorage/sessionStorage (tokens, PII)
- Missing `rel="noopener noreferrer"` on external links with `target="_blank"`

### SEO (if applicable)
- Missing `<title>` or `<meta description>`
- Missing Open Graph tags
- Missing canonical URL
- Client-side only rendering for content that should be indexed

### State Management
- Props drilling through many levels (needs context or state management)
- Global state used for local concerns
- Stale closures in effects/callbacks
- Memory leaks from uncleanup effects or subscriptions
