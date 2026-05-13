/**
 * Public API for the `ui` primitives module.
 *
 * Per Requirement 22.5, each component directory exposes its public surface
 * via a single `index.ts` barrel so consumers can import every Design System
 * v2 primitive from `@/components/ui` without reaching into specific files.
 *
 * Scope covered here (task 7.7):
 *   - Controls:  `Button`, `IconButton`, `Input`, `Textarea`.
 *   - Surfaces:  `GlassCard` (from `Card.tsx`), `GlassPanel` (from `Panel.tsx`).
 *   - Feedback:  `Skeleton`, `EmptyState`, `ErrorState`, `ProgressBar`, `Badge`,
 *                `Toast` + `ToastProvider` + `useToast`.
 *   - Overlays:  `Dialog`, `Drawer`, `Tooltip`.
 *   - Navigation/typography/a11y: `Tabs`, `KineticHeading`, `SkipLink`.
 *
 * Component-level prop and variant types are re-exported alongside each
 * component (type-only re-exports) so consumers can type their own wrappers
 * without importing from module internals.
 */

// --- Controls ---------------------------------------------------------------
export { Button } from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button'

export { IconButton } from './IconButton'
export type {
  IconButtonProps,
  IconButtonVariant,
  IconButtonSize,
} from './IconButton'

export { Input } from './Input'
export type { InputProps } from './Input'

export { Textarea } from './Textarea'
export type { TextareaProps } from './Textarea'

// --- Surfaces ---------------------------------------------------------------
export { GlassCard } from './Card'
export type { GlassCardProps } from './Card'

export { GlassPanel } from './Panel'
export type { GlassPanelProps } from './Panel'

// --- Feedback ---------------------------------------------------------------
export { Skeleton } from './Skeleton'
export type { SkeletonProps, SkeletonVariant } from './Skeleton'

export { EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'

export { ErrorState } from './ErrorState'
export type { ErrorStateProps } from './ErrorState'

export { ProgressBar } from './ProgressBar'
export type { ProgressBarProps } from './ProgressBar'

export { Badge } from './Badge'
export type { BadgeProps, BadgeVariant } from './Badge'

export { Toast } from './Toast'
export type { ToastProps, ToastVariant } from './Toast'

export { ToastProvider, useToast } from './ToastProvider'
export type {
  ToastProviderProps,
  ToastOptions,
  ToastHandle,
} from './ToastProvider'

// --- Overlays ---------------------------------------------------------------
export { Dialog } from './Dialog'
export type { DialogProps } from './Dialog'

export { Drawer } from './Drawer'
export type { DrawerProps, DrawerPosition } from './Drawer'

export { Tooltip } from './Tooltip'
export type { TooltipProps, TooltipPlacement } from './Tooltip'

// --- Navigation / typography / a11y -----------------------------------------
export { Tabs } from './Tabs'
export type { TabsProps, TabItem } from './Tabs'

export { KineticHeading } from './KineticHeading'
export type { KineticHeadingProps, KineticHeadingLevel } from './KineticHeading'

export { SkipLink } from './SkipLink'
export type { SkipLinkProps } from './SkipLink'
