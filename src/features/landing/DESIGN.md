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

The page is drawn on Glaze, the app's design system, like every other
screen. That replaced the first pass (Archivo display type, the lime brand,
scroll-timeline motion) in November 2026.

- Monochrome: ink and paper from Glaze's roles. Colour only where Glaze
  allows it, the status words on the settle receipt.
- Type: Glaze's sans through its type roles; the amounts use `type-title`
  and `type-heading` with tabular figures.
- Shape: Glaze's card shell for the two receipts, Glaze buttons for the
  calls to action, a Glaze table for the goals and a data list for the
  feature index.
- Motion: none. The hero shows the split's end state: the total, the two
  halves on either side of a dashed seam and the odd cent on the payer's
  side. Glaze rules out scroll reveals, so the tear, the band fill and the
  footer wordmark mend are gone.

## Sections (layout family)

```
1 Hero stage              [h1, intro, CTA] / receipt card: 87,45, Ana | Leo
2 Statement               one paragraph at the measure
3 Settle (asymmetric)     sticky h2 + the receipt with its three statuses;
                          three real steps beside it
4 Goals (data)            a table of the six goals: percent and planned
5 Index list              six rows: feature name | what it does
6 Footer finale           CTA and sign-in link, then tagline and theme
```

## Genericness test

- A generic answer would be a centred hero with a phone mockup and three
  feature cards. Replaced with the torn amount and an index list.

## Open items for the owner

- Canonical URL and `og:image` need the production origin, which the repo
  does not record.
