# External Skill Sources and Verification Record

This file documents the verification, shallow-cloning, and ingestion of review, security, and testing skills into `.agents/skills/`.

## Verified Repository Sources

| Repository | Source URL | Verified Commit SHA | License | Maintenance / Verification Status | Skills Ingested |
|---|---|---|---|---|---|
| **anthropics/skills** | `https://github.com/anthropics/skills` | `1780c5e5a552fd4d1c9d6a7b0cab26b0c2bef064` | MIT | Active (Anthropic official skills repository) | `.agents/skills/anthropic-skill-creator/` (and references `webapp-testing`) |
| **anthropics/claude-code** | `https://github.com/anthropics/claude-code` | `0cb75cebcdfd767ee14cd06295f9bf4163274e79` | MIT | Active (Claude Code CLI plugins and core commands) | Reviewed plugins architecture, commit/triage commands |
| **anthropics/claude-code-security-review** | `https://github.com/anthropics/claude-code-security-review` | `0c6a49f1fa56a1d472575da86a94dbc1edb78eda` | Apache-2.0 | Active (Security review prompts and guidelines) | `.agents/skills/claude-security-review/` |
| **vercel-labs/agent-skills** | `https://github.com/vercel-labs/agent-skills` | `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` | MIT | Active (Vercel React & Next.js performance and composition patterns) | `.agents/skills/vercel-react-best-practices/`, `.agents/skills/vercel-composition-patterns/` |
| **obra/superpowers** | `https://github.com/obra/superpowers` | `22f0b463e7a5e579904dd6211a520321035526f7` | MIT | Active (Agentic workflow, systematic debugging, code review & verification skills) | `.agents/skills/systematic-debugging/`, `.agents/skills/requesting-code-review/`, `.agents/skills/verification-before-completion/` |
| **trailofbits/skills** | `https://github.com/trailofbits/skills` | `149d7b21f4067765b82e67029730b42d228ef4b4` | Apache-2.0 | Active (Trail of Bits cybersecurity, code improvement, bug patching and SARIF skills) | `.agents/skills/trailofbits-code-improver/`, `.agents/skills/trailofbits-patching-bugs/` |
| **microsoft/playwright** | `https://github.com/microsoft/playwright` | `b4d016aadc5cbd2b898a284307975fe73e05483d` | Apache-2.0 | Active (End-to-end browser automation engine) | Used for runtime audit and verification scripts (`webapp-testing`) |
| **doyensec/electronegativity** | `https://github.com/doyensec/electronegativity` | `0b4d3450321705b07461d1e7c4d88c905b761e9b` | Apache-2.0 | Maintained tool (Electron AST security scanner) | Used as static analysis security scanning tool against Electron configuration |

## Ingested Skill Inventories & Safety Notes

All ingested third-party skills were reviewed prior to use. None of their optional network-calling or installation scripts are executed. All skills function strictly in read-only analysis and advisory modes.
