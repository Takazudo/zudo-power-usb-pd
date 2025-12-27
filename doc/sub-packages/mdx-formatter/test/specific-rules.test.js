import { describe, it, expect } from 'vitest';
import { SpecificFormatter } from '../src/specific-formatter.js';

describe('Specific Formatting Rules', () => {
  describe('Rule 1: Add 1 empty line between elements', () => {
    it('should add empty line between heading and paragraph', () => {
      const input = '# Heading\nParagraph text';
      const expected = '# Heading\n\nParagraph text';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should add empty line between paragraph and list', () => {
      const input = 'Paragraph text\n- List item 1\n- List item 2';
      const expected = 'Paragraph text\n\n- List item 1\n- List item 2';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should add empty line between list and paragraph', () => {
      const input = '- List item\nParagraph text';
      const expected = '- List item\n\nParagraph text';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should add empty line between code block and paragraph', () => {
      const input = '```js\ncode\n```\nParagraph';
      const expected = '```js\ncode\n```\n\nParagraph';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should not add multiple empty lines if one already exists', () => {
      const input = '# Heading\n\nParagraph text';
      const expected = '# Heading\n\nParagraph text';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should handle multiple headings and paragraphs', () => {
      const input = '# Heading 1\nParagraph 1\n## Heading 2\nParagraph 2';
      const expected = '# Heading 1\n\nParagraph 1\n\n## Heading 2\n\nParagraph 2';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should add empty line between consecutive headings', () => {
      const input = '# Heading 1\n## Heading 2';
      const expected = '# Heading 1\n\n## Heading 2';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should preserve frontmatter spacing', () => {
      const input = '---\ntitle: Test\n---\n# Heading';
      const expected = '---\ntitle: Test\n---\n\n# Heading';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });
  });

  describe('Rule 2: Format multi-line JSX/HTML', () => {
    it('should indent content inside JSX components', () => {
      const input = '<InfoBox>\nContent here\n</InfoBox>';
      const expected = '<InfoBox>\n  Content here\n</InfoBox>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should indent nested JSX properly', () => {
      const input = '<Outer>\n<Inner>\nContent\n</Inner>\n</Outer>';
      const expected = '<Outer>\n  <Inner>\n    Content\n  </Inner>\n</Outer>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should preserve self-closing JSX tags', () => {
      const input = '<Youtube url="https://example.com" />';
      const expected = '<Youtube url="https://example.com" />';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should indent multiple lines inside JSX', () => {
      const input = '<Outro>\nLine 1\nLine 2\nLine 3\n</Outro>';
      const expected = '<Outro>\n  Line 1\n  Line 2\n  Line 3\n</Outro>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });
  });

  describe('Rule 3: Trim dl/dt/dd spacing', () => {
    it('should remove excessive whitespace in definition lists', () => {
      const input = '<dl>\n  <dt> Term  </dt>\n  <dd>  Definition </dd>\n</dl>';
      const expected = '<dl>\n  <dt>Term</dt>\n  <dd>Definition</dd>\n</dl>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should handle multiple dt/dd pairs', () => {
      const input =
        '<dl>\n  <dt>  Term 1  </dt>\n  <dd> Def 1 </dd>\n  <dt> Term 2 </dt>\n  <dd>  Def 2  </dd>\n</dl>';
      const expected =
        '<dl>\n  <dt>Term 1</dt>\n  <dd>Def 1</dd>\n  <dt>Term 2</dt>\n  <dd>Def 2</dd>\n</dl>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should preserve content with code tags inside dd', () => {
      const input =
        '<dl>\n  <dt>Term</dt>\n  <dd>  Definition with <code>code</code>  </dd>\n</dl>';
      const expected = '<dl>\n  <dt>Term</dt>\n  <dd>Definition with <code>code</code></dd>\n</dl>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });
  });

  describe('Rule 4: Expand single-line JSX with 2+ props', () => {
    it('should expand JSX with 2 props to multi-line', () => {
      const input = '<Component prop1="value1" prop2="value2" />';
      const expected = '<Component\n  prop1="value1"\n  prop2="value2"\n/>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should expand JSX with 3 props to multi-line', () => {
      const input = '<Youtube url="https://example.com" width="100%" height="400" />';
      const expected = '<Youtube\n  url="https://example.com"\n  width="100%"\n  height="400"\n/>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should not expand JSX with 1 prop', () => {
      const input = '<Component prop="value" />';
      const expected = '<Component prop="value" />';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should expand opening tags with multiple props', () => {
      const input = '<InfoBox title="Title" type="warning">Content</InfoBox>';
      const expected = '<InfoBox\n  title="Title"\n  type="warning"\n>\n  Content\n</InfoBox>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should handle props with complex values', () => {
      const input = '<Component data={{ key: "value" }} handler={() => console.log("test")} />';
      const expected =
        '<Component\n  data={{ key: "value" }}\n  handler={() => console.log("test")}\n/>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });
  });

  describe('Rule 5: Indent JSX content', () => {
    it('should indent content inside Outro component', () => {
      const input = '<Outro>\nContent without indent\n</Outro>';
      const expected = '<Outro>\n  Content without indent\n</Outro>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should indent content inside InfoBox component', () => {
      const input = '<InfoBox>\n警告内容\n</InfoBox>';
      const expected = '<InfoBox>\n  警告内容\n</InfoBox>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should indent markdown inside JSX components', () => {
      const input = '<LayoutDivideItem>\n- List item 1\n- List item 2\n</LayoutDivideItem>';
      const expected = '<LayoutDivideItem>\n  - List item 1\n  - List item 2\n</LayoutDivideItem>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should indent code blocks inside JSX', () => {
      const input = '<Column>\n```js\ncode();\n```\n</Column>';
      const expected = '<Column>\n  ```js\n  code();\n  ```\n</Column>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should handle already indented content correctly', () => {
      const input = '<InfoBox>\n  Already indented\n</InfoBox>';
      const expected = '<InfoBox>\n  Already indented\n</InfoBox>';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });
  });

  describe('Rule 6: Preserve Docusaurus admonitions', () => {
    it('should preserve simple admonition', () => {
      const input = ':::note\nThis is a note\n:::';
      const expected = ':::note\nThis is a note\n:::';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should preserve admonition with title', () => {
      const input = ':::tip[Pro Tip]\nThis is a professional tip\n:::';
      const expected = ':::tip[Pro Tip]\nThis is a professional tip\n:::';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should preserve nested content in admonitions', () => {
      const input = ':::warning\n- Item 1\n- Item 2\n\n```js\ncode();\n```\n:::';
      const expected = ':::warning\n- Item 1\n- Item 2\n\n```js\ncode();\n```\n:::';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should add spacing around admonitions', () => {
      const input = 'Text before\n:::note\nNote content\n:::\nText after';
      const expected = 'Text before\n\n:::note\nNote content\n:::\n\nText after';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });
  });

  describe('Rule 7: Error handling', () => {
    it('should throw error on invalid MDX JSX', () => {
      const input = '<Component prop="unclosed';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).toThrow();
    });

    it('should throw error on unclosed JSX tags', () => {
      const input = '<InfoBox>\nContent without closing tag';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).toThrow();
    });

    it('should throw error on mismatched JSX tags', () => {
      const input = '<InfoBox>\nContent\n</Outro>';
      const formatter = new SpecificFormatter(input);
      expect(() => formatter.format()).toThrow();
    });

    it('should handle empty input gracefully', () => {
      const input = '';
      const expected = '';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle all rules together', () => {
      const input = `---
title: Test
---
# Heading
Paragraph text
<InfoBox title="Warning" type="alert">
Content here
</InfoBox>
## Section 2
- List item
<Youtube url="https://example.com" width="100%" />
:::note
Admonition content
:::
Text after`;

      const expected = `---
title: Test
---

# Heading

Paragraph text

<InfoBox
  title="Warning"
  type="alert"
>
  Content here
</InfoBox>

## Section 2

- List item

<Youtube
  url="https://example.com"
  width="100%"
/>

:::note
Admonition content
:::

Text after`;

      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should handle nested JSX with all formatting rules', () => {
      const input = `<LayoutDivide>
<LayoutDivideItem>
# Left Column
Content here
</LayoutDivideItem>
<LayoutDivideItem>
# Right Column
More content
</LayoutDivideItem>
</LayoutDivide>`;

      const expected = `<LayoutDivide>
  <LayoutDivideItem>
    # Left Column
    
    Content here
  </LayoutDivideItem>
  <LayoutDivideItem>
    # Right Column
    
    More content
  </LayoutDivideItem>
</LayoutDivide>`;

      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });
  });

  describe('Edge cases', () => {
    it('should handle JSX inside markdown lists', () => {
      const input = '- Item 1\n- <Component prop="value" />\n- Item 3';
      const expected = '- Item 1\n- <Component prop="value" />\n- Item 3';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should handle code blocks with JSX-like content', () => {
      const input = '```jsx\n<Component prop="value" />\n```';
      const expected = '```jsx\n<Component prop="value" />\n```';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should not format JSX inside code blocks', () => {
      const input = '```\n<InfoBox>\nNot formatted\n</InfoBox>\n```';
      const expected = '```\n<InfoBox>\nNot formatted\n</InfoBox>\n```';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });

    it('should handle mixed line endings', () => {
      const input = '# Heading\r\nParagraph\r\n- List';
      const expected = '# Heading\n\nParagraph\n\n- List';
      const formatter = new SpecificFormatter(input);
      const result = formatter.format();
      expect(result).toBe(expected);
    });
  });
});
