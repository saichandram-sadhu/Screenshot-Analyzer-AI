#!/bin/bash

# Configuration
APP_NAME="Screenshot Analyzer AI"
APP_FILE="Screenshot Analyzer AI-0.0.0.AppImage"
ICON_FILE="icon.png"
INSTALL_DIR="$HOME/Applications/ScreenshotAnalyzer"
DESKTOP_FILE="$HOME/.local/share/applications/screenshot-analyzer.desktop"

# Ensure target directory exists
mkdir -p "$INSTALL_DIR"

# Copy files
echo "Installing to $INSTALL_DIR..."
cp "dist_electron/$APP_FILE" "$INSTALL_DIR/"
cp "public/$ICON_FILE" "$INSTALL_DIR/"

# Make executable
chmod +x "$INSTALL_DIR/$APP_FILE"

# Create .desktop file
echo "Creating menu entry..."
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=$APP_NAME
Exec="$INSTALL_DIR/$APP_FILE" --no-sandbox %U
Icon=$INSTALL_DIR/$ICON_FILE
Type=Application
Categories=Utility;
Terminal=false
EOF

# Update database
update-desktop-database "$HOME/.local/share/applications"

echo "✅ Installed successfully!"
echo "Search for '$APP_NAME' in your Applications menu."
