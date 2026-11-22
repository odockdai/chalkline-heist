// Chalkline's hand-in program (Node 22, standard library only). The game is game/: plain static
// files a desktop browser opens offline (index.html, style.css, ES modules under src/ and two
// self-hosted fonts). This copies game/ and screenshots/ to /output and writes /output/dossier.json
// with the vendored make.fun library, the same bytes on every run.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });

// Only the screenshot images go out (3 or 4 JPEG/PNG files, the cover first by name).
const shotsDir = join(repoRoot, 'screenshots');
const shotFiles = existsSync(shotsDir) ? readdirSync(shotsDir).filter((name) => /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png)$/i.test(name)).sort() : [];
for (const name of shotFiles) cpSync(join(shotsDir, name), join(outputDir, 'screenshots', name));

// The scorer's caps: text_max_bytes shapes the dossier text; the rest refuse what the gate would.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, caps));
