import globals from "globals";
import js from "@eslint/js";

export default [
  {
    files: ["**/*.js"], // Apply to all JavaScript files
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021, // Use modern JavaScript
      },
      globals: {
        ...globals.node, // Add Node.js-specific globals like `require`, `module`
        ...globals.commonjs, // Add CommonJS-specific globals
      },
    },
    rules: {
      "no-undef": "off", // Allow CommonJS variables like `require`
      "semi": ["error", "always"], // Example: enforce semicolons
      "quotes": ["error", "double"], // Example: enforce double quotes
    },
  },
];
