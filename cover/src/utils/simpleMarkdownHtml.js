import { buildMarkdownArticle } from './markdownArticle';

/** 轻量 Markdown → HTML（预览 / 文章页，非完整规范实现） */
export function simpleMarkdownToHtml(markdown) {
  return buildMarkdownArticle(markdown).html;
}

export { buildMarkdownArticle, parseMarkdownOutline, parseSectionsOutline } from './markdownArticle';
