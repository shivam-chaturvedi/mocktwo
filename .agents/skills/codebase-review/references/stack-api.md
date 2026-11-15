# Stack: API (REST, GraphQL, FastAPI, Express, Flask, Django)

## API-Specific Issues to Look For

### Input Validation
- Are ALL endpoints validating input? (not just some)
- Is validation happening at the API boundary (not deep in business logic)?
- Are request bodies schema-validated (Pydantic, Joi, Zod, class-validator)?
- Are path/query parameters validated and typed?
- Is there protection against oversized payloads?

### Authentication & Authorisation
- Is auth middleware applied to all protected routes?
- Are there any endpoints accidentally left public?
- Is the auth check at the route level (not buried in handler)?
- Role-based access: are permissions checked per-endpoint?
- Is there rate limiting on auth endpoints (login, password reset)?

### Error Handling
- Do errors return appropriate HTTP status codes (not always 500)?
- Are internal details (stack traces, DB errors) hidden from responses?
- Is there a consistent error response format?
- Are unhandled exceptions caught by a global error handler?

### API Design
- Is there an OpenAPI/Swagger spec? Is it up to date?
- Are routes versioned (`/v1/`, `/api/v2/`)?
- Is pagination implemented for list endpoints?
- Are responses consistent in shape (same envelope, same error format)?
- Are deprecation headers used for old endpoints?

### CORS Configuration
- Is CORS configured? (not just `*` in production)
- Are allowed origins, methods, and headers restrictive?
- Are credentials handled correctly with CORS?

### Rate Limiting
- Is rate limiting applied? (especially to public and auth endpoints)
- Are limits reasonable for the use case?
- Is there a response header indicating remaining quota?

### GraphQL-Specific
- Query depth limiting — is it enforced?
- Is introspection disabled in production?
- N+1 via dataloader — are dataloaders used for nested resolvers?
- Query complexity analysis — are expensive queries rejected?

### Performance
- N+1 query detection in ORM usage
- Missing database indexes for frequently queried fields
- Unbounded queries (no LIMIT clause)
- Missing response caching for stable data
- Connection pool configuration

### Monitoring Readiness
- Is structured logging in place (not just `print`)?
- Is error monitoring integrated (Sentry, Datadog, etc.)?
- Are request IDs propagated for tracing?
- Are health check endpoints present (`/health`, `/ready`)?
