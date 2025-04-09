import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { VideoPlayer } from '../VideoPlayer';
import { nostrService } from '../../services/NostrService';
import { errorTracker } from '../../services/ErrorTracker';

// Mock the services
jest.mock('../../services/NostrService', () => ({
  nostrService: {
    subscribe: jest.fn().mockResolvedValue(() => {})
  }
}));

jest.mock('../../services/ErrorTracker', () => ({
  errorTracker: {
    trackError: jest.fn()
  }
}));

describe('VideoPlayer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<VideoPlayer />);
    expect(screen.getByText('Loading video...')).toBeInTheDocument();
  });

  it('subscribes to video events', async () => {
    render(<VideoPlayer />);
    
    await waitFor(() => {
      expect(nostrService.subscribe).toHaveBeenCalledWith(
        [{ kinds: [30023], limit: 1 }],
        expect.any(Function)
      );
    });
  });

  it('displays video metadata when received', async () => {
    const mockVideoEvent = {
      content: JSON.stringify({
        title: 'Test Video',
        description: 'Test Description',
        source: 'https://example.com/video.mp4',
        thumbnail: 'https://example.com/thumbnail.jpg',
        duration: 120
      })
    };

    nostrService.subscribe.mockImplementation((_, callback) => {
      callback(mockVideoEvent);
      return () => {};
    });

    render(<VideoPlayer />);

    await waitFor(() => {
      expect(screen.getByText('Test Video')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Duration: 2:00')).toBeInTheDocument();
    });
  });

  it('handles video metadata parsing errors', async () => {
    const mockVideoEvent = {
      content: 'invalid json'
    };

    nostrService.subscribe.mockImplementation((_, callback) => {
      callback(mockVideoEvent);
      return () => {};
    });

    render(<VideoPlayer />);

    await waitFor(() => {
      expect(errorTracker.trackError).toHaveBeenCalled();
      expect(screen.getByText('Failed to load video metadata')).toBeInTheDocument();
    });
  });

  it('handles video playback errors', async () => {
    const mockVideoEvent = {
      content: JSON.stringify({
        title: 'Test Video',
        description: 'Test Description',
        source: 'https://example.com/video.mp4'
      })
    };

    nostrService.subscribe.mockImplementation((_, callback) => {
      callback(mockVideoEvent);
      return () => {};
    });

    render(<VideoPlayer />);

    // Simulate video error
    const video = screen.getByTestId('video-player');
    fireEvent.error(video);

    await waitFor(() => {
      expect(errorTracker.trackError).toHaveBeenCalled();
      expect(screen.getByText('Failed to play video')).toBeInTheDocument();
    });
  });

  it('shows retry button on error', async () => {
    const mockVideoEvent = {
      content: 'invalid json'
    };

    nostrService.subscribe.mockImplementation((_, callback) => {
      callback(mockVideoEvent);
      return () => {};
    });

    render(<VideoPlayer />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
}); 