# BB-RANK CLAUDE GUIDELINES

## Commands
- Build: `npm run build`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Preview: `npm run preview`

## Code Style
- **Components:** Functional React components with hooks
- **Naming:** PascalCase for components/files, camelCase for functions/variables
- **Imports:** Group by source type, use `~` alias for src directory
- **State:** Context API for global state, useState for local state
- **CSS:** kebab-case for class names, mode-based styling with classes
- **Error Handling:** UI error states with feedback, console.error for logging
- **File Structure:** Components organized by feature in directories
- **Vite:** Used for build system and development server
- **ESLint:** Modern flat config format with React plugin and Hooks linting

When adding code, follow existing patterns in similar files, maintain consistent formatting, and use the established naming conventions.