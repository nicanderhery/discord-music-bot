module.exports = {
  root: true,
  env: { browser: true, es2024: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended-type-checked', 'prettier'],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'spaced-comment': [
      'error',
      'always',
      {
        exceptions: ['-', '+'],
        markers: ['!', 'TODO', '?', '//'],
      },
    ],
    'capitalized-comments': [
      'error',
      'always',
      {
        ignorePattern: 'pragma|ignored',
        ignoreInlineComments: true,
        ignoreConsecutiveComments: true,
      },
    ],
    curly: ['error', 'all'],
  },
};
