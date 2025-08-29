import eslintPluginTs from "@typescript-eslint/eslint-plugin";
import eslintParserTs from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: eslintParserTs,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": eslintPluginTs,
      prettier,
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: "error",
      semi: ["error", "always"],
      "@typescript-eslint/no-unused-vars": ["warn"],
      "prettier/prettier": "error",
    },
  },
];
