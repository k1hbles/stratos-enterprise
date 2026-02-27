#!/usr/bin/env bash
set -euo pipefail

echo "=== Nightshift VM Setup ==="

# Install Node 20 via nvm
if ! command -v node &> /dev/null; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
fi

# Install PM2 globally
npm install -g pm2

# Install Caddy
if ! command -v caddy &> /dev/null; then
  sudo apt-get update
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update
  sudo apt-get install caddy
fi

# Create data directory
mkdir -p data/files

# Install dependencies and build
npm install
npm run build

echo "=== Setup complete ==="
echo "Copy .env.example to .env.local and fill in values, then run: pm2 start ecosystem.config.js"
