import { describe, it, expect, beforeEach } from 'vitest';
import { HybridFormatter } from '../src/hybrid-formatter.js';
import { formatterSettings } from '../src/settings.mjs';

describe('Settings Isolation', () => {
  // Save original settings to verify they don't change
  let originalSettings;

  beforeEach(() => {
    // Deep clone the original settings before each test
    originalSettings = JSON.parse(JSON.stringify(formatterSettings));
  });

  it('should not mutate global settings when auto-detect runs', () => {
    // Content with 4-space indentation
    const fourSpaceContent = `# Test

- Item 1
    - Nested with 4 spaces
        - Deep nested
    - Another nested

\`\`\`js
console.log("test");
\`\`\`
`;

    // Content with 2-space indentation
    const twoSpaceContent = `# Test

- Item 1
  - Nested with 2 spaces
    - Deep nested
  - Another nested

\`\`\`js
console.log("test");
\`\`\`
`;

    // Create formatter with 4-space content
    const formatter1 = new HybridFormatter(fourSpaceContent);

    // Verify formatter1 detected 4 spaces
    expect(formatter1.indentDetector.getIndentSize()).toBe(4);
    expect(formatter1.settings.formatMultiLineJsx.indentSize).toBe(4);

    // Verify global settings are unchanged
    expect(formatterSettings.formatMultiLineJsx.indentSize).toBe(
      originalSettings.formatMultiLineJsx.indentSize,
    );
    expect(formatterSettings.formatHtmlBlocksInMdx.formatterConfig.tabWidth).toBe(
      originalSettings.formatHtmlBlocksInMdx.formatterConfig.tabWidth,
    );

    // Create another formatter with 2-space content
    const formatter2 = new HybridFormatter(twoSpaceContent);

    // Verify formatter2 detected 2 spaces
    expect(formatter2.indentDetector.getIndentSize()).toBe(2);
    expect(formatter2.settings.formatMultiLineJsx.indentSize).toBe(2);

    // Verify global settings are still unchanged
    expect(formatterSettings.formatMultiLineJsx.indentSize).toBe(
      originalSettings.formatMultiLineJsx.indentSize,
    );
    expect(formatterSettings.formatHtmlBlocksInMdx.formatterConfig.tabWidth).toBe(
      originalSettings.formatHtmlBlocksInMdx.formatterConfig.tabWidth,
    );

    // Verify formatter1's settings weren't affected by formatter2
    expect(formatter1.settings.formatMultiLineJsx.indentSize).toBe(4);
    expect(formatter1.settings.formatHtmlBlocksInMdx.formatterConfig.tabWidth).toBe(4);
  });

  it('should maintain separate settings for concurrent formatters', () => {
    const tabContent = `# Test

- Item 1
\t- Nested with tab
\t\t- Deep nested
`;

    const spaceContent = `# Test

- Item 1
  - Nested with spaces
    - Deep nested
`;

    // Create multiple formatters simultaneously
    const tabFormatter = new HybridFormatter(tabContent);
    const spaceFormatter = new HybridFormatter(spaceContent);

    // Check each has its own settings
    expect(tabFormatter.settings.formatHtmlBlocksInMdx.formatterConfig.useTabs).toBe(true);
    expect(spaceFormatter.settings.formatHtmlBlocksInMdx.formatterConfig.useTabs).toBe(false);

    // Verify global settings remain untouched
    expect(formatterSettings.formatHtmlBlocksInMdx.formatterConfig.useTabs).toBe(
      originalSettings.formatHtmlBlocksInMdx.formatterConfig.useTabs,
    );
  });

  it('should not affect settings when auto-detect is disabled', () => {
    // Save current auto-detect state
    const originalAutoDetect = formatterSettings.autoDetectIndent.enabled;

    // Temporarily disable auto-detect globally
    formatterSettings.autoDetectIndent.enabled = false;

    // Create new formatter with auto-detect disabled
    const content = `- Item\n    - Four space nested`;
    const disabledFormatter = new HybridFormatter(content);

    // Settings should use defaults, not detected values
    expect(disabledFormatter.settings.formatMultiLineJsx.indentSize).toBe(
      originalSettings.formatMultiLineJsx.indentSize,
    );

    // Global settings should remain unchanged (except autoDetectIndent.enabled which we changed)
    expect(formatterSettings.formatMultiLineJsx.indentSize).toBe(
      originalSettings.formatMultiLineJsx.indentSize,
    );

    // Restore original auto-detect state
    formatterSettings.autoDetectIndent.enabled = originalAutoDetect;
  });

  it('should handle nested object mutations without affecting global settings', () => {
    const content = `# Test

<div>
  <p>HTML content</p>
</div>
`;

    const formatter = new HybridFormatter(content);

    // Mutate nested settings in the formatter instance
    formatter.settings.formatHtmlBlocksInMdx.formatterConfig.tabWidth = 8;
    formatter.settings.formatHtmlBlocksInMdx.formatterConfig.newProperty = 'test';

    // Verify global settings are unaffected
    expect(formatterSettings.formatHtmlBlocksInMdx.formatterConfig.tabWidth).toBe(
      originalSettings.formatHtmlBlocksInMdx.formatterConfig.tabWidth,
    );
    expect(formatterSettings.formatHtmlBlocksInMdx.formatterConfig.newProperty).toBeUndefined();
  });
});
