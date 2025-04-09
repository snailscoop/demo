import { Chainable } from 'cypress';

declare global {
  namespace Cypress {
    interface Chainable {
      waitForGunConnection(): Chainable<void>;
      waitForNostrConnection(): Chainable<void>;
      checkVideoPlaying(): Chainable<void>;
      sendChatMessage(message: string): Chainable<void>;
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
          setTimeout(checkConnection, 100);
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
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  });
});

Cypress.Commands.add('checkVideoPlaying', () => {
  cy.get('[data-testid="video-player"]').then(($video) => {
    const video = $video[0] as HTMLVideoElement;
    expect(video.paused).to.be.false;
    expect(video.readyState).to.be.greaterThan(0);
  });
});

Cypress.Commands.add('sendChatMessage', (message: string) => {
  cy.get('[data-testid="chat-input"]').type(message);
  cy.get('[data-testid="send-button"]').click();
});

Cypress.Commands.add('checkChatMessage', (message: string) => {
  cy.get('[data-testid="chat-message"]').should('contain', message);
}); 