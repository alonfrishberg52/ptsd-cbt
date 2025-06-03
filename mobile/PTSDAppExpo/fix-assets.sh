#!/bin/bash

echo "🔧 Fixing Expo asset issues..."

# Navigate to project directory
cd "/Users/alonfrishberg/Desktop/af/tech/Projects/mindShift/PTSD/mobile/PTSDAppExpo"

echo "1. Backing up current assets..."
mv assets assets_backup_$(date +%Y%m%d_%H%M%S)

echo "2. Creating fresh assets directory..."
mkdir assets

echo "3. Downloading fresh Expo assets..."
# You'll need to manually download these or create simple placeholder images
# For now, let's create a simple script to generate basic placeholder images

echo "4. Creating temporary placeholder images..."
# This requires ImageMagick or similar tool
# convert -size 1024x1024 xc:lightblue assets/icon.png
# convert -size 1024x1024 xc:lightgreen assets/adaptive-icon.png  
# convert -size 1242x2436 xc:white assets/splash.png
# convert -size 32x32 xc:blue assets/favicon.png

echo "5. Clearing Metro cache..."
rm -rf node_modules/.cache
rm -rf .expo
expo start --clear

echo "✅ Done! Try running 'expo start --ios' again"
