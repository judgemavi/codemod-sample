import { type SourceFile, SyntaxKind } from "ts-morph";
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
      const cssBased = button.classList.contains(CLASS_SELECTOR) && !button.hasAttribute(ATTR_SELECTOR);

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

export function handleSourceFile(sourceFile: SourceFile): string | undefined {
  sourceFile
    .getDescendantsOfKind(SyntaxKind.Decorator)
    .forEach((decorator) => {
      if (decorator.getName() === 'Component') {
        const decoratorCall = decorator.getCallExpression();
        if (!decoratorCall) return;

        const [argument] = decoratorCall.getArguments();
        if (!argument) return;

        const template = argument.getFirstDescendantByKind(SyntaxKind.TemplateExpression) 
          || argument.getFirstDescendantByKind(SyntaxKind.NoSubstitutionTemplateLiteral)
          || argument.getFirstDescendantByKind(SyntaxKind.StringLiteral);

        if (template) {
          const originalTemplate = template.getText();
          // Remove backticks or quotes from the template string
          const cleanTemplate = originalTemplate.replace(/^[`'"]([\s\S]*)[`'"]$/, '$1');
          const transformedTemplate = transformHtml(cleanTemplate);
          
          template.replaceWithText(`\`${transformedTemplate}\``);
        }
      }
    });

  return sourceFile.getFullText();
}

