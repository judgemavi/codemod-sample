import { FileInfo, API, Options } from 'jscodeshift';

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
): string | undefined {
  const j = api.jscodeshift;
  const src = file.source;
  const debug = options.debug || false;

  /**
   * Precise transformation for the specific button pattern provided
   * This handles the exact transformation requested in the example
   */
  function transformButtonPrecisely(html: string): string {
    // Look for the specific pattern to transform
    const pattern =
      /<button\s+\(click\)="([^"]+)"\s+mat-button\s+color="accent"\s+class="rkt-ButtonLink rkt-ButtonLink--is-small([^"]*)"\s+\[attr\.data-rmqa\]="([^"]+)"\s*>([\s\S]*?)<\/button>/g;

    return html.replace(
      pattern,
      (match, clickHandler, additionalClasses, dataRmqa, content) => {
        // Clean up additional classes - remove extra spaces
        additionalClasses = additionalClasses.trim();

        // Construct the new button
        return `<button (click)="${clickHandler}" rkt-button variant="accent" size="sm" class="${additionalClasses}" [attr.data-rmqa]="${dataRmqa}">${content}</button>`;
      }
    );
  }

  // Configuration for variant and size mappings
  const CONFIG = {
    variants: {
      accent: 'accent',
      primary: 'primary',
      default: 'default',
    },
    sizes: {
      'rkt-ButtonLink--is-small': 'sm',
      'rkt-ButtonLink--is-large': 'lg',
      default: 'md',
    },
  };

  /**
   * More generic transformation for any mat-button
   */
  function transformAngularTemplate(template: string): string {
    // First try the precise transformation
    let transformedTemplate = transformButtonPrecisely(template);

    // Apply the generic transformation to the entire template
    const buttonRegex = /<button[^>]*mat-button[^>]*>([\s\S]*?)<\/button>/g;

    transformedTemplate = transformedTemplate.replace(buttonRegex, (match) => {
      // Replace mat-button with rkt-button
      let result = match.replace(/mat-button/g, 'rkt-button');

      // Dynamically determine variant based on color attribute
      const colorMatch = result.match(/color="([^"]*)"/);
      if (colorMatch) {
        const color = colorMatch[1];
        const variant = CONFIG.variants[color] || CONFIG.variants.default;
        result = result.replace(/color="[^"]*"/, `variant="${variant}"`);
      }

      // Extract the class attribute value
      const classMatch = result.match(/class="([^"]*)"/);
      if (classMatch) {
        const classes = classMatch[1];
        let newClasses = classes;
        let size = CONFIG.sizes.default; // Default size

        // Determine size based on class
        for (const [key, value] of Object.entries(CONFIG.sizes)) {
          if (key !== 'default' && classes.includes(key)) {
            size = value;
            break;
          }
        }

        // Remove rkt-ButtonLink classes
        newClasses = classes
          .replace('rkt-ButtonLink rkt-ButtonLink--is-small', '')
          .replace('rkt-ButtonLink--is-small', '')
          .replace('rkt-ButtonLink--is-large', '')
          .replace('rkt-ButtonLink', '')
          .trim();

        // Update the class attribute
        if (newClasses) {
          result = result.replace(/class="[^"]*"/, `class="${newClasses}"`);
        } else {
          // Remove the class attribute if it's empty
          result = result.replace(/\s*class="[^"]*"/, '');
        }

        // Add size attribute
        if (!result.includes('size="')) {
          result = result.replace(/<button/, `<button size="${size}"`);
        }
      }

      return result;
    });

    return transformedTemplate;
  }

  try {
    // For TypeScript files with inline templates
    if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
      const root = j(src);
      let modified = false;

      // Process template strings in component decorators
      root.find(j.ClassDeclaration).forEach((classPath) => {
        // Find Angular @Component decorators
        j(classPath)
          .find(j.Decorator)
          .forEach((decoratorPath) => {
            const expression = decoratorPath.value.expression;

            // Check if this is a Component decorator
            if (
              expression.type === 'CallExpression' &&
              expression.callee.type === 'Identifier' &&
              expression.callee.name === 'Component'
            ) {
              // Find the template property in the decorator
              j(decoratorPath)
                .find(j.Property, {
                  key: {
                    name: 'template',
                  },
                })
                .forEach((templatePath) => {
                  modified = true;

                  // Handle string literals
                  if (templatePath.value.value.type === 'StringLiteral') {
                    const oldValue = templatePath.value.value.value;
                    templatePath.value.value.value =
                      transformAngularTemplate(oldValue);

                    if (debug && oldValue !== templatePath.value.value.value) {
                      console.log(`Transformed template in ${file.path}`);
                    }
                  }

                  // Handle template literals
                  if (templatePath.value.value.type === 'TemplateLiteral') {
                    templatePath.value.value.quasis.forEach((quasi) => {
                      const oldRaw = quasi.value.raw;
                      const oldCooked = quasi.value.cooked;

                      if (oldRaw) {
                        quasi.value.raw = transformAngularTemplate(oldRaw);
                      }
                      if (oldCooked) {
                        quasi.value.cooked =
                          transformAngularTemplate(oldCooked);
                      }

                      if (
                        debug &&
                        (oldRaw !== quasi.value.raw ||
                          oldCooked !== quasi.value.cooked)
                      ) {
                        console.log(
                          `Transformed template literal in ${file.path}`
                        );
                      }
                    });
                  }
                });
            }
          });
      });

      return modified ? root.toSource() : src;
    }

    // For standalone template files (.html)
    if (file.path.endsWith('.html')) {
      const transformed = transformAngularTemplate(src);
      if (debug && transformed !== src) {
        console.log(`Transformed HTML file: ${file.path}`);
      }
      return transformed;
    }

    // For other file types, return unchanged
    return src;
  } catch (error) {
    console.error(`Error processing ${file.path}:`, error);
    return src; // Return original source on error
  }
}
