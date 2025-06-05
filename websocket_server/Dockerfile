# Use an official Deno image as a parent image
# Using a specific version for stability
FROM denoland/deno:1.44.4

# Set the working directory in the container
WORKDIR /app

# Expose the port the app runs on (Fly.io will set the PORT env var, Deno app reads it)
# This EXPOSE instruction is more for documentation; Fly.io handles port mapping based on fly.toml
EXPOSE 8080 

# Cache dependencies. If you had a deps.ts or deno.json/lock file, you would copy and cache them here.
# For now, our main.ts directly imports from URL, so they will be fetched on first run or when building.
# COPY deps.ts .
# RUN deno cache deps.ts

# Bundle app source
COPY main.ts .

# Command to run the application
# We need --allow-net for serving and for HTTP imports
# We need --allow-env to read the PORT environment variable set by Fly.io
CMD ["run", "--allow-net", "--allow-env", "main.ts"] 