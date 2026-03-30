# sky-shaders

Drop-in WebGL sky shader components for React. Copies directly into your project so you own the source and can tweak everything.

## Install

```bash
npx sky-shaders add SkyShader
```

This copies `SkyShader.tsx` into your components directory (auto-detects `src/components/ui`, `src/components`, etc.). You can also specify a custom path when prompted.

### Requirements

- React 18+
- A project that supports `.tsx` files (e.g. Next.js, Vite + React, Create React App with TypeScript)

## Usage

```tsx
import { SkyShader } from "./components/ui/SkyShader";

function App() {
  return (
    <div style={{ background: "#07080a", height: "100vh" }}>
      <SkyShader />
    </div>
  );
}
```

### Without controls

```tsx
<SkyShader showControls={false} defaultTime={720} />
```

### Custom size

```tsx
<SkyShader width={800} height={450} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number` | `1200` | Canvas width in pixels |
| `height` | `number` | `675` | Canvas height in pixels |
| `defaultTime` | `number` | `420` | Initial time of day in minutes (0-1440). 420 = 7:00 AM |
| `defaultDensity` | `number` | `50` | Cloud density (0-100) |
| `defaultTurbulence` | `number` | `40` | Cloud turbulence (0-100) |
| `defaultWind` | `number` | `30` | Wind speed (0-100) |
| `showControls` | `boolean` | `true` | Show/hide the slider control panel |
| `className` | `string` | — | Additional class on the wrapper div |
| `style` | `CSSProperties` | — | Additional inline styles on the wrapper div |

## Time of day reference

| Minutes | Time | Phase |
|---------|------|-------|
| 0 | 12:00 AM | Night |
| 300 | 5:00 AM | Night |
| 390 | 6:30 AM | Dawn |
| 480 | 8:00 AM | Sunrise |
| 660 | 11:00 AM | Morning |
| 720 | 12:00 PM | Noon |
| 960 | 4:00 PM | Afternoon |
| 1080 | 6:00 PM | Golden Hour |
| 1170 | 7:30 PM | Sunset |
| 1260 | 9:00 PM | Dusk |

## How it works

The component renders a full-screen WebGL fragment shader that simulates:

- Sky gradient with piecewise time-of-day color interpolation
- Three cloud layers (cirrus, cumulus, stratus) using FBM noise with domain warping
- Beer-Lambert light absorption and subsurface scattering on clouds
- Sun with atmospheric glow and scatter
- Moon with crescent phase
- Twinkling star field
- Atmospheric haze near the horizon
- Film grain

All rendering happens on the GPU via a single fragment shader. The component is self-contained with no dependencies beyond React.

## CLI commands

```bash
npx sky-shaders add <ComponentName>   # Copy a component into your project
npx sky-shaders list                  # List available components
npx sky-shaders help                  # Show help
```

## License

MIT
