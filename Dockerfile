FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the application
RUN npm run build

# Expose ports
EXPOSE 3001
EXPOSE 8765

# Start the application
CMD ["npm", "run", "start"] 