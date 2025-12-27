import { describe, it, expect, beforeEach } from 'vitest';
import { HybridFormatter } from '../src/hybrid-formatter.js';
import { formatterSettings } from '../src/settings.mjs';

describe('Fallback Indentation Behavior', () => {
  let originalSettings;

  beforeEach(() => {
    // Save original settings
    originalSettings = JSON.parse(JSON.stringify(formatterSettings));
  });

  it('should apply fallback indentation to all settings when confidence is low', () => {
    // Content with no detectable indentation (confidence = 0)
    const content = `# Title

Just a paragraph with no lists or code.`;

    // Create formatter with fallback values
    const formatter = new HybridFormatter(content);

    // Check that confidence is indeed 0
    expect(formatter.indentDetector.getConfidence()).toBe(0);

    // Verify fallback values are applied to all settings
    const fallbackSize = formatterSettings.autoDetectIndent.fallbackIndentSize || 2;
    const fallbackType = formatterSettings.autoDetectIndent.fallbackIndentType || 'space';

    // Check JSX formatting settings
    expect(formatter.settings.formatMultiLineJsx.indentSize).toBe(fallbackSize);
    expect(formatter.settings.formatMultiLineJsx.indentType).toBe(fallbackType);

    // Check JSX content settings
    expect(formatter.settings.indentJsxContent.indentSize).toBe(fallbackSize);
    expect(formatter.settings.indentJsxContent.indentType).toBe(fallbackType);

    // Check HTML block formatter settings
    expect(formatter.settings.formatHtmlBlocksInMdx.formatterConfig.tabWidth).toBe(fallbackSize);
    expect(formatter.settings.formatHtmlBlocksInMdx.formatterConfig.useTabs).toBe(fallbackType === 'tab');

    // Check YAML frontmatter settings
    expect(formatter.settings.formatYamlFrontmatter.indent).toBe(fallbackSize);
  });

  it('should respect minConfidence = 0 to always accept detected indentation', () => {
    // Content with weak indentation signal
    const content = `# Title
  - One indented item`;

    // Temporarily set minConfidence to 0
    formatterSettings.autoDetectIndent.minConfidence = 0;

    const formatter = new HybridFormatter(content);

    // Even with low confidence, should use detected values (not fallback)
    // The detected size should be 2 based on the single indented item
    expect(formatter.settings.formatMultiLineJsx.indentSize).toBe(2);
    expect(formatter.settings.formatHtmlBlocksInMdx.formatterConfig.tabWidth).toBe(2);

    // Restore original settings
    formatterSettings.autoDetectIndent.minConfidence = originalSettings.autoDetectIndent.minConfidence;
  });

  it('should ensure all formatters use consistent indentation with fallback', () => {
    // Short content that can't be reliably detected
    const content = `---
title: Test
---

<div>
  <p>HTML content</p>
</div>

<InfoBox>
  JSX content
</InfoBox>`;

    const formatter = new HybridFormatter(content);

    // Get the applied indent size (should be fallback)
    const appliedSize = formatter.settings.formatMultiLineJsx.indentSize;
    const appliedType = formatter.settings.formatMultiLineJsx.indentType;

    // Verify ALL settings have the same indentation
    expect(formatter.settings.formatMultiLineJsx.indentSize).toBe(appliedSize);
    expect(formatter.settings.formatMultiLineJsx.indentType).toBe(appliedType);

    expect(formatter.settings.indentJsxContent.indentSize).toBe(appliedSize);
    expect(formatter.settings.indentJsxContent.indentType).toBe(appliedType);

    expect(formatter.settings.formatHtmlBlocksInMdx.formatterConfig.tabWidth).toBe(appliedSize);
    expect(formatter.settings.formatHtmlBlocksInMdx.formatterConfig.useTabs).toBe(appliedType === 'tab');

    expect(formatter.settings.formatYamlFrontmatter.indent).toBe(appliedSize);

    // All formatters should be in sync
    expect(formatter.indentDetector.getIndentSize()).toBe(appliedSize);
    expect(formatter.indentDetector.getIndentType()).toBe(appliedType);
  });

  it('should handle custom fallback values correctly', () => {
    // Temporarily set custom fallback values
    formatterSettings.autoDetectIndent.fallbackIndentSize = 4;
    formatterSettings.autoDetectIndent.fallbackIndentType = 'tab';

    // Content with no detectable indentation
    const content = `# Simple Title`;

    const formatter = new HybridFormatter(content);

    // Should use the custom fallback values
    expect(formatter.settings.formatMultiLineJsx.indentSize).toBe(4);
    expect(formatter.settings.formatMultiLineJsx.indentType).toBe('tab');
    expect(formatter.settings.formatHtmlBlocksInMdx.formatterConfig.tabWidth).toBe(4);
    expect(formatter.settings.formatHtmlBlocksInMdx.formatterConfig.useTabs).toBe(true);

    // Restore original settings
    formatterSettings.autoDetectIndent.fallbackIndentSize = originalSettings.autoDetectIndent.fallbackIndentSize;
    formatterSettings.autoDetectIndent.fallbackIndentType = originalSettings.autoDetectIndent.fallbackIndentType;
  });

  it('should handle minConfidence edge cases correctly', () => {
    // Test with various minConfidence values
    const testCases = [
      { minConfidence: 0, shouldUseFallback: false },      // Always accept detection
      { minConfidence: 0.5, shouldUseFallback: true },     // Medium threshold
      { minConfidence: 1, shouldUseFallback: true },       // Never accept detection
      { minConfidence: undefined, shouldUseFallback: true }, // Use default (0.7)
      { minConfidence: null, shouldUseFallback: true },     // Use default (0.7)
    ];

    // Content with weak indentation (low confidence)
    const content = `# Title
  - Single item`;

    for (const testCase of testCases) {
      // Set minConfidence
      formatterSettings.autoDetectIndent.minConfidence = testCase.minConfidence;

      const formatter = new HybridFormatter(content);
      const confidence = formatter.indentDetector.getConfidence();

      if (testCase.shouldUseFallback && confidence < (testCase.minConfidence ?? 0.7)) {
        // Should use fallback
        const fallbackSize = formatterSettings.autoDetectIndent.fallbackIndentSize || 2;
        expect(formatter.settings.formatMultiLineJsx.indentSize).toBe(fallbackSize);
      } else {
        // Should use detected (2 spaces from the single indented item)
        expect(formatter.settings.formatMultiLineJsx.indentSize).toBe(2);
      }
    }

    // Restore original settings
    formatterSettings.autoDetectIndent.minConfidence = originalSettings.autoDetectIndent.minConfidence;
  });
});