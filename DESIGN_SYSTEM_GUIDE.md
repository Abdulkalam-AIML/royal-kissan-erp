# ROYAL KISSAN ERP — DESIGN SYSTEM GUIDE v2

**Version**: 2.0.0 (Enterprise Grade)  
**Reference Quality Bar**: Linear Precision, Stripe Dashboard Density, Notion Clarity, Vercel Cleanliness  

---

## 🎨 1. Core Color Palette Tokens

### Primary Gold Accent Discipline (Max 10% Ratio)
- **Primary Gold**: `#c9a227` (`hsl(46 65% 52%)`) — Active states, key metrics, primary CTAs, hover icons.
- **Gold Hover**: `#dfb638` (`hsl(46 72% 58%)`) — Hover feedback for primary actions.
- **Muted Gold Tint**: `rgba(201, 162, 39, 0.15)` — Secondary borders, subtle badges.

### Surface Neutrals & Depth
- **Base Background**: `#0a0908` (`hsl(40 6% 3%)`) — Deep near-black background.
- **Surface Layer 1 (Cards & Sidebar)**: `rgba(16, 14, 10, 0.75)` — Glassmorphism cards with `blur(20px)`.
- **Surface Layer 2 (Hero Cards)**: `linear-gradient(135deg, rgba(32, 26, 14, 0.85), rgba(14, 12, 8, 0.95))` with top gold accent bar (`2.5px solid #c9a227`).
- **Surface Layer 3 (Modals)**: `rgba(14, 12, 8, 0.95)` with `backdrop-filter: blur(30px)`.

### Semantic Colors
- **Success**: `#34d399` (`hsl(142 71% 45%)`) — Paid invoices, active status, clear dues.
- **Warning**: `#fb923c` (`hsl(38 92% 50%)`) — Low stock, pending verification.
- **Error / Destructive**: `#f87171` (`hsl(0 85% 60%)`) — Outstanding dues, error alerts.
- **Info**: `#60a5fa` (`hsl(217 91% 60%)`) — System badges, informational metrics.

---

## 🔤 2. Typography Scale & Tabular Monospace

```css
/* Typography Scale */
H1 Display: 2.25rem (36px) / Weight 800 / Line-height 1.2 / Tracking -0.03em
H2 Title 1:  1.75rem (28px) / Weight 800 / Line-height 1.25 / Tracking -0.02em
H3 Title 2:  1.25rem (20px) / Weight 700 / Line-height 1.3 / Tracking -0.01em
H4 Subtitle: 1.00rem (16px) / Weight 600 / Line-height 1.4
Body Text:   0.875rem (14px) / Weight 400 / Line-height 1.5 / Color #f3f1ec
Small / Cap: 0.75rem (12px) / Weight 700 / Upper / Tracking 0.06em / Color #a39f93
```

### Tabular Numbers Rule:
All currency (`₹1,250`), transaction counts (`50 items`), and invoice codes use `font-variant-numeric: tabular-nums` with `JetBrains Mono` formatting for precise vertical column alignment.

---

## 📐 3. Strict 8px Spacing Scale

- **`4px`** (`0.25rem`) — Micro spacing (badge padding, icon gaps).
- **`8px`** (`0.5rem`) — Dense element spacing.
- **`16px`** (`1.0rem`) — Standard component padding & gap.
- **`24px`** (`1.5rem`) — Section gutters & grid spacing.
- **`32px`** (`2.0rem`) — Major section padding.
- **`48px`** (`3.0rem`) — Page container spacing.

---

## 🔘 4. Interactive Components & Touch Targets

### Buttons & CTAs
- **Primary Button**: Background `#c9a227` gradient → Hover `#dfb638`, `min-height: 40px`, `padding: 0.5rem 1.25rem`, `border-radius: 0.75rem`.
- **Secondary Button**: Background `rgba(201, 162, 39, 0.1)`, Border `1px solid rgba(201, 162, 39, 0.25)`, Text `#f3f1ec`.
- **Touch Target Requirement**: All buttons on mobile enforce `min-height: 44px` for one-handed field usage.

---

## ⏱️ 5. Motion & Transition System

- **Duration**: System-wide `180ms`.
- **Easing Curve**: `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Hover Feedback**: `transform: translateY(-2px)` with soft gold aura glow (`0 0 15px rgba(201, 162, 39, 0.15)`).
