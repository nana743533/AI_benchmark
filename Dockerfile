# AI Coding Agent Benchmark - Accounting Software
# Reference Dockerfile - Adjust based on your chosen technology stack

# Stage 1: Base image (adjust as needed for your stack)
# Example: For Node.js/TypeScript
FROM node:20-alpine AS base
# For Python: FROM python:3.11-slim
# For Go: FROM golang:1.21-alpine

WORKDIR /app

# Stage 2: Dependencies (adjust for your stack)
FROM base AS dependencies

# Copy dependency files
# For Node.js:
COPY package*.json ./
# For Python:
# COPY requirements.txt ./
# For Go:
# COPY go.mod go.sum ./

# Install dependencies
# For Node.js:
RUN npm ci --only=production
# For Python:
# RUN pip install --no-cache-dir -r requirements.txt
# For Go:
# RUN go mod download

# Stage 3: Development/Testing image
FROM base AS development

# Install development dependencies
# For Node.js with E2E testing tools:
RUN npm install -g @playwright/test

# Install browser dependencies for E2E testing
RUN apk add --no-cache chromium nmap
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium-browser

# Copy all source files
COPY . .

# Expose port
EXPOSE 3000

# Default command (adjust for your stack)
CMD ["npm", "run", "dev"]
# For Python:
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]
# For Go:
# CMD ["./app"]

# Stage 4: Production image (optional)
# FROM base AS production
# COPY --from=dependencies /app/node_modules ./node_modules
# COPY . .
# CMD ["npm", "start"]
