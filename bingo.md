# Bingo Caller — St. Anthony of Padua School

## Project Overview

A browser-based bingo number caller built for **projector display** at St. Anthony of Padua School events. Zero-dependency static HTML/CSS/JS — no build tools, no frameworks, no npm. Just open `index.html` in a browser or visit the GitHub Pages deployment.

- **Repo**: https://github.com/jpetrides/bingo-caller
- **Live**: https://jpetrides.github.io/bingo-caller/

Numbers 1–75, each belonging to a letter column (B=1–15, I=16–30, N=31–45, G=46–60, O=61–75).

---

## File Structure

```
Bingo Game/
├── index.html              # Single-page HTML shell (~68 lines)
├── css/
│   └── styles.css          # All styling (~613 lines)
├── js/
│   ├── app.js              # Main game logic (~299 lines)
│   └── audio.js            # Optional speech announcements (~56 lines)
├── colors.json             # Reference: school color palette (unused by app)
├── SchoolLogo.png          # School crest (favicon + header)
├── SchoolLogo.avif         # Optimized version of logo
└── bingo.md                # This file
```

---

## Page Layout

The body is `display: flex; flex-direction: column; height: 100%; overflow: hidden` — everything must fit in one viewport, no scrolling.

```
┌─────────────────────────────────────────────────────┐
│  HEADER  (gold bar, flex-shrink: 0)                 │
│  [Logo] St. Anthony of Padua School    BINGO        │
├──────────┬──────────────────────────────────────────┤
│          │                                           │
│  CALLER  │  NUMBER BOARD (horizontal grid)           │
│  BALL    │  B | 1  2  3  4  5  6  7  8  9 ... 15   │
│  (auto)  │  I | 16 17 18 ...                  30    │
│          │  N | 31 32 33 ...                  45    │
│ 12 / 75  │  G | 46 47 48 ...                  60    │
│  (16%)   │  O | 61 62 63 ...                  75    │
│          │                                           │
├──────────┴──────────────────────────────────────────┤
│  HISTORY STRIP (dark bar, horizontal scroll)         │
│  [ball][ball][ball]...  newest on left               │
├─────────────────────────────────────────────────────┤
│  CONTROLS (dark bar, flex-shrink: 0)                 │
│  [Audio] [NEXT NUMBER] [New Game]                    │
└─────────────────────────────────────────────────────┘
```

### Main Content (`.main-content`)
- CSS Grid: `grid-template-columns: auto 1fr`
- `column-gap: 1.5rem` matches `padding: 1rem 1.5rem` so the caller ball is equidistant from the left edge and the board
- No `max-width` — stretches full viewport width (important for projector)

### Number Board (`.board-grid`)
- **Horizontal layout**: 5 rows (B, I, N, G, O) x 16 columns (1 row header + 15 numbers)
- `height: 100%` — rows divide viewport height evenly (no overflow)

### History Strip (`.call-history`)
- Standalone element between `<main>` and `<footer>` — full viewport width
- Horizontal flex with `overflow-x: auto`
- **Current ball is NOT in history** — it only appears here when the next number is called (via fly animation)

---

## Fly-to-History Animation

When a new number is called, the **previous** ball animates from the caller display down to the history strip:

1. A temporary `.flying-chip` element is created with `position: fixed` at the caller ball's screen position
2. Scaled up via `transform: scale(callerSize / chipSize)` to match the large caller ball size
3. CSS transition (`500ms cubic-bezier(0.34, 1.56, 0.64, 1)`) translates it to the history strip while scaling down to chip size — the easing gives a bouncy overshoot
4. On `transitionend` (or 600ms fallback timeout), the flyer is removed and the real chip is prepended to the history strip

Key details:
- `animateToHistory(num, letter)` handles the animation; `insertHistoryChip(num, letter)` does the DOM insertion
- Chip size is computed in JS to match CSS: `clamp(48px, 5vw, 64px)`, or `72px` at 1400px+
- Respects `prefers-reduced-motion: reduce` — skips animation, inserts chip directly
- `resetGame()` removes any in-flight `.flying-chip` elements and clears pending timeouts

---

## JavaScript Architecture (`js/app.js`)

### IIFE Pattern
Wrapped in `window.BingoApp = (function() { ... })()` returning `{ callNumber, resetGame }` for console debugging.

### State
```js
state = {
  pool: [],              // Uncalled numbers (shuffled array, pop from end)
  called: [],            // All called numbers in order
  currentNumber: null,   // Most recent call (stays in caller, not in history yet)
  gameOverTimeout: null  // Pending setTimeout ID for game-over transition
}
```

### Call Flow (`callNumber()`)
1. If there's a previous number: remove `current` class from its board cell, call `animateToHistory()` to fly it to the history strip
2. Pop new number from pool, update state
3. Update caller display: text, color class (`col-B`/`col-I`/etc.), bounce animation
4. Update call count and percentage display
5. Mark board cell: `called` + `current` classes + pop animation
6. Audio announcement (if enabled)
7. If pool empty: disable button, set 1.5s timeout → fly last ball to history → show "DONE!" game-over state

### Reset Flow (`resetGame()`)
- Confirm dialog, then: clear `gameOverTimeout`, remove `.flying-chip` elements, rebuild pool, clear all DOM state

### CSS Class Management on Caller Display
- `has-call`: activates white band + shine pseudo-elements
- `col-B`/`col-I`/`col-N`/`col-G`/`col-O`: background color (only one at a time)
- `pop`: bounce animation (removed + reflow + re-added each call)
- `game-over`: gold background, hides pseudo-elements, shows "DONE!"

---

## Bingo Ball Visual (Pure CSS)

Both caller display and history chips use the same technique at different sizes:
1. **Base circle**: colored background, `border-radius: 50%`
2. **White center band** (`::before`): white oval across the middle
3. **Shine highlight** (`::after`): radial gradient in upper-left
4. **3D depth**: inset box-shadows

| Letter | Color  | Hex       |
|--------|--------|-----------|
| B      | Blue   | `#1565C0` |
| I      | Red    | `#C62828` |
| N      | Silver | `#9E9E9E` |
| G      | Green  | `#2E7D32` |
| O      | Orange | `#EF6C00` |

---

## Audio Module (`js/audio.js`)

- Web Speech API (`SpeechSynthesis`), off by default
- Announces `"B ... 5"` (letter, pause, number) at rate 0.85
- Voice preference: Google English → en-US → any English → first available

---

## Game States

| State | Caller Ball | Board | History | Count |
|-------|------------|-------|---------|-------|
| Initial / Reset | Navy, "?" | All white | Empty | 0 / 75 (0%) |
| Active | Colored per letter, bingo ball styling | Called=navy, current=red+gold outline | Previous balls (not current) | X / 75 (Y%) |
| Game Over | Gold, "DONE!" (after 1.5s delay) | All navy | All 75 balls | 75 / 75 (100%) |

---

## Design Constraints

1. **No scrolling** — `overflow: hidden` on body; entire UI must fit one viewport (projector requirement)
2. **No max-width on main content** — stretches full width so caller ball is properly centered relative to viewport edges
3. **Horizontal board** (5 rows x 15 cols) — better use of widescreen projectors
4. **History strip is a standalone element** between `<main>` and `<footer>` — gives it full viewport width
5. **School branding** — navy/gold palette derived from school website (`colors.json`); logo in PNG + AVIF via `<picture>`

---

## Potential Future Enhancements

- Keyboard shortcut (spacebar) to call next number
- Full-screen toggle button
- Custom game modes (four corners, blackout, specific patterns)
- Undo last call button
