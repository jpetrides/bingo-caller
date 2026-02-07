# Bingo Caller — St. Anthony of Padua School

## Project Overview

A browser-based bingo number caller built for **projector display** at St. Anthony of Padua School events. It is a zero-dependency, static HTML/CSS/JS application — no build tools, no frameworks, no npm. Just open `index.html` in a browser.

The app randomly calls bingo numbers 1–75 one at a time. Each number belongs to a letter column (B=1–15, I=16–30, N=31–45, G=46–60, O=61–75). The UI is designed to be legible on a projected screen from across a room.

---

## File Structure

```
Bingo Game/
├── index.html              # Single-page HTML shell (68 lines)
├── css/
│   └── styles.css          # All styling (~614 lines)
├── js/
│   ├── app.js              # Main game logic (215 lines)
│   └── audio.js            # Optional speech announcements (56 lines)
├── colors.json             # Reference: school color palette (unused by app)
├── SchoolLogo.png          # School crest (favicon + header)
├── SchoolLogo.avif         # Optimized version of logo
└── bingo.md                # This file
```

---

## Page Layout (top to bottom)

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
│  0 / 75  │  G | 46 47 48 ...                  60    │
│          │  O | 61 62 63 ...                  75    │
│          │                                           │
├──────────┴──────────────────────────────────────────┤
│  HISTORY STRIP (dark bar, horizontal scroll)         │
│  [ball][ball][ball][ball]...  newest on left          │
├─────────────────────────────────────────────────────┤
│  CONTROLS (dark bar, flex-shrink: 0)                 │
│  [Audio] [NEXT NUMBER] [New Game]                    │
└─────────────────────────────────────────────────────┘
```

### Main Content (`.main-content`)
- CSS Grid: `grid-template-columns: auto 1fr`
- Left column (`auto`): caller ball + count — sizes to the ball width
- Right column (`1fr`): the number board — takes all remaining space

### Number Board (`.board-grid`)
- **Horizontal layout**: 5 rows (B, I, N, G, O) x 16 columns (1 row header + 15 numbers)
- Grid: `grid-template-columns: clamp(2rem, 3.5vw, 3.5rem) repeat(15, 1fr)`
- Grid: `grid-template-rows: repeat(5, 1fr)`
- Row gap `clamp(6px, 1vh, 12px)` separates the letter rows; column gap is `3px`
- No max-width — stretches to fill available space
- `height: 100%` — rows divide viewport height evenly (no overflow)

### History Strip (`.call-history`)
- **Positioned between main content and controls** (its own element, not inside either)
- Horizontal flex row with `overflow-x: auto` for scrolling
- Dark navy background matching controls
- Newest balls are prepended (left side); `scrollLeft = 0` keeps newest visible

---

## Visual Design: Bingo Balls

Both the **caller display** (big ball) and **history chips** (small balls) use the same CSS bingo-ball technique:

### Ball Construction (3 layers via CSS)
1. **Base circle**: colored background per letter column, `border-radius: 50%`
2. **White center band** (`::before`): absolutely positioned white oval across the middle (top 22–25%, bottom 22–25%)
3. **Shine highlight** (`::after`): radial gradient blob in upper-left for gloss effect
4. **3D depth**: `box-shadow: inset 0 -Xpx Xpx rgba(0,0,0,0.25), inset 0 Xpx Xpx rgba(255,255,255,0.2)`

### Traditional Bingo Ball Colors
| Letter | Color   | Hex       |
|--------|---------|-----------|
| B      | Blue    | `#1565C0` |
| I      | Red     | `#C62828` |
| N      | Silver  | `#9E9E9E` |
| G      | Green   | `#2E7D32` |
| O      | Orange  | `#EF6C00` |

These colors are applied via `.col-B`, `.col-I`, `.col-N`, `.col-G`, `.col-O` classes on both the caller display and history chips.

### Caller Display Ball
- Size: `clamp(160px, 22vw, 280px)` square circle
- Default state (no call yet): navy background, white "?" text
- Active state (`has-call` + `col-X`): colored ball with white band + shine
- Text: letter + number both use `color: var(--text-primary)` (dark) so they're readable against the white band
- Letter/number have `position: relative; z-index: 1` to sit above pseudo-elements

### History Ball Chips
- Size: `clamp(48px, 5vw, 64px)`; `72px` on screens 1400px+
- Structure: `<span class="history-chip col-B"><span class="ball-letter">B</span><span class="ball-number">5</span></span>`
- `.ball-number` uses dark text (sits on white band); `.ball-letter` uses white (sits on colored top)

---

## JavaScript Architecture (`js/app.js`)

### IIFE Pattern
The app is wrapped in `window.BingoApp = (function() { ... })()` — an immediately-invoked function expression that returns `{ callNumber, resetGame }` for console debugging.

### State
```js
state = {
  pool: [],            // Uncalled numbers (shuffled array, pop from end)
  called: [],          // All called numbers in order
  currentNumber: null  // Most recent call (for removing "current" highlight)
}
```

### Key Functions

**`buildPool()`** — Creates array [1..75], shuffles with Fisher-Yates, returns it.

**`buildBoard()`** — Generates the board grid DOM:
- Iterates `LETTERS` array `['B', 'I', 'N', 'G', 'O']`
- For each letter: creates a `.board-col-header` div, then 15 `.board-cell` divs
- Each cell gets `id="cell-{num}"` and `data-number="{num}"`
- Grid order matches CSS: row header + 15 cells = 16 items per row x 5 rows

**`callNumber()`** — Core game action:
1. Pops a number from `state.pool`
2. Removes `current` class from previous board cell
3. Updates caller display text (letter + number)
4. Swaps color class: removes all `col-X` classes, adds `col-{letter}`
5. Triggers `pop` bounce animation (remove class → force reflow → re-add)
6. Marks board cell with `called` + `current` classes + pop animation
7. Creates history chip with `innerHTML` (ball-letter + ball-number spans)
8. Prepends chip to history strip, resets `scrollLeft` to 0
9. Calls `BingoAudio.announce()` if audio enabled
10. If pool empty: disables button, shows "DONE!", switches to game-over state

**`resetGame()`** — Confirms with user, then:
- Rebuilds pool, clears state
- Resets caller display (removes `has-call`, all `col-X`, `game-over`)
- Clears history strip innerHTML
- Removes `called`/`current`/`pop` from all board cells

**`toggleAudio()`** — Toggles audio state, swaps SVG icon path between muted/on.

### CSS Class Management on Caller Display
The caller display accumulates these classes:
- `has-call`: activates white band + shine pseudo-elements, dark text
- `col-B`/`col-I`/`col-N`/`col-G`/`col-O`: sets background color (only one at a time)
- `pop`: triggers bounce animation (removed and re-added with reflow trick)
- `game-over`: gold background, hides pseudo-elements, shows "DONE!"

On each new call, all `col-X` and `game-over` classes are removed before adding the new `col-X`.
On reset, all of `has-call`, `pop`, `game-over`, and all `col-X` are removed.

---

## Audio Module (`js/audio.js`)

- Uses Web Speech API (`SpeechSynthesis`)
- Off by default; toggled via the speaker button
- Announces as `"B ... 5"` (letter, pause, number) at rate 0.85
- Voice selection: prefers Google English → en-US → any English → first available
- `synth.cancel()` before each call to avoid queuing

---

## CSS Styling Details

### Color Palette (CSS Custom Properties)
```
--navy: #3E4A5C          (board headers, called cells, default caller ball)
--dark-navy: #2C3544     (controls bar, history strip background)
--gold: #D4C5A0          (header background, focus outlines, game-over ball)
--red: #E31E24           (NEXT NUMBER button, "current" board cell highlight)
--white: #FFFFFF
--text-primary: #1A1A1A  (dark text on white/light backgrounds)
--text-muted: #4A4A4A    (call count, motto)
```

### Board Cell States
| Class | Background | Text | Extra |
|-------|-----------|------|-------|
| (default) | white | dark | 1px border #E8E4DD |
| `.called` | navy | white | navy border |
| `.current` | red | white | 3px gold box-shadow, z-index: 1 |

The `.current` class is only on the **most recently called** cell. Previous calls keep `.called` but lose `.current`.

### Animations
- **`bounce`** (caller display): scale 1 → 1.12 → 0.95 → 1 over 400ms
- **`pop`** (board cells): scale 1 → 1.2 → 1 over 350ms
- Both respect `prefers-reduced-motion: reduce`

### Responsive Breakpoints
| Breakpoint | Target | Key Changes |
|-----------|--------|-------------|
| `>1400px` | Large projector | Board cells 1.4rem, history balls 72px |
| `<900px` | Tablet | Single column, caller section goes horizontal |
| `<500px` | Phone | Smaller logo, hide "BINGO" text, tighter spacing |

---

## Game States Summary

### Initial / After Reset
- Caller ball: navy, shows "?"
- Board: all white cells
- History strip: empty
- Count: "0 / 75"

### Active Game (numbers being called)
- Caller ball: colored per letter (B=blue, I=red, N=silver, G=green, O=orange) with bingo ball styling
- Board: called cells turn navy; most recent is red with gold outline
- History strip: colored bingo balls accumulate left-to-right (newest on left)
- Count: increments "X / 75"

### Game Over (all 75 called)
- Caller ball: gold background, shows "DONE!", pseudo-elements hidden
- NEXT NUMBER button: disabled (opacity 0.5)
- Board: all cells navy (called)

---

## Design Decisions & History

1. **Horizontal board** (5 rows x 15 cols, not 5 cols x 15 rows): Better use of widescreen projector. Row headers (B/I/N/G/O) on the left with rounded-left corners.

2. **No aspect-ratio on cells**: Cells use `grid-template-rows: repeat(5, 1fr)` with `height: 100%` so they auto-fit any viewport height — critical for projector compatibility.

3. **History strip outside main grid**: The history strip is a standalone element between `<main>` and `<footer>`, not nested inside the caller section. This gives it full viewport width for the horizontal bingo ball scroll.

4. **Bingo ball visual via pure CSS**: No images or emoji. Uses `::before` (white band) and `::after` (shine) pseudo-elements with inset box-shadows for 3D depth. Same technique on both caller display and history chips, just different sizes.

5. **Color-coded caller ball**: The caller display uses the same `col-B`/`col-I`/etc. color scheme as the history balls (traditional bingo colors), not a hardcoded red. Colors are swapped via JS class management on each call.

6. **`overflow: hidden` on body**: The entire UI must fit in one viewport with no scrolling — essential for projector use where you can't scroll.

7. **School branding**: Colors derived from school website (see `colors.json`). Navy/gold palette throughout. Logo served in both PNG and AVIF (with `<picture>` element for browser optimization).

---

## How to Run

Just open `index.html` in any modern browser. No server needed. For projector use, go full-screen (F11) on a 1080p or higher display.

---

## Potential Future Enhancements

- Keyboard shortcut (e.g., spacebar) to call next number
- Full-screen toggle button
- Custom game modes (e.g., four corners, blackout, specific patterns)
- Print bingo cards
- Undo last call button
