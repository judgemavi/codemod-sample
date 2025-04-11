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
      const cssBased = button.classList.contains(CLASS_SELECTOR);

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
  api: API,
): string | undefined {
  const src = file.source;

  try {
    if (file.path.endsWith('.html')) {
      return transformHtml(src);
    }
    if (file.path.endsWith('.ts')) {
      const j = api.jscodeshift.withParser('ts');
      const root = j(src);
      let modified = false;
      root
        .find(j.Decorator)
        .filter((path) => {
          const expr = path.value.expression;
          return (
            j.CallExpression.check(expr) &&
            j.Identifier.check(expr.callee) &&
            expr.callee.name === 'Component'
          );
        })
        .forEach((path) => {
          const expr = path.value.expression;
          if (!j.CallExpression.check(expr)) return;

          const arg = expr.arguments[0];
          if (!j.ObjectExpression.check(arg)) return;

          // Find the template property
          const templateProp = arg.properties.find(
            (prop) =>
              j.Property.check(prop) &&
              j.Identifier.check(prop.key) &&
              prop.key.name === 'template'
          );

          if (!templateProp || !j.Property.check(templateProp)) return;

          // Handle template string or literal
          if (j.TemplateLiteral.check(templateProp.value)) {
            const oldValue = templateProp.value.quasis[0].value.raw;
            const newValue = transformHtml(oldValue);
            if (oldValue !== newValue) {
              templateProp.value.quasis[0].value.raw = newValue;
              templateProp.value.quasis[0].value.cooked = newValue;
              modified = true;
            }
          } else if (j.StringLiteral.check(templateProp.value)) {
            const oldValue = templateProp.value.value;
            const newValue = transformHtml(oldValue);
            if (oldValue !== newValue) {
              templateProp.value.value = newValue;
              modified = true;
            }
          }
        });

      return modified ? root.toSource() : src;
    }
    return src;
  } catch (error) {
    console.error('Error in transformer:', error);
    return src;
  }
}
