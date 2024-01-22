module.exports = {
  env: {
    node: true,
    es2021: true,
    commonjs: true,
  },
  extends: ['eslint:recommended', 'plugin:json/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-undef': 'warn',
    'no-case-declarations': 'warn',
    'no-unused-vars': [
      'warn', // or "error"
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'no-useless-escape': 'warn',
  },
};
