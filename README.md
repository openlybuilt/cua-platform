# Openly platform

The platform is Openly's local workflow UI. Build guided Browser and Windows workflows, choose a configured provider, inspect runs and recordings, manage schedules and placeholders, and use the interactive guide. The guide plays a prerecorded example; it does not start a VM for that example.

The platform communicates with the backend, which owns persistent data and orchestration. Agents executes the workflows. For complete setup, see [computer-use](https://github.com/openlybuilt/computer-use).

## Run locally

Install Node.js 24 and pnpm 11.25.0, and start the backend and agents with their required configuration. Set `BACKEND_URL` to the backend's local HTTP origin, for example `http://127.0.0.1:2120`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The development server binds to `127.0.0.1` and defaults to port `2110`. Set `PORT` or pass `--port` to use a different port.

Open `http://127.0.0.1:2110`. `UI_ORIGIN` is optional; when set, it must match the browser's exact origin, including host and port, for write requests. The app displays a service-unavailable screen when required services cannot be reached. Configured providers and their supported VM types are discovered through the backend.

The application currently uses a local workspace and does not provide user sign-in. The service-to-service tokens remain part of the backend/agents configuration.

## Checks

```sh
pnpm typecheck
pnpm build
```

## License

[MIT](LICENSE).
