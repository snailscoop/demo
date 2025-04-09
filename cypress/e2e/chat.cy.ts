describe('Chat Functionality', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForGunConnection();
    cy.waitForNostrConnection();
  });

  it('should send and receive messages in real-time', () => {
    // Navigate to chat
    cy.get('[data-testid="chat-container"]').should('exist');
    
    // Send a message
    const message = 'Hello, world!';
    cy.sendChatMessage(message);
    
    // Verify message appears in chat
    cy.checkChatMessage(message);
  });

  it('should handle multiple users', () => {
    // Navigate to chat
    cy.get('[data-testid="chat-container"]').should('exist');
    
    // Send message as user 1
    const message1 = 'Message from user 1';
    cy.sendChatMessage(message1);
    
    // Send message as user 2
    const message2 = 'Message from user 2';
    cy.sendChatMessage(message2);
    
    // Verify both messages appear in chat
    cy.checkChatMessage(message1);
    cy.checkChatMessage(message2);
  });

  it('should maintain chat history', () => {
    // Navigate to chat
    cy.get('[data-testid="chat-container"]').should('exist');
    
    // Send multiple messages
    const messages = ['Message 1', 'Message 2', 'Message 3'];
    messages.forEach(message => {
      cy.sendChatMessage(message);
    });
    
    // Reload the page
    cy.reload();
    
    // Verify all messages are still present
    messages.forEach(message => {
      cy.checkChatMessage(message);
    });
  });

  it('should handle chat errors gracefully', () => {
    // Navigate to chat
    cy.get('[data-testid="chat-container"]').should('exist');
    
    // Simulate connection error
    cy.intercept('POST', '/chat/message', {
      statusCode: 500,
      body: { error: 'Connection failed' }
    });
    
    // Try to send a message
    cy.sendChatMessage('Test message');
    
    // Check if error message is displayed
    cy.get('[data-testid="chat-error"]').should('be.visible');
    cy.get('[data-testid="chat-error"]').should('contain', 'Failed to send message');
  });

  it('should support message formatting', () => {
    // Navigate to chat
    cy.get('[data-testid="chat-container"]').should('exist');
    
    // Send formatted message
    const message = '**Bold** and *italic* text';
    cy.sendChatMessage(message);
    
    // Verify formatting is preserved
    cy.get('[data-testid="chat-message"]').should('contain.html', '<strong>Bold</strong>');
    cy.get('[data-testid="chat-message"]').should('contain.html', '<em>italic</em>');
  });

  it('should handle message deletion', () => {
    // Navigate to chat
    cy.get('[data-testid="chat-container"]').should('exist');
    
    // Send a message
    const message = 'Message to delete';
    cy.sendChatMessage(message);
    
    // Delete the message
    cy.get('[data-testid="delete-message"]').click();
    
    // Verify message is removed
    cy.get('[data-testid="chat-message"]').should('not.contain', message);
  });

  it('should support message reactions', () => {
    // Navigate to chat
    cy.get('[data-testid="chat-container"]').should('exist');
    
    // Send a message
    const message = 'React to this message';
    cy.sendChatMessage(message);
    
    // Add reaction
    cy.get('[data-testid="add-reaction"]').click();
    cy.get('[data-testid="reaction-picker"]').select('👍');
    
    // Verify reaction is displayed
    cy.get('[data-testid="message-reactions"]').should('contain', '👍');
  });

  it('should handle chat room switching', () => {
    // Navigate to chat
    cy.get('[data-testid="chat-container"]').should('exist');
    
    // Send message in first room
    const message1 = 'Message in room 1';
    cy.sendChatMessage(message1);
    
    // Switch to second room
    cy.get('[data-testid="room-selector"]').select('Room 2');
    
    // Send message in second room
    const message2 = 'Message in room 2';
    cy.sendChatMessage(message2);
    
    // Switch back to first room
    cy.get('[data-testid="room-selector"]').select('Room 1');
    
    // Verify messages are in correct rooms
    cy.checkChatMessage(message1);
    cy.get('[data-testid="chat-message"]').should('not.contain', message2);
  });
}); 