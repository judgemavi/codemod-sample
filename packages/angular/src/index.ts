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

const IMPORT_REPLACEMENTS = {
  '@angular/material/button': {
    module: '@rds/angular-button',
    symbolMap: {
      'MatButtonModule': 'RktButton'
    }
  },
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

const transformImports = (sourceFile: SourceFile) => {
  sourceFile.getImportDeclarations().forEach((importDecl) => {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const replacement = IMPORT_REPLACEMENTS[moduleSpecifier];

    if (replacement) {
      // Update module specifier
      importDecl.setModuleSpecifier(replacement.module);

      // Update named imports
      const namedImports = importDecl.getNamedImports();
      namedImports.forEach((namedImport) => {
        const importName = namedImport.getName();
        if (replacement.symbolMap[importName]) {
          namedImport.setName(replacement.symbolMap[importName]);
        }
      });

      // If there are no named imports, add them
      if (namedImports.length === 0) {
        const firstValue = Object.values(replacement.symbolMap)[0];
        if (firstValue) {
          importDecl.addNamedImport(firstValue);
        }
      }
    }
  });
};

export function handleSourceFile(sourceFile: SourceFile): string | undefined {
  // Handle imports first
  transformImports(sourceFile);

  // Handle template transformations
  sourceFile
    .getDescendantsOfKind(SyntaxKind.Decorator)
    .forEach((decorator) => {
      if (decorator.getName() === 'Component') {
        const decoratorCall = decorator.getCallExpression();
        if (!decoratorCall) return;

        const [argument] = decoratorCall.getArguments();
        if (!argument) return;

        // Handle template transformation
        const template = argument.getFirstDescendantByKind(SyntaxKind.TemplateExpression) 
          || argument.getFirstDescendantByKind(SyntaxKind.NoSubstitutionTemplateLiteral)
          || argument.getFirstDescendantByKind(SyntaxKind.StringLiteral);

        if (template) {
          const originalTemplate = template.getText();
          const cleanTemplate = originalTemplate.replace(/^[`'"]([\s\S]*)[`'"]$/, '$1');
          const transformedTemplate = transformHtml(cleanTemplate);
          template.replaceWithText(`\`${transformedTemplate}\``);
        }

        // Handle imports array transformation
        const importsProperty = argument.getFirstDescendantByKind(SyntaxKind.PropertyAssignment);
        if (importsProperty && importsProperty.getName() === 'imports') {
          const arrayLiteral = importsProperty.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);
          if (arrayLiteral) {
            const elements = arrayLiteral.getElements();
            elements.forEach(element => {
              const text = element.getText();
              // Check all import replacements for matching symbols
              Object.values(IMPORT_REPLACEMENTS).forEach(replacement => {
                if (Object.keys(replacement.symbolMap).includes(text)) {
                  element.replaceWithText(replacement.symbolMap[text]);
                }
              });
            });
          }
        }
      }
    });

  return sourceFile.getFullText();
}

