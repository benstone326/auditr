# auditr

Design-system audit app built with React + Vite.

## Getting started

```bash
npm install
npm run dev
```

## Common commands

```bash
npm run lint
npm run build
npm run verify:dist
npm run clean
```

## Verifying built asset paths (cross-platform)

After `npm run build`, run:

```bash
npm run verify:dist
```

This check confirms `dist/index.html` references `./assets/...` (relative paths), so opening `dist/index.html` directly does not produce a blank screen due to broken `/assets/...` URLs.

> If `node_modules` is missing, `predev`, `prelint`, and `prebuild` auto-run `npm install` to prevent `'<tool>' is not recognized` errors in fresh environments.


`npm run clean` is cross-platform (works in PowerShell and Unix shells).
