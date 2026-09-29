# Assets

## Photography

All photos are from Unsplash under the free [Unsplash License](https://unsplash.com/license) (none are Unsplash+; each was checked on its photo page, "Free to use under the Unsplash License"). They were downloaded from `images.unsplash.com`, resized to 2,000 px on the long edge, recompressed, and are served from `public/images/` with `next/image`. Photographers are credited on `/credits`, linked from the footer.

| File | Unsplash page | Photographer | Profile | Used on |
|-|-|-|-|-|
| `public/images/contributor.jpg` | https://unsplash.com/photos/man-in-black-t-shirt-using-laptop-computer--ZZ7I31c0B8 | Anthony Riera | https://unsplash.com/@frenchriera | Home, "Who locks with TimeVault": contributors; `/credits` |
| `public/images/club.jpg` | https://unsplash.com/photos/three-men-laughing-while-looking-in-the-laptop-inside-room-XkKCui44iM0 | Priscilla Du Preez | https://unsplash.com/@priscilladupreez | Home, "Who locks with TimeVault": student clubs; `/credits` |
| `public/images/meetup.jpg` | https://unsplash.com/photos/woman-speaking-at-brick-walled-conference-wn7dOzUh3Rs | charlesdeluvio | https://unsplash.com/@charlesdeluvio | Home, "Who locks with TimeVault": grants and sponsors; `/credits` |

## Monark brand assets

From `lovable-migration/brand-refs/` and the [monark-community/website](https://github.com/monark-community/website) repo, used per `monark-brand-guidelines.md`:

| File | Source | Used for |
|-|-|-|
| `public/brand/monark-mark.svg`, `src/app/icon.svg` | brand-refs `logos/svg/standalone/logo-branded-standalone.svg` | Header brand, favicon, wallet prompt, Open Graph image |
| `public/brand/monark-horizontal-{light,dark}.svg` | website `public/vectors/brand/horizontal/` (named by theme: `-light` has dark lettering) | Footer Monark band |
| `public/brand/monark-vertical-{light,dark}.svg` | brand-refs `logos/svg/vertical/` (named by lettering: `-dark` has dark lettering, used on cream) | 404 page |
| `public/brand/monark-mesh.svg` | website `public/vectors/decorative/monark-mesh.svg` | Home hero only (once per site) |
| `public/brand/socials/*.svg` | website `public/vectors/socials/` | Footer social links (recoloured to `foreground` through a CSS mask for contrast) |

## Built in code

- Schedule chart (`src/components/charts/schedule-chart.tsx`): the hero's live vault, the three home cards, the composer preview, the vault page with its time scrubber, and the `/how-it-works` examples and revocation diagram. Flat orange line art, SVG lines plus HTML labels and Lucide padlocks; the "still locked" hatching is an SVG mask, not a gradient.
- Life-of-a-vault diagram on `/how-it-works`: HTML/CSS with Lucide icons.
- Open Graph image: generated per locale with `next/og` (`src/app/[locale]/opengraph-image.tsx`), a six-step staircase with three padlocks open.
- Icons: [Lucide](https://lucide.dev).
- Type: Nunito Sans via `next/font/google`.
