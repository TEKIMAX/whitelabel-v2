#!/bin/bash
set -e

CLIENT_NAME=$1

if [ -z "$CLIENT_NAME" ]; then
    echo "Usage: $0 <client-name>"
    exit 1
fi

DEPLOY_DIR="deployments/$CLIENT_NAME"

if [ -d "$DEPLOY_DIR" ]; then
    echo "Error: Deployment for '$CLIENT_NAME' already exists in $DEPLOY_DIR"
    exit 1
fi

echo "🚀 Provisioning Dedicated Service for: $CLIENT_NAME"

# Create directory
mkdir -p "$DEPLOY_DIR"

# Copy Infrastructure Files
cp docker-compose.yml "$DEPLOY_DIR/"
cp Dockerfile "$DEPLOY_DIR/"
cp nginx.conf "$DEPLOY_DIR/"
cp .dockerignore "$DEPLOY_DIR/"
cp -r . "$DEPLOY_DIR/src-copy" # For build context, we need the source. 
# Alternatively, we could build the image once and refer to it, but for self-contained isolation we copy.
# Optimization: In a real CI/CD, we'd pull a pre-built image. For this local script, we'll configure compose to build from root.

# Fix docker-compose to point back to source for build context, OR copy source. 
# Let's verify standard practice: We want the CLIENT to be able to run this.
# Simplest: Copy everything excluding what's in .dockerignore using rsync if available, or just assume we are setting up a run-time directory.
# Actually, for "Dedicated Services", we usually want to refer to a stable image.
# But since we are building locally, let's keep it simple:

echo "📂 configuring deployment..."

# We need to modify docker-compose project name to ensure isolation
# We will use the COMPOSE_PROJECT_NAME env var in a .env file
echo "COMPOSE_PROJECT_NAME=$CLIENT_NAME" > "$DEPLOY_DIR/.env"

# Create a start script for the client
cat <<EOF > "$DEPLOY_DIR/start.sh"
#!/bin/bash
echo "Starting Dedicated Service for $CLIENT_NAME..."
docker compose up -d

echo "waiting for tunnel..."
sleep 5
docker compose logs tunnel | grep "trycloudflare.com"
EOF

chmod +x "$DEPLOY_DIR/start.sh"

echo "✅ Provisioned at: $DEPLOY_DIR"
echo "To start this client's service:"
echo "  cd $DEPLOY_DIR"
echo "  ./start.sh"
