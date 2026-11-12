# AGENTS.md — Hotel Coach Engineering Rules

## 1. Mandatory instructions

You MUST read this entire `AGENTS.md` file before performing any task in this repository.

These instructions apply to every task, including:
- Writing new code
- Modifying existing code
- Fixing bugs
- Refactoring
- Installing dependencies
- Changing configurations
- Designing architecture
- Reviewing code
- Writing tests
- Building and packaging the application

Never start implementation immediately after receiving a task.

First understand the existing project, identify relevant skills, read their instructions, and create an appropriate execution plan.

Do not assume that a skill has been read or applied simply because it is installed.

## 2. Project technology

Hotel Coach is a desktop application.

Current technology:

- Electron — desktop application runtime
- React — frontend UI
- TypeScript — application development
- Node.js — Electron main-process runtime
- Vite — frontend development and build tooling
- Electron Builder — desktop application packaging

The current objective is to build a minimal, maintainable, secure, production-ready application without unnecessary complexity.

Do not introduce additional frameworks, libraries, services, databases, or architectural layers unless the task requires them.

## 3. Mandatory skill discovery

Before every task:

1. Inspect the available project skills.
2. Identify which skills are relevant to the requested task.
3. Read the complete `SKILL.md` instructions for every relevant skill.
4. Follow the skill instructions during planning, implementation, testing, and review.
5. If multiple skills apply, combine their guidance rather than ignoring one.
6. If instructions conflict, prioritize security, correctness, project requirements, and official documentation.
7. Never pretend to have used a skill that you could not access.

Check these locations for skills:

- `.agents/skills/`
- `.claude/skills/`
- Other skill directories supported by the active coding agent.

Use the available skill discovery mechanism to locate installed skills.

### Skill selection rules

Use relevant skills, not every installed skill for every task.

| Skill | When it must be used |
|---|---|
| `electron-development` | Electron windows, main process, preload, IPC, permissions, packaging |
| `backend-architecture` | Node.js architecture, services, APIs, backend design |
| `vercel-react-best-practices` | React components, rendering, performance, hooks and state |
| `vercel-composition-patterns` | Component architecture and reusable UI composition |
| `improve-codebase-architecture` | Architecture reviews, structural changes and refactoring |
| `grill-me` | Ambiguous requirements, significant design decisions and unclear assumptions |
| `tdd` | Bug fixes, feature implementation and behavior changes |
| `webapp-testing` | Browser-based UI and end-to-end testing |
| `security-review` | Security-sensitive changes, authentication, IPC, dependencies and code reviews |

For TypeScript-specific tasks, also apply strict TypeScript practices:
- Avoid `any` unless justified.
- Prefer explicit types and safe interfaces.
- Handle nullable values and errors.
- Avoid unsafe type assertions.
- Keep types consistent across process boundaries.

If a required skill is missing, do not invent its contents. Use authoritative documentation and established engineering practices instead. Report the missing skill when it materially affects the task.

## 4. Required workflow before implementation

Follow this workflow for every meaningful task.

### Phase 1 — Understand

- Read this file.
- Inspect the existing project structure.
- Read relevant source files and configuration.
- Understand existing implementation patterns.
- Identify the actual requested outcome.
- Identify constraints and potential side effects.
- Do not assume that existing code is incorrect without examining it.

For ambiguous or high-impact tasks, use `grill-me` to clarify requirements before proceeding.

Do not ask unnecessary questions when reasonable assumptions are sufficient.

### Phase 2 — Skill research

- Discover relevant installed skills.
- Read their complete instructions.
- Identify applicable rules and recommendations.
- Check official documentation for version-sensitive APIs.
- Prefer official Electron, React, TypeScript, Node.js and Vite documentation over outdated tutorials.

Never rely on memory alone for version-sensitive technical decisions.

### Phase 3 — Architecture and planning

For significant changes:

- Use `improve-codebase-architecture`.
- Understand where the feature belongs.
- Identify affected modules and dependencies.
- Define component and module responsibilities.
- Consider error handling and failure scenarios.
- Identify security and privacy implications.
- Consider maintainability and future extension.
- Avoid unnecessary abstraction and overengineering.

For major architectural decisions, document:
- The problem
- The proposed solution
- Alternatives considered
- Trade-offs
- Security implications

Store significant decisions in `docs/decisions/` using architecture decision records.

For small changes, use a lightweight plan rather than creating unnecessary documentation.

### Phase 4 — Security and privacy assessment

Before implementing security-sensitive features, evaluate:

- Trust boundaries
- Input validation
- Permission requirements
- Data exposure
- Authentication and authorization
- Sensitive information
- Dependency risks
- Error and logging behavior
- Potential abuse scenarios

Use `security-review` whenever applicable.

Never weaken security settings simply to make an implementation work.

### Phase 5 — Implementation

- Make the smallest complete change that solves the problem.
- Follow existing naming and folder conventions.
- Keep business logic separate from presentation.
- Prefer small, focused modules.
- Use reusable components when they provide genuine value.
- Avoid duplicated logic.
- Avoid unnecessary dependencies.
- Preserve existing functionality.
- Handle errors explicitly.
- Keep code readable and maintainable.

Do not rewrite unrelated files or perform unrelated refactoring.

Do not create empty folders or placeholder abstractions without a concrete purpose.

### Phase 6 — Testing

Use `tdd` for meaningful behavior changes and bug fixes.

Depending on the task, perform:

- Unit tests
- Integration tests
- Component tests
- End-to-end tests
- Security tests
- Regression tests

Use `webapp-testing` for relevant browser-based testing.

Test failure scenarios, not just successful execution.

Never remove or weaken existing tests simply to make the test suite pass.

### Phase 7 — Code review

Before finishing:

- Review the complete diff.
- Check for unintended changes.
- Check TypeScript errors.
- Check security implications.
- Check architectural consistency.
- Check error handling.
- Check performance where relevant.
- Check for unnecessary dependencies.
- Check for duplicated or dead code.

Use `security-review` for relevant security-sensitive changes.

### Phase 8 — Verification

Use `verification-loop` if installed and relevant.

Run the appropriate checks:

- TypeScript compilation
- Linting
- Tests
- Production build
- Electron packaging when applicable

For Electron changes, verify that the application actually launches and that the packaged application works when packaging is affected.

Never claim a command succeeded unless you actually ran it and observed the result.

If a check cannot be performed, explicitly state why.

### Phase 9 — Final response

At the end of every task, provide:

1. What changed.
2. Important implementation decisions.
3. Skills used.
4. Tests and verification performed.
5. Any remaining issues or limitations.

Keep the response concise and technically precise.

## 5. Electron security requirements

Electron security is mandatory, not optional.

Always follow current official Electron security recommendations.

### Renderer security

- `nodeIntegration` must remain disabled.
- `contextIsolation` must remain enabled.
- Sandboxing must remain enabled unless a documented technical requirement prevents it.
- Use a restrictive Content Security Policy.
- Never expose unrestricted Node.js APIs to React.
- Never expose the complete `ipcRenderer` object to the renderer.
- Do not allow arbitrary remote content to execute with privileged access.

### Preload and IPC

- Expose only explicitly approved methods through `contextBridge`.
- Validate IPC inputs.
- Validate IPC sender and origin where applicable.
- Keep IPC handlers narrowly scoped.
- Never trust renderer-provided data.
- Avoid arbitrary file-system access.
- Handle errors without leaking sensitive information.

### Navigation and external resources

- Restrict navigation to trusted application URLs.
- Prevent unexpected new windows.
- Open external links through controlled system-browser handling.
- Do not permit untrusted websites to access privileged application functionality.

### Secrets and dependencies

- Never hardcode secrets.
- Never commit credentials or private keys.
- Audit dependencies before introducing them.
- Avoid unnecessary native modules.
- Keep dependencies updated responsibly.

Do not disable security protections to bypass implementation problems.

## 6. React and TypeScript requirements

- Use functional React components.
- Follow the Rules of Hooks.
- Avoid unnecessarily large components.
- Separate UI, state management and application logic.
- Use composition instead of excessive conditional rendering.
- Avoid unnecessary global state.
- Avoid premature optimization.
- Keep TypeScript strict.
- Prefer explicit and reusable types.
- Avoid unsafe casts and ignored compiler errors.
- Handle loading, empty, success and error states appropriately.

Do not introduce state-management libraries unless actual application complexity justifies them.

## 7. Architecture principles

Follow these principles:

- Separation of concerns
- Single responsibility
- High cohesion
- Low coupling
- Explicit dependencies
- Dependency inversion where useful
- Composition over inheritance
- Small, understandable modules
- Secure defaults
- Fail-safe behavior

Do not blindly apply design patterns.

Do not introduce microservices, event buses, dependency injection frameworks, repositories or additional abstraction layers without a real requirement.

The simplest architecture that satisfies current requirements is preferred.

## 8. Legal, privacy and compliance

For features involving personal data, camera access, employee data, physiological measurements, AI processing, third-party SDKs or data sharing, perform a privacy and compliance assessment before implementation.

Review applicable requirements, including:

- GDPR
- EU AI Act
- Employee monitoring and workplace privacy rules
- Data minimization
- Purpose limitation
- Retention and deletion
- Transparency and consent where legally appropriate
- Third-party data processing
- Software and open-source licenses

Never claim legal compliance without sufficient evidence and appropriate legal review.

Do not implement emotion recognition, inferred psychological states or employee employment-related scoring without first assessing applicable legal restrictions.

Do not assume that user consent makes an otherwise prohibited processing activity lawful.

Treat legal and compliance decisions as requiring qualified human review.

## 9. Documentation and official sources

Prefer primary sources:

- Electron: https://www.electronjs.org/docs/latest/
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/docs/
- Node.js: https://nodejs.org/docs/latest/api/
- Vite: https://vite.dev/guide/
- Electron Builder: https://www.electron.build/
- OWASP: https://owasp.org/
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- EU AI Act: https://eur-lex.europa.eu/eli/reg/2024/1689/oj

Check the documentation version relevant to the installed dependencies.

Do not invent APIs, configuration options, package names or command-line flags.

## 10. Dependency management

Before adding a dependency:

1. Explain why it is needed.
2. Check whether existing functionality can solve the problem.
3. Check maintenance activity and compatibility.
4. Check license and security considerations.
5. Prefer established, maintained packages.
6. Avoid adding dependencies for trivial functionality.

Do not upgrade unrelated dependencies during a feature task.

## 11. Git and change management

- Never overwrite user work without understanding it.
- Never delete files simply because they appear unused.
- Never run destructive commands without understanding their impact.
- Never force-push or rewrite Git history unless explicitly authorized.
- Do not commit secrets, local configuration or generated artifacts unnecessarily.
- Keep changes focused and reviewable.

## 12. Non-negotiable rules

1. Read `AGENTS.md` before every task.
2. Read all relevant skill instructions before implementation.
3. Plan before significant changes.
4. Research version-sensitive APIs.
5. Follow secure Electron defaults.
6. Never fabricate test results.
7. Never silently ignore errors.
8. Never add unnecessary complexity.
9. Never make unsupported legal or security claims.
10. Verify the final implementation.
11. Preserve existing functionality.
12. Explain important trade-offs.

## Final principle

Act like a senior software engineer responsible for a real production application.

Do not optimize for writing code quickly.

Optimize for correctness, security, maintainability, reliability and simplicity.

Understand first. Research second. Design third. Implement fourth. Test and review last.



# UI/UX, Premium Design & macOS Guidelines

## 1. Mandatory UI skill usage

Before creating, modifying, or reviewing any UI, you MUST:

1. Read the complete instructions of all relevant installed UI skills.
2. Use `frontend-design` for visual design decisions.
3. Use `vercel-react-best-practices` and `vercel-composition-patterns` for React implementation.
4. Use relevant skills from `hueyexe/frontend-agent-skills` and `jakubkrehel/skills` for layout, colors, typography, design systems and UX.
5. Use relevant animation and accessibility skills when applicable.
6. Never assume a skill was used without actually reading its instructions.

Use only skills relevant to the task. Avoid unnecessary duplication.

## 2. Apple Human Interface Guidelines — Mandatory

For every macOS-specific UI decision, consult Apple's official Human Interface Guidelines:

https://developer.apple.com/design/human-interface-guidelines/

Treat these guidelines as the primary reference for native macOS user experience.

Follow relevant guidance for:

- Window design and behavior
- Navigation, sidebars and toolbars
- SF Symbols and iconography
- Typography and SF Pro
- Native controls and interactions
- Light and dark appearances
- Keyboard shortcuts and accessibility
- Spacing, alignment and visual hierarchy
- Menus, dialogs and notifications
- Window resizing and responsive layouts
- Platform conventions and user expectations

Do not blindly copy web-dashboard patterns into a macOS desktop application.

Use native macOS conventions where appropriate while maintaining a cohesive product identity.

## 3. Color and typography

Before implementing a new interface:

- Establish a consistent color palette.
- Define semantic color tokens.
- Use appropriate contrast ratios.
- Choose typography deliberately.
- Establish a consistent type scale and hierarchy.
- Use readable font sizes and line heights.
- Prefer native system typography where appropriate.
- Avoid arbitrary colors, font combinations and inconsistent spacing.

Do not introduce gradients, shadows, glass effects or accent colors without a clear design purpose.

## 4. Premium visual design

Hotel Coach must have a polished, professional, modern and premium visual identity.

Prioritize:

- Clean layouts
- Strong visual hierarchy
- Consistent spacing
- Restrained color usage
- Elegant typography
- Consistent iconography
- Well-designed cards and panels
- Subtle transitions
- Purposeful micro-interactions
- Clear loading, empty, error and success states

Avoid generic AI-generated dashboard aesthetics, excessive gradients, unnecessary glassmorphism, decorative elements and inconsistent components.

## 5. UX and interaction quality

Every interface must prioritize usability.

Consider:

- Clear navigation
- Predictable interactions
- Meaningful feedback
- Accessible keyboard navigation
- Visible focus states
- Appropriate hover and pressed states
- Error prevention and recovery
- Empty and loading states
- Screen-size and window-size behavior

Respect the user's reduced-motion preference.

## 6. Design system

Maintain reusable design tokens and components.

Keep consistent:

- Colors
- Typography
- Spacing
- Border radii
- Shadows
- Icons
- Buttons
- Inputs
- Cards
- Navigation
- Dialogs

Do not create a new visual style for every screen.

## 7. Mandatory visual verification

Never finish a UI task simply because the code compiles.

You MUST:

1. Run the application.
2. Inspect the actual rendered interface.
3. Check alignment, spacing, typography and colors.
4. Check different window sizes.
5. Check light and dark appearances where supported.
6. Verify interactions and keyboard accessibility.
7. Fix visible issues before completing the task.

Use browser or desktop screenshot inspection tools when available.

If visual inspection is unavailable, explicitly disclose this limitation.

## Final design principle

Design Hotel Coach as a premium macOS application, not a generic website placed inside an Electron window.

Prioritize native platform conventions, excellent typography, thoughtful colors, intuitive UX, consistency and restraint.