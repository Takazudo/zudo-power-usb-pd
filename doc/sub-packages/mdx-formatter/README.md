# MDX Formatter for Claude Code

AST-based markdown and MDX formatter with Japanese text support. This is a standalone formatter designed to be used by Claude Code subagents for formatting markdown and MDX content.

## Features

- **AST-based formatting** - Uses remark's AST for reliable formatting
- **MDX support** - Full support for MDX syntax including JSX components
- **Japanese text formatting** - Special handling for Japanese punctuation and URLs
- **HTML to Markdown conversion** - Converts HTML definition lists to markdown
- **Docusaurus support** - Preserves Docusaurus admonitions (:::note, :::tip, etc.)
- **GFM features** - Tables, strikethrough, task lists
- **Frontmatter preservation** - YAML and TOML frontmatter support
- **CLI and API** - Use as command-line tool or import as library

## Installation

From the mdx-formatter directory:

```bash
npm install
```

## Usage for Claude Code Subagents

### CLI Usage

```bash
# Format a single file
~/.claude/scripts/mdx-formatter/src/cli.js --write path/to/file.md

# Check if formatting is needed
~/.claude/scripts/mdx-formatter/src/cli.js --check path/to/file.md

# Format multiple files
~/.claude/scripts/mdx-formatter/src/cli.js --write "**/*.{md,mdx}"
```

### Direct Node Usage

```bash
node ~/.claude/scripts/mdx-formatter/src/cli.js --write README.md
```

### API Usage in Scripts

```javascript
import { format, formatFile, checkFile } from '/Users/takazudo/.claude/scripts/mdx-formatter/src/index.js';

// Format a string
const formatted = await format('# Hello\nWorld');
console.log(formatted); // '# Hello\n\nWorld\n'

// Format a file in place
const changed = await formatFile('./README.md');
console.log(changed ? 'File formatted' : 'No changes needed');

// Check if a file needs formatting
const needsFormatting = await checkFile('./README.md');
console.log(needsFormatting ? 'Needs formatting' : 'Already formatted');
```

## Formatting Rules

### Headings

- ATX-style headings (`#`) are used (not setext)
- Blank line after headings

### Lists

- Unordered lists use `-` as bullet marker
- Ordered lists use `.` as marker
- Minimal indentation (2 spaces)

### Code

- Fenced code blocks with ` ``` `
- Language identifier preserved
- Content inside code blocks is not modified

### Tables

- GFM tables are formatted with aligned columns
- Pipes are padded with spaces

### Japanese Text

- URLs in Japanese parentheses `（）` are converted to markdown links
- Japanese punctuation spacing is preserved
- No extra spaces around `、。！？`

### MDX/JSX

- JSX components are preserved with proper indentation
- Import/export statements are maintained
- Self-closing tags remain self-closing

### HTML Conversion

HTML definition lists are converted to markdown:

```html
<dl>
  <dt>Term</dt>
  <dd>Definition</dd>
</dl>
```

Becomes:

```markdown
**Term**
: Definition
```

### Docusaurus Admonitions

Admonition directives are preserved:

```markdown
:::note[Optional Title]
Content
:::
```

## CLI Options

- `-w, --write` - Write formatted files in place
- `-c, --check` - Check if files need formatting (for CI)
- `--ignore <patterns>` - Comma-separated patterns to ignore

## Testing

The formatter includes comprehensive tests for:

- Basic markdown formatting
- HTML to markdown conversion
- MDX/JSX preservation
- Docusaurus admonitions
- Japanese text handling
- GFM features
- Complex mixed content
- Error handling

Run tests with:

```bash
cd ~/.claude/scripts/mdx-formatter
npm test
```

## License

MIT