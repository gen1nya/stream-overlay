# Audio Visualizers — URL Parameters

All three audio visualizer overlays support customization via URL query parameters.
When a parameter is omitted, the default value is used.

Base URL: `http://localhost:5173` (dev).

---

## Linear FFT (`/audio-fft-linear-demo`)

Horizontal bar spectrum visualizer.

| Parameter          | Type    | Default              | Description                        |
|--------------------|---------|----------------------|------------------------------------|
| `width`            | string  | `1280px`             | Container width (CSS value)        |
| `height`           | string  | `350px`              | Container height (CSS value)       |
| `bars`             | int     | `256`                | Number of frequency bands          |
| `barColor`         | string  | `#37ff00`            | Bar fill color                     |
| `barGradient`      | boolean | `true`               | Enable gradient fill               |
| `backgroundColor`  | string  | `rgba(0,0,0,0.00)`  | Canvas background color            |
| `smoothDuration`   | float   | `16`                 | Smoothing duration (ms)            |
| `amplitude`        | float   | `1`                  | Vertical scale factor              |
| `peakHold`         | float   | `10`                 | Peak hold time (ms)               |
| `peakFall`         | float   | `800`                | Peak fall duration (ms)            |
| `peakColor`        | string  | `#ce00ff`            | Peak indicator color               |
| `peakThickness`    | float   | `2`                  | Peak line thickness (px)           |

### Examples

Default (green bars, purple peaks):
```
/audio-fft-linear-demo
```

Wide overlay with cyan bars and yellow peaks, 128 bands:
```
/audio-fft-linear-demo?width=1920px&height=200px&bars=128&barColor=%2300e5ff&peakColor=%23ffeb3b
```

Tall, high-detail visualizer with slower smoothing:
```
/audio-fft-linear-demo?width=800px&height=600px&bars=512&smoothDuration=32&amplitude=1.5
```

No peaks, red bars:
```
/audio-fft-linear-demo?barColor=%23ff0000&peakThickness=0
```

---

## Round FFT (`/audio-fft-round-demo`)

Circular donut spectrum visualizer.

| Parameter           | Type    | Default              | Description                                   |
|---------------------|---------|----------------------|-----------------------------------------------|
| `width`             | string  | `500px`              | Container width (CSS value)                   |
| `height`            | string  | `500px`              | Container height (CSS value)                  |
| `bars`              | int     | `256`                | Number of frequency bands                     |
| `barColor`          | string  | `#ce00ff`            | Bar/sector fill color                         |
| `barGradient`       | boolean | `true`               | Enable gradient fill                          |
| `backgroundColor`   | string  | `rgba(0,0,0,0.00)`  | Canvas background color                       |
| `smoothDuration`    | float   | `60`                 | Smoothing duration (ms)                       |
| `peakHold`          | float   | `500`                | Peak hold time (ms)                          |
| `peakFall`          | float   | `800`                | Peak fall duration (ms)                       |
| `peakColor`         | string  | `#57fe04`            | Peak arc color                                |
| `peakThickness`     | float   | `2`                  | Peak arc thickness (px)                       |
| `innerRadiusRatio`  | float   | `0.6`                | Inner radius as fraction of outer (0–1)       |
| `sectorGap`         | float   | `0.01`               | Gap between sectors (radians)                 |
| `startAngle`        | float   | `-1.5708` (−π/2)    | Start angle in radians (top = −π/2)           |
| `inactiveSector`    | float   | `0`                  | Size of inactive (empty) arc segment (radians)|

### Examples

Default (purple ring, green peaks):
```
/audio-fft-round-demo
```

Large ring with cyan color and thin inner hole:
```
/audio-fft-round-demo?width=800px&height=800px&barColor=%2300e5ff&innerRadiusRatio=0.3
```

Half-circle visualizer (bottom half inactive):
```
/audio-fft-round-demo?inactiveSector=3.14159&startAngle=-3.14159
```

64-band ring with wide gaps and no gradient:
```
/audio-fft-round-demo?bars=64&sectorGap=0.05&barGradient=false&barColor=%23ff6600
```

---

## Waveform (`/audio-waveform-demo`)

Oscilloscope-style waveform visualizer.

| Parameter          | Type    | Default                 | Description                     |
|--------------------|---------|-------------------------|---------------------------------|
| `width`            | string  | `1280px`                | Container width (CSS value)     |
| `height`           | string  | `350px`                 | Container height (CSS value)    |
| `lineColor`        | string  | `#37ff00`               | Waveform line color             |
| `lineWidth`        | float   | `2`                     | Waveform line thickness (px)    |
| `backgroundColor`  | string  | `rgba(197,89,89,0.06)`  | Canvas background color         |
| `gridColor`        | string  | `rgba(255,255,255,0.1)` | Grid line color                 |
| `centerLineColor`  | string  | `rgba(255,255,255,0.3)` | Center line color               |
| `showGrid`         | boolean | `true`                  | Show background grid            |
| `showCenterLine`   | boolean | `true`                  | Show center horizontal line     |
| `smoothDuration`   | float   | `16`                    | Smoothing duration (ms)         |
| `amplitude`        | float   | `1`                     | Amplitude scale factor          |

### Examples

Default (green line, grid on):
```
/audio-waveform-demo
```

Clean waveform without grid, white line:
```
/audio-waveform-demo?lineColor=%23ffffff&showGrid=false&showCenterLine=false&backgroundColor=rgba(0,0,0,0)
```

Wide overlay with thick red line and high amplitude:
```
/audio-waveform-demo?width=1920px&height=150px&lineColor=%23ff0000&lineWidth=4&amplitude=2
```

---

## Notes

- **Colors**: URL-encode `#` as `%23` (e.g. `%2300e5ff` for `#00e5ff`). `rgba(...)` values work as-is.
- **Booleans**: accepted values are `true`/`1` and `false`/`0`.
- **Angles** (Round FFT): values are in radians. Common values: `0` = right, `1.5708` (π/2) = bottom, `-1.5708` (−π/2) = top, `3.14159` (π) = left.
- All visualizers connect to `ws://localhost:5001` for FFT data by default.
