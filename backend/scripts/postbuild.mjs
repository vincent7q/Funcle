// Copies non-TS runtime assets that `tsc` does not emit into dist/.
// Currently: the SQL schema, which db.ts reads at runtime via __dirname.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const assets = [['db/schema.sql', 'dist/backend/db/schema.sql']];

for (const [src, dest] of assets) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`postbuild: copied ${src} -> ${dest}`);
}
