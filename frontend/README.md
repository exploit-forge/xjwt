# JWT Pentest Studio Frontend

A modern, JWT.io-inspired React frontend for JWT security testing and analysis.

## Features

- 🎨 **Modern UI Design** - Clean, professional interface inspired by JWT.io
- 🌙 **Dark/Light Mode** - Seamless theme switching with system preference detection
- 🔍 **JWT Decoder** - Interactive three-pane layout for Header, Payload, and Signature
- 🔓 **JWT Cracker** - Real-time brute force attacks using dictionary wordlists
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- ⚡ **Real-time Updates** - Live Server-Sent Events for crack progress
- 🎯 **Token Validation** - Visual feedback for JWT format validation
- 📋 **Copy to Clipboard** - Easy copying of tokens, JSON, and secrets

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Header.jsx       # Navigation header with theme toggle
│   ├── TokenInput.jsx   # JWT token input and display
│   ├── DecodedSections.jsx  # Header/Payload/Verify sections
│   ├── CrackSection.jsx # JWT cracking interface
│   └── index.js         # Component exports
├── App.jsx              # Main application component
├── main.jsx             # React entry point
├── index.css            # Global styles and Tailwind imports
└── App.css              # App-specific styles
```

## Component Overview

### Header Component
- Application branding and navigation
- Dark/light theme toggle
- Responsive mobile menu
- Professional gradient styling

### TokenInput Component  
- JWT token input with validation
- Color-coded token breakdown (Header/Payload/Signature)
- Sample token loading
- Copy and clear functionality
- Visual validation status

### DecodedSections Component
- Three-section layout matching JWT.io
- JSON editor for Header and Payload
- Algorithm selection (HS256, RS256, etc.)
- Signature verification with secret input
- Token generation and encoding
- Real-time validation feedback

### CrackSection Component
- JWT secret cracking interface
- Wordlist file upload support
- Real-time attack progress via Server-Sent Events
- Terminal-style logging output
- Success/failure result display
- Attack controls (start/stop/clear)

## Styling

- **Tailwind CSS** for utility-first styling
- **Custom color palette** with JWT-specific colors:
  - Header: Red (`#ef4444`)
  - Payload: Purple (`#8b5cf6`)
  - Signature: Blue (`#3b82f6`)
- **Dark mode support** with `class` strategy
- **Custom animations** and transitions
- **Professional gradients** and shadows
- **Responsive breakpoints** for all screen sizes

## Key Features

### JWT.io-Inspired Design
- Three-pane layout for decoded sections
- Color-coded token visualization
- Professional typography and spacing
- Consistent with industry standards

### Enhanced User Experience
- Intuitive navigation with tab switching
- Visual feedback for all actions
- Loading states and progress indicators
- Error handling with user-friendly messages
- Accessibility considerations

### Security Testing Focus
- Built-in wordlist support for cracking
- Real-time attack monitoring
- Professional pentesting interface
- Educational content and warnings
- Ethical use guidelines

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Configuration

Environment variables:
- `VITE_BACKEND_URL` - Backend API URL (default: empty string for relative URLs)

## Browser Support

- Modern browsers with ES2020+ support
- Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Optimized bundle size with tree shaking
- Lazy loading where appropriate
- Efficient re-renders with React best practices
- Minimal dependencies for fast loading
