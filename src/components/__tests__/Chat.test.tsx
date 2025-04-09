import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Chat } from '../Chat';
import { gunService } from '../../services/GunService';
import { errorTracker } from '../../services/ErrorTracker';

// Mock the services
jest.mock('../../services/GunService', () => ({
  gunService: {
    getGun: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue({
        map: jest.fn().mockReturnValue({
          on: jest.fn()
        }),
        set: jest.fn()
      }),
      on: jest.fn()
    })
  }
}));

jest.mock('../../services/ErrorTracker', () => ({
  errorTracker: {
    trackError: jest.fn()
  }
}));

describe('Chat Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chat interface', () => {
    render(<Chat />);
    
    expect(screen.getByText('Chat Room')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('handles connection status', () => {
    render(<Chat />);
    
    // Simulate connection
    const hiCallback = gunService.getGun().on.mock.calls.find(
      (call: any) => call[0] === 'hi'
    )[1];
    hiCallback();
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    
    // Simulate disconnection
    const byeCallback = gunService.getGun().on.mock.calls.find(
      (call: any) => call[0] === 'bye'
    )[1];
    byeCallback();
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('sends messages', async () => {
    render(<Chat />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');
    
    // Simulate connection
    const hiCallback = gunService.getGun().on.mock.calls.find(
      (call: any) => call[0] === 'hi'
    )[1];
    hiCallback();
    
    // Send a message
    fireEvent.change(input, { target: { value: 'Hello, world!' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(gunService.getGun().get().set).toHaveBeenCalledWith({
        text: 'Hello, world!',
        sender: 'user',
        timestamp: expect.any(Number),
        formatted: false
      });
    });
  });

  it('displays error messages', () => {
    render(<Chat />);
    
    // Simulate error
    const mapCallback = gunService.getGun().get().map().on.mock.calls[0][0];
    mapCallback(null, 'error');
    
    expect(errorTracker.trackError).toHaveBeenCalled();
  });

  it('formats messages with markdown', () => {
    render(<Chat />);
    
    // Simulate receiving a formatted message
    const mapCallback = gunService.getGun().get().map().on.mock.calls[0][0];
    mapCallback({
      text: '**bold** and *italic*',
      sender: 'test',
      timestamp: Date.now(),
      formatted: true
    }, 'test-message');
    
    expect(screen.getByText('bold')).toHaveStyle('font-weight: bold');
    expect(screen.getByText('italic')).toHaveStyle('font-style: italic');
  });
}); 