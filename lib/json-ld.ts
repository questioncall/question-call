/**
 * Serialize a value for embedding inside a `<script type="application/ld+json">`
 * block.
 *
 * `JSON.stringify` alone is NOT safe here: it does not escape `<`, so any
 * user-authored string in the payload (a course title, an instructor name) can
 * close the script tag and inject markup — stored XSS on every visitor of the
 * page. U+2028/U+2029 are also escaped: they are valid JSON but terminate
 * JavaScript string literals.
 *
 * Always use this instead of raw JSON.stringify for ld+json.
 *
 * Lives outside lib/seo.ts so it carries no server-only dependency and stays
 * usable (and testable) anywhere.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
