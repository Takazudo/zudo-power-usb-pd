# CLAUDE.md - Documentation Guidelines

This file provides guidance to Claude Code when working with documentation in this directory.

## Circuit Diagram Writing Rules

When creating or updating circuit diagrams in the documentation:

### 1. Use ASCII Art in Code Blocks

Always illustrate circuits using ASCII art within markdown code blocks:

```
USB-C 15V ──┬─→ +13.5V (DC-DC) ──→ +12V (LDO) ──→ +12V OUT
            │
            ├─→ +7.5V  (DC-DC) ──→ +5V  (LDO) ──→ +5V OUT
            │
            └─→ -15V (Inverter) ──→ -13.5V (DC-DC) ──→ -12V (LDO) ──→ -12V OUT
```

### 2. Always Include Full Connection List

Under every circuit diagram, provide a detailed connection list showing:
- Component identifiers (U1, R1, C1, etc.)
- Pin numbers and names
- Connection destinations
- Signal names or voltage levels

Example:

```
Connections:
- J1 (USB-C) VBUS → U1 (CH224D) VIN (pin 1)
- J1 (USB-C) CC1 → U1 (CH224D) CC1 (pin 5) via R1 (5.1kΩ)
- J1 (USB-C) CC2 → U1 (CH224D) CC2 (pin 6) via R2 (5.1kΩ)
- U1 (CH224D) VOUT (pin 3) → C1 (10µF) → GND
- U1 (CH224D) VOUT (pin 3) → U2 (LM2596S) VIN (pin 1)
```

### 3. ASCII Art Best Practices

#### THE GOLDEN RULES for Clear ASCII Schematics

**Rule 1: 🚫 NEVER cross lines unless they form an electrical junction (connection point)**

If two signals cross paths:
- If they connect electrically: Use a junction symbol and clearly show the connection
- If they don't connect: **Route one of them differently to avoid the crossing**

**Rule 2: 🚫 NEVER cross lines over text labels - it looks like they're connected**

When a vertical or horizontal line passes over a text label, it creates ambiguity:
- Does the line connect to that label?
- Or does it just pass through?

**Solutions**:
1. Route lines around labels
2. Remove intermediate labels that would be crossed
3. **Route vertically in the opposite direction** - If a downward line crosses labels, route it upward instead to use empty space

**❌ WRONG** - Lines crossing without junction (ambiguous):
```
Signal A  ──┼──  (is this connected or just passing?)
            │
         Signal B
```

**❌ WRONG** - Lines crossing over labels (ambiguous):
```
Output ──┬──→ Load
         │
        GND      ← Label
         │       ← Is this line connected to the GND label above?
        C1       ← Or just passing through to C1?
```

**✅ CORRECT** - Route around to avoid crossing:
```
Signal A  ────────  (clearly not connected)

         Signal B
            │
```

**✅ CORRECT** - Remove intermediate labels to prevent crossing:
```
Output ──┬──→ Load
         │
         ├─→ C1 ─→ GND  ← No label in the path
            470µF
```

**✅ CORRECT** - Use explicit junction when signals DO connect:
```
Signal A  ──┬──  (T-junction: A and B connect here)
            │
         Signal B
```

#### Box-Drawing Characters

- Use box-drawing characters for clear visual flow: `─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴`
- Use arrows to show signal direction: `→ ←`
- **NEVER use `┼` (cross) unless it's an actual 4-way junction** - it suggests connection when there may be none
- Label all voltage levels and current ratings
- Keep diagrams concise but complete
- Group related components visually

#### Junction vs Crossing Guidelines

| Symbol | Meaning | When to Use |
|--------|---------|-------------|
| `┬` | T-junction (3-way) | One signal splits into two paths |
| `├` `┤` `┴` | Side junctions | Signal branches from side |
| `─` `│` | Straight lines | No branching, continuous path |
| `┼` | **AVOID** | Ambiguous! Looks like connection but might not be |
| `┌` `┐` `└` `┘` | Corners | Change direction 90° |

#### Using Labels to Avoid Crossings

**Best Practice**: When connections would require crossing wires, use arrow-to-label notation instead of drawing physical wires across the diagram.

**✅ CORRECT** - Use labels to indicate connections:
```
IC Pin ├2─→ Tap      ← Pin points to "Tap" label (no wire drawn)

Output ─┬─→ R1 ──┬─→ Tap ─→ R2 ─→ GND
        │         ↑
        │    This "Tap" matches the label above
```

**❌ WRONG** - Drawing wire creates crossings:
```
IC Pin ├2───┼────┼─→ Junction   ← Crosses other signals!
            │    │
```

**Key points**:
- Use `─→ Label` notation for pins that connect to distant points
- The label name indicates the connection without drawing a wire
- Common labels: `GND`, `Tap`, `VCC`, `Output`
- Example: `FB ├2─→ Tap` means "FB pin 2 connects to the point labeled 'Tap'"
- Example: `GND ├1─→ GND` means "GND pin 1 connects to system ground"

#### Parallel Components (Shunt Elements)

When showing components connected in parallel (between a signal and GND):
- Draw them as vertical drops from the signal line
- Make it visually obvious they're shunt elements, not series

**Example - Output filter capacitor:**
```
Output ──┬──→ Load
         │
        C1 (470µF)   ← Clearly parallel
         │
        GND
```

**Not this** (looks like series):
```
Output ── C1 ── Load   ← Confusing! Looks like C1 blocks current
```

#### Column Alignment (Preventing "Sliding Lines")

**Problem**: In monospace fonts, vertical lines can appear misaligned if labels have different character widths.

**❌ WRONG** - Lines slide because labels have different widths:
```
            │
           GND    ← 3 characters
            │
           C3     ← 2 characters
            │
          470µF   ← 5 characters
            │     ← Lines appear to "slide" left/right!
```

**✅ CORRECT** - Maintain consistent column spacing:
```
            │
           GND
            │
           C3
          470µF
            │     ← Vertical line stays in same column!
```

**Best practices**:
- Plan your column widths before drawing
- Use consistent spacing after component labels
- Align vertical bars (`│`) in the same character column throughout
- Test your diagram in a monospace font viewer before committing

### 4. Component Notation

- **ICs**: Use part numbers (CH224D, LM2596S, etc.)
- **Passives**: Show values with units (10µF, 5.1kΩ, 33µH)
- **Voltages**: Show at each stage (+15V, +13.5V, +12V, etc.)
- **Currents**: Show max ratings (1.2A, 800mA, etc.)

## Validating ASCII Diagrams with Preview Tool

**CRITICAL**: Always preview ASCII diagrams in monospace font before finalizing to catch label crossing issues and alignment problems.

**Preview method using headless-browser**:
```bash
cat > /tmp/preview.html << 'EOF'
<html>
<head>
  <style>
    body {
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      line-height: 1.4;
      padding: 20px;
      white-space: pre;
    }
  </style>
</head>
<body>[PASTE DIAGRAM HERE]</body>
</html>
EOF
node ~/.claude/skills/headless-browser/scripts/headless-check.js --url file:///tmp/preview.html --screenshot viewport
```

This renders the diagram exactly as users will see it in monospace font, revealing:
- Label crossings that aren't visible in plain text
- Column alignment issues ("sliding" vertical bars)
- Spacing problems
- Junction ambiguities

## Integration with Main Documentation

This documentation is part of a Docusaurus site. When referencing circuit diagrams:
- Place diagrams in the appropriate section (overview.md, circuit-diagrams.md, etc.)
- Cross-reference from other documents using relative links
- Keep technical accuracy paramount
- Use English for all text and labels
- **Preview all diagrams in monospace** before committing
