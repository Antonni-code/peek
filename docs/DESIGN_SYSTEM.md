# Design system

## Direction

Peek is a compact editorial lens with pearl-white surfaces, true graphite text and restrained blue actions. Originality comes from the vertical source rail and edge-based Peek Stack, not gradients, glass effects, oversized headings, or decorative statistics.

## Tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| ink | `#1d1d1f` | `#f5f5f7` | primary text and controls |
| muted | `#68686d` | `#b0b0b7` | supporting text |
| paper | `#f5f5f7` | `#141416` | page and rail |
| raised | `#ffffff` | `#222225` | cards |
| line | `#e2e2e7` | `#3b3b41` | separation |
| accent | `#0071e3` | `#0071e3` | focus, active, confirmation |
| danger | `#9f261d` | `#ffb4ab` | failure and destructive actions |

Typography uses the system UI sans stack. Preview title is 19 px/1.23 at weight 600, body is 13 px/1.65, and tiny source labels remain at least 10–11 px with high contrast.

## Geometry and motion

- preview width: 330/390/480 px for compact/comfortable/wide;
- source rail: 36 px;
- corner radius: 20 px;
- interactive targets: at least 36 px in compact surfaces and 42–44 px in settings;
- motion: 160–220 ms using transform and opacity;
- reduced motion: animations disabled;
- placement: anchored beside the link, clamped to a 12 px viewport margin.

All preview actions wrap at compact sizes. Stack entries use separators instead of nested outlined cards. The original brand geometry uses a white P and frost-blue lens on graphite. Pro is US$1.99 once.

## Interaction states

The card explicitly represents intent, loading, ready, cached, unavailable, reader, and pinned states. Loading reserves final geometry. Failure retains Open, Copy, and Retry. Focus uses a two- or three-pixel accent ring and is never communicated by color alone.

## UI prohibitions

- no emoji icons;
- no remote fonts or icon packages at runtime;
- no hover scaling that shifts layout;
- no hidden essential action available only to pointer users;
- no host-page CSS leakage into the Shadow DOM;
- no remote string rendered with `innerHTML`.
