#!/usr/bin/env bash
# detect-stack.sh — Auto-detect tech stack and recommend reference files to load
# Usage: bash detect-stack.sh [project-root]
# Output: list of reference files that should be loaded

ROOT="${1:-.}"
REFS=()

# Python
if [ -f "$ROOT/pyproject.toml" ] || [ -f "$ROOT/setup.py" ] || [ -f "$ROOT/requirements.txt" ] || [ -f "$ROOT/Pipfile" ]; then
  REFS+=("stack-python.md")
fi

# Node / JavaScript / TypeScript
if [ -f "$ROOT/package.json" ] || [ -f "$ROOT/tsconfig.json" ] || [ -f "$ROOT/yarn.lock" ] || [ -f "$ROOT/pnpm-lock.yaml" ]; then
  REFS+=("stack-node.md")
fi

# Web Frontend
if grep -qsl "react\|vue\|angular\|next\|nuxt\|svelte" "$ROOT/package.json" 2>/dev/null; then
  REFS+=("stack-web.md")
fi

# API Frameworks
if grep -qsl "fastapi\|flask\|django\|express\|koa\|hono\|nestjs\|graphql\|apollo" "$ROOT/package.json" "$ROOT/pyproject.toml" "$ROOT/requirements.txt" 2>/dev/null; then
  REFS+=("stack-api.md")
fi
# Also check for route files
if find "$ROOT" -maxdepth 3 -name "routes.*" -o -name "router.*" -o -name "urls.py" 2>/dev/null | head -1 | grep -q .; then
  if [[ ! " ${REFS[*]} " =~ "stack-api.md" ]]; then
    REFS+=("stack-api.md")
  fi
fi

# Docker / CI/CD / Infrastructure
if [ -f "$ROOT/Dockerfile" ] || [ -f "$ROOT/docker-compose.yml" ] || [ -f "$ROOT/docker-compose.yaml" ] || \
   [ -d "$ROOT/.github/workflows" ] || [ -f "$ROOT/Jenkinsfile" ] || [ -f "$ROOT/.gitlab-ci.yml" ] || \
   [ -d "$ROOT/terraform" ] || [ -f "$ROOT/main.tf" ]; then
  REFS+=("stack-infra.md")
fi

# Database / ORM
if grep -qsl "sqlalchemy\|prisma\|typeorm\|sequelize\|mongoose\|django.db\|knex\|drizzle" \
   "$ROOT/package.json" "$ROOT/pyproject.toml" "$ROOT/requirements.txt" 2>/dev/null; then
  REFS+=("stack-database.md")
fi
if [ -d "$ROOT/migrations" ] || [ -d "$ROOT/alembic" ] || [ -d "$ROOT/prisma" ]; then
  if [[ ! " ${REFS[*]} " =~ "stack-database.md" ]]; then
    REFS+=("stack-database.md")
  fi
fi

# Auth / Security
if grep -qsl "jsonwebtoken\|passport\|bcrypt\|argon2\|oauth\|auth0\|clerk\|supabase/auth\|next-auth\|lucia" \
   "$ROOT/package.json" "$ROOT/pyproject.toml" "$ROOT/requirements.txt" 2>/dev/null; then
  REFS+=("stack-security.md")
fi

# Web-facing = always load compliance
if [[ " ${REFS[*]} " =~ "stack-web.md" ]] || [[ " ${REFS[*]} " =~ "stack-api.md" ]]; then
  REFS+=("compliance.md")
fi

# ServiceNow
if find "$ROOT" -maxdepth 3 -name "*.js" -exec grep -l "GlideRecord\|GlideAggregate\|gs\.\(info\|error\|log\)" {} + 2>/dev/null | head -1 | grep -q .; then
  REFS+=("stack-servicenow.md")
fi
if [ -d "$ROOT/update_sets" ] || [ -f "$ROOT/sys_metadata.xml" ]; then
  if [[ ! " ${REFS[*]} " =~ "stack-servicenow.md" ]]; then
    REFS+=("stack-servicenow.md")
  fi
fi

# Always load
REFS+=("checklists.md")

# Output
if [ ${#REFS[@]} -eq 1 ]; then
  echo "No specific stack detected. Loading general checklists only."
else
  echo "Detected stacks — load these reference files:"
fi

printf "  references/%s\n" "${REFS[@]}"
