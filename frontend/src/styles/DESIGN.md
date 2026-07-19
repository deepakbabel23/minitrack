---
name: MiniTrack Precision
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#005522'
  on-tertiary: '#ffffff'
  tertiary-container: '#00702f'
  on-tertiary-container: '#78f591'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
  bg-slate-50: '#f8fafc'
  border-slate-200: '#e2e8f0'
  text-muted: '#475569'
  text-subtle: '#94a3b8'
  danger-red: '#dc2626'
  priority-high-bg: '#fee2e2'
  priority-high-text: '#991b1b'
  priority-medium-bg: '#fef3c7'
  priority-medium-text: '#92400e'
  priority-low-bg: '#dbeafe'
  priority-low-text: '#1e40af'
typography:
  headline-3xl:
    fontFamily: Inter
    fontSize: 1.875rem
    fontWeight: '700'
    lineHeight: '1.25'
  headline-2xl:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.25'
  headline-xl:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: '1.25'
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.5'
  body-base:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: '1.25'
  label-xs:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: 0.025em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '700'
    lineHeight: '1.25'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 0.25rem
  space-1: 0.25rem
  space-2: 0.5rem
  space-3: 0.75rem
  space-4: 1rem
  space-5: 1.5rem
  space-6: 2rem
  space-8: 3rem
  space-10: 4rem
  container-max: 880px
  gutter: 1rem
---

## Brand & Style

The design system is rooted in **Corporate Minimalism**, prioritizing clarity, utility, and a sense of calm productivity. It is designed for a professional audience that values efficiency over embellishment. The aesthetic is "invisible" yet polished—relying on generous whitespace, a strictly governed color palette, and high-quality typography to guide the user's focus toward their tasks.

The emotional response should be one of reliability and control. By utilizing a "clean and modern" approach, the UI avoids cognitive overload. Subtle transitions and purposeful motion are used sparingly to reinforce the state of the application without distracting the user.

## Colors

The palette is anchored by a sophisticated Slate scale, using **Slate-50** for the application background to reduce eye strain and **White** for content surfaces to establish clear containment. 

**Indigo-600** serves as the primary action color, providing a confident "call to work." Functional colors are strictly applied: **Green** denotes completion and success, while **Red** is reserved for destructive actions and errors. 

Priority levels utilize a distinct tri-color system (Red, Amber, Blue) with high-contrast text to ensure information hierarchy is immediately scannable. All color applications must maintain WCAG AA contrast ratios against their respective backgrounds.

## Typography

The system utilizes a clean, humanist sans-serif stack to ensure maximum legibility across all platforms. The hierarchy is built on a structured scale from 0.75rem to 1.875rem.

Headings use a tighter line-height (1.25) and heavier weights (600-700) to create a strong visual anchor. Body text is set at a comfortable 1.5 line-height for readability in task descriptions. Small labels and badges use a medium weight (500-600) to remain legible even at smaller scales. On mobile devices, the largest headings scale down to `headline-lg-mobile` to prevent excessive wrapping.

## Layout & Spacing

This design system uses a **Fixed Grid** approach for the main content area, centered on the screen with a maximum width of 880px to ensure optimal line lengths for task management.

The spacing rhythm is based on a **4px (0.25rem) increment**. 
- **Margins:** 1.5rem (space-5) for mobile, increasing to 2rem (space-6) for tablet/desktop.
- **Gutters:** Standardized at 1rem (space-4) between task cards and form elements.
- **Mobile Reflow:** Components like the TaskCard transition from a side-by-side row layout (Desktop) to a vertically stacked layout (Mobile) to maintain touch-friendly targets.

## Elevation & Depth

Visual hierarchy is established using **Tonal Layers** combined with **Ambient Shadows**. Surfaces are kept flat (White) to contrast against the Slate-50 background, but are lifted using soft, Slate-900 based shadows to indicate interactivity and importance.

- **Level 1 (Cards/Inputs):** A subtle shadow (`0 1px 2px rgba(15,23,42,.06)`) and a hairline border of Slate-200.
- **Level 2 (Dropdowns/Hover States):** A medium shadow (`0 4px 12px rgba(15,23,42,.08)`) to provide separation from the base surface.
- **Level 3 (Modals/Dialogs):** A deep, diffused shadow (`0 12px 32px rgba(15,23,42,.12)`) to focus user attention on the task at hand.

## Shapes

The shape language is "Soft," utilizing a 4px (0.25rem) base radius to maintain a professional, slightly geometric feel while avoiding the harshness of sharp corners. 

- **Small (4px):** Used for checkboxes and small UI controls.
- **Medium (8px):** The standard for TaskCards, Inputs, and Buttons.
- **Large (12px):** Reserved for Modals and larger container elements.
- **Full (Pill):** Exclusively used for Badges (Priority/Status) to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid Indigo-600 background with white text. High contrast, used for the main action (e.g., "Create Task").
- **Secondary:** White surface with Slate-200 border and Slate-900 text.
- **Danger:** Solid Red-600 background, used for delete actions.
- **Ghost:** No background or border, used for secondary navigation or "Cancel" actions.

### FormField
Comprises a Label (label-md), a text input or textarea with an 8px radius, and optional error text in Red-600. Inputs use a 2px Indigo-500 ring on focus.

### Badges
- **PriorityBadge:** Pill-shaped, using the light background and dark text defined in the priority palette. Includes a geometric icon (▲, ●, ▼).
- **StatusBadge:** Uses "Active" (Neutral) or "Completed" (Green-100 bg with Green-800 text and a checkmark icon).

### TaskCard
The primary unit of the UI. Features an 8px radius, Level 1 shadow, and a white surface. It organizes the title, description, and action row. On desktop, actions appear on the right; on mobile, they stack below the content.

### ConfirmDialog
A modal component that uses a Level 3 shadow, centered on the screen, with a backdrop blur or dimming effect to trap focus. Requires a clear "Confirm" (Primary/Danger) and "Cancel" (Ghost) action.
