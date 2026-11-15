# Stack: Infrastructure (Docker, CI/CD, Terraform, Cloud)

## Docker / Container Checks

### Dockerfile Best Practices
- Multi-stage build used? (keeps image small)
- Running as non-root user? (`USER` directive)
- `.dockerignore` present and effective?
- Base image pinned to specific version (not just `latest`)?
- Secrets passed via build args? (they're visible in image history)
- Health check defined (`HEALTHCHECK` directive)?
- Unnecessary tools/packages removed from final image?
- Is the image size reasonable for what it does?

### Docker Compose
- Are services using named volumes (not bind mounts for data)?
- Are environment variables in `.env` file (not hardcoded in compose)?
- Are resource limits set (memory, CPU)?
- Is there a dependency ordering (`depends_on` with health checks)?
- Are ports mapped correctly (not exposing internal services to host)?

## CI/CD Pipeline Checks

### Security
- Are GitHub Action versions pinned to SHA (not `@v3` which can be hijacked)?
- Are secrets stored in CI secrets manager (not in env vars or config)?
- Is there branch protection on main/master?
- Are PRs required before merging?
- Are CI artifacts cleaned up (no sensitive data persisted)?

### Quality Gates
- Are tests run in CI? Which ones?
- Is there a coverage threshold that blocks merges?
- Is linting enforced in CI?
- Is there a build step that catches compilation errors?
- Are security scans (dependency audit, SAST) part of the pipeline?

### Deployment Safety
- Is there a staging/preview environment before production?
- Are deployments reversible (rollback mechanism)?
- Is there a smoke test after deployment?
- Are database migrations run separately from code deployment?

## Terraform / IaC Checks

- Is state stored remotely (not local)?
- Is state encrypted at rest?
- Are sensitive outputs marked as `sensitive = true`?
- Are values hardcoded that should be variables?
- Is there drift detection in CI?
- Are modules versioned?
- Is there a plan step before apply in CI?
