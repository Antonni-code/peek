# Design system

## Direction

Peek is an editorial lens: compact, calm, and spatial. Originality comes from the vertical source rail and edge-based Peek Stack, not gradients, glass effects, oversized headings, or decorative statistics.

## Tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| ink | `#11130f` | `#f2f4eb` | primary text and controls |
| muted | `#5f6457` | `#aeb4a4` | supporting text |
| paper | `#fbfaf5` | `#141610` | page and rail |
| raised | `#ffffff` | `#1b1e16` | cards |
| line | `#d9dbd1` | `#3a3e33` | separation |
| accent | `#c9ff3f` | `#c9ff3f` | focus, active, confirmation |
| danger | `#9f261d` | `#ffb4ab` | failure and destructive actions |

Typography uses the system UI sans stack. Preview title is 19 px/1.23, body is 13 px/1.5, and tiny source labels remain at least 10–11 px with high contrast.

## Geometry and motion

- preview width: 330/390/480 px for compact/comfortable/wide;
- source rail: 42 px;
- corner radius: 16–18 px;
- interactive targets: at least 36 px in compact surfaces and 42–44 px in settings;
- motion: 160–220 ms using transform and opacity;
- reduced motion: animations disabled;
- placement: anchored beside the link, clamped to a 12 px viewport margin.

## Interaction states

The card explicitly represents intent, loading, ready, cached, unavailable, reader, and pinned states. Loading reserves final geometry. Failure retains Open, Copy, and Retry. Focus uses a three-pixel accent ring and is never communicated by color alone.

## UI prohibitions

- no emoji icons;
- no remote fonts or icon packages at runtime;
- no hover scaling that shifts layout;
- no hidden essential action available only to pointer users;
- no host-page CSS leakage into the Shadow DOM;
- no remote string rendered with `innerHTML`.
