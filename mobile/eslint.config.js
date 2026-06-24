const js = require("@eslint/js");
const globals = require("globals");
const reactHooks = require("eslint-plugin-react-hooks");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  { ignores: ["node_modules", ".expo", "coverage", "dist", "eslint.config.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        ...globals.es2023,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "jest.setup.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
);
