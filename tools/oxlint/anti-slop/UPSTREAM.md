# anti-slop provenance

- Source: https://github.com/dmmulroy/anti-slop
- Commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (plugin version 0.1.2)
- Copied with `skills/install-anti-slop/scripts/install.mjs` from
  `skills/install-anti-slop/assets/anti-slop/` at that commit. It matches
  upstream `src/` without the `*.test.ts` files.
- Registered plugin: `anti-slop` → `./tools/oxlint/anti-slop/index.ts`.
  The Effect plugin (`effect/index.ts`) is copied but not registered because
  this repository does not depend on `effect`.
- Upstream was built against oxlint 1.78.0. This repository pins `oxlint` and
  `@oxlint/plugins` at 1.85.0.
- Local deviations: none. The folder is excluded from Prettier and oxlint so
  it stays byte-identical to upstream.
