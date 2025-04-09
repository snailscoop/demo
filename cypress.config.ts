import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    responseTimeout: 30000,
    retries: {
      runMode: 2,
      openMode: 0
    },
    env: {
      GUN_SERVER_URL: 'ws://localhost:8765/gun',
      NOSTR_RELAY_URL: 'wss://nostr-relay.example.com'
    }
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    }
  }
}); 