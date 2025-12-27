import { describe, it, expect } from 'vitest';
import { HybridFormatter } from '../src/hybrid-formatter.js';
import { formatterSettings } from '../src/settings.mjs';

describe('IndentDetector Integration with HybridFormatter', () => {
  it('should detect and use 4-space indentation in JSX formatting', async () => {
    const input = `# Title

Some content with 4-space indent:

    const x = 1;
    const y = 2;

<Button
onClick={handleClick}
className="primary"
/>`;

    const expected = `# Title

Some content with 4-space indent:

    const x = 1;
    const y = 2;

<Button
    onClick={handleClick}
    className="primary"
/>`;

    // Enable auto-detect
    formatterSettings.autoDetectIndent.enabled = true;
    formatterSettings.formatMultiLineJsx.enabled = true;

    const formatter = new HybridFormatter(input);
    const result = await formatter.format();

    expect(result).toBe(expected);
  });

  it('should detect and use 2-space indentation in JSX formatting', async () => {
    const input = `# Title

- List item
  - Nested with 2 spaces

<Component
prop="value"
another={true}
/>`;

    const expected = `# Title

- List item
  - Nested with 2 spaces

<Component
  prop="value"
  another={true}
/>`;

    // Enable auto-detect
    formatterSettings.autoDetectIndent.enabled = true;
    formatterSettings.formatMultiLineJsx.enabled = true;

    const formatter = new HybridFormatter(input);
    const result = await formatter.format();

    expect(result).toBe(expected);
  });

  it('should detect tab indentation and use it in JSX formatting', async () => {
    const input = `# Title

Code with tabs:

\tconst x = 1;
\tconst y = 2;

<Container
title="Test"
active={true}
/>`;

    const expected = `# Title

Code with tabs:

\tconst x = 1;
\tconst y = 2;

<Container
\ttitle="Test"
\tactive={true}
/>`;

    // Enable auto-detect
    formatterSettings.autoDetectIndent.enabled = true;
    formatterSettings.formatMultiLineJsx.enabled = true;

    const formatter = new HybridFormatter(input);
    const result = await formatter.format();

    expect(result).toBe(expected);
  });

  it('should use fallback indentation when confidence is low', () => {
    const input = `<Component prop="value" />`;

    // Enable auto-detect with high confidence threshold
    formatterSettings.autoDetectIndent.enabled = true;
    formatterSettings.autoDetectIndent.minConfidence = 0.8;
    formatterSettings.autoDetectIndent.fallbackIndentSize = 2;
    formatterSettings.formatMultiLineJsx.enabled = false;

    const formatter = new HybridFormatter(input);

    // Check that fallback was used (confidence should be 0)
    expect(formatter.indentDetector.getConfidence()).toBe(0);
    expect(formatter.indentDetector.getIndentSize()).toBe(2);
  });

  it('should detect indentation from mixed MDX content', async () => {
    const input = `---
title: Test
tags:
  - tag1
  - tag2
---

# Title

Some content

<Component
prop="value"
another={true}
>
  Content inside
</Component>

- List item
  - Nested item`;

    const expected = `---
title: Test
tags:
  - tag1
  - tag2
---

# Title

Some content

<Component
  prop="value"
  another={true}
>
  Content inside
</Component>

- List item
  - Nested item`;

    // Enable auto-detect
    formatterSettings.autoDetectIndent.enabled = true;
    formatterSettings.formatMultiLineJsx.enabled = true;

    const formatter = new HybridFormatter(input);
    const result = await formatter.format();

    // Should detect 2-space indentation from YAML frontmatter and lists
    expect(formatter.indentDetector.getIndentSize()).toBe(2);
    expect(result).toBe(expected);
  });

  it('should respect disabled auto-detect setting', () => {
    const input = `    <Component
    prop="value"
    />`;

    // Disable auto-detect
    formatterSettings.autoDetectIndent.enabled = false;
    formatterSettings.formatMultiLineJsx.enabled = true;
    formatterSettings.formatMultiLineJsx.indentSize = 2; // Force 2-space

    const formatter = new HybridFormatter(input);

    // Should not have indentDetector when disabled
    expect(formatter.indentDetector).toBeUndefined();
  });
});