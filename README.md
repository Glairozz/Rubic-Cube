# 🎮 Realistic 3D Rubik's Cube

A fully interactive, browser-based 3D Rubik's Cube simulation with realistic physics, multiple design themes, and comprehensive game controls.

## ✨ Features

### 🎯 Core Gameplay
- **Full 3D Cube**: Realistic Rubik's Cube with all 6 faces and 54 colored stickers
- **Complete Rotation Set**: All standard rotations (U, D, F, B, R, L), the middle slices (M, E, S) and their inverses
- **Accurate Mechanics**: Proper cube state management and adjacency logic
- **Smooth Animations**: Fluid transitions with adjustable speed controls

### 🎮 Game Controls
- **Scramble**: Random valid moves to mix up the cube
- **Auto-Solve**: Instantly return to solved state
- **Reset**: Clear game stats and reset timer
- **Manual Rotation**: Full control over individual face rotations

### 🎨 Visual Design
- **4 Design Themes**:
  - 🌈 **Classic**: Traditional Rubik's Cube colors
  - 💫 **Neon**: Vibrant cyberpunk-style colors
  - ⚡ **Metallic**: Premium metal finishes
  - 🔮 **Glass**: Modern translucent look

### ⚡ Interactive Features
- **3D View Control**: Click and drag to rotate the entire cube view
- **Keyboard Shortcuts**: Q/W/E/A/S/D for rotations, Space to scramble, Enter to solve
- **Real-time Statistics**: Move counter, timer, and game status
- **Particle Effects**: Visual feedback for moves and celebrations
- **Hover Effects**: Interactive sticker highlighting
- **Speed Control**: Adjustable animation speed slider

### 📱 Responsive Design
- Mobile-friendly interface
- Touch support for mobile devices
- Adaptive layout for different screen sizes

## 🚀 Getting Started

### Installation
1. Clone or download this repository
2. Open `index.html` in your favorite web browser
3. No additional dependencies required - everything runs in the browser!

### Quick Start
1. **Scramble the cube** using the "🔀 Scramble" button or press Space
2. **Solve it manually** using rotation controls or keyboard shortcuts
3. **Get help** with the "✨ Solve" button when stuck
4. **Try different themes** to customize your experience

## 🎮 Controls Guide

### Mouse Controls
- **Click & Drag**: Rotate the entire 3D view
- **Button Clicks**: Use control panel buttons for actions
- **Hover**: Highlight stickers and buttons

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| R / L / U / D / F / B | Turn that outer face clockwise |
| Shift + letter | Turn counter-clockwise |
| M | Turn the vertical middle slice clockwise (like L) |
| E | Turn the horizontal middle slice clockwise (like D) |
| S | Turn the front-to-back middle slice clockwise (like F) |
| Shift + M/E/S | Turn that slice counter-clockwise |
| Z / Y | Undo / redo |
| Space | Start / stop timer |

You can also drag any sticker — including the middle rows and columns — to
turn the layer under your finger. Release past 45° to commit the turn (past
135° gives a 180° turn).

### Rotation Notation
- **U, D**: Up/Down face
- **F, B**: Front/Back face  
- **R, L**: Right/Left face
- **"i" suffix**: Counter-clockwise (e.g., Ui, Fi, Ri)

## 🏗️ Technical Details

### Architecture
- **Pure HTML/CSS/JavaScript**: No external dependencies
- **CSS 3D Transforms**: Hardware-accelerated 3D rendering
- **Object-Oriented Design**: Clean, maintainable code structure
- **Event-Driven**: Responsive user interactions

### Key Components
- `RubiksCube` class: Main game logic and state management
- 3D CSS transforms for realistic cube rendering
- State management for accurate cube physics
- Animation system with configurable timing

### Browser Compatibility
- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 Game Mechanics

### Cube State
The cube maintains a 6×9 array representing each face's 9 stickers:
- **Front**: Red
- **Back**: Orange  
- **Top**: White
- **Bottom**: Yellow
- **Right**: Green
- **Left**: Blue

### Rotation Logic
Each rotation properly:
1. Rotates the face itself (90° clockwise/counterclockwise)
2. Updates adjacent faces to maintain cube integrity
3. Triggers visual animations
4. Updates game statistics

### Validation
All moves are validated to ensure:
- Only legal Rubik's Cube moves are executed
- Cube state remains consistent
- No impossible configurations

## 🎨 Customization

### Adding New Themes
To add a new color theme:
1. Define color gradients in the `changeDesign()` method
2. Add a theme button in the HTML
3. Implement theme switching logic

### Animation Speed
Use the speed slider to control animation timing:
- **Left**: Faster animations (100ms)
- **Right**: Slower animations (1000ms)
- **Default**: Moderate speed (300ms)

## 🐛 Troubleshooting

### Common Issues
- **Cube not visible**: Ensure browser supports CSS 3D transforms
- **Slow performance**: Try closing other tabs or reducing animation speed
- **Touch not working**: Use a modern mobile browser

### Performance Tips
- Use Chrome/Chromium for best performance
- Close unnecessary browser tabs
- Reduce animation speed if experiencing lag

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional solving algorithms
- Sound effects
- More visual themes
- Accessibility enhancements
- Performance optimizations

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the classic Rubik's Cube puzzle
- Created for educational and entertainment purposes

---

**Enjoy the ultimate Rubik's Cube experience! 🎮✨**