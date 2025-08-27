# SpringBonk Agent Guidelines

## Scope

These instructions apply to the entire repository.

## Style & Theme

- Use Angular Material components with a clean Pip-Boy inspired aesthetic: green-on-black palette,
  thin rectangular borders, and modern spacing.
- Avoid heavy 80s decoration; emphasize clarity, accessibility, and readable typography.

## Angular & NgRx

- Use strict TypeScript typing, `OnPush` change detection, and NgRx with `inject`-based effects and
  creators.
- Prefer selector-based subscriptions and let pipes to manage store data flow.
- Provide concise console logging within effects and critical services to aid local debugging.

## Testing

- Run `npm install` when dependencies change.
- Run `npm run build` and `npm test` after modifying source code or tests. Documentation-only
  changes may skip tests.

## Commit Standards

- Keep commit history linear and do not amend existing commits.
- Ensure the working tree is clean and code is formatted before committing.
