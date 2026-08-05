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
]);

export default eslintConfig;
