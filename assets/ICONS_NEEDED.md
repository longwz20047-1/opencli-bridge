# Icon Assets Needed

Place the following files here before building:

- `icon.png` (512x512 or 1024x1024 PNG) — source icon
- `icon.ico` (256x256 multi-resolution ICO for Windows)
- `icon.icns` (ICNS for macOS)
- `tray-icon.png` (16x16 or 22x22 PNG for system tray)

Use https://www.electron.build/icons to generate platform-specific icons from a single 1024x1024 PNG.

electron-builder can auto-generate .ico and .icns from a 512x512+ PNG if only `icon.png` is provided.
