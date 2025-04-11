import { FileInfo, API } from 'jscodeshift';
import { parse } from 'node-html-parser';

const ATTR_SELECTOR = 'mat-button';
const NEW_ATTR_SELECTOR = 'rkt-button';
const CLASS_SELECTOR = 'rkt-ButtonLink';
const NEW_CLASS_SELECTOR = 'rkt-Button';
const COLOR_ATTR = 'color';
const NEW_COLOR_ATTR = 'variant';
const NEW_SIZE_ATTR = 'size';

const VARIANT_MAP = {
  accent: 'accent',
  primary: 'primary',
  default: 'default',
};

const SIZE_MAP = {
  'rkt-ButtonLink--is-small': 'sm',
  'rkt-ButtonLink--is-large': 'lg',
};

const transformHtml = (html: string): string => {
  try {
    const doc = parse(html.trim());
    const matButtons = doc.querySelectorAll(
      `[${ATTR_SELECTOR}], .${CLASS_SELECTOR}`
    );

    matButtons.forEach((button) => {
      const cssBased =
        button.classList.contains(CLASS_SELECTOR) &&
        !button.hasAttribute(ATTR_SELECTOR);

      if (button.hasAttribute(ATTR_SELECTOR)) {
        button.setAttribute(NEW_ATTR_SELECTOR, '');
        button.removeAttribute(ATTR_SELECTOR);
      }

      if (button.hasAttribute(COLOR_ATTR)) {
        const color = button.getAttribute(COLOR_ATTR);
        if (color && VARIANT_MAP[color]) {
          button.setAttribute(NEW_COLOR_ATTR, VARIANT_MAP[color]);
          button.removeAttribute(COLOR_ATTR);
        }
      }

      const classList = button.classList.toString().split(' ');
      classList.forEach((cls) => {
        if (SIZE_MAP[cls]) {
          button.classList.remove(cls);
          button.setAttribute(NEW_SIZE_ATTR, SIZE_MAP[cls]);
        }
      });

      button.classList.remove(CLASS_SELECTOR);
      if (cssBased) {
        button.classList.add(NEW_CLASS_SELECTOR);
      }
    });

    const result = doc.toString();
    return result;
  } catch (error) {
    console.error('Error transforming HTML:', error);
    return html;
  }
};

export default function transformer(
  file: FileInfo,
  api: API
): string | undefined {
  const src = file.source;

  try {
    if (file.path.endsWith('.html')) {
      return transformHtml(src);
    }
    return src;
  } catch (error) {
    console.error('Error in transformer:', error);
    return src;
  }
}
