module.exports = {
  plugins: ["simple-import-sort", "check-file"],
  extends: ["prettier", "plugin:anti-trojan-source/recommended"],
  ignorePatterns: ["dist"],
  rules: {
    // ### Import

    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["*/src"],
            message: "Do not directly import packages from the src/ directory."
          }
        ]
      }
    ],

    // ### Simple Import Sort

    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",

    // ### Check File

    "check-file/filename-naming-convention": [
      "error",
      {
        "src/**/*.{tsx,ts}": "PASCAL_CASE"
      },
      {
        ignoreMiddleExtensions: true
      }
    ]
  },
  overrides: [
    {
      files: ["tests/**/*.ts"],
      rules: {
        "no-restricted-imports": "off"
      }
    },
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      extends: ["plugin:@typescript-eslint/recommended"],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/prefer-arrow-callback": "off",
        "@typescript-eslint/ban-types": "off"
      }
    },
    {
      files: ["types.d.ts", "main.ts", "main.tsx", "mod.ts", "mod.tsx", "index.ts", "index.tsx"],
      rules: {
        "check-file/filename-naming-convention": ["off"]
      }
    }
  ]
};
