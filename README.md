# Jera On Air 2026 — Unofficial Mobile Timetable

A small static fan-made web app that re-creates the [Jera On Air 2026](https://www.jeraonair.nl/nl/timetable/) timetable with extra features:

- 📱 Mobile-friendly overview (list view by stage) and a desktop grid view
- ❤️ "Like" any artist to mark them as a favorite
- 💾 Favorites + filters are saved in `localStorage` — **no login, no backend**
- 🎛️ Stage filter chips and a "show only favorites" toggle
- 🗓️ Day tabs for Thursday, Friday and Saturday

## Run it

It's pure HTML/CSS/JS. Just open `index.html` in a browser, or serve the folder:

```powershell
# Optional: serve over http (so localStorage scope is consistent)
npx serve .
# or
python -m http.server 8000
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell |
| `styles.css` | Styling (responsive, dark theme) |
| `app.js` | Rendering + like/filter/persistence logic |
| `data.js` | Generated timetable data (`window.TIMETABLE = {...}`) |
| `build-data.mjs` | Node script that parses the saved JOA HTML files into `data.js` |
| `thu.html` / `fri.html` / `sat.html` | Source HTML snapshots from jeraonair.nl |

## Refreshing the data

If the official lineup changes, re-download the HTML pages and rebuild:

```powershell
curl -s "https://www.jeraonair.nl/nl/timetable/?day=THU" -o thu.html
curl -s "https://www.jeraonair.nl/nl/timetable/?day=FRI" -o fri.html
curl -s "https://www.jeraonair.nl/nl/timetable/?day=SAT" -o sat.html
node build-data.mjs
```

> Note: at the time of building, the `?day=SUN` URL on jeraonair.nl returned the Thursday page, so `thu.html` was downloaded from that URL.

## How "likes" persist

Likes are stored as a JSON array of `"DAY:bandId"` strings under the `joa2026.likes` key in your browser's `localStorage`. They survive page reloads and browser restarts on the same device/browser, without any account or server. Clearing site data will reset them.

## Credits & disclaimer

This is an **unofficial fan-made project** and is not affiliated with, endorsed by, or sponsored by Jera On Air. All timetable data, band names, stage names, and the "Jera On Air" name itself are property of the festival organizers — see [jeraonair.nl](https://www.jeraonair.nl/). The source code in this repository is released under the [MIT License](LICENSE).
