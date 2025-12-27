import { describe, it, expect } from 'vitest';
import { IndentDetector } from '../src/indent-detector.js';

describe('IndentDetector - Automatic Indentation Detection', () => {
  describe('Basic Detection', () => {
    it('should detect 2-space indentation', () => {
      const content = `function hello() {
  const x = 1;
  if (x) {
    console.log('hello');
  }
}`;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
      expect(detector.getIndentString()).toBe('  ');
    });

    it('should detect 4-space indentation', () => {
      const content = `function hello() {
    const x = 1;
    if (x) {
        console.log('hello');
    }
}`;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(4);
      expect(detector.getIndentType()).toBe('space');
      expect(detector.getIndentString()).toBe('    ');
    });

    it('should detect tab indentation', () => {
      const content = `function hello() {
\tconst x = 1;
\tif (x) {
\t\tconsole.log('hello');
\t}
}`;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(1);
      expect(detector.getIndentType()).toBe('tab');
      expect(detector.getIndentString()).toBe('\t');
    });
  });

  describe('Mixed Content Detection', () => {
    it('should detect indentation from JSX content', () => {
      const content = `<Component>
    <Child
        prop="value"
        anotherProp={true}
    />
</Component>`;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(4);
      expect(detector.getIndentType()).toBe('space');
    });

    it('should detect indentation from markdown lists', () => {
      const content = `- Item 1
  - Nested item 1.1
    - Deep nested 1.1.1
  - Nested item 1.2
- Item 2`;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
    });

    it('should detect indentation from code blocks', () => {
      const content = `\`\`\`javascript
function test() {
    const value = 42;
    return value;
}
\`\`\``;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(4);
      expect(detector.getIndentType()).toBe('space');
    });
  });

  describe('Confidence Scoring', () => {
    it('should return high confidence for consistent indentation', () => {
      const content = `function a() {
  const x = 1;
  const y = 2;
  if (x) {
    console.log('x');
  }
  if (y) {
    console.log('y');
  }
}`;
      const detector = new IndentDetector(content);
      expect(detector.getConfidence()).toBeGreaterThan(0.8);
    });

    it('should return low confidence for inconsistent indentation', () => {
      const content = `function a() {
  const x = 1;
    const y = 2;  // inconsistent
  if (x) {
      console.log('x');  // inconsistent
  }
}`;
      const detector = new IndentDetector(content);
      expect(detector.getConfidence()).toBeLessThan(0.5);
    });

    it('should return zero confidence for no indentation', () => {
      const content = `line1
line2
line3`;
      const detector = new IndentDetector(content);
      expect(detector.getConfidence()).toBe(0);
    });
  });

  describe('Default Fallback', () => {
    it('should return default 2-space indent when no indentation is detected', () => {
      const content = `# Title
No indentation here`;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
      expect(detector.getIndentString()).toBe('  ');
      expect(detector.getConfidence()).toBe(0);
    });

    it('should return default for empty content', () => {
      const detector = new IndentDetector('');
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
      expect(detector.getIndentString()).toBe('  ');
      expect(detector.getConfidence()).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide detailed statistics about indentation patterns', () => {
      const content = `function test() {
  const a = 1;  // 2 spaces
  const b = 2;  // 2 spaces
    const c = 3;  // 4 spaces (inconsistent)
  if (a) {
    console.log('a');  // 4 spaces (2+2)
  }
}`;
      const detector = new IndentDetector(content);
      const stats = detector.getStatistics();

      expect(stats).toHaveProperty('totalLines');
      expect(stats).toHaveProperty('indentedLines');
      expect(stats).toHaveProperty('patterns');
      expect(stats.patterns).toHaveProperty('2-space');
      expect(stats.patterns).toHaveProperty('4-space');
      expect(stats.totalLines).toBe(8);
      expect(stats.indentedLines).toBeGreaterThan(0);
    });
  });

  describe('Ignore Patterns', () => {
    it('should ignore lines inside code fences when analyzing', () => {
      const content = `Normal content
  with two spaces

\`\`\`python
    def hello():
        # This uses 4 spaces but should be ignored
        print("hello")
\`\`\`

  More content with two spaces`;

      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
    });

    it('should ignore empty lines', () => {
      const content = `function test() {
  const a = 1;

  const b = 2;


  const c = 3;
}`;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(2);
    });

    it('should ignore comment-only lines if needed', () => {
      const content = `function test() {
  // This is a comment
  const a = 1;
  // Another comment
  const b = 2;
}`;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(2);
    });
  });

  describe('MDX-specific Detection', () => {
    it('should handle MDX with mixed markdown and JSX', () => {
      const content = `# Title

Some paragraph

<Component
  prop="value"
  anotherProp={true}
>
  Content inside
</Component>

- List item
  - Nested item`;

      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
    });

    it('should detect from frontmatter if present', () => {
      const content = `---
title: Test
tags:
  - tag1
  - tag2
nested:
  value: 123
  another:
    deep: true
---

# Content`;

      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
    });
  });

  describe('Complex Patterns', () => {
    it('should handle mixed tabs and spaces by choosing most common', () => {
      const content = `function a() {
  const x = 1;  // 2 spaces
  const y = 2;  // 2 spaces
\tconst z = 3;  // tab
  if (x) {
    console.log('x');  // 4 spaces
  }
}`;
      const detector = new IndentDetector(content);
      // Should detect spaces as more common
      expect(detector.getIndentType()).toBe('space');
      expect(detector.getIndentSize()).toBe(2);
    });

    it('should detect consistent nested indentation levels', () => {
      const content = `level0
  level1
    level2
      level3
        level4`;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
      expect(detector.getConfidence()).toBeGreaterThan(0.9);
    });
  });

  describe('Integration Helpers', () => {
    it('should format a line with detected indentation', () => {
      const content = `  const x = 1;
  const y = 2;`;
      const detector = new IndentDetector(content);

      // Format a line with 1 level of indentation
      expect(detector.formatWithIndent('test', 1)).toBe('  test');
      // Format with 2 levels
      expect(detector.formatWithIndent('test', 2)).toBe('    test');
      // Format with 0 levels
      expect(detector.formatWithIndent('test', 0)).toBe('test');
    });

    it('should calculate indent level of a line', () => {
      const content = `function test() {
  const a = 1;
    const b = 2;
      const c = 3;
}`;
      const detector = new IndentDetector(content);

      expect(detector.getLineIndentLevel('  const a = 1;')).toBe(1);
      expect(detector.getLineIndentLevel('    const b = 2;')).toBe(2);
      expect(detector.getLineIndentLevel('      const c = 3;')).toBe(3);
      expect(detector.getLineIndentLevel('function test() {')).toBe(0);
    });
  });

  describe('Special Cases', () => {
    it('should handle single line content', () => {
      const detector = new IndentDetector('const x = 1;');
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
      expect(detector.getConfidence()).toBe(0);
    });

    it('should handle only whitespace content', () => {
      const detector = new IndentDetector('   \n  \n    \n');
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
      expect(detector.getConfidence()).toBe(0);
    });

    it('should detect from deeply nested structures', () => {
      const content = `{
  "a": {
    "b": {
      "c": {
        "d": "value"
      }
    }
  }
}`;
      const detector = new IndentDetector(content);
      expect(detector.getIndentSize()).toBe(2);
      expect(detector.getIndentType()).toBe('space');
    });
  });
});