# Volume Presets - Design

## Product Identity
A minimalist volume control utility. The design language is **Material Design 3** with a clean, light-first aesthetic. Think of a well-crafted Android settings panel — functional, precise, and calm.

## Color System (MD3 Light)
- **Primary**: `#1A73E8` — Google Blue, the color of action and trust
- **Surface**: `#FFFFFF` — clean white cards on a cool gray canvas
- **Background**: `#F1F3F4` — neutral gray, lets content breathe
- **On-surface**: `#1F1F1F` — near-black for maximum readability
- **Outline**: `#DADCE0` — subtle boundaries, never heavy

## Typography
- Volume percentage: 48px, bold — the hero number, impossible to miss
- Preset names: 16px, medium weight — clear but not shouting
- Labels: 12-13px, regular — quiet supporting information

## Key Design Decisions
- **Cards with 16px radius** — soft but not pillowy
- **Elevation via subtle shadow** — `rgba(0,0,0,0.06)` at 8px blur
- **No gradients, no decorations** — pure MD3 surface + elevation system
- **Slider as the hero interaction** — thumb + track in primary blue
- **Icon containers** — 40x40 circles with 8% opacity primary background

## What This Is NOT
- Not dark mode (light-first for clarity)
- Not colorful — one accent color does all the work
- Not decorative — every pixel serves a function
