# CEH presentation

Static web slide deck based on `template-diapositivas`.

## Structure

- `index.html`: slides, Reveal.js configuration and speaker notes.
- `style.css`: presentation-specific visual design.
- Reveal.js 6.0.1 is vendored locally in `vendor/reveal/` for runtime reliability.

## Controls

- Arrow keys or space: navigate.
- `S`: open the Reveal.js Speaker View in a separate window.
- `Esc`: overview.
- `?`: Reveal.js keyboard shortcut help.

Speaker notes live inside each slide as `<aside class="notes">`.

## Reliability note

Reveal.js is intentionally served from this repository rather than from a CDN. On 2 October 2026, moving the runtime-critical Reveal.js files to jsDelivr produced a blank presentation in the real deployment even though the GitHub Pages build itself succeeded. The local copy was restored. Future cleanup should not replace these runtime-critical files with remote CDN dependencies unless the deployed presentation is smoke-tested in the target environment.


## Rendering model

This deck uses a fixed **1600 × 900** canvas. Reveal.js scales the entire slide uniformly to fit the available viewport.

The slide layout must not reflow on mobile. Do not add viewport-width media queries that change columns, spacing, typography or element positions. Narrow screens should display the same 16:9 composition at a smaller scale. `scrollActivationWidth: null` keeps Reveal.js from switching to its mobile scroll layout automatically.
