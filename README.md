# Liquid Library CLI Handbook

A concise guide to using the Liquid Library CLI for installing and developing UI components.

## Overview
- **Public command**: `add` — install components from the library into your theme.
- **Dev-only commands**: available when developing this library locally (if `dev/*` scripts are present). These scaffold components, manage assets, and run build audits.

## Install Components (Public)
- **Command**: `liq add <name>`
- **What it does**: Copies the component files from the library `registry.json` into your theme, prefixing filenames with `lib-`.
- **Example**:
  ```powershell
  liq add lib-button
  ```

## Develop Components (Dev-only)
These commands are available when running the CLI inside the library repo with dev scripts present.

### Generate
- **Command**: `liq generate component <name> [-t javascript|liquid]`
- **Prompts**:
  - Component type (if `-t` not provided): `JavaScript` or `Liquid`
  - Static assets: `JavaScript only`, `CSS only`, `Both`, or `None`
- **What it does**:
  - Scaffolds files from templates under `components/lib-<name>/`
  - Creates `manifest.json` with initial hash/version
  - Adds an entry to `registry.json`
- **Example**:
  ```powershell
  liq generate component slider -t liquid
  ```

### Remove
- **Command**: `liq remove component <name> [-y]`
- **Flags**:
  - `-y, --yes`: confirm removal without prompt
- **What it does**: Removes the component scaffolds and updates the registry.
- **Example**:
  ```powershell
  liq remove component slider -y
  ```

### Build (Audit)
- **Command**: `liq build`
- **What it does**:
  - Computes the primary file hash for each component.
  - Compares against `manifest.primary.hash`/`manifest.registry.hash`.
  - Enforces versioning:
    - If hash changed and `manifest.version` > `registry.version`: accepts the bump, writes new hashes, and updates the registry.
    - If hash changed but versions are equal: requires you to bump `manifest.version`.
    - If `manifest.version` is lower than the registry: fails.
  - For Liquid components, on accepted bump: re-extracts `props`, `dependencies`, and `scope`.
- **Example**:
  ```powershell
  liq build
  ```

### Manifest Utilities
- **Compute Hash**: `liq manifest-hash [name] [-a]`
  - `-a, --all`: process all components with a manifest
  - Computes and writes `manifest.primary.hash` + `manifest.registry.hash`; syncs registry hash.
- **Clean Manifests**: `liq manifest-clean [name] [--dry-run]`
  - `--dry-run`: preview changes without writing
  - Removes unused manifest keys (e.g., old audit metadata).

### Asset Management
- Group command: `liq asset`
- **Add**: `liq asset add [name] -t css|js`
  - Adds a CSS or JS asset file to a component and syncs manifest/registry `files`.
- **Remove**: `liq asset remove [name] -t css|js`
  - Removes a CSS or JS asset file and syncs manifest/registry `files`.

## Metadata Extraction (Liquid)
- **Descriptions**: Author descriptions inline in the first Liquid comment block:
  - `@prop _title: Button label text`
  - `@prop _price: Display price for the product`
  - If a description is missing, it remains empty; downstream tooling can show a placeholder.
- **Scope**: Annotate scope in the first comment block:
  - `@scope= product, collection` or `- @scope= all`
- **Required detection**:
  - A prop is **required** when it has **no** `default` filter.
  - If a `default` is present (e.g., `{{ _title | default: 'Hello' }}`), it is **not required** and the default becomes the `placeholder`.
- **Dependencies**:
  - Extracted from real `{% render 'lib-...' %}` tags **outside** comments.
  - Guidance examples inside comments are ignored.

## Files & Registry
- **Manifests**: Per-component `components/lib-<name>/manifest.json` is dev-only; it tracks type, version, primary path, hashes, assets, props, dependencies, and scope.
- **Registry**: Root `registry.json` is the canonical source for consumers (`liq add`). The build audit updates registry version, hash, and metadata on accepted changes.

## Tips
- Always bump `manifest.version` when changing the primary file to allow `liq build` to accept and sync changes.
- Keep `@prop` descriptions short and clear; they are used for documentation and tooling.
- Only real Liquid code contributes to prop/dependency extraction; comment examples are ignored.

## Examples
```powershell
# Add to theme
liq add lib-button

# Generate a Liquid component with CSS & JS prompts
liq generate component gallery -t liquid

# Audit and sync after edits (remember to bump version)
liq build

# Compute hashes for all manifests
liq manifest-hash -a

# Add a CSS asset to a component
liq asset add lib-gallery -t css
```