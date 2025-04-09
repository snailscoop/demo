import React, { useEffect, useState, useRef } from 'react';
import { SimpleGrid, Card, Text, Badge, Group, Stack, Button } from '@mantine/core';
import '@mantine/core/styles.layer.css';
import { NostrService } from '../services/NostrService.js';
import type { ContentItem, RelayStats } from '../services/NostrService.js';

export function VideoList() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [relayStats, setRelayStats] = useState<Map<string, RelayStats>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const nostrService = useRef(NostrService.getInstance());
  const subscriptionId = useRef<string>('');

  useEffect(() => {
    const handleEvent = (item: ContentItem) => {
      setContentItems(prev => {
        const exists = prev.some(existing => existing.id === item.id);
        if (!exists) {
          return [...prev, item].sort((a, b) => b.created_at - a.created_at);
        }
        return prev;
      });
    };

    const handleError = (error: Error) => {
      setError(error.message);
    };

    const subscribe = async () => {
      try {
        subscriptionId.current = await nostrService.current.subscribe(handleEvent, handleError);
        
        // Set up interval to update relay stats
        const statsInterval = setInterval(() => {
          setRelayStats(new Map(nostrService.current.getRelayStats()));
        }, 5000);

        return () => {
          clearInterval(statsInterval);
          if (subscriptionId.current) {
            nostrService.current.unsubscribe(subscriptionId.current);
          }
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe to events');
      }
    };

    const cleanup = subscribe();

    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []);

  const getRelayStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'connecting':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Stack spacing="md">
      {error && (
        <Card withBorder>
          <Text color="red">{error}</Text>
        </Card>
      )}

      <Group spacing="xs">
        {Array.from(relayStats.entries()).map(([url, stats]) => (
          <Badge 
            key={url} 
            color={getRelayStatusColor(stats.status)}
            variant="light"
          >
            {new URL(url).hostname} ({stats.eventCount})
          </Badge>
        ))}
      </Group>

      <SimpleGrid cols={3} spacing="md">
        {contentItems.map(item => (
          <Card key={item.id} withBorder>
            <Stack spacing="xs">
              <Text weight={500} size="lg">{item.title}</Text>
              <Badge color={item.type === 'video' ? 'blue' : 'green'}>
                {item.type}
              </Badge>
              <Text size="sm" color="dimmed">
                {new Date(item.created_at * 1000).toLocaleString()}
              </Text>
              {item.type === 'video' ? (
                <Button 
                  component="a" 
                  href={item.content} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Watch Video
                </Button>
              ) : (
                <Text>{item.content}</Text>
              )}
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
} 