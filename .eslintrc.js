module.exports = {
  env: {
    node: true,
    es2021: true,
    commonjs: true,
  },
  extends: ["prettier", "eslint:recommended", "plugin:json/recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {},
};
