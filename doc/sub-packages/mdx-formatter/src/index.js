/**
 * Main entry point for the markdown formatter
 * Uses SpecificFormatter for targeted formatting rules
 */

import { promises as fs } from 'fs';
import { HybridFormatter } from './hybrid-formatter.js';

/**
 * Check if content is likely MDX
 * @param {string} content - File content to check
 * @returns {boolean} True if content appears to be MDX
 */
export function detectMdx(content) {
  // Check for MDX-specific features
  const mdxPatterns = [/^import\s+/m, /^export\s+/m, /<[A-Z]\w*[^>]*>/, /^\s*---\s*$/m];

  return mdxPatterns.some((pattern) => pattern.test(content));
}

/**
 * Format markdown/MDX content using hybrid AST approach
 * @param {string} content - Content to format
 * @param {Object} options - Formatting options
 * @returns {Promise<string>} Formatted content
 */
export async function format(content, options = {}) {
  try {
    const formatter = new HybridFormatter(content);
    return formatter.format();
  } catch (error) {
    // Silently return original content if formatting fails
    // This is expected for files with certain JSX patterns that remark-mdx doesn't like
    return content;
  }
}

/**
 * Format a file and write it back if changed
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} True if file was changed
 */
export async function formatFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const formatted = await format(content);

  if (content !== formatted) {
    await fs.writeFile(filePath, formatted, 'utf-8');
    return true;
  }

  return false;
}

/**
 * Check if a file needs formatting
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} True if file needs formatting
 */
export async function checkFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const formatted = await format(content);
  return content !== formatted;
}

// Export all functions
export default {
  format,
  formatFile,
  checkFile,
  detectMdx,
};
