import { describe, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { handleSourceFile } from '../src/index.js';
import { Project } from 'ts-morph';
import assert from 'node:assert';
import { extname } from 'node:path';

const transform = (beforeText: string, afterText: string, path: string) => {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipFileDependencyResolution: true,
    compilerOptions: {
      allowJs: true,
    },
  });

  const actualSourceFile = project.createSourceFile(path, beforeText);

  const actual = handleSourceFile(actualSourceFile)?.replace(/\s/gm, '');

  const expected = project
    .createSourceFile(`expected${extname(path)}`, afterText)
    .getFullText()
    .replace(/\s/gm, '');

  return {
    actual,
    expected,
  };
};

describe('angular', () => {
  it('test #1', async () => {
    const INPUT = await readFile(new URL('../__testfixtures__/fixture1.input.ts', import.meta.url), 'utf-8');
    const OUTPUT = await readFile(new URL('../__testfixtures__/fixture1.output.ts', import.meta.url), 'utf-8');
    
    const { actual, expected } = transform(
      INPUT,
      OUTPUT,
      'index.tsx',
    );

    assert.deepEqual(actual, expected);
  });
});

