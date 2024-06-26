module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  ignorePatterns: [
    'node_modules/**/*',
    'lib/**/*', // Ignore built files.
  ],
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  rules: {
    'quotes': ['error', 'single'],
    'object-curly-spacing': ['warn', 'always'],
    'arrow-parens': ['warn', 'as-needed'],
    'comma-dangle': 'off',
    'guard-for-in': 'off',
    'import/no-unresolved': 0,
    'require-jsdoc': 0,
    'max-len': ['error', {
      code: 200,
      tabWidth: 2,
      ignoreUrls: true,
    }],
    'indent': ['error', 2, {
      'SwitchCase': 1,
      'MemberExpression': 1,
      'FunctionDeclaration': {
        'body': 1,
        'parameters': 1,
      },
    }],
  },
};
