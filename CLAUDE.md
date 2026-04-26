# Claude Instructions

Rules and preferences that apply to every session in this project.

## General Behavior

1. Every proposed change must be confirmed by me before committing and pushing.
2. Keep code high quality, adhering to SOLID, DRY, KISS, and other clean code standards.
3. Code must be proposed in small, well-thought-out chunks, broken down into separate functions, files, and modules.
4. Constants and enums must be placed in a separate file using the `.constants.ts` extension.
5. Types and interfaces must be placed in files using the `.types.ts` extension.
6. Every component must be kept in its own folder; related components can be grouped under a shared parent folder.

## Code Style

1. Use Tailwind CSS utility classes for all component styling — no inline styles, no CSS Modules. Design tokens (colors, fonts) are defined in `src/global.css` under `@theme`.
2. Never hardcode UI strings in components; always source them from `src/locales/en.json` via `src/locales/index.ts`.
3. Use TypeScript strictly — avoid `any` types.
4. Keep functions short and focused — extract logic into named functions rather than relying on inline complexity.
5. Always use curly braces for `if` / `else` blocks — even single-line ones. Never write `if (x) return y` on one line.
6. Never use single-letter variable names — use descriptive names even in callbacks (e.g. `candle` not `c`).
7. Always wrap JSX in parentheses when returning, even for single-line returns — `return (<div />)`.
8. Avoid `as` type casting. Prefer proper types or type guards. When a cast is unavoidable (e.g. bridging to a branded external type), isolate it in a dedicated converter function.
9. Use `async/await` with `try/catch` for all asynchronous code — never use `.then()`, `.catch()`, or `.finally()` chains.

## Architecture Rules

1. Use React Context for shared state to avoid prop drilling. Each context must have a dedicated Provider component and a typed `use<Name>Context` hook.
2. `App.tsx` must remain layout-only — no state, no logic, no async calls. All state belongs in a context provider or a custom hook.
3. All code must pass `npm run typecheck` with zero errors before committing.

## Workflow

1. After every code change, run `npm run format` before committing to ensure consistent formatting.

## Project-Specific Rules

1. Never hardcode API keys or secrets — use environment variables.
2. Services must live in `src/services/`.
3. Shared enums and constants must live in `src/constants/`.
4. Shared types and interfaces must live in `src/types/`.
5. Translations must live in `src/locales/en.json` and be accessed via `src/locales/index.ts`.
