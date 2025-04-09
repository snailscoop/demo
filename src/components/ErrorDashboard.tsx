import React, { useEffect, useState } from 'react';
import { Card, Text, Group, Stack, Title, Grid, Badge, Table } from '@mantine/core';
import { ErrorTracker, ErrorEvent, ErrorAnalytics } from '../services/ErrorTracker';

const getSeverityColor = (severity: ErrorEvent['severity']) => {
  switch (severity) {
    case 'low': return 'blue';
    case 'medium': return 'yellow';
    case 'high': return 'orange';
    case 'critical': return 'red';
    default: return 'gray';
  }
};

export function ErrorDashboard() {
  const [analytics, setAnalytics] = useState<ErrorAnalytics | null>(null);
  const errorTracker = ErrorTracker.getInstance();

  useEffect(() => {
    // Start analytics
    errorTracker.startAnalytics(5000); // Update every 5 seconds

    // Update analytics state
    const updateAnalytics = () => {
      setAnalytics(errorTracker.getAnalytics());
    };

    // Initial update
    updateAnalytics();

    // Set up interval for updates
    const interval = setInterval(updateAnalytics, 5000);

    return () => {
      clearInterval(interval);
      errorTracker.stopAnalytics();
    };
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Stack gap="md">
      <Title order={2}>Error Dashboard</Title>
      
      <Grid>
        <Grid.Col span={4}>
          <Card shadow="sm" padding="lg">
            <Title order={3}>Error Summary</Title>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">Total Errors</Text>
                <Text size="sm">{analytics?.totalErrors || 0}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Error Rate</Text>
                <Text size="sm">{(analytics?.errorRate || 0).toFixed(2)}/s</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Unresolved</Text>
                <Text size="sm">{analytics?.unresolvedErrors.length || 0}</Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={8}>
          <Card shadow="sm" padding="lg">
            <Title order={3}>Error Types</Title>
            <Stack gap="xs">
              {analytics?.errorTypes && Array.from(analytics.errorTypes.entries()).map(([type, count]) => (
                <Group key={type} justify="space-between">
                  <Text size="sm">{type}</Text>
                  <Text size="sm">{count}</Text>
                </Group>
              ))}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg">
            <Title order={3}>Recent Errors</Title>
            <Table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.recentErrors.map((error, index) => (
                  <tr key={index}>
                    <td>{formatTimestamp(error.timestamp)}</td>
                    <td>{error.type}</td>
                    <td>
                      <Badge color={getSeverityColor(error.severity)}>
                        {error.severity}
                      </Badge>
                    </td>
                    <td>{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
} 