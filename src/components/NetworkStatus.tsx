import { useEffect, useState } from 'react';
import { Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconWifi, IconWifiOff, IconAlertCircle } from '@tabler/icons-react';
import { NetworkMonitor, NetworkStatus, ConnectionType } from '../services/NetworkMonitor';

interface ConnectionBadgeProps {
  type: ConnectionType;
  stats: {
    lastSuccess: number;
    lastFailure: number;
    failureCount: number;
    retryCount: number;
  };
}

const ConnectionBadge = ({ type, stats }: ConnectionBadgeProps) => {
  const isConnected = stats.lastSuccess > stats.lastFailure;
  const retryCount = stats.retryCount;
  const color = isConnected ? 'green' : retryCount > 0 ? 'yellow' : 'red';

  return (
    <Tooltip
      label={
        <Stack gap="xs">
          <Text size="sm">Last Success: {new Date(stats.lastSuccess).toLocaleTimeString()}</Text>
          <Text size="sm">Last Failure: {new Date(stats.lastFailure).toLocaleTimeString()}</Text>
          <Text size="sm">Failures: {stats.failureCount}</Text>
          <Text size="sm">Retries: {retryCount}</Text>
        </Stack>
      }
    >
      <Badge
        color={color}
        leftSection={isConnected ? <IconWifi size={12} /> : <IconWifiOff size={12} />}
      >
        {type.toUpperCase()}
      </Badge>
    </Tooltip>
  );
};

export const NetworkStatusIndicator = () => {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [connectionStats, setConnectionStats] = useState<Map<ConnectionType, any>>(new Map());
  const networkMonitor = NetworkMonitor.getInstance();

  useEffect(() => {
    const handleStatusChange = (newStatus: NetworkStatus) => {
      setStatus(newStatus);
    };

    const handleConnectionUpdate = ({ type, stats }: { type: ConnectionType; stats: any }) => {
      setConnectionStats(prev => new Map(prev).set(type, stats));
    };

    networkMonitor.on('statusChange', handleStatusChange);
    networkMonitor.on('connectionUpdate', handleConnectionUpdate);

    return () => {
      networkMonitor.off('statusChange', handleStatusChange);
      networkMonitor.off('connectionUpdate', handleConnectionUpdate);
    };
  }, []);

  const isOnline = status === 'online';
  const hasIssues = Array.from(connectionStats.values()).some(
    stats => stats.lastFailure > stats.lastSuccess
  );

  return (
    <Group gap="xs">
      <Tooltip label={isOnline ? 'Network Online' : 'Network Offline'}>
        <Badge
          color={isOnline ? 'green' : 'red'}
          leftSection={isOnline ? <IconWifi size={12} /> : <IconWifiOff size={12} />}
        >
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Badge>
      </Tooltip>

      {hasIssues && (
        <Tooltip label="Some connections are experiencing issues">
          <Badge color="yellow" leftSection={<IconAlertCircle size={12} />}>
            DEGRADED
          </Badge>
        </Tooltip>
      )}

      {Array.from(connectionStats.entries()).map(([type, stats]) => (
        <ConnectionBadge key={type} type={type} stats={stats} />
      ))}
    </Group>
  );
}; 