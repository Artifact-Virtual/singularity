# Principle Design Guidelines
> ARTIFACT VIRTUAL ENTERPRISE

**Version:** 1.0.0  
**Date:** 2026-02-02

---

## 1. Design Principles

### 1.1 Core Principles

1. **Clarity** - Every element serves a purpose. Remove visual noise.
2. **Consistency** - Uniform patterns across all modules and interactions.
3. **Efficiency** - Optimize for frequent tasks. Minimize clicks.
4. **Accessibility** - WCAG 2.1 AA compliance. Works for everyone.
5. **Responsiveness** - Adapts seamlessly from mobile to desktop.

### 1.2 Visual Hierarchy

- Use typography scale consistently
- Primary actions are visually prominent
- Secondary information is subdued
- Group related elements with spacing

---

## 2. Color System

### 2.1 Brand Colors

| Color | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| Primary | `#2563eb` | `#3b82f6` | Actions, links, focus |
| Secondary | `#f1f5f9` | `#1e293b` | Backgrounds, cards |
| Accent | `#f1f5f9` | `#1e293b` | Highlights |

### 2.2 Semantic Colors

| Color | Value | Usage |
|-------|-------|-------|
| Success | `#16a34a` | Positive feedback |
| Warning | `#ea580c` | Caution alerts |
| Destructive | `#dc2626` | Errors, destructive actions |
| Info | `#0ea5e9` | Informational alerts |

### 2.3 Neutral Scale

```
--gray-50:  #f8fafc
--gray-100: #f1f5f9
--gray-200: #e2e8f0
--gray-300: #cbd5e1
--gray-400: #94a3b8
--gray-500: #64748b
--gray-600: #475569
--gray-700: #334155
--gray-800: #1e293b
--gray-900: #0f172a
--gray-950: #020617
```

---

## 3. Typography

### 3.1 Font Families

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 3.2 Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display | 36px | 700 | 1.2 | Page titles |
| H1 | 30px | 700 | 1.25 | Section titles |
| H2 | 24px | 600 | 1.3 | Subsections |
| H3 | 20px | 600 | 1.35 | Card titles |
| H4 | 16px | 600 | 1.4 | Labels |
| Body | 14px | 400 | 1.5 | Paragraphs |
| Small | 12px | 400 | 1.5 | Captions |
| Tiny | 11px | 500 | 1.4 | Badges |

---

## 4. Spacing System

### 4.1 Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight spacing |
| `sm` | 8px | Compact elements |
| `md` | 16px | Standard spacing |
| `lg` | 24px | Generous spacing |
| `xl` | 32px | Section separation |
| `2xl` | 48px | Page sections |
| `3xl` | 64px | Major divisions |

### 4.2 Layout Grid

- **Container max-width:** 1400px
- **Gutter:** 24px (desktop), 16px (mobile)
- **Columns:** 12-column grid

---

## 5. Component Specifications

### 5.1 Buttons

**Sizes:**
- Small: 32px height, 12px padding-x
- Default: 40px height, 16px padding-x
- Large: 48px height, 24px padding-x

**Variants:**
- Primary: Filled background, high contrast
- Secondary: Border only, subtle
- Ghost: No border, text only
- Destructive: Red background

**States:**
- Default, Hover, Active, Focus, Disabled, Loading

### 5.2 Inputs

**Heights:**
- Small: 32px
- Default: 40px
- Large: 48px

**States:**
- Default, Focus, Error, Disabled, Read-only

### 5.3 Cards

- Border radius: 8px
- Border: 1px solid `--color-border`
- Background: `--color-card`
- Padding: 24px (desktop), 16px (mobile)
- Shadow: None by default, optional elevation

### 5.4 Modals

- Max width: 500px (small), 700px (default), 900px (large)
- Border radius: 12px
- Overlay: Black at 50% opacity
- Animation: Fade + scale in

### 5.5 Tables

- Header: Bold, uppercase, smaller font
- Row height: 52px minimum
- Hover: Subtle background change
- Borders: Horizontal only (minimal style)

---

## 6. Icons

### 6.1 Library: Lucide Icons

- **Size scale:** 16px, 20px, 24px, 32px
- **Stroke width:** 1.5 (default), 2 (emphasized)
- **Color:** Inherit from parent text color

### 6.2 Usage Guidelines

- Use consistent size within context
- Pair icons with labels for accessibility
- Avoid icon overload - prioritize meaning

---

## 7. Motion & Animation

### 7.1 Timing Functions

```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### 7.2 Durations

| Token | Value | Usage |
|-------|-------|-------|
| `fast` | 100ms | Hover states |
| `normal` | 200ms | Standard transitions |
| `slow` | 300ms | Complex animations |
| `slower` | 400ms | Page transitions |

### 7.3 Guidelines

- Transitions should be subtle and purposeful
- Avoid animations that delay user interaction
- Respect `prefers-reduced-motion`

---

## 8. Responsive Breakpoints

| Name | Min Width | Target |
|------|-----------|--------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

---

## 9. Accessibility

### 9.1 Requirements

- Color contrast: 4.5:1 (normal text), 3:1 (large text)
- Focus indicators: Always visible
- Keyboard navigation: Complete support
- Screen reader: ARIA labels where needed

### 9.2 Focus Styles

```css
:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

---

## 10. Dark Mode

### 10.1 Implementation

- Uses CSS custom properties
- System preference detection
- Manual toggle with persistence
- Smooth transition between modes

### 10.2 Guidelines

- Reduce contrast slightly in dark mode
- Use muted colors, not pure black
- Maintain hierarchy through brightness
- Test all components in both modes

---

**Document Owner:** Design Team  
**Review Cycle:** Quarterly
