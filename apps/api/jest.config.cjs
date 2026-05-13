/** @type {import("jest").Config} */
const ignoreIntegration = process.env.INTEGRATION_TEST !== "1";

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: ["**/*.spec.ts", "**/*.integration.spec.ts"],
  testPathIgnorePatterns: ignoreIntegration ? ["\\.integration\\.spec\\.ts$"] : [],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    "^chess\\.js$": "<rootDir>/test/vendor/chess.cjs",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.types.ts", "!src/main.ts", "!src/prisma/**"],
  setupFilesAfterEnv: ["<rootDir>/test/jest-setup.ts"],
};
