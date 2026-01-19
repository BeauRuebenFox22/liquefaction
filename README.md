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
  - `liq add <lib-name>`: Install a component into the current theme by copying files from the registry entries.
- Dev-only (available in this repo; excluded from npm)
  - `liq generate component <name>`: Scaffold a new component (prompts for type and assets). Creates files and a manifest, and adds an entry to the registry.
  - `liq remove component <name>`: Remove a component directory and delete its registry entry (with confirmation).
  - `liq build`: Audit all components. Hashes primary files and enforces versioning rules (see Build Workflow).
  - `liq manifest-hash [name] --all`: Utility to recompute manifest and registry hash for one or all components (dev convenience).

Tip: When working locally you can also run commands via Node: `node bin/cli.js <command>`.

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

Authors should bump the manifest version whenever the primary file changes. After bumping, `liq build` will take care of the hashes and registry sync.

## Naming Rules
- Library names always use the `lib-` prefix (e.g., `lib-button`).
- Component folders should match the library name.

## Notes
- Hash algorithm: MD5 (fast, sufficient for tamper detection here).
- Dev-only files (manifests, dev commands) are excluded from the published package.

---

Footnote: Static Assets
- You can add/remove static assets (CSS/JS) by editing the component’s `manifest.json` `files` array and `assets` section to reflect the new files. Ensure the files live alongside the component folder. A command(s) may be introduced to streamline this. 
- A feature review is underway to optionally hash static asset files in addition to the primary file, to improve change detection beyond the primary artifact.
