# Liquid Library (Internal Notes)

A small component library and CLI for managing reusable UI components (Liquid snippets and JS web components) and installing them into themes.

## Overview
- **Components folder:** [components/](components/) with one folder per component (e.g., `components/lib-button`).
- **Registry:** [registry.json](registry.json) lists published components, files to copy, and metadata used by the `add` command.
- **CLI entry:** [bin/cli.js](bin/cli.js). Public `add`; dev-only utilities (`generate`, `remove`, `build`, `manifest-hash`).

## Directory Layout
- **Components:** `components/lib-<name>/`
  - Primary file: Liquid → `lib-<name>.liquid`; JS → `lib-<name>.js`
  - Optional assets: `lib-<name>.css`, `lib-<name>.js` (for Liquid)
  - Manifest: `manifest.json` (dev-only; not published)
- **Registry:** `registry.json` is the canonical catalog shipped with the package.

## Commands
- Public (published)
  - `liq add <lib-name>`: Install a component into the current theme by copying files from the registry entries. This is accessed via the supporting extension. Seperate documentation pending for this. 
- Dev-only (available in this repo; excluded from npm)
  - `liq generate component <name>`: Scaffold a new component (prompts for type and assets). Creates files and a manifest, and adds an entry to the registry.
  - `liq remove component <name>`: Remove a component directory and delete its registry entry (with confirmation).
  - `liq build`: Audit all components. Hashes primary files and enforces versioning rules (see Build Workflow).
  - `liq manifest-hash [name] --all`: Utility to recompute manifest and registry hash for one or all components (dev convenience).
  - `liq asset add [name] -t <css|js>`: Add a static asset (CSS/JS) to a component. Prompts if `name` or `type` is omitted. Prevents duplicates and updates both manifest and registry.
  - `liq asset remove [name] -t <css|js>`: Remove a static asset (CSS/JS) from a component. Prompts if `name` or `type` is omitted. Updates both manifest and registry.

Tip: When working locally you can also run commands via Node: `node bin/cli.js <command>`.

## Examples
- Generate a Liquid component:

```bash
liq generate component lib-footer
# or
node bin/cli.js generate component lib-footer
```

- Add a CSS asset to a component (prompts if omitted):

```bash
liq asset add lib-footer -t css
# or
node bin/cli.js asset add lib-footer -t css
```

- Add a JS asset to a Liquid component:

```bash
liq asset add lib-footer -t js
# or
node bin/cli.js asset add lib-footer -t js
```

- Remove a CSS asset from a component:

```bash
liq asset remove lib-footer -t css
# or
node bin/cli.js asset remove lib-footer -t css
```

- Run build audit (version-aware hashing):

```bash
liq build
# or
node bin/cli.js build
```

## Component Manifest
Each component has a dev-only manifest stored at `components/lib-<name>/manifest.json`:
- `name`: Component library name (e.g., `lib-button`).
- `type`: `snippet-component` (Liquid) or `web-component` (JS).
- `version`: Semver string, updated by authors when the primary file changes.
- `primary`: `{ path, hash }` of the primary file.
- `files`: Array of `{ src, destDir }` entries used by `add` to copy into a theme.
- `assets`: Optional lists of `css` and `js` assets.
- `registry`: `{ createdAt, updatedAt, hash }` (dev metadata; `hash` mirrors the primary file hash).
- `build`: `{ lastAuditAt, warnings }` (dev metadata).

## Registry
`registry.json` is the source of truth for consumers. For each `lib-<name>` it stores:
- `type`, `version`, `description`, `hash`, timestamps, and `files` to install.
- The `hash` mirrors the current primary file hash used for audit sanity checks.

## Build Workflow (Hashes + Versioning)
The `liq build` command computes the MD5 of each component’s primary file and compares it with the manifest’s stored hash.
- **Hashes match:** No action. If the registry is missing the same hash, it will be synced.
- **Hashes mismatch:** Compare `manifest.version` to `registry.version`.
  - Version equal → Build fails with a prompt to bump the version.
  - Version lower than registry → Build fails (manifest version must not go backwards).
  - Version higher than registry → Build accepts the change, writes the new hash to the manifest (`primary.hash` and `registry.hash`) and updates `registry.json` version + hash.

Authors should bump the manifest version whenever the primary file changes. After bumping, `liq build` will take care of the hashes and registry sync. If a version that is lower than a previous iteration is added, build will be aborted. 

## Naming Rules
- Library names always use the `lib-` prefix (e.g., `lib-button`).
- Component folders should match the library name.

## Notes
- Hash algorithm: MD5 (fast, sufficient for tamper detection here).
- Dev-only files (manifests, dev commands) are excluded from the published package.

---

Footnote: Static Assets

- You can add/remove static assets (CSS/JS) via commands or by editing the component’s `manifest.json` `files` and `assets` sections to reflect new/removed files. Ensure the files live alongside the component folder.
- Gotchas:
  - For `web-component` types, a primary JS file already exists; adding/removing a separate JS asset is not applicable.
  - Registry currently references flat paths like `components/lib-<name>.<ext>`; manifests live in `components/lib-<name>/`. Commands handle this mapping automatically.
- Planned: hashing of static asset files to improve change detection and parity with primary-file hashing.
- Planned: path normalization across registry and manifest so both can support nested component directories more uniformly.

- A feature review is underway to optionally hash static asset files in addition to the primary file, to improve change detection beyond the primary artifact.

Testing Environment: 
- Thinking of expanding the currently used Liquid Parser, to enable a preview mode, adding rich pseudo data models (product, collection etc), or a pre-release flag, to test a component in situ. Current parser, extricates properties from Liquid file for adding to the manifest & registry. I feel JSON data models would be easier fo testing and speed to market. 

## Working with Liquefaction
1. Clone Repo from Git
2. Run npm i 
3. Run liq generate component <name> lib- prefix, if not added, is added for you, same for component removal. If added in error, the code will fix this automatically for you. Components will be gererated with boilerpalte, which act as guidlines and BP's. 
4. Work on the components primary and static files, Liquid, CSS and JS, exactly like you were working in a Shopify theme. 
5. Run either liq build or npm publish, as this uses a pre-publish hook, build will run wheather you want it to or not, however, the prefered work flow is to run build first, to audit the files. 
5a. If you recieve errors or prompts, they will be accompanied by the offending files, address any bugs raised. Repeat point 5. 

Highly advised to push code to Git once dev is complete. Though there is no src/dist pattern here, as there is no packaging / compilation happening. 