# OpenCLI Brand Assets

Source of truth:
- `icon.png` is downloaded from `https://opencli.org/img/logo.png`
- The source logo was verified on `2026-04-01` and is `256x256`
- `tray-icon.png` is derived from `icon.png` for Electron tray usage

Refresh procedure:
1. Re-download `https://opencli.org/img/logo.png`
2. Overwrite `assets/icon.png`
3. Re-generate `assets/tray-icon.png` with the PowerShell command in this plan
4. Re-run `npm run dist:win` and manually verify the installed app icon and tray icon
