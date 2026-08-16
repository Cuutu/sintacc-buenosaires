const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/.next/', '<rootDir>/node_modules/'],
}

module.exports = async () => {
  const config = await createJestConfig(customJestConfig)()
  const extra = ['<rootDir>/e2e/']
  config.testPathIgnorePatterns = Array.from(
    new Set([...(config.testPathIgnorePatterns || []), ...extra])
  )
  return config
}
