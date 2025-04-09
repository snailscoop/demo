import { useState, useEffect } from 'react';
import { Button, Text, Stack, Alert, Group } from '@mantine/core';
import { IconAlertCircle, IconWallet } from '@tabler/icons-react';
import { KeplrAuth, ConnectionStatus, KeplrError } from '../services/KeplrAuth';

interface KeplrConnectProps {
  onConnect: (address: string) => void;
  onDisconnect: () => void;
  keplrAuth: KeplrAuth;
}

export const KeplrConnect = ({ onConnect, onDisconnect, keplrAuth }: KeplrConnectProps) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<KeplrError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const statusUnsubscribe = keplrAuth.onStatusChange(setStatus);
    const errorUnsubscribe = keplrAuth.onError(setError);

    return () => {
      statusUnsubscribe();
      errorUnsubscribe();
    };
  }, [keplrAuth]);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const address = await keplrAuth.connect();
      onConnect(address);
    } catch (err) {
      // Error is already handled by the error listener
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    keplrAuth.disconnect();
    onDisconnect();
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'connecting':
        return 'orange';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group>
          <IconWallet size={24} color={getStatusColor()} />
          <Text fw={500} c={getStatusColor()}>{getStatusText()}</Text>
        </Group>
        {status === 'connected' ? (
          <Button variant="light" color="red" onClick={handleDisconnect}>
            Disconnect
          </Button>
        ) : (
          <Button
            variant="light"
            onClick={handleConnect}
            loading={isLoading}
            disabled={status === 'connecting'}
          >
            Connect Wallet
          </Button>
        )}
      </Group>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Connection Error"
          color="red"
          variant="light"
        >
          <Stack gap="xs">
            <Text>{error.message}</Text>
            {error.details && (
              <Text size="sm" c="dimmed">
                {error.details}
              </Text>
            )}
            {error.type === 'rejection' && (
              <Text size="sm" c="dimmed">
                Please approve the connection request in your Keplr wallet.
              </Text>
            )}
            {error.type === 'extension' && (
              <Text size="sm" c="dimmed">
                Please install the Keplr wallet extension to continue.
              </Text>
            )}
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}; 