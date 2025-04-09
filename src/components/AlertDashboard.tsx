import { useEffect, useState } from 'react';
import { Card, Text, Group, Stack, Title, Grid, Badge, ScrollArea } from '@mantine/core';
import { AlertService, type Alert } from '../services/AlertService';

const getAlertColor = (type: Alert['type']) => {
  switch (type) {
    case 'error': return 'red';
    case 'warning': return 'yellow';
    case 'info': return 'blue';
    case 'success': return 'green';
    default: return 'gray';
  }
};

const getSeverityColor = (severity: Alert['severity']) => {
  switch (severity) {
    case 'critical': return 'red';
    case 'high': return 'orange';
    case 'medium': return 'yellow';
    case 'low': return 'blue';
    default: return 'gray';
  }
};

export function AlertDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const alertService = AlertService.getInstance();

  useEffect(() => {
    // Initial alerts
    setAlerts(alertService.getRecentAlerts());

    // Subscribe to new alerts
    const unsubscribe = alertService.subscribe((alert) => {
      setAlerts(prev => [...prev, alert].slice(-10));
    });

    return () => unsubscribe();
  }, []);

  return (
    <Card shadow="sm" padding="lg">
      <Title order={3}>System Alerts</Title>
      <ScrollArea h={300}>
        <Stack gap="xs">
          {alerts.map((alert) => (
            <Card key={alert.id} withBorder>
              <Group justify="space-between">
                <Group>
                  <Badge color={getAlertColor(alert.type)}>{alert.type}</Badge>
                  <Badge color={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </Text>
              </Group>
              <Text size="sm" mt="xs">{alert.message}</Text>
              <Text size="xs" c="dimmed" mt="xs">Source: {alert.source}</Text>
            </Card>
          ))}
          {alerts.length === 0 && (
            <Text c="dimmed" ta="center">No alerts to display</Text>
          )}
        </Stack>
      </ScrollArea>
    </Card>
  );
} 