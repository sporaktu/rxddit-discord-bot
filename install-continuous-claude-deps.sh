#!/bin/bash
# Install dependencies for continuous-claude on Arch Linux

set -e

echo "📦 Installing continuous-claude dependencies for Arch Linux..."

# Install jq and github-cli
echo "Installing jq and github-cli..."
sudo pacman -S --needed --noconfirm jq github-cli

# Verify installations
echo ""
echo "✅ Verifying installations..."
if command -v jq &> /dev/null; then
    echo "  ✓ jq installed: $(jq --version)"
else
    echo "  ✗ jq installation failed"
    exit 1
fi

if command -v gh &> /dev/null; then
    echo "  ✓ GitHub CLI installed: $(gh --version | head -n1)"
else
    echo "  ✗ GitHub CLI installation failed"
    exit 1
fi

if command -v continuous-claude &> /dev/null; then
    echo "  ✓ continuous-claude is available"
else
    echo "  ⚠️  continuous-claude not found in PATH, but dependencies are installed"
    echo "     Make sure ~/.local/bin is in your PATH"
fi

echo ""
echo "🎉 All dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Reload your shell: source ~/.bashrc"
echo "  2. Authenticate with GitHub: gh auth login"
echo "  3. Run continuous-claude: continuous-claude --prompt \"your task\" --max-runs 5 --owner YourGitHubUser --repo your-repo"
