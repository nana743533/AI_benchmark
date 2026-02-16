.PHONY: help build up down test-api test-mcp test-e2e test-all logs shell

# Default target
help:
	@echo "AI Coding Agent Benchmark - Accounting Software"
	@echo ""
	@echo "Available commands:"
	@echo "  make build      - Build Docker image"
	@echo "  make up         - Start containers"
	@echo "  make down       - Stop and remove containers"
	@echo "  make test-api   - Run API tests"
	@echo "  make test-mcp   - Run MCP server tests"
	@echo "  make test-e2e   - Run E2E tests"
	@echo "  make test-all   - Run all tests"
	@echo "  make logs       - Show container logs"
	@echo "  make shell      - Open shell in app container"
	@echo "  make clean      - Remove all generated files"

# Variables
COMPOSE_FILE := docker-compose.yml
PROJECT_NAME := ai-benchmark

# Build Docker image
build:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) build

# Start containers
up:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) up -d
	@echo "Containers started. Use 'make logs' to see logs."

# Stop containers
down:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) down

# Run API tests
test-api:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec app npm run test:api 2>/dev/null || \
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec app pytest tests/api 2>/dev/null || \
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec app go test ./tests/api/... 2>/dev/null || \
	@echo "Please implement API test command for your chosen stack"

# Run MCP server tests
test-mcp:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec app npm run test:mcp 2>/dev/null || \
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec app pytest tests/mcp 2>/dev/null || \
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec app go test ./tests/mcp/... 2>/dev/null || \
	@echo "Please implement MCP test command for your chosen stack"

# Run E2E tests
test-e2e:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec app npm run test:e2e 2>/dev/null || \
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec app pytest tests/e2e 2>/dev/null || \
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec app go test ./tests/e2e/... 2>/dev/null || \
	@echo "Please implement E2E test command for your chosen stack"

# Run all tests
test-all: test-api test-mcp test-e2e

# Show logs
logs:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) logs -f

# Open shell in app container
shell:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec app sh

# Clean up
clean:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) down -v
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) rm -f
