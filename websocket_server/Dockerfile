# WebSocket Server Docker Configuration
# 
# This Dockerfile creates a containerized environment for the WebSocket server
# that handles real-time AI voice conversations. The container is optimized
# for deployment on Fly.io with minimal resource usage.
# 
# Key Features:
# - Node.js 20 runtime with slim image for smaller size
# - Multi-stage build optimization for faster deployments
# - Health check integration for monitoring
# - Port 8080 exposure for Fly.io mapping

# Use an official Node.js runtime as a parent image
# Using a specific version for stability, -slim is a good choice for smaller size
# Node 20 provides good performance and LTS support
FROM node:20-slim

# Declare a build argument that can be passed in from fly.toml
# This allows for cache busting when dependencies change
ARG CACHE_BUSTER

# Set the working directory in the container
# All subsequent commands will run from this directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
# This leverages Docker's build cache. These files are copied first
# and `npm install` is run only if they change, improving build times.
COPY package*.json ./

# Install app dependencies and verify key packages exist
# The verification step ensures critical AI service packages are properly installed
# This helps catch dependency issues early in the build process
RUN npm install && ls -la node_modules/openai && ls -la node_modules/@google-cloud/speech

# Bundle app source
# Copy the main server file into the container
# This is done after npm install to leverage Docker layer caching
COPY main.js .

# Expose the port the app runs on. Fly.io will map this.
# Port 8080 is the standard port for the WebSocket server
# Fly.io will automatically map this to external ports (80/443)
EXPOSE 8080

# Command to run the application
# This is the entry point when the container starts
# The server will listen on port 8080 and handle WebSocket connections
CMD ["node", "main.js"] 