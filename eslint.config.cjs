const tsEslintPlugin = require("@typescript-eslint/eslint-plugin");
const tsEslintParser = require("@typescript-eslint/parser");

const browserGlobals = {
  CodeMirror: "readonly",
  MessageEvent: "readonly",
  URL: "readonly",
  Worker: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  document: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  postMessage: "readonly",
  self: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
  window: "readonly",
  HTMLCollection: "readonly",
  HTMLSpanElement: "readonly",
};

module.exports = [
  {
    ignores: [
      "target",
      "pkg",
      "dist",
      ".task",
      ".parcel-cache",
      "book",
      "pnpm-lock.yaml",
      "static/codemirror",
    ],
  },
  {
    files: ["static/scripts/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsEslintParser,
      globals: browserGlobals,
    },
    plugins: {
      "@typescript-eslint": tsEslintPlugin,
    },
    rules: {
      ...tsEslintPlugin.configs.recommended.rules,
    },
  },
];
