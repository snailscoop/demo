describe('Video Playback', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForGunConnection();
    cy.waitForNostrConnection();
  });

  it('should load and play a video', () => {
    // Navigate to video page
    cy.get('[data-testid="video-player"]').should('exist');
    
    // Check if video controls are present
    cy.get('[data-testid="video-controls"]').should('be.visible');
    
    // Play the video
    cy.get('[data-testid="play-button"]').click();
    
    // Verify video is playing
    cy.checkVideoPlaying();
  });

  it('should handle video errors gracefully', () => {
    // Navigate to video page
    cy.get('[data-testid="video-player"]').should('exist');
    
    // Simulate video error
    cy.get('[data-testid="video-player"]').trigger('error');
    
    // Check if error message is displayed
    cy.get('[data-testid="video-error"]').should('be.visible');
    cy.get('[data-testid="video-error"]').should('contain', 'Error playing video');
  });

  it('should maintain video state across page reloads', () => {
    // Navigate to video page
    cy.get('[data-testid="video-player"]').should('exist');
    
    // Play the video
    cy.get('[data-testid="play-button"]').click();
    
    // Reload the page
    cy.reload();
    
    // Verify video continues playing
    cy.checkVideoPlaying();
  });

  it('should handle multiple video sources', () => {
    // Navigate to video page
    cy.get('[data-testid="video-player"]').should('exist');
    
    // Switch to different video source
    cy.get('[data-testid="video-source-select"]').select('alternative-source');
    
    // Verify video source changed
    cy.get('[data-testid="video-player"]').should('have.attr', 'src', 'alternative-source');
    
    // Play the video
    cy.get('[data-testid="play-button"]').click();
    
    // Verify video is playing
    cy.checkVideoPlaying();
  });

  it('should respect video quality settings', () => {
    // Navigate to video page
    cy.get('[data-testid="video-player"]').should('exist');
    
    // Change video quality
    cy.get('[data-testid="quality-select"]').select('1080p');
    
    // Verify quality setting was applied
    cy.get('[data-testid="video-player"]').should('have.attr', 'quality', '1080p');
  });

  it('should handle video buffering', () => {
    // Navigate to video page
    cy.get('[data-testid="video-player"]').should('exist');
    
    // Simulate slow network
    cy.intercept('GET', '/video/*', {
      delay: 2000,
      statusCode: 200
    });
    
    // Play the video
    cy.get('[data-testid="play-button"]').click();
    
    // Check if buffering indicator is shown
    cy.get('[data-testid="buffering-indicator"]').should('be.visible');
  });

  it('should support video seeking', () => {
    // Navigate to video page
    cy.get('[data-testid="video-player"]').should('exist');
    
    // Play the video
    cy.get('[data-testid="play-button"]').click();
    
    // Seek to specific time
    cy.get('[data-testid="seek-bar"]').setSliderValue(50);
    
    // Verify seek was successful
    cy.get('[data-testid="video-player"]').should('have.prop', 'currentTime', 50);
  });

  it('should handle video playback rate changes', () => {
    // Navigate to video page
    cy.get('[data-testid="video-player"]').should('exist');
    
    // Play the video
    cy.get('[data-testid="play-button"]').click();
    
    // Change playback rate
    cy.get('[data-testid="playback-rate"]').select('2x');
    
    // Verify playback rate changed
    cy.get('[data-testid="video-player"]').should('have.prop', 'playbackRate', 2);
  });
}); 