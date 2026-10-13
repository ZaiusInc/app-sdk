# Repo notes for coding agents

## Keep build-time code out of the runtime module graph

Every OCP function and job process loads `@zaiusinc/app-sdk` from the package root (`src/index.ts`): anduin's
parent process and each worker it forks. Everything the root reaches through **static** imports is loaded,
parsed and held in memory on every cold start, in pods with a 512 Mi–1 Gi memory limit.

Validation (`src/app/validation/`) only runs at build time: anduin's `validate` mode in the builder and the
`ocp-app-sdk validate` CLI. It pulls in remark/unified, lodash (via `json-schema-merge-allof`) and
`jsonpath-rfc9535`, which is about two thirds of the module graph.

When adding or changing code:

- **Runtime code must not value-import from `src/app/validation/`.** Runtime code is anything reachable from
  `src/index.ts` through static imports. Use `import type` for types. Load values with `await import(...)` at
  the call site, on the path that needs them only. Example: `Runtime.initialize` loads Ajv only when it
  validates the manifest, and `buildManifestSchema` only when the app also has plugins.
- **Expose validation APIs on the root through `src/app/validation/lazy.ts`.** It holds thin wrappers that load
  the real module on first call, and must have no top-level value imports from the validation directory.
  Never add `export * from './validation'`, or any other validation module, to a barrel.
- **The same goes for any heavy dependency that's only needed at build time.** Keep it behind a dynamic import.
- **`src/app/validation/tests/lazy.test.ts` guards this.** It fails if importing the root loads any module in
  `src/app/validation/` or one of the packages it tracks. If it fails, fix the import; don't add the module to
  the test's exclusions. When you add a heavy build-time-only package, add it to the tracked list.

To check the size directly, count what the root loads (167 modules after OCP-2399):

```sh
npx tsc && node -e "const before = new Set(Object.keys(require.cache)); require('./dist'); console.log(Object.keys(require.cache).filter((k) => !before.has(k)).length)"
```

### Why this matters

`export * from './validation'` was added to the app barrel in 3.3.2 (OCP-1680), and nothing flagged that the
barrel is also the runtime's hot path. Importing the root went from 234 modules to over 700: about 40 ms and
13 MB more per process, or ~140 MB in a pod running a parent and ten workers. OCP-2399 took it down to 167.

## The root API and some `dist/` paths are a contract with the platform

- **Keep root exports backwards compatible within a major.** Apps don't run the app-sdk version in their own
  `package.json`. zap-build installs the version pinned for the app's major in `node22/dependencies.json`. A
  breaking change needs a new major, which means a new runtime line (anduin, app-storage), and it never reaches
  existing apps.
- **Code outside this repo deep-imports files under `dist/`.** Don't move these, and don't add an `exports` map
  to `package.json`, which would block them:
  - `dist/sources/sources` and `dist/app/validation/validateApp`: anduin
  - `dist/app/validation/manifestSource`: `@optimizely/ocp-cms-ui-extensions-sdk`
  - `dist/app/validation/runValidation.js`: run directly by apps' `validate` scripts (e.g. hub-shakedown)
