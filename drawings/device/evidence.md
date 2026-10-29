# o.f.f. device — evidence record

Intended use: illustration on the o.f.f. website, below the hero, shown up to 800 px wide (exploded, labelled).
The whole drawing is a concept: no CAD, photographs or dimensions were supplied.

| Feature group | Evidence | How it is drawn |
| --- | --- | --- |
| Rectangular body, 50 × 80 × 11.5 mm | Fictional object requested by the user ("small device", "rectangle") | Invented proportions; rounded 8 mm corners |
| Screen at the front with a 1 cm bezel | User requirement | Front cover window = body minus 10 mm per side (30 × 60 mm); `bezel` parameter 6–14 mm |
| Display module | Implied by the screen | Panel 2 mm larger than the window on each side, seated under the cover |
| Internal chip | User requirement | 12 × 12 mm processor package on a logic board; placement invented |
| Logic board and standoffs | Implied by the chip | 45 × 75 × 1 mm board on four housing standoffs; no fasteners drawn |
| USB-C port at the bottom edge | User requirement | Receptacle envelope 8.94 × 3.26 mm (USB-C nominal) on the board's front edge |
| USB-C opening in the housing | Illustrative | Drawn as outlines on the end wall; the wall is not actually cut |
| Battery, antennas, buttons, fasteners | Not requested | Omitted |

## Rebuild and proof

From the project root, with Node 24:

```sh
# Proof sheets (assembled + exploded) into a fresh folder
node tools/teardown/scripts/proof.cjs drawings/device/drawing.json drawings/device/proof-3/ --quick

# Website asset (exploded, labelled, cropped)
node drawings/render-site.cjs drawings/device src/assets
```
