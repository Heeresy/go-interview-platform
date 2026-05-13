/**
 * Public API for the `shell` module.
 *
 * Per Requirement 22.2, App_Shell components live in `src/components/shell/`,
 * and per Requirement 22.5 each component directory exposes its public surface
 * via a single `index.ts` barrel so consumers can import the App_Shell API
 * from `@/components/shell` without reaching into specific files.
 *
 * Scope covered here (task 10.7):
 *   - Layout:      `AppShell`, `Sidebar`, `Topbar`, `MobileTabBar`.
 *   - Overlays:    `CommandPalette`.
 *   - Theming:     `ThemeProvider` (+ `useTheme` hook), `ThemeToggle`.
 *   - Auth:        `AuthGate`.
 *   - Hooks:       `useGlobalHotkey` (from `./useGlobalHotkey`).
 *
 * Component-level prop types are re-exported alongside each component
 * (type-only re-exports) so consumers can type their own wrappers without
 * importing from module internals.
 */

// --- Layout -----------------------------------------------------------------
export { AppShell } from './AppShell'
export type { AppShellProps } from './AppShell'

export { Sidebar } from './Sidebar'
export type { SidebarProps } from './Sidebar'

export { Topbar } from './Topbar'
export type { TopbarProps, TopbarNavItem } from './Topbar'

export { MobileTabBar } from './MobileTabBar'
export type { MobileTabBarProps, MobileTabBarItem } from './MobileTabBar'

// --- Overlays ---------------------------------------------------------------
export { CommandPalette } from './CommandPalette'
export type { CommandPaletteProps } from './CommandPalette'

// --- Theming ----------------------------------------------------------------
// `useTheme` is exported alongside `ThemeProvider` to mirror the
// `ToastProvider`/`useToast` pairing from `@/components/ui` — consumers
// should not need to reach into `./ThemeProvider` directly.
export { ThemeProvider, useTheme } from './ThemeProvider'
export type { ThemeProviderProps } from './ThemeProvider'

export { ThemeToggle } from './ThemeToggle'
export type { ThemeToggleProps } from './ThemeToggle'

// --- Auth -------------------------------------------------------------------
export { AuthGate } from './AuthGate'
export type { AuthGateProps } from './AuthGate'

// --- Hooks ------------------------------------------------------------------
// `useGlobalHotkey` is the window-scoped keyboard-shortcut primitive
// that powers `CommandPalette` (Cmd/Ctrl+K, Req 7.1). Re-exported here
// so consumers of the `shell` public API (e.g. page-level hotkey wiring)
// don't have to import from a deep file path.
export { useGlobalHotkey } from './useGlobalHotkey'
