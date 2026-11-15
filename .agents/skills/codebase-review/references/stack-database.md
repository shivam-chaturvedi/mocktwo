# Stack: Database (SQL, ORM, Migrations)

## Database-Specific Issues to Look For

### Migration Hygiene
- Are migrations sequential and consistent?
- Are there any migrations that drop data without a backup step?
- Is there a rollback migration for each forward migration?
- Are migrations tested (applied and rolled back)?
- Is the migration history clean (no duplicate or conflicting migrations)?

### Query Safety
- Raw SQL with string interpolation/concatenation? — SQL injection risk
- Are parameterised queries used consistently?
- N+1 query patterns: are related records loaded eagerly where needed?
- Unbounded queries: is there always a LIMIT or pagination?
- Missing indexes on frequently filtered/joined columns

### Connection Management
- Is connection pooling configured?
- Are pool limits appropriate for the deployment (not too many, not too few)?
- Are connections properly closed/returned to pool after use?
- Is there a connection timeout configured?
- Is there retry logic for transient connection failures?

### ORM-Specific
- **SQLAlchemy**: Session management correct? No leaked sessions?
- **Prisma**: Schema in sync with DB? `prisma generate` up to date?
- **TypeORM**: Migrations auto-generated correctly? Entity decorators consistent?
- **Django ORM**: `select_related` / `prefetch_related` used for joins?

### Data Safety
- Is there a backup strategy? Is it tested?
- Are destructive operations (DELETE, TRUNCATE, DROP) gated behind confirmation?
- Is soft-delete used where appropriate?
- Are sensitive fields encrypted at rest?
- Is PII flagged and handled according to privacy requirements?
