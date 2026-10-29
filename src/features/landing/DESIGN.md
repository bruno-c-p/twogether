# Landing page (`/conheca`)

Planning notes for the public landing page. Later passes keep to them.

## Brief

- Subject: twogether, a shared budget for exactly two people (pt-BR).
- Audience: couples who split costs today in a spreadsheet, a notes app or
  a bank transfer with "acerto" in the memo.
- Job: explain what the app does in one screen and send the visitor to
  `/entrar`.
- Assets: the app itself (tokens, Bold Duo palette, wordmark, six goals).
- Assumptions: the demo couple "Ana" and "Leo" and the R$ 87,45 grocery
  bill are illustrative. No metrics, testimonials or press claims.
- Scale: a product landing page. No loader, no WebGL, no smooth-scroll
  library. Craft lives in type, layout and one scroll-driven moment.

## Concepts

|             | Idea                                                                                                                  | Anchor                                                               | Signature                                                                            | O/F/Fe/P      |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------- |
| A. Material | **The odd cent.** Every amount on the page is cut along one seam; the cent that does not divide falls to whoever paid | `halfDown`: a split owes half rounded down, the payer keeps the rest | a grocery total tears into two 43,72 halves and the leftover 0,01 drops to the payer | 5 / 5 / 4 / 1 |
| B. Formal   | The page is laid out in the six goal proportions (30/10/15/15/5/25 of the scroll)                                     | the fixed six-goal split                                             | a progress bar fills band by band as you read                                        | 3 / 4 / 4 / 2 |
| C. Name     | _two + together_: two columns, lime and ink, converge into one                                                        | the household caps at two people                                     | the columns slide into one at the footer                                             | 3 / 3 / 5 / 4 |

Picked **A**: only this app rounds a split down and gives the cent to the
payer, so the idea cannot move to another product. B's six-band split
survives as the goals section; C's convergence survives as the footer
wordmark joining.

## Concept card

```
Idea:        Splitting is exact here, down to the cent that doesn't divide.
Metaphor:    a receipt with a perforated seam down the middle.
Signature:   hero stage: "R$ 87,45" tears along the seam into 43,72 | 43,72,
             and the odd 0,01 coin drops onto Ana's side (CSS view timeline).
Emotion:     calm precision with a wink: "they thought of the cent".
Motion verb: tear and settle. Things part along a vertical seam and come to
             rest; hovers do the reverse and close from both sides.
Screenshot:  the mega number torn in two, the coin landing on the payer.
```

## System

- Palette (app tokens, both themes): ground `--page` #f2f2f4, ink `--text`
  #0d0d12, muted `--text-muted` #5b5b66, line `--line`, accent `--hero`
  #c6f432 (person A, the payer), second person `--person-b` (ink). The
  acid lime on ink is the app's own brand and stands for one of the two
  people, so it stays; it never fills a whole section.
- Type: Archivo Variable at width 112 to 125, weight 760 to 860, for
  numbers and display (tabular figures, tracking -0.04 to -0.06em).
  Inter Tight (the app face) for text and UI at 16 to 18 px.
- Grid: 12 columns, gutter `clamp(16px, 2vw, 28px)`, outer margin equal to
  the gutter. Text hangs from column 1 and column 7 (the seam).
- The seam: the page's centre line. It is drawn as a perforation (dashed
  2 px) in the hero and the footer and is the origin of every hover.
- Shape: 999px for the coin and pills, 14px (`--radius-lg`) for blocks.
- Motion: `--ease-out` (cubic-bezier(0.23, 1, 0.32, 1)) everywhere. Hovers
  0.45s, reveals scroll-linked. Only transform, opacity and clip-path.
- Idle: the coin rocks on the seam before it falls (it has not been
  assigned yet). After it lands it settles still. The rocking copy has fixed
  angles: keyframes that read a custom property run on the compositor with
  the value frozen, so a var-scaled rock never moved a pixel.
- Motion runs on CSS scroll timelines, not GSAP or Lenis: the repo bans
  effects and component state, and every reveal only rewinds a finished
  static frame, so no script decides what is visible.
- Reduced motion or no `animation-timeline`: the hero shows its torn end
  state as a static composition, the bar shows all six bands, the footer
  wordmark is joined.

## Sections (layout family)

```
1 Hero stage (poster)     [h1 left, CTA right] / mega 87,45 + seam / Ana | Leo
2 Statement               one paragraph at t-l across columns 1 to 10
3 Settle (asymmetric)     sticky h2 + the hero's receipt on cols 1-5; three
                          real steps on 7-12. Each step adds a line to the
                          receipt (open, then struck and stamped paid)
4 Goals (data)            one full-width bar split into six bands + legend
5 Index list              six rows: feature name | what it does
6 Footer finale           CTA, then "twogether." torn and mended on entry
```

## Genericness test

- A generic answer would be a centred hero with a phone mockup and three
  feature cards. Replaced with the torn amount and an index list.
- A generic answer would use the lime as a full-bleed field. Kept it to the
  payer's half, the coin and the CTA.

## Open items for the owner

- Canonical URL and `og:image` need the production origin, which the repo
  does not record.
