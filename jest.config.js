// TODO still have to find way to pass parameters to jest when running from jest extension in vscode

// configuration options described in https://jestjs.io/docs/configuration

// TODO this may be a problem in the future
// problem with open handles from fetch, had to remove --detectOpenHandles from test script in package.json
// otherwise spurious warnings at end of test run. 
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testEnvironmentOptions: {
        "NODE_TLS_REJECT_UNAUTHORIZED": "0",
    },
    // Need to avoid running both ts and js versions of tests
    testMatch: [
        "**/test/*.test.ts"
    ]
}