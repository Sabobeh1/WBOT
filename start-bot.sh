#!/bin/bash

echo "=========================================="
echo "   WBOT - WhatsApp Business Automation"
echo "=========================================="
echo ""
echo "Starting your WhatsApp Business Bot..."
echo ""
echo "IMPORTANT STEPS:"
echo "1. Wait for the QR code to appear"
echo "2. Open WhatsApp on your phone"
echo "3. Go to Settings > Linked Devices"
echo "4. Scan the QR code displayed below"
echo "5. Your bot will be ready to respond!"
echo ""
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "src/index.js" ]; then
    echo "ERROR: Cannot find src/index.js"
    echo "Please make sure you're running this from the WBOT directory"
    exit 1
fi

# Start the bot
echo "Starting WBOT..."
echo ""
node src/index.js

echo ""
echo "Bot stopped." 