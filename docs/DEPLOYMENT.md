# SNAILS Deployment Guide 🚀

## Prerequisites

- Node.js 16 or higher
- npm 7 or higher
- Redis (optional, for caching)
- PM2 (recommended for production)

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/snails.git
cd snails
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Gun Server
GUN_SERVER_PORT=8765
GUN_PEERS=ws://localhost:8765/gun

# Nostr Configuration
NOSTR_RELAYS=wss://relay.damus.io,wss://nostr.bitcoiner.social

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
```

## Building the Application

1. Build the application:
```bash
npm run build
```

2. Verify the build:
```bash
npm run preview
```

## Starting Services

### Development Mode

1. Start the Gun server:
```bash
npm run start:gun
```

2. Start the application:
```bash
npm start
```

### Production Mode

1. Install PM2:
```bash
npm install -g pm2
```

2. Start services with PM2:
```bash
# Start Gun server
pm2 start gun-server.js --name "snails-gun"

# Start the application
pm2 start npm --name "snails-app" -- start

# Save the configuration
pm2 save
```

3. Configure PM2 to start on boot:
```bash
pm2 startup
```

## Monitoring

### Performance Monitoring

1. Access the performance dashboard at `http://localhost:3001/performance`
2. Monitor metrics:
   - Service initialization time
   - Memory usage
   - Relay latency
   - Event processing time

### Error Tracking

1. Access the error dashboard at `http://localhost:3001/errors`
2. Monitor:
   - Error rates
   - Error categories
   - Severity levels
   - Error trends

### Alert Management

1. Access the alert dashboard at `http://localhost:3001/alerts`
2. Configure:
   - Alert thresholds
   - Notification channels
   - Alert categories

## Scaling

### Horizontal Scaling

1. Set up multiple Gun servers:
```bash
# Server 1
GUN_SERVER_PORT=8765 pm2 start gun-server.js --name "snails-gun-1"

# Server 2
GUN_SERVER_PORT=8766 pm2 start gun-server.js --name "snails-gun-2"
```

2. Update peer configuration:
```env
GUN_PEERS=ws://server1:8765/gun,ws://server2:8766/gun
```

### Load Balancing

1. Set up Nginx:
```nginx
upstream snails {
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    server_name snails.example.com;

    location / {
        proxy_pass http://snails;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Backup and Recovery

1. Set up automated backups:
```bash
# Backup script
#!/bin/bash
timestamp=$(date +%Y%m%d_%H%M%S)
tar -czf backup_$timestamp.tar.gz /path/to/snails/data
```

2. Schedule backups:
```bash
0 0 * * * /path/to/backup.sh
```

## Troubleshooting

### Common Issues

1. **Gun Server Not Starting**
   - Check port availability
   - Verify WebSocket configuration
   - Check firewall settings

2. **High Memory Usage**
   - Monitor with performance dashboard
   - Check for memory leaks
   - Adjust cache settings

3. **Connection Issues**
   - Verify relay URLs
   - Check network connectivity
   - Monitor error dashboard

### Logs

1. View PM2 logs:
```bash
pm2 logs snails-gun
pm2 logs snails-app
```

2. Check application logs:
```bash
tail -f logs/app.log
```

## Security

1. Configure SSL:
```nginx
server {
    listen 443 ssl;
    server_name snails.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # ... rest of configuration
}
```

2. Set up firewall:
```bash
# Allow necessary ports
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8765/tcp
```

## Maintenance

1. Update dependencies:
```bash
npm update
npm audit fix
```

2. Monitor system resources:
```bash
pm2 monit
```

3. Check service status:
```bash
pm2 status
```

## Support

For issues and support:
- GitHub Issues: https://github.com/your-org/snails/issues
- Documentation: https://github.com/your-org/snails/docs
- Community: https://community.snails.example.com 