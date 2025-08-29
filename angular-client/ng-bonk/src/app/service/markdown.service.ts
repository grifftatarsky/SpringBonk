import { Injectable } from '@angular/core';

// TODO __ Do I even need this?
@Injectable({ providedIn: 'root' })
export class MarkdownService {
  toHtml(src: string | null | undefined): string {
    if (!src) return '';
    let text: string = this.escapeHtml(src);

    // Headings (support up to ###)
    text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Bold then italic
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links [text](url)
    text = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_m: string, label, url): string => {
        const safeUrl = this.isSafeUrl(url) ? url : '#';
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      }
    );

    // Paragraphs: split on blank lines
    const paragraphs: string[] = text
      .split(/\n\s*\n/g)
      .map((p: string): string => p.replace(/\n/g, '<br>'))
      .map((p: string): string =>
        p.trim().startsWith('<h') ? p : `<p>${p}</p>`
      );
    return paragraphs.join('\n');
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private isSafeUrl(url: string): boolean {
    try {
      const u = new URL(url, window.location.origin);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
