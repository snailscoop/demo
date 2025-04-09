import React, { useState, useEffect, useRef } from 'react';
import { ServiceRegistry } from '../services/ServiceRegistry';
import { NostrService } from '../services/NostrService';
import { ErrorTracker } from '../services/ErrorTracker';

interface VideoMetadata {
  title: string;
  description: string;
  source: string;
  thumbnail?: string;
  duration?: number;
}

export const VideoPlayer: React.FC = () => {
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const nostrService = ServiceRegistry.get<NostrService>('NostrService');
  const errorTracker = ServiceRegistry.get<ErrorTracker>('ErrorTracker');

  useEffect(() => {
    const setupVideoPlayer = async () => {
      try {
        setIsLoading(true);
        
        // Subscribe to video events (kind 30023)
        const unsubscribe = await nostrService.subscribe(
          [{ kinds: [30023], limit: 1 }],
          (event) => {
            try {
              const content = JSON.parse(event.content);
              setVideoMetadata({
                title: content.title,
                description: content.description,
                source: content.source,
                thumbnail: content.thumbnail,
                duration: content.duration
              });
              setError(null);
            } catch (err) {
              const error = new Error('Failed to parse video metadata');
              errorTracker.trackError({
                message: error.message,
                category: 'video',
                originalError: err instanceof Error ? err : new Error('Unknown error')
              });
              setError('Failed to load video metadata');
            }
          }
        );

        return () => {
          unsubscribe();
        };
      } catch (err) {
        const error = new Error('Failed to setup video player');
        errorTracker.trackError({
          message: error.message,
          category: 'video',
          originalError: err instanceof Error ? err : new Error('Unknown error')
        });
        setError('Failed to connect to video source');
      } finally {
        setIsLoading(false);
      }
    };

    setupVideoPlayer();
  }, []);

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const error = new Error('Video playback error');
    errorTracker.trackError({
      message: error.message,
      category: 'video',
      originalError: new Error('Video element error')
    });
    setError('Failed to play video');
  };

  if (isLoading) {
    return (
      <div className="video-player loading">
        <div className="spinner" />
        <p>Loading video...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-player error">
        <p>{error}</p>
        <button onClick={() => setError(null)}>Retry</button>
      </div>
    );
  }

  if (!videoMetadata) {
    return (
      <div className="video-player empty">
        <p>No video available</p>
      </div>
    );
  }

  return (
    <div className="video-player">
      <div className="video-info">
        <h2>{videoMetadata.title}</h2>
        <p>{videoMetadata.description}</p>
      </div>
      
      <video
        ref={videoRef}
        src={videoMetadata.source}
        poster={videoMetadata.thumbnail}
        controls
        onError={handleError}
      />
      
      {videoMetadata.duration && (
        <div className="video-duration">
          Duration: {Math.floor(videoMetadata.duration / 60)}:{(videoMetadata.duration % 60).toString().padStart(2, '0')}
        </div>
      )}
    </div>
  );
}; 