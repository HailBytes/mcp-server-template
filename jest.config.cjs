// jest.config.cjs — CommonJS Jest config (required because package.json has "type":"module")
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  forceExit: true,
  moduleNameMapper: {
    // Strip .js extensions so ts-jest can resolve .ts source files
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS' } }],
  },
};
