module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  clearMocks: true,
  modulePaths: ["<rootDir>"],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};