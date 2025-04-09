import './commands';

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to wait for Gun server connection
       * @example cy.waitForGunConnection()
       */
      waitForGunConnection(): Chainable<void>;

      /**
       * Custom command to wait for Nostr relay connection
       * @example cy.waitForNostrConnection()
       */
      waitForNostrConnection(): Chainable<void>;

      /**
       * Custom command to check if video is playing
       * @example cy.checkVideoPlaying()
       */
      checkVideoPlaying(): Chainable<void>;

      /**
       * Custom command to send a chat message
       * @example cy.sendChatMessage('Hello, world!')
       */
      sendChatMessage(message: string): Chainable<void>;

      /**
       * Custom command to check if chat message exists
       * @example cy.checkChatMessage('Hello, world!')
       */
      checkChatMessage(message: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('waitForGunConnection', () => {
  cy.window().then((win) => {
    return new Cypress.Promise((resolve) => {
      const checkConnection = () => {
        if (win.gun && win.gun.isConnected) {
          resolve();
        } else {
          setTimeout(checkConnection, 1000);
        }
      };
      checkConnection();
    });
  });
});

Cypress.Commands.add('waitForNostrConnection', () => {
  cy.window().then((win) => {
    return new Cypress.Promise((resolve) => {
      const checkConnection = () => {
        if (win.nostr && win.nostr.isConnected) {
          resolve();
        } else {
          setTimeout(checkConnection, 1000);
        }
      };
      checkConnection();
    });
  });
});

Cypress.Commands.add('checkVideoPlaying', () => {
  cy.get('video').should('exist').and('have.prop', 'paused', false);
});

Cypress.Commands.add('sendChatMessage', (message: string) => {
  cy.get('[data-testid="chat-input"]').type(message);
  cy.get('[data-testid="send-button"]').click();
});

Cypress.Commands.add('checkChatMessage', (message: string) => {
  cy.get('[data-testid="chat-messages"]').should('contain', message);
}); 