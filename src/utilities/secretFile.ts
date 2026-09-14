// import fs from 'node:fs';
// import fsp from 'node:fs/promises';
// import os from 'node:os';
// import path from 'node:path';

// export async function ensureFileFromEnv(
//   pathVar: string,
//   b64Var: string,
//   fallbackName: string
// ): Promise<string> {
//   const p = process.env[pathVar];
//   if (p) {
//     const candidates = [
//       p,
//       path.resolve(p),
//       path.resolve(process.cwd(), p),
//       path.resolve(__dirname, '..', p),
//       path.resolve(__dirname, '../..', p),
//     ];
//     const found = candidates.find((c) => fs.existsSync(c));
//     if (found) return found;
//   }

//   const b64 = process.env[b64Var];
//   if (b64) {
//     const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'inhlanyelo-'));
//     const file = path.join(dir, fallbackName);
//     const buf = Buffer.from(b64, 'base64');
//     // ✅ pass a Uint8Array view (avoids TS generics mismatch)
//     await fsp.writeFile(file, new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
//     return file;
//   }

//   throw new Error(
//     `Missing secret: set ${pathVar} to a readable file path OR ${b64Var} to base64 content`
//   );
// }
