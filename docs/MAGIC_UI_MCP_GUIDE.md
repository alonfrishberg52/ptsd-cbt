# Magic UI MCP Integration Guide

## Overview
Magic UI MCP is now integrated into your PTSD therapy system, allowing you to generate beautiful UI components using natural language descriptions directly in Cursor.

## What is Magic UI MCP?
Magic UI MCP is an AI-powered tool that helps developers create modern UI components instantly through natural language descriptions. It's like v0 but integrated directly into Cursor.

## Features
- **AI-Powered UI Generation**: Create UI components by describing them in natural language
- **Modern Component Library**: Access to pre-built, customizable components inspired by 21st.dev
- **Real-time Preview**: Instantly see your components as you create them
- **TypeScript Support**: Full TypeScript support for type-safe development
- **SVGL Integration**: Access to professional brand assets and logos

## How to Use

### 1. Basic Usage
In Cursor's chat, simply type `/ui` followed by your component description:

```
/ui create a modern navigation bar with responsive design
/ui build a patient progress card with charts and metrics
/ui design a therapy session booking form with date picker
/ui create a dashboard widget for PTSD assessment scores
```

### 2. For PTSD App Components
Here are some specific examples for your PTSD therapy system:

```
/ui create a patient dashboard card showing therapy progress with SUD scores
/ui build a session notes component with rich text editor
/ui design a breathing exercise widget with animated circles
/ui create a mood tracking component with color-coded emotions
/ui build a therapist appointment scheduler with calendar view
/ui design a progress chart component for PTSD assessment scores
/ui create a story generation interface with customizable parameters
/ui build a patient profile card with photo and key metrics
```

### 3. Mobile App Components
For your React Native/Expo mobile app:

```
/ui create a mobile therapy session card for React Native
/ui build a mobile navigation component with tab bar
/ui design a mobile progress tracker with swipe gestures
/ui create a mobile breathing exercise screen with animations
```

## Integration with Your Project

### Web Dashboard
Magic UI components can be integrated into your Flask dashboard:
- Components will be generated as React/HTML/CSS
- Can be adapted for your Jinja2 templates
- Perfect for enhancing `templates/dashboard/` pages

### Mobile App
For your React Native/Expo app in `mobile/PTSDAppExpo/`:
- Components can be generated as React Native components
- TypeScript support matches your existing setup
- Can be integrated into your `screens/` directory

### Styling Integration
- Components will follow modern design principles
- Can be customized to match your existing styles in `src/styles/`
- Responsive design for both web and mobile

## Configuration
The Magic UI MCP is configured in:
- **Global**: `~/.cursor/mcp.json` (available in all projects)
- **Project**: `.cursor/mcp.json` (specific to this PTSD project)

## API Key Management
Your API key is securely stored in the MCP configuration and is excluded from git via `.gitignore`.

## Next Steps
1. **Restart Cursor** to ensure the MCP server is loaded
2. Go to Cursor Settings > MCP to verify the Magic UI server is active
3. Start generating components using `/ui` commands in chat
4. Integrate generated components into your PTSD therapy system

## Examples for Your PTSD System

### Dashboard Components
```
/ui create a patient overview dashboard with cards for recent sessions, progress metrics, and upcoming appointments
/ui build a therapist dashboard showing today's schedule, patient alerts, and system notifications
/ui design a research integration panel showing latest PTSD studies and treatment recommendations
```

### Therapy Components
```
/ui create a session progress tracker with SUD score visualization and trend analysis
/ui build a story generation interface with patient context and customizable parameters
/ui design a memory management panel for the MCP knowledge graph system
```

### Mobile Components
```
/ui create a mobile therapy session screen with progress indicators and session notes
/ui build a mobile patient profile with photo, progress charts, and quick actions
/ui design a mobile breathing exercise with guided animations and timer
```

## Support
- Visit [21st.dev/magic](https://21st.dev/magic) for more information
- Join their Discord community for support
- Check the [GitHub repository](https://github.com/21st-dev/magic-mcp) for updates

## Integration with Existing MCP System
This Magic UI MCP works alongside your existing MCP Knowledge Graph integration, providing:
- UI generation capabilities via Magic UI MCP
- Memory and context management via your existing MCP Knowledge Graph
- Enhanced development workflow for both backend logic and frontend components 