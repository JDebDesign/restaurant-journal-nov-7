# Images

- `cover.png`: 1200x640 Open Graph / README cover, exported from the Figma file "Restaurant Journal" (frame 24:44).
- `screens/*.png`: 375x812 phone screenshots at 2x, taken from the browser-only demo mode.

To retake the screenshots: run `npm run dev:demo` (serves http://localhost:5174), then drive a 375x812, `deviceScaleFactor: 2` Playwright context through: demo sign-in, `/` (home), `/log` with `e2e/fixtures/chai-pani-gps.jpg` (log-photo), `/visits/demo-v1` (visit), `/places`, `/asked` with "date night" (asked), and a share link opened in a fresh logged-out context (share).
