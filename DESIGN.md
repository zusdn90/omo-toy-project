---
name: Omo Restaurant Explorer
description: A calm product UI for map-first local restaurant scouting.
colors:
  ink-slate: "#0f172a"
  body-slate: "#475569"
  muted-slate: "#64748b"
  cloud-surface: "#f8fafc"
  card-surface: "#ffffff"
  hairline-slate: "#e2e8f0"
  accent-sky: "#0284c7"
  success-green: "#16a34a"
  naver-rose: "#e11d48"
typography:
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.18em"
rounded:
  sm: "0.375rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.ink-slate}"
    textColor: "{colors.card-surface}"
    rounded: "{rounded.full}"
    padding: "0.625rem 1rem"
  chip-selected:
    backgroundColor: "{colors.ink-slate}"
    textColor: "{colors.card-surface}"
    rounded: "{rounded.full}"
  card-default:
    backgroundColor: "{colors.card-surface}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
---

# Design System: Omo Restaurant Explorer

## 1. Overview

**Creative North Star: "The Field Notebook Map"**

Omo should feel like a precise restaurant scouting notebook laid over a live map. It is product UI, so the design serves decisions: compare candidates, see where they are, open details, and save personal notes. Ornament should never compete with place names, addresses, or source context.

The system rejects generic AI gloss: no purple gradients, no glassmorphism, no gradient text, no nested card stacks. Use restrained color, confident type, and clear selection states.

**Key Characteristics:**
- Map-first hierarchy with shortlist and detail as supporting instruments.
- Cool tinted neutrals with one restrained sky accent, plus semantic source colors.
- Rounded, touch-friendly controls with visible focus and hover states.
- Korean-first copy that is concise and task-oriented.

## 2. Colors

The palette is restrained: tinted slate neutrals carry the product, source colors appear only where they clarify data provenance.

### Primary
- **Ink Slate** (#0f172a): primary actions, selected chips, high-emphasis text.
- **Accent Sky** (#0284c7): active map/search context and current selection emphasis.

### Secondary
- **Success Green** (#16a34a): VisitKorea/source success and positive status only.
- **Naver Rose** (#e11d48): Naver saved-list markers and source identity.

### Neutral
- **Cloud Surface** (#f8fafc): app background and quiet panels.
- **Card Surface** (#ffffff): primary readable surfaces.
- **Hairline Slate** (#e2e8f0): borders and separators.
- **Body Slate** (#475569): body copy.
- **Muted Slate** (#64748b): labels and secondary metadata.

### Named Rules
**The Source Color Rule.** Source colors identify provenance, not decoration. If a color does not explain data source or state, it should probably be neutral.

## 3. Typography

**Display Font:** Inter/system sans
**Body Font:** Inter/system sans
**Label/Mono Font:** Inter/system sans

**Character:** Native, precise, and low-friction. Hierarchy comes from weight, scale, and spacing rather than novelty fonts.

### Hierarchy
- **Title** (650, 1.5rem, 1.2): page and panel titles.
- **Headline** (650, 1.125rem, 1.35): restaurant names and section headings.
- **Body** (400, 0.875rem, 1.6): explanatory copy, addresses, review text, max 65-75ch.
- **Label** (650, 0.75rem, 0.18em tracking): sparse uppercase metadata only.

### Named Rules
**The Label Rarity Rule.** Uppercase tracking is for orientation cues, not every piece of metadata.

## 4. Elevation

Depth is a hybrid of hairline borders, tonal surfaces, and one soft ambient shadow. Surfaces should feel placed, not floating. Shadows are subtle and reserved for primary containers, overlays, and hovered actionable cards.

### Shadow Vocabulary
- **Soft Surface** (`0 18px 50px -28px rgba(15, 23, 42, 0.18)`): main cards and dialogs.
- **Lifted Action** (`0 18px 35px -24px rgba(15, 23, 42, 0.35)`): selected or hovered restaurant cards only.

### Named Rules
**The No Stack Rule.** Do not put card-looking components inside card-looking components unless the inner surface is an input, map, or list item with a distinct job.

## 5. Components

### Buttons
- **Shape:** rounded-full for navigation/action pills, rounded-xl for compact icon buttons.
- **Primary:** ink slate background, card-surface text, clear hover darkening.
- **Hover / Focus:** color shift plus visible ring; no layout movement.
- **Secondary:** white or cloud surface with hairline border.

### Chips
- **Style:** pill shape, concise labels, selected chip uses ink slate.
- **State:** active chips must be visually distinct beyond color via weight and contrast.

### Cards / Containers
- **Corner Style:** 1.5rem for major panels, 1rem for list items.
- **Background:** card surface on cloud background.
- **Shadow Strategy:** soft surface for major panels, light lift for interactive list items.
- **Border:** hairline slate, never thick side stripes.
- **Internal Padding:** 1rem on dense mobile elements, 1.5-2rem on major panels.

### Inputs / Fields
- **Style:** pill search input, white surface, hairline border.
- **Focus:** sky border/ring, no decorative glow.
- **Error / Disabled:** direct Korean copy, no color-only indication.

### Navigation
- Mobile uses sticky top context plus bottom navigation. Desktop uses a compact header and horizontal neighborhood rail. Both must preserve map-first flow.

## 6. Do's and Don'ts

Do:
- Keep map, shortlist, and details visually synchronized.
- Use source badges and marker colors sparingly but consistently.
- Prefer concise Korean labels over generic dashboard terms.
- Preserve 44px touch targets.

Don't:
- Use purple gradients, gradient text, glassmorphism, or decorative blur.
- Add modals when inline disclosure can work.
- Hide source differences behind color alone.
- Expose implementation details such as SDK names unless they help troubleshoot a real user state.
