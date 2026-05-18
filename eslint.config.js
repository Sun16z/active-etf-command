import globals from "globals";
import react from "eslint-plugin-react";

export default [
  {
    files: ["**/*.{js,jsx}"],
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "react/jsx-uses-vars": "error",
    },
  },
];
