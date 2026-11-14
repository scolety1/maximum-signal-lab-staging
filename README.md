# Maximum Signal Lab — staging export

An experimental portfolio export with interactive browser experiences around workflow decisions, simulation, and project architecture. This is a staging snapshot, not the authoritative production portfolio.

## Source map

- [Landing document](index.html) and [page behavior](script.js).
- [Experience loader](loader.js), [registry](registry.js), and [scenario definitions](scenarios.js).
- [Simulation](simulation.js), [seeded randomness](seeded-random.js), and public snapshot adapters.

## Current limitation

The uploaded file layout is incomplete: `index.html` references `experiments/loader.js` and `experiments/experiment-dock.css`, but those files are at the repository root. Serving this snapshot as-is produces missing assets. Reconstruct the intended export directory structure and verify each experience before presenting it as a working demo. This documentation pass did not change the site or deploy it.

For the current portfolio, visit [spencercolety.com](https://spencercolety.com/). Project summaries and public snapshots are illustrative interfaces, not the complete source or runtime of the projects represented. This work and its documentation are AI-assisted; no independent line-authorship claim is made.
