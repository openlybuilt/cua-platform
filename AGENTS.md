# Repository instructions

- The platform is the local workflow UI. It calls the backend API; it does not access agents or provider credentials directly.
- Preserve the guided workflow, provider/VM selection, saved workflow versions, service availability handling, run history, and example guide behavior when changing related screens.
- Use the existing components and styling. Keep recordings and live-view URLs private, and do not place sensitive values in client logs.
- Use `pnpm typecheck` and `pnpm build` as appropriate. Follow the user's instructions before incurring provider usage or modifying tests.
- Do not create or modify README.md or other documentation files unless the user explicitly requests it.
