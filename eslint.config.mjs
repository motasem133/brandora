import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * The radius scale, enforced.
 *
 * DESIGN.md gives three radii and a role for each — 14px to operate, 20px for a
 * card, 24px for a panel of cards — and by the time anyone measured, the
 * off-scale values outnumbered the named ones 56 to 43. Every one of them was a
 * reasonable local choice; the scale lost by a hundred small decisions rather
 * than one big one, which is exactly the kind of drift a rule catches and a
 * review does not.
 *
 * Tailwind's own defaults are the ones that leak, so those are what is banned.
 * Anything genuinely off-scale can still be written as an arbitrary value, which
 * is a deliberate enough act to survive a code review.
 */
const OFF_SCALE_RADIUS = /(^|\s)rounded(-[trbl]{1,2})?-(sm|md|lg|xl|2xl|3xl)(\s|$)/;

const radiusMessage =
  "Off-scale radius. Use rounded-control (14px, anything you operate), rounded-card (20px), rounded-panel (24px), or rounded-full for a pill — see DESIGN.md §Shapes.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      /*
       * The block renderer draws the customer's website, not this product's
       * interface. It legitimately has its own scale, because the brand it is
       * rendering is not this one.
       */
      "src/components/blocks/**",
      "src/app/sites/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=${OFF_SCALE_RADIUS}]`,
          message: radiusMessage,
        },
        {
          selector: `TemplateElement[value.raw=${OFF_SCALE_RADIUS}]`,
          message: radiusMessage,
        },
      ],
    },
  },
  {
    /*
     * The database boundary, enforced.
     *
     * README has said "src/server/ is the only DB boundary" since the first
     * commit, and by the time anyone measured, five pages and one component
     * were issuing raw Drizzle themselves. Same failure as the radius scale:
     * every one was a reasonable local shortcut, and the rule lost by a hundred
     * small decisions rather than one big one.
     *
     * It matters more here than radii do. A query written in a page is a query
     * no service can reuse, no test can exercise and no reader can find, and
     * the one that mattered — `plans.isActive` — decides whether a retired plan
     * is back on sale.
     *
     * Scoped to app and components rather than to a queries/ directory on
     * purpose. Services, jobs and billing legitimately hold a `db` handle;
     * pages and components never do.
     */
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: {
      /*
       * Schema is deliberately not banned. `import type { Plan }` is the shared
       * shape a page and a query legitimately agree on; it is the `db` handle
       * and the query builders that must not travel.
       */
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/server/db",
              message:
                "Pages and components never query directly. Call a function in src/server/db/queries/ (or a service), and add one there if it does not exist yet.",
            },
          ],
          patterns: [
            {
              group: ["drizzle-orm", "drizzle-orm/*"],
              message:
                "Query builders belong in src/server/db/queries/, not in a page or component.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
