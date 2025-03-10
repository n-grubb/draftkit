# DRAFTKIT CLAUDE GUIDELINES

## Commands
- Build: `npm run build` 
- Dev server: `npm run dev` 
- Lint: `npm run lint` 
- Preview: `npm run preview` 
- Server: `deno run --allow-net main.ts` (server directory)

## Code Style
- **Components:** Functional React components with hooks (no classes)
- **Naming:** PascalCase for components/files, camelCase for functions/variables
- **Imports:** Group by source type, use `~` alias for src directory paths
- **State:** Context API for global state (StoreContext, DraftContext, StatsPrefsContext)
- **Data Fetching:** SWR pattern with custom hooks and localStorage caching
- **CSS:** kebab-case for class names, mode-based styling with classes
- **Error Handling:** UI error states with feedback, console.error for logging
- **File Structure:** Components organized by feature in directories
- **Frontend:** JavaScript/JSX with React 19, Vite bundler
- **Backend:** TypeScript with Deno, Hono framework, KV storage

When adding code, follow existing patterns in similar files, maintain consistent formatting, and use the established naming conventions.