module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    // "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    "/lib/**/*",       // Ignore built files.
    "/generated/**/*", // Ignore generated files.
    "jest.config.js",  // もし不要ならここで個別除外も追加可
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
  },
  overrides: [
    {
      // .js ファイルは TypeScript の型情報なしで lint する
      files: ["*.js"],
      parser: "espree",
      parserOptions: {
        sourceType: "module",
      },
      rules: {
        "@typescript-eslint/no-unused-vars": ["error", {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          // Schema という名前の末尾を持つ変数は無視する
          varsIgnorePattern: "Schema$"
        }],
      },
    },
  ],
};
