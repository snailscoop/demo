import React, { useEffect, useState } from 'react';
import { Card, Text, Group, Stack, Title, Grid, Badge } from '@mantine/core';
import { PerformanceMonitor } from '../services/PerformanceMonitor';
import type { PerformanceMetrics } from '../services/PerformanceMonitor';

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const performanceMonitor = PerformanceMonitor.getInstance();

  useEffect(() => {
    // Initial metrics
    setMetrics(performanceMonitor.getMetrics());

    // Update metrics every 5 seconds
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const latestMetrics = metrics[metrics.length - 1] || null;

  return (
    <Stack gap="md">
      <Title order={2}>Performance Dashboard</Title>
      <Grid>
        <Grid.Col span={4}>
          <Card shadow="sm" padding="lg">
            <Title order={3}>Initialization Times</Title>
            <Stack gap="xs">
              {metrics.map((metric, index) => (
                <Group key={index} justify="space-between">
                  <Text size="sm">{metric.service}</Text>
                  <Text size="sm">{metric.initializationTime.toFixed(2)}ms</Text>
                </Group>
              ))}
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={4}>
          <Card shadow="sm" padding="lg">
            <Title order={3}>Memory Usage</Title>
            <Stack gap="xs">
              {latestMetrics && (
                <Group justify="space-between">
                  <Text size="sm">Current Usage</Text>
                  <Text size="sm">{latestMetrics.memoryUsage.toFixed(2)} MB</Text>
                </Group>
              )}
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={4}>
          <Card shadow="sm" padding="lg">
            <Title order={3}>System Status</Title>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">Services Running</Text>
                <Badge color="green">Active</Badge>
              </Group>
              {latestMetrics?.errorRate && (
                <Group justify="space-between">
                  <Text size="sm">Error Rate</Text>
                  <Badge color={latestMetrics.errorRate > 0.1 ? 'red' : 'green'}>
                    {(latestMetrics.errorRate * 100).toFixed(1)}%
                  </Badge>
                </Group>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
} 