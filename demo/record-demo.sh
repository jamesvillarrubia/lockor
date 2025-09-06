#!/bin/bash

# Lockor Demo Recording Script
# This script helps you record a screen capture and convert it to a GIF

echo "🎬 Lockor Demo Recording Setup"
echo "=============================="
echo ""

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first:"
        echo "   brew install $1"
        return 1
    else
        echo "✅ $1 is installed"
        return 0
    fi
}

echo "Checking required tools..."
check_tool "ffmpeg" || exit 1
check_tool "gifsicle" || exit 1

echo ""
echo "📋 Demo Script:"
echo "1. Open Cursor with this project"
echo "2. Open demo-config.js file"
echo "3. Use Cmd+Shift+P → 'Lockor: Toggle File Lock' to lock the file"
echo "4. Ask AI: 'Please update the API key in demo-config.js to use a new value'"
echo "5. AI should refuse and explain the file is locked"
echo "6. Stop recording after AI response"
echo ""

# Get screen dimensions for optimal recording
echo "🖥️  Screen Setup:"
echo "Recommended recording area: 1200x800 pixels"
echo "Position: Center of screen for best social media appearance"
echo ""

# Recording commands
echo "🎥 Recording Commands:"
echo ""
echo "Start recording (adjust coordinates as needed):"
echo "ffmpeg -f avfoundation -i \"1:0\" -r 30 -s 1200x800 -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -t 30 demo-recording.mov"
echo ""
echo "Convert to GIF:"
echo "ffmpeg -i demo-recording.mov -vf \"fps=15,scale=800:-1:flags=lanczos,palettegen\" palette.png"
echo "ffmpeg -i demo-recording.mov -i palette.png -filter_complex \"fps=15,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse\" demo-lockor.gif"
echo ""
echo "Optimize for Twitter (under 5MB):"
echo "gifsicle -O3 --lossy=80 --colors 256 demo-lockor.gif -o demo-lockor-optimized.gif"
echo ""

# Create a simple demo prompt file
cat > demo-prompt.txt << 'EOF'
Demo Prompt for AI:
"Please update the API key in demo-config.js to use a new value like 'new-api-key-67890'"
EOF

echo "📝 Demo prompt saved to demo-prompt.txt"
echo ""
echo "🚀 Ready to record! Follow the demo script above."


