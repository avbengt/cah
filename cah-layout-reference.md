# Cards Against Humanity — Desktop Layout Reference

Use this file as a guide when refactoring the game UI. It describes the intended layout, structure, and behavior for each game state.

---

## General principles

- Desktop-first. The layout is always horizontal — never a single long column.
- A fixed topbar spans the full width and persists across all game states.
- Below the topbar, content is split into a narrow left column and a wide right column.
- The exception is the round-end screen, which uses a 3-column layout.
- Colors: black cards use `#2C2C2A` background with `#F1EFE8` text. White cards use a white/surface background with a subtle border.
- The winning/selected card accent color is `#534AB7` (purple).

---

## Layout: topbar (all screens)

Always visible. Contains:

- **Left**: Game title ("Cards Against Humanity")
- **Center**: Round indicator (e.g. "Round 4 of 10") + a badge showing either "Czar: [name]" or "You are czar"
- **Right**: One score pill per player. The current user's pill is highlighted (dark background). Format: "[Name] — [N] pts"

```
[Game Title]          Round 4 of 10  |  Czar: Alex          [You — 3pts] [Sam — 2pts] [Jordan — 1pt] [Alex — 0pts]
```

---

## Screen 1: Player submitting cards

**Trigger**: It is not the current player's turn as czar. The round is active and the player hasn't submitted yet.

### Left column (~260px fixed width)
- Black card displayed prominently, filling most of the column height
- Below the black card: a small "Waiting on" status box listing which players have/haven't submitted (submitted players are struck through or dimmed)

### Right column (remaining width)
- Header row: label ("Your hand — pick N to submit") on the left, selected card count + "Submit cards" button on the right
- Hand displayed as a grid of white cards — 5 per row
- Cards toggle selected state on click. Selected cards get a 2px purple (`#534AB7`) border
- Empty hand slots shown as dashed-border placeholders
- "Submit cards" button is disabled until the correct number of cards is selected

---

## Screen 2: Czar judging

**Trigger**: It IS the current player's turn as czar. All players have submitted.

### Left column (~260px fixed width)
- Black card displayed prominently
- Short label below: "All [N] players submitted. Pick the funniest."

### Right column (remaining width)
- Submissions displayed in equal-width columns (one column per player)
- Each column contains the submitted white card(s) stacked vertically
- Submissions are anonymous — no player names shown
- Clicking a column selects it (2px purple border on all cards in that column)
- "Pick this winner" button appears at the bottom-right, only active when a column is selected

---

## Screen 3: Round end / winner revealed

**Trigger**: The czar has picked a winner. This screen holds until someone clicks "Next round" or the countdown expires.

This screen uses a **3-column layout** instead of the standard 2-column split.

### Column 1 — Winner callout (leftmost, ~25% width)
- Large winner name at the top
- "+1 point · now at N pts" subtitle
- Horizontal divider
- "Winning combo" section: black card reprinted small, then the winning white cards side by side with purple borders

### Column 2 — All submissions revealed (center, ~45% width)
- Label: "All submissions revealed"
- List of all submissions, one row per player
- Each row: submission text on the left, player name on the right
- Winning submission row gets a 2px purple border and the player name is shown in purple with a checkmark

### Column 3 — Next round panel (rightmost, ~30% width)
- Centered content vertically
- Heading: "Ready for the next round?"
- Subtext: "Anyone can advance" (or "Czar only" depending on your preference)
- Large "Next round →" button
- Auto-advance countdown: label + seconds remaining + a thin progress bar draining left-to-right
- Footer note: "Next czar: [name]"

---

## Behavior notes

- **Auto-advance**: If no one clicks "Next round", the game advances automatically after a countdown (suggested: 15–20 seconds). The progress bar visually reflects the remaining time.
- **Anyone can click "Next round"**: Not restricted to the czar or winner. This prevents the game from stalling.
- **Czar's hand**: During Screen 1 (other players submitting), the czar's hand area should be hidden or replaced with a "You are judging this round" message — they don't submit cards.
- **Score updates**: The topbar score pills update immediately when the winner is announced (Screen 3). Animate the winning player's pill if possible (e.g. brief highlight).
- **Submission reveal timing**: On Screen 3, consider revealing submissions one by one with a short stagger delay (~150ms each) for dramatic effect.

---

## Key measurements

| Element | Value |
|---|---|
| Left column width | 260px fixed |
| Cards per row (hand) | 5 |
| Black card font size | 14px |
| White card font size | 11–12px |
| Selected card border | 2px solid #534AB7 |
| Topbar background | #2C2C2A |
| Topbar text | #D3D1C7 |
| Auto-advance countdown | 15–20 seconds |
| Submission columns (czar view) | Equal-width, one per player |
