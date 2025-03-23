# Stage 1: Build TypeScript
FROM node:22-alpine AS builder
# Set the working directory inside the container
WORKDIR /app
# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
# Install dependencies
RUN npm install
# Copy the rest of the application code to the working directory
COPY . .
# Build the TypeScript code
RUN npm run build

# Stage 2: Create production image
FROM node:22-alpine AS runner
# Set the working directory inside the container
WORKDIR /app
# Copy the built files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create any required directories and set proper ownership
RUN mkdir -p /app/logs && chown -R node:node /app

# Switch to the node user
USER node

# Start the API
CMD ["node", "dist/app.js"]