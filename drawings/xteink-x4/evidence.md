# Xteink X4 — evidence record

Intended use: standalone preview page (`dist/index.html`) with SVG, PNG and PDF downloads, landscape A3 sheet, NTS.
The product page (eu.xteink.com) returned HTTP 429 when fetched, so dimensions come from press coverage and
the layout from two press photos (Notebookcheck). Nothing here comes from CAD or a teardown.

| Feature group | Evidence | How it is drawn |
| --- | --- | --- |
| Body 114 × 69 × 5.9 mm | Published specs (Notebookcheck, Lemmy spec list) | Exact outer size; 5.5 mm corner radius estimated from photos |
| Display window, 4.3" 800 × 480 | Published specs | 56 × 94 mm active area (4.3" at 5:3); window centred across the width |
| Bezels: thin sides and top, deep bottom chin | Photo | Estimated: 6.5 mm sides, 5 mm top, ~15 mm chin |
| Two split rocker keys in the chin | Photo; review ("on the front are two rockers") | Estimated size 23 × 3 mm each, centre divider for the two halves |
| Power key and page rocker on the right edge | Review ("power button and a volume rocker" on the right); manual (power at top right) | Positions along the edge estimated |
| USB-C port on the bottom edge | Specs list USB-C charging; one review claims pogo pins instead | Drawn as USB-C, centred; location estimated |
| microSD slot and reset hole on the bottom edge | User manual summary | Positions estimated |
| Front frame / rear housing split | Hidden construction | Illustrative: 0.7 mm front frame over a 5.2 mm housing with 1 mm walls |
| E-paper panel | Implied by the display | Illustrative panel 61 × 101 × 1 mm under the window |
| ESP32 processor on a logic board | Specs name the ESP32 | Illustrative board in the chin; 5 × 5 mm package |
| Battery, 650 mAh | Published specs | Illustrative 44 × 58 × 2.6 mm pouch; position invented |
| Magnet ring (MagSafe / Qi2) | Published specs | Illustrative 54 mm ring on the housing floor |
| Housing openings for ports and keys | Illustrative | Outlines on the walls; the walls are not cut |
| Antennas, flex cables, fasteners, adhesive | Not documented | Omitted |

## Rebuild and proof

From the project root, with Node 24:

```sh
# Proof sheets into a fresh folder (full run checks every view and hidden parts)
node tools/teardown/scripts/proof.cjs drawings/xteink-x4/drawing.json drawings/xteink-x4/proof-5/

# Viewer dependencies (once), then the standalone page and its check
(cd drawings/xteink-x4 && npm install)
node tools/teardown/scripts/build-viewer.cjs drawings/xteink-x4/drawing.json drawings/xteink-x4/dist/index.html
node tools/teardown/scripts/check-viewer.cjs drawings/xteink-x4/dist/index.html drawings/xteink-x4/check/
```
