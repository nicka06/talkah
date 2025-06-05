# Use an official Node.js runtime as a parent image
# Using a specific version for stability, -slim is a good choice for smaller size
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
# This leverages Docker's build cache. These files are copied first
# and `npm install` is run only if they change.
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY main.js .

# Expose the port the app runs on. Fly.io will map this.
EXPOSE 8080

# Command to run the application
CMD ["node", "main.js"] 