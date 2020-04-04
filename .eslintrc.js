module.exports = {
  plugins: ['prettier', 'react'],
  root: true,
  extends: ['eslint:recommended', 'prettier', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
      jsx: true,
    },
  },
  env: {
    node: true,
    es6: true,
    browser: true,
    jest: true,
  },
  rules: {
    'sonarjs/no-duplicate-string': 'off',
    'no-unused-vars': 'off',
    'object-shorthand': ['error', 'always'],
    semi: ['error', 'never'],
    'security/detect-non-literal-fs-filename': 'off',
  },
}
