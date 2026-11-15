# Stack: Security & Authentication

## Auth-Specific Issues to Look For

### Token Management (JWT)
- Is token expiry set and reasonable? (not 30 days for access tokens)
- Is refresh token rotation implemented?
- Are tokens stored securely? (httpOnly cookies, not localStorage)
- Is the signing secret strong and rotated?
- Are token claims validated on the server (not just client)?
- Is there a token revocation mechanism?

### OAuth / Social Login
- Is the state parameter used to prevent CSRF?
- Are redirect URIs validated against a whitelist?
- Is the ID token verified (signature + claims)?
- Are scopes minimal (principle of least privilege)?

### Session Management
- Are session IDs regenerated after login?
- Is session timeout configured?
- Are sessions invalidated on logout (server-side)?
- Is the session cookie `Secure`, `HttpOnly`, and `SameSite`?

### Password Security
- Are passwords hashed with bcrypt/scrypt/argon2 (not MD5/SHA)?
- Is there a minimum password length/complexity requirement?
- Is there rate limiting on login attempts?
- Is there account lockout after N failed attempts?
- Are password reset tokens single-use and time-limited?

## General Security Checks

### Secrets Management
- Are secrets in environment variables (not committed to repo)?
- Does `.env.example` exist with placeholder values?
- Is `.env` in `.gitignore`?
- Are there any secrets in git history? (`git log --all -p | grep -i "password\|secret\|api_key"`)
- Are secrets rotated periodically?

### Input Validation
- Is ALL user input validated before processing?
- Are file uploads validated (type, size, content)?
- Is there protection against path traversal (`../`)?
- Are redirects validated against a whitelist?

### OWASP Top 10 Quick Check
- **Injection**: SQL, NoSQL, OS command, LDAP injection points?
- **Broken Auth**: Weak passwords, missing MFA, session fixation?
- **Sensitive Data Exposure**: Unencrypted PII, verbose error messages?
- **XXE**: XML external entity processing enabled?
- **Broken Access Control**: Missing role checks, IDOR vulnerabilities?
- **Security Misconfiguration**: Default credentials, debug mode in production?
- **XSS**: User input reflected without escaping?
- **Insecure Deserialisation**: Pickle, YAML, JSON deserialisation of untrusted data?
- **Known Vulnerabilities**: Outdated dependencies with CVEs?
- **Insufficient Logging**: Security events not logged?

### Environment Hygiene
- Is debug mode disabled in production?
- Are stack traces hidden from end users?
- Is HTTPS enforced (HTTP redirects to HTTPS)?
- Are security headers set (HSTS, X-Frame-Options, X-Content-Type-Options)?
