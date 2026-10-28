# Uncanny Listening

Human-algorithmic listening: what makes a pop song *uncanny* to a trained ear, and where an algorithm agrees.

Open folders of songs, one folder per class (or one folder of class folders). Uncanny Listening describes every song
and every 10 s segment by its sound (dynamics, harmony, timbre, structural complexity, brightness, rhythm and more),
lays the songs out as maps, groups them without labels (k-means by default; DBSCAN, agglomerative, GMM, spectral and
HDBSCAN on request), and trains a model on your classes whose descriptor families you can turn up and down by ear.
Listen to any song or segment, relabel it by ear, walk the boundary between classes, and save every stage as CSV and
parquet with a methods note.

**Web tool:** https://mcrozzoli.github.io/uncanny-listening/

- The analysis runs in your browser. **Your audio never leaves your computer**: nothing is uploaded, and the page holds
  no audio and no data.
- The default preset reproduces the research's DarkLibrosa analysis (58 descriptor columns, whole song + 10 s segments).
  Optional extras: all MFCCs, chroma per pitch class, and a CLAP audio embedding (a model of 34–77 MB, downloaded once
  when switched on). CLAP runs on several threads in Chrome and Firefox, and on one thread (slower) in Safari.
- Best in a recent Chrome, Edge or Firefox on a desktop computer. Folder picking needs a browser that can open folders.
- Optional link to Ableton Live through the DMC Hub (Chrome, Firefox).

**Research: Ana Marjalizo**, PhD student in Aesthetic and Electronic Music and lecturer in training, Faculty of
Information and Audiovisual Media, University of Barcelona.
Built with DarkSonification. Designed by Miguel Angel Crozzoli; implemented with Claude AI agents.

## Licences

- **Code**: MIT (see `LICENSE`).
- **CLAP models** (`models/`): LAION, Apache License 2.0, with each model's `NOTICE.txt` beside it.
  **ONNX Runtime Web** (`vendor/ort/`): Microsoft, MIT.
- Other third-party software keeps its own licence. Full credits, with the cited methods and papers, are in
  [`CREDITS.md`](CREDITS.md); the page's own list is `CREDITS.txt` and its about page.
