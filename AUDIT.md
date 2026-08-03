# Frontend Audit Report

**Date:** 2026-08-02  
**Scope:** All reusable components in `src/components/`  
**Total components:** 14 (1,399 LOC)

---

## Executive Summary

**Overall health: Good ✅**

- ✅ All icon buttons have `aria-label`
- ✅ Consistent border-radius system (all use rem-based semantic values)
- ✅ Responsive design patterns present
- ✅ Semantic HTML structure
- ⚠️ 2 hardcoded hex colors remain (non-token contexts)
- ⚠️ 21 opacity modifiers need semantic token migration
- ⚠️ Minor duplication in card/button styles

---

## 1. Accessibility (A11Y)

### ✅ Passing

- **All interactive elements** have accessible labels
  - Icon-only buttons: `aria-label` present (Search, Menu, Bell, Theme toggle, etc.)
  - Dropdown menus: `aria-expanded` state
  - Current page: `aria-current="page"` on active nav links
  - Decorative icons: `aria-hidden="true"`

- **Semantic HTML**
  - `<nav>` for navigation
  - `<main>` for primary content
  - `<header>`, `<footer>` landmarks
  - `<figure>` + `<figcaption>` for images
  - Heading hierarchy: h2 → h3

- **Keyboard navigation**
  - All interactive elements are native buttons/links (focusable)
  - Search palette: focus trap via `useEffect(() => inputRef.current?.focus())`
  - Dropdowns close on outside click

### 🔧 Recommendations

1. **Missing `role="dialog"` semantics** in search palette  
   Current: `<motion.div role="dialog" aria-modal="true">`  
   ✅ Already correct

2. **Image alt text**  
   - Album covers: empty `alt=""` (decorative, OK)
   - User avatars: empty `alt=""` (should use user name)
   - **Fix:** `<img src={CURRENT_USER.avatar} alt={CURRENT_USER.name} />`

3. **Form labels** (search input)  
   - Placeholder exists but no visible `<label>`
   - Wrapped in dialog with `aria-label`, acceptable for search

---

## 2. Color Tokens

### ✅ Migrated to semantic tokens

- All component text uses `text-foreground`, `text-muted-foreground`, `text-primary`, etc.
- All backgrounds use `bg-card`, `bg-hover`, `bg-primary-subtle`
- All borders use `border-border`, `border-primary`

### ⚠️ Remaining hardcoded colors (2)

**hero.tsx:73** — Dark mode heading override  
```tsx
className="... dark:text-[#f7f3ef]"
```
**Reason:** Specific override for high contrast on photo background  
**Fix:** Create `--color-hero-heading-dark: #f7f3ef` token

**header.tsx:174** — Notification badge  
```tsx
className="... bg-[#d1495b]"
```
**Reason:** Alert red, semantic equivalent exists  
**Fix:** Use `bg-destructive` or create `--color-notification: #d1495b`

### ⚠️ Opacity modifiers (21 uses)

Components still using raw opacity on semantic colors:
- `bg-card/90`, `bg-primary/20`, `text-primary/[.11]`, `opacity-80`

**Pattern:**
```tsx
// Current
bg-card/90

// Should be
bg-card-translucent  // or keep if truly dynamic
```

**Decision:** Keep opacity modifiers for **dynamic/animation contexts** (hero petals animating 0.3→0.6, glass surfaces). Remove for **static contexts** where a semantic token should exist.

**Static contexts to fix:**
- Tag hover: `hover:bg-[#8f4356]` → semantic `hover:bg-primary-strong`
- Album card overlay: `bg-card/90` → `bg-card-overlay` token
- Featured albums stat badge: consistent across all cards

---

## 3. Typography

### ✅ Consistent system

- **Font stack:** Geist Sans (body), Geist Mono (code), Noto Serif JP, Noto Sans JP
- **Size scale:** `text-[9px]` to `text-[42px]`, incremental
- **Weight:** `font-medium` (500), `font-semibold` (600), `font-bold` (700)
- **Line height:** `leading-snug` (1.375), `leading-normal` (1.5), `leading-relaxed` (1.625)
- **Tracking:** `tracking-tight` (-0.025em), `tracking-wide` (0.025em)

### 🔧 Minor inconsistencies

1. **Mixed size units**  
   - Most: `text-[11px]`, `text-[12px]` (exact px)
   - Some: `text-xs`, `text-sm` (Tailwind preset)
   - **Recommendation:** Stick to px for precision, or adopt Tailwind scale fully

2. **Duplicate size declarations**  
   Sidebar heading: `text-[16px]` appears 3x across components  
   Section label: `text-[10px]` uppercase pattern repeats  
   **Fix:** Extract to utility classes or design tokens

---

## 4. Spacing

### ✅ Consistent scale

- Gap: `gap-1` (0.25rem) → `gap-10` (2.5rem)
- Padding: `p-2` → `p-5`, `px-3`, `py-2.5`
- Margin: `mt-1.5`, `mb-3.5` (using 0.5 increments)

### ⚠️ Large hardcoded values (2)

**hero.tsx:64** — `py-24` (6rem = 96px)  
**search-palette.tsx:23** — `pt-28` (7rem = 112px)

**Context:** Both are intentional — hero vertical spacing, search modal offset.  
**Recommendation:** Keep, but document in design system.

---

## 5. Border Radius

### ✅ Fully consistent

All components use rem-based semantic radii:
- Cards: `rounded-[1.25rem]` (20px)
- Buttons: `rounded-full`
- Images: `rounded-xl` (12px), `rounded-[0.9rem]` (14.4px)
- Inputs: `rounded-full`
- Dropdowns: `rounded-[1.15rem]` (18.4px)
- Hero section: `rounded-[2rem]` (32px)

No raw pixel values. No inconsistency. ✅

---

## 6. Animations

### ✅ Framer Motion usage

**Pattern:** Consistent `initial`/`animate`/`transition` structure

```tsx
<motion.div
  initial={{ opacity: 0, y: -12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8 }}
>
```

**Used in:**
- Hero greeting (staggered fade, 0.8s + 0.3s delay)
- Search palette (fade + scale)
- Dropdown menus (fade + y-offset)
- Header mobile nav (fade + y-offset)
- Sidebar today-memory shuffle (opacity + scale)
- Floating petals (infinite loop, easeInOut)

### 🔧 Recommendations

1. **Extract animation variants**  
   Dropdown pattern repeats 3x (Header, lang/bell/user dropdowns)
   ```tsx
   const dropdownVariants = {
     initial: { opacity: 0, y: -4 },
     animate: { opacity: 1, y: 0 }
   }
   ```

2. **Reduce motion preference**  
   Missing `prefers-reduced-motion` respect  
   **Fix:** Add to globals.css
   ```css
   @media (prefers-reduced-motion: reduce) {
     * { animation-duration: 0.01ms !important; }
   }
   ```

---

## 7. Responsive Design

### ✅ Mobile-first patterns

**Breakpoints:** `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)

**Responsive behaviors:**
- Header: Logo + icons always visible, nav hidden on `<xl`, hamburger menu
- Search: Desktop shows inline, mobile shows icon → modal
- Hero: Font sizes scale `text-[28px] sm:text-[36px] lg:text-[42px]`
- Layout: Sidebar hidden on mobile, main content full-width
- Tab bar: Fixed bottom on mobile (`md:hidden`), replaces header nav

### ⚠️ Gaps

1. **Sidebar missing mobile behavior**  
   Current: Sidebar components (UpcomingCard, TagsCard, TodayMemoryCard) always render  
   Layout doesn't conditionally hide them on mobile  
   **Check:** Is sidebar actually shown on mobile? If not, OK. If yes, needs `hidden lg:block`.

2. **Touch targets**  
   Some buttons are `size-8` (32px) — below recommended 44px for touch  
   **Acceptable for desktop-first, but flag for mobile UX review**

---

## 8. Component Reusability

### ✅ Extracted primitives

**Button component** (`ui/button.tsx`)  
- Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- Sizes: `default`, `sm`, `lg`, `icon`
- Composable via `cn()` utility

**Decor components** (`ui/decor.tsx`)  
- `<Fuurin />`, `<Petal />`, `<Blossom />`, `<FujiScene />`, `<Torii />`
- Size prop, color via `className`

**SectionHead** (`ui/section-head.tsx`)  
- Reused 5x across home sections
- Props: `title`, `href`, `linkLabel`, `as` (h2/h3)

### 🔧 Duplication to refactor

#### 1. **Card wrapper** (sidebar.tsx:11)

```tsx
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-paper shadow-paper rounded-[1.25rem] border border-border/60 p-5">
      {children}
    </div>
  )
}
```

**Used:** sidebar.tsx (UpcomingCard, TagsCard)  
**Also appears:** TodayMemoryCard has same structure but adds `overflow-hidden`  
**Fix:** Move to `ui/card.tsx`, add `className` passthrough

#### 2. **Dropdown** (header.tsx:271)

```tsx
function Dropdown({ children, className, onClick }: ...) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-paper ... ${className}`}
    >
      {children}
    </motion.div>
  )
}
```

**Used:** Header lang/bell/user dropdowns (3x)  
**Fix:** Extract to `ui/dropdown.tsx`

#### 3. **Tag pill styles**

**sidebar.tsx:67** (Popular tags)
```tsx
className="inline-flex items-center gap-0.5 rounded-full border border-primary/20 bg-primary-subtle px-3 py-1.5 text-[10.5px] font-semibold ..."
```

**search-palette.tsx:119** (Search results tags)
```tsx
className="flex items-center gap-1 rounded-full bg-primary-subtle px-2.5 py-1 text-[11px] font-medium ..."
```

**Difference:** Size, icon placement — but semantic intent identical  
**Fix:** Create `<Tag />` component with size variants

---

## 9. Semantic HTML

### ✅ Correct usage

- `<nav>` for all navigation blocks
- `<main>` wrapper for page content
- `<section>` for hero, featured albums, recent memories
- `<article>` — **not used** (acceptable, sections suffice for this app)
- `<figure>` + `<figcaption>` for photo cards
- `<dl>`, `<dt>`, `<dd>` for hero stats (32 members, 68 albums, etc.)

### ⚠️ Minor issues

1. **Heading hierarchy jump**  
   Home page: `<h2>` (Featured Albums) → user dropdown uses no heading  
   Sidebar: `<h3>` for "Upcoming", "Tags", "Today's Memory"  
   **OK if visually consistent**

2. **List semantics**  
   Album grid, photo grid: `<ul>` + `<li>` ✅  
   Nav links: Rendered as siblings, should wrap in `<ul>` for a11y tree  
   **Fix:**
   ```tsx
   <nav>
     <ul className="flex">
       {NAV.map(...)}
     </ul>
   </nav>
   ```

---

## 10. Performance

### ✅ Optimizations present

- Images: `loading="lazy"` on all non-hero images
- Motion: Staggered animations reduce layout thrash
- Event listeners: Cleanup in `useEffect` return

### 🔧 Recommendations

1. **Image optimization**  
   All images served from Unsplash CDN — no local optimization  
   **Consideration:** Next.js `<Image>` component for auto-optimization (already using Next 16)

2. **Memo candidates**  
   - `<Dropdown>` re-renders on every header state change (lang/bell/user open)
   - `<SectionHead>` pure component, wrap in `React.memo`

3. **Bundle size**  
   - Framer Motion: 55KB gzipped (used extensively, justified)
   - Lucide React: Tree-shakeable (only imports used icons, good)

---

## Refactoring Plan

### Priority 1: Token migration

1. **Replace hardcoded hex**
   - [ ] hero.tsx:73 `dark:text-[#f7f3ef]` → `dark:text-hero-heading` (new token)
   - [ ] header.tsx:174 `bg-[#d1495b]` → `bg-destructive`

2. **Audit opacity modifiers**
   - [ ] Keep: hero petals (animated), glass surfaces (intentional translucency)
   - [ ] Fix: tag hover `bg-[#8f4356]` → `bg-primary-strong`
   - [ ] Fix: album overlay `bg-card/90` → `bg-card-overlay` (new token)

### Priority 2: Extract reusable components

1. **Create `ui/card.tsx`**
   ```tsx
   export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
     return (
       <div className={cn("card-paper shadow-paper rounded-[1.25rem] border border-border/60 p-5", className)}>
         {children}
       </div>
     )
   }
   ```

2. **Create `ui/dropdown.tsx`**
   ```tsx
   export function Dropdown({ children, className, onClick }: DropdownProps) {
     return (
       <motion.div
         initial={{ opacity: 0, y: -4 }}
         animate={{ opacity: 1, y: 0 }}
         onClick={onClick}
         className={cn("card-paper absolute right-0 top-11 rounded-[1.15rem] border border-border p-2 shadow-[0_14px_38px_rgba(160,104,96,0.16)]", className)}
       >
         {children}
       </motion.div>
     )
   }
   ```

3. **Create `ui/tag.tsx`**
   ```tsx
   export function Tag({ children, href, onClick, size = 'default' }: TagProps) {
     const sizeClasses = {
       sm: 'px-2.5 py-1 text-[11px]',
       default: 'px-3 py-1.5 text-[10.5px]',
     }
     // ... implementation
   }
   ```

### Priority 3: Accessibility improvements

1. **Add image alt text**
   - [ ] header.tsx: user avatar
   - [ ] sidebar.tsx: event thumbnails (use event title)

2. **Wrap nav in `<ul>`**
   - [ ] header.tsx desktop nav
   - [ ] header.tsx mobile menu
   - [ ] tab-bar.tsx bottom nav

3. **Add `prefers-reduced-motion`**
   - [ ] globals.css: disable animations for users who prefer reduced motion

### Priority 4: Performance

1. **Memoize pure components**
   - [ ] `SectionHead`: `export default React.memo(SectionHead)`
   - [ ] `PhotoCard`, `AlbumCard` if they become list items

2. **Consider Next.js Image**
   - [ ] Evaluate migration from `<img>` to `<Image>` for auto-optimization

---

## Design System Extract

### Spacing scale (in use)
```
0.5  → 2px   (gap-0.5)
1    → 4px   (gap-1, p-1)
1.5  → 6px   (gap-1.5, mt-1.5)
2    → 8px   (gap-2, p-2)
2.5  → 10px  (gap-2.5)
3    → 12px  (gap-3, px-3, py-3)
3.5  → 14px  (gap-3.5, py-3.5)
4    → 16px  (gap-4, px-4)
5    → 20px  (p-5, px-5)
8    → 32px  (gap-8, size-8)
10   → 40px  (gap-10, size-10)
```

### Border radius scale
```
rounded-full       → 9999px (buttons, avatars, inputs)
rounded-xl         → 12px   (small images, badges)
rounded-[0.9rem]   → 14.4px (event date boxes)
rounded-[1rem]     → 16px   (photo frames)
rounded-[1.15rem]  → 18.4px (dropdowns)
rounded-[1.25rem]  → 20px   (cards)
rounded-[1.75rem]  → 28px   (search modal)
rounded-[2rem]     → 32px   (hero section)
```

### Typography scale
```
9px    → labels, badges, kbd shortcuts
10px   → captions, secondary text
10.5px → tags, metadata
11px   → body small, nav links
11.5px → button text
12px   → body default, photo captions
13px   → headings small, icons
14px   → body emphasis
16px   → section headings (h3)
28px   → page headings (h2, mobile)
36px   → page headings (h2, tablet)
42px   → page headings (h2, desktop)
```

---

## Conclusion

**Overall:** Frontend is well-structured with good a11y baseline, consistent design tokens, and semantic HTML. Main areas for improvement are eliminating remaining hardcoded colors, extracting duplicated component patterns, and adding reduced-motion support.

**Next steps:**
1. Token migration (2 hex, tag hover)
2. Extract Card, Dropdown, Tag components
3. A11y: image alt, nav lists, reduced motion
4. Performance: memoization, consider Next.js Image

**Estimated effort:** ~4 hours for Priority 1-3.
