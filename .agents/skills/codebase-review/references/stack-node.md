# Stack: Node / JavaScript / TypeScript

## Checks to Run
- `eslint .` — linting
- `tsc --noEmit` — type checking (TypeScript)
- `npm audit` — dependency vulnerabilities
- `npx depcheck` — unused dependencies

## Node-Specific Issues to Look For

### Project Configuration
- Is a lock file present (package-lock.json, yarn.lock, pnpm-lock.yaml)? Is it committed?
- Is there a `.nvmrc` or `engines` field pinning the Node version?
- Dual CJS/ESM: is the `"type"` field in package.json set correctly?
- Are dev dependencies separated from production dependencies?
- Is there a `.npmrc` with `save-exact=true`?

### Code Patterns
- Empty `catch {}` blocks — silent failures
- `.catch(() => {})` on promises — swallowed errors
- Missing `await` on async functions — unhandled promise
- `==` instead of `===` — type coercion bugs
- `var` instead of `let`/`const`
- `any` type used excessively in TypeScript — defeats type safety
- `require()` in ESM context or `import` in CJS context
- `console.log` left in production code
- `process.exit()` without cleanup
- Missing `return` in Express/Koa middleware (request hangs)

### Security
- `eval()`, `new Function()`, or `vm.runInNewContext()` with user input
- Template literals in SQL queries (injection risk)
- `dangerouslySetInnerHTML` without sanitisation (XSS)
- Secrets in client-side bundles (check for `NEXT_PUBLIC_` or `VITE_` prefixed vars)
- `npm audit` results — any critical or high vulnerabilities?

### Testing
- Is a test framework configured (Jest, Vitest, Mocha)?
- Are tests actually running? Check `npm test`
- Is coverage measured?
- Any snapshot tests that are outdated?

### Build & Bundle
- Is tree-shaking working? Any side-effect imports blocking it?
- Bundle size — is it reasonable for what the app does?
- Are source maps generated for production? (security consideration)
- Is there dead code in the bundle?
