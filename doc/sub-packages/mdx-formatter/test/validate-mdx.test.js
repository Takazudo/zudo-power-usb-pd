import { describe, it, expect } from 'vitest';
import { SpecificFormatter } from '../src/specific-formatter.js';

describe('validateMdx function', () => {
  describe('Self-closing JSX tags', () => {
    it('should accept simple self-closing JSX tag', () => {
      const input = '<MercariNav id="test" />';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should accept self-closing tag with multiple props', () => {
      const input = '<ExImg src="/test.jpg" alt="test" floatRight extraWide />';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should accept multiple self-closing tags', () => {
      const input = '<Youtube url="test" />\n<TOC />\n<ImgsGrid srcs={[]} />';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should accept self-closing tag with complex props', () => {
      const input = '<Component data={{ key: "value" }} handler={() => console.log("test")} />';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should accept self-closing tag with no props', () => {
      const input = '<TOC />';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });
  });

  describe('Code blocks - fenced', () => {
    it('should ignore JSX-like content in fenced code blocks', () => {
      const input = '```\n<Component prop="value" />\n```';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should ignore unclosed tags in fenced code blocks', () => {
      const input = '```\n<InfoBox>\nNo closing tag here\n```';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should ignore angle brackets in shell commands in code blocks', () => {
      const input = '```bash\ngh pr view <PR_NUMBER> --comments\n```';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should ignore generic types in code blocks', () => {
      const input = '```typescript\ninterface Props<T> {\n  data: Array<T>;\n}\n```';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle multiple code blocks with JSX-like content', () => {
      const input = '```\n<First>\n```\n\nSome text\n\n```\n<Second>\n```';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle code blocks with language specifiers', () => {
      const input = '```jsx\n<Component />\n```\n\n```typescript\nArray<Type>\n```';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });
  });

  describe('Code blocks - inline', () => {
    it('should ignore JSX in inline code', () => {
      const input = 'Use `<Component />` in your code';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should ignore angle brackets in inline code', () => {
      const input = 'Type `Array<string>` for string arrays';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle multiple inline code blocks', () => {
      const input = 'Use `<First />` and `<Second />` components';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle inline code with unclosed tags', () => {
      const input = 'The `<div>` tag needs closing';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });
  });

  describe('Properly closed JSX tags', () => {
    it('should accept properly closed JSX tags', () => {
      const input = '<InfoBox>\nContent here\n</InfoBox>';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should accept nested JSX tags', () => {
      const input = '<Outer>\n<Inner>\nContent\n</Inner>\n</Outer>';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should accept JSX with both self-closing and paired tags', () => {
      const input = '<Outro>\n<Youtube url="test" />\nContent\n</Outro>';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });
  });

  describe('Actual errors - should throw', () => {
    it('should throw for unclosed JSX tag', () => {
      const input = '<InfoBox>\nContent without closing';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).toThrow('Unclosed JSX tags: InfoBox');
    });

    it('should throw for mismatched tags', () => {
      const input = '<InfoBox>\nContent\n</Outro>';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).toThrow('Mismatched JSX tags');
    });

    it('should throw for multiple unclosed tags', () => {
      const input = '<First>\n<Second>\nContent';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).toThrow();
    });

    it('should throw for unclosed quotes in JSX props', () => {
      const input = '<Component prop="unclosed value />';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle JSX-like text that is not a component', () => {
      // Text that looks like a tag but isn't (no closing bracket)
      const input = 'Use Array<string> for types';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle comparison operators', () => {
      const input = 'if (a < b && c > d) { }';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle HTML entities', () => {
      const input = 'Use &lt;Component /&gt; for JSX';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle mixed content with code and JSX', () => {
      const input = `
# Title

Some text with \`<inline>\` code.

\`\`\`jsx
<CodeBlock />
\`\`\`

<RealComponent prop="value" />

More text.`;
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle TypeScript interfaces mentioned in text', () => {
      const input = 'The ResponsiveImageProps interface defines the props';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle shell placeholders in code blocks', () => {
      const input = '```sh\ngit commit -m "<message>"\ngh pr view <PR_NUMBER>\n```';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });
  });

  describe('Real-world MDX content', () => {
    it('should handle complex MDX with multiple components', () => {
      const input = `
---
title: Test
---

# Title

<MercariNav
  items={[
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" }
  ]}
/>

<ImgsGrid
  srcs={['/img1.jpg', '/img2.jpg']}
  alts={['Image 1', 'Image 2']}
/>

## Code Example

\`\`\`jsx
<Component prop="value" />
\`\`\`

Use \`<TOC />\` for table of contents.

<Outro>
  Final content here
</Outro>`;
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle MDX with inline styles', () => {
      const input = '<div style={{ background: "orange" }}>Content</div>';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).not.toThrow();
    });

    it('should handle incomplete component props in real content', () => {
      const input = `
<MercariNav
  items={[
    {
      imgSrc: '',
      title: 'OXI Instruments: OXI One: Black',
      href: 'https://mercari-shops.com/products/rkJCVU3DDBrbvCV5gSJqed',
`;
      // This is actually an error - unclosed tag
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).toThrow();
    });
  });
});
