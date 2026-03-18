import * as assert from 'assert';
import { blankMarkdownBody, FrontMatterTracker, isFrontMatterLanguage } from '../src/markdown-frontmatter';

describe('blankMarkdownBody', () => {
  it('should extract standard ---/--- front matter', () => {
    const input = '---\ntitle: Hello\ndate: 2024\n---\nMarkdown content here.\n';
    const result = blankMarkdownBody(input);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.endLine, 2);
    assert.strictEqual(result.text, '---\ntitle: Hello\ndate: 2024\n\n\n');
  });

  it('should accept ... as closing delimiter', () => {
    const input = '---\ntitle: Hello\n...\nContent\n';
    const result = blankMarkdownBody(input);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.endLine, 1);
    assert.strictEqual(result.text, '---\ntitle: Hello\n\n\n');
  });

  it('should return null for plain markdown without front matter', () => {
    const input = '# Hello World\n\nSome content.\n';
    assert.strictEqual(blankMarkdownBody(input), null);
  });

  it('should handle empty front matter', () => {
    const input = '---\n---\nContent\n';
    const result = blankMarkdownBody(input);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.endLine, 0);
    assert.strictEqual(result.text, '---\n\n\n');
  });

  it('should preserve CRLF line endings', () => {
    const input = '---\r\ntitle: Hello\r\n---\r\nContent\r\n';
    const result = blankMarkdownBody(input);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.endLine, 1);
    assert.strictEqual(result.text, '---\r\ntitle: Hello\r\n\r\n\r\n');
  });

  it('should only match first closing delimiter', () => {
    const input = '---\ntitle: Hello\n---\nSome text\n---\nMore text\n';
    const result = blankMarkdownBody(input);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.endLine, 1);
    // Lines after first --- are all blanked
    assert.strictEqual(result.text, '---\ntitle: Hello\n\n\n\n\n');
  });

  it('should tolerate trailing whitespace on delimiter lines', () => {
    const input = '---  \ntitle: Hello\n---  \nContent\n';
    const result = blankMarkdownBody(input);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.endLine, 1);
  });

  it('should handle BOM prefix', () => {
    const input = '\uFEFF---\ntitle: Hello\n---\nContent\n';
    const result = blankMarkdownBody(input);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.endLine, 1);
  });

  it('should return null when --- is not at the start', () => {
    const input = '\n---\ntitle: Hello\n---\nContent\n';
    assert.strictEqual(blankMarkdownBody(input), null);
  });

  it('should return null for TOML +++ delimiters', () => {
    const input = '+++\ntitle = "Hello"\n+++\nContent\n';
    assert.strictEqual(blankMarkdownBody(input), null);
  });

  it('should return null for JSON ;;; delimiters', () => {
    const input = ';;;\n{"title":"Hello"}\n;;;\nContent\n';
    assert.strictEqual(blankMarkdownBody(input), null);
  });

  it('should preserve line count', () => {
    const input = '---\ntitle: Hello\ndate: 2024\ndraft: true\n---\nLine 1\nLine 2\nLine 3\n';
    const result = blankMarkdownBody(input);
    assert.notStrictEqual(result, null);
    const inputLineCount = input.split(/\r?\n/).length;
    const outputLineCount = result.text.split(/\r?\n/).length;
    assert.strictEqual(outputLineCount, inputLineCount);
  });

  it('should return null when there is no closing delimiter', () => {
    const input = '---\ntitle: Hello\ndate: 2024\n';
    assert.strictEqual(blankMarkdownBody(input), null);
  });

  it('should handle front matter that ends at last line', () => {
    const input = '---\ntitle: Hello\n---';
    const result = blankMarkdownBody(input);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.endLine, 1);
  });
});

describe('FrontMatterTracker', () => {
  it('should track and retrieve documents', () => {
    const tracker = new FrontMatterTracker();
    tracker.set('file:///test.md', 3);
    assert.deepStrictEqual(tracker.get('file:///test.md'), { endLine: 3 });
    assert.strictEqual(tracker.has('file:///test.md'), true);
  });

  it('should return undefined for untracked documents', () => {
    const tracker = new FrontMatterTracker();
    assert.strictEqual(tracker.get('file:///unknown.md'), undefined);
    assert.strictEqual(tracker.has('file:///unknown.md'), false);
  });

  it('should delete tracked documents', () => {
    const tracker = new FrontMatterTracker();
    tracker.set('file:///test.md', 3);
    assert.strictEqual(tracker.delete('file:///test.md'), true);
    assert.strictEqual(tracker.has('file:///test.md'), false);
  });

  it('should update endLine on re-set', () => {
    const tracker = new FrontMatterTracker();
    tracker.set('file:///test.md', 3);
    tracker.set('file:///test.md', 5);
    assert.deepStrictEqual(tracker.get('file:///test.md'), { endLine: 5 });
  });
});

describe('isFrontMatterLanguage', () => {
  for (const id of ['markdown', 'mdx', 'mdc', 'rmd', 'quarto']) {
    it(`should return true for '${id}'`, () => {
      assert.strictEqual(isFrontMatterLanguage(id), true);
    });
  }

  for (const id of ['yaml', 'json', 'html', 'typescript', '']) {
    it(`should return false for '${id}'`, () => {
      assert.strictEqual(isFrontMatterLanguage(id), false);
    });
  }
});
