/*
 * Architecture invariants for the SPA, enforced rather than documented.
 *
 * CLAUDE.md states two boundaries that keep this codebase honest: every network
 * call goes through the single wrapper in src/api/client.ts, and src/api/ stays
 * React-free so it can be tested and reasoned about without a renderer. Both
 * were honour-system -- nothing failed if you broke them, and the damage shows
 * up much later as a component that bypasses error normalisation, or an api
 * module that can no longer be imported outside a component tree.
 *
 * These read the source rather than importing it, so a violation is reported as
 * a boundary error rather than a module-resolution failure.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "..");
const CLIENT = join(SRC, "api", "client.ts");

function sourceFiles(dir: string): string[] {
  // readdirSync is overloaded; the explicit annotation keeps `entry` from
  // widening to `any` under noImplicitAny.
  return readdirSync(dir).flatMap((entry: string) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/** Strip comments and string literals so prose about `fetch(` doesn't match. */
function code(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
}

describe("architecture", () => {
  it("routes every network call through src/api/client.ts", () => {
    const offenders = sourceFiles(SRC)
      .filter((f) => f !== CLIENT && !f.includes("/test/"))
      .filter((f) => /\bfetch\s*\(/.test(code(f)))
      .map((f) => relative(SRC, f));

    expect(
      offenders,
      "fetch() escaped src/api/client.ts. Route the call through request()/" +
        "requestVoid() so it inherits the base URL, the X-API-Key header, " +
        "error normalisation and the 401 handler.",
    ).toEqual([]);
  });

  it("keeps src/api/ free of React", () => {
    const offenders = sourceFiles(join(SRC, "api"))
      .filter((f) => /from\s+["']react/.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));

    expect(
      offenders,
      "src/api/ imported React. It must stay usable without a renderer -- " +
        "that inversion is why client.ts pulls the API key from a registered " +
        "provider instead of importing the store.",
    ).toEqual([]);
  });

  it("keeps the api layer from importing the auth store directly", () => {
    const offenders = sourceFiles(join(SRC, "api"))
      .filter((f) => /from\s+["'][^"']*auth\//.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));

    expect(
      offenders,
      "src/api/ imported src/auth/. The key is pulled per request via " +
        "setApiKeyProvider; a direct import reintroduces the effect-ordering " +
        "race that 401s on first load.",
    ).toEqual([]);
  });

  it("agrees with the e2e suite on the sessionStorage key", () => {
    const fromApp = /SESSION_STORAGE_KEY\s*=\s*["']([^"']+)["']/.exec(
      readFileSync(join(SRC, "auth", "apiKeyStore.ts"), "utf8"),
    )?.[1];
    const fromE2e = /SESSION_STORAGE_KEY\s*=\s*["']([^"']+)["']/.exec(
      readFileSync(resolve(SRC, "../../e2e/tests/fixtures.ts"), "utf8"),
    )?.[1];

    expect(fromApp).toBe("minitrack_api_key");
    expect(
      fromE2e,
      "e2e/tests/fixtures.ts seeds a different sessionStorage key than " +
        "src/auth/apiKeyStore.ts writes. The e2e suite would boot disconnected.",
    ).toBe(fromApp);
  });
});
