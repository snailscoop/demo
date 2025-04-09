import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { MantineProvider, AppShell, Group, Text, Container, createTheme, Button, Stack, Grid } from '@mantine/core';
import { VideoList } from './components/VideoList';
import { KeplrConnect } from './components/KeplrConnect';
import { ChatPage } from './components/ChatPage';
import '@mantine/core/styles.css';
import './App.css';
import { NetworkStatusIndicator } from './components/NetworkStatusIndicator';
import { KeplrAuth } from './services/KeplrAuth';
import { useState } from 'react';
import { Notifications } from '@mantine/notifications';
import { Web3Provider } from './contexts/Web3Context';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { ErrorDashboard } from './components/ErrorDashboard';
import { ServiceRegistry } from './services/ServiceRegistry';
import { NostrService } from './services/NostrService';
import { ErrorTracker } from './services/ErrorTracker';
import { PerformanceMonitor } from './services/PerformanceMonitor';
import { AlertService } from './services/AlertService';
import { AlertDashboard } from './components/AlertDashboard';
import { GunService } from './services/GunService';
import { Chat } from './components/Chat';

const theme = createTheme({
  primaryColor: 'blue',
});

const OSMOSIS_CONFIG = {
  chainId: 'osmosis-1',
  rpcEndpoint: 'https://rpc.osmosis.zone',
  prefix: 'osmo',
  chainName: 'Osmosis',
  stakeCurrency: {
    coinDenom: 'OSMO',
    coinMinimalDenom: 'uosmo',
    coinDecimals: 6,
  },
};

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <Container size="lg" py="xl">
      <Stack align="center" gap="md">
        <Text size="xl" fw={700} c="red">Something went wrong</Text>
        <Text c="dimmed">{error.message}</Text>
        <Button onClick={resetErrorBoundary} variant="light">
          Try again
        </Button>
      </Stack>
    </Container>
  );
}

function App() {
  const [keplrAuth] = useState(() => new KeplrAuth(OSMOSIS_CONFIG));
  const [address, setAddress] = useState<string | null>(null);

  const handleConnect = (newAddress: string) => {
    setAddress(newAddress);
  };

  const handleDisconnect = () => {
    setAddress(null);
  };

  useEffect(() => {
    console.log('🚀 Starting service initialization...');
    const performanceMonitor = PerformanceMonitor.getInstance();
    const alertService = AlertService.getInstance();
    
    try {
      // Initialize services in the correct order
      const serviceRegistry = ServiceRegistry.getInstance();
      performanceMonitor.trackInitialization('ServiceRegistry');
      alertService.addAlert('info', 'ServiceRegistry initialized', 'system', 'low');
      console.log('📦 ServiceRegistry initialized');

      const nostrService = NostrService.getInstance();
      performanceMonitor.trackInitialization('NostrService');
      alertService.addAlert('info', 'NostrService initialized', 'system', 'low');
      console.log('🔌 NostrService initialized');

      const errorTracker = ErrorTracker.getInstance();
      performanceMonitor.trackInitialization('ErrorTracker');
      alertService.addAlert('info', 'ErrorTracker initialized', 'system', 'low');
      console.log('⚠️ ErrorTracker initialized');

      // Register services
      serviceRegistry.register('nostrService', nostrService);
      serviceRegistry.register('errorTracker', errorTracker);
      serviceRegistry.register('alertService', alertService);
      console.log('📝 Services registered in ServiceRegistry');

      // Verify service registration
      const registeredServices = {
        nostrService: serviceRegistry.has('nostrService'),
        errorTracker: serviceRegistry.has('errorTracker'),
        alertService: serviceRegistry.has('alertService')
      };
      console.log('✅ Service registration status:', registeredServices);

      // Test error tracking
      errorTracker.trackError(
        new Error('Test error for initialization'),
        'system',
        'low'
      );
      alertService.addAlert('warning', 'Test error tracked', 'system', 'low');
      console.log('🧪 Test error tracked successfully');

      // Log performance metrics
      const metrics = performanceMonitor.getMetrics();
      console.log('📊 Initialization metrics:', metrics);

    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      alertService.addAlert('error', 'Service initialization failed', 'system', 'high');
    }

    return () => {
      console.log('🧹 Starting service cleanup...');
      try {
        const serviceRegistry = ServiceRegistry.getInstance();
        if (serviceRegistry.has('nostrService')) {
          const nostrService = serviceRegistry.get<NostrService>('nostrService');
          nostrService.cleanup();
          alertService.addAlert('info', 'Services cleaned up', 'system', 'low');
          console.log('✅ Services cleaned up successfully');
        }
      } catch (error) {
        console.error('❌ Service cleanup failed:', error);
        alertService.addAlert('error', 'Service cleanup failed', 'system', 'high');
      }
    };
  }, []);

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <Web3Provider>
        <Router>
          <video
            className="video-background"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/videos/fillerbackground.mp4" type="video/mp4" />
          </video>
          <AppShell
            header={{ height: 60 }}
            padding="md"
          >
            <AppShell.Header>
              <Container size="lg" h="100%">
                <Group h="100%" px="md" justify="space-between">
                  <Group>
                    <Text component={Link} to="/" size="lg" fw={700}>
                      SNAILS
                    </Text>
                    <Group ml="xl" gap="xl">
                      <Text component={Link} to="/" c="dimmed">
                        Videos
                      </Text>
                      <Text component={Link} to="/chat" c="dimmed">
                        Chat
                      </Text>
                    </Group>
                  </Group>
                  <NetworkStatusIndicator />
                  <KeplrConnect 
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    keplrAuth={keplrAuth}
                  />
                </Group>
              </Container>
            </AppShell.Header>

            <AppShell.Main>
              <Container size="lg">
                <Routes>
                  <Route path="/" element={<VideoList />} />
                  <Route path="/chat" element={<ChatPage />} />
                </Routes>
                <div style={{ padding: '20px' }}>
                  <Grid>
                    <Grid.Col span={8}>
                      <VideoList />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Stack>
                        <PerformanceDashboard />
                        <ErrorDashboard />
                        <AlertDashboard />
                      </Stack>
                    </Grid.Col>
                  </Grid>
                </div>
              </Container>
            </AppShell.Main>
          </AppShell>
        </Router>
      </Web3Provider>
    </MantineProvider>
  );
}

export default App;
