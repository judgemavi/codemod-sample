import { describe, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert';
import { extname } from 'node:path';
import * as jscodeshift from 'jscodeshift';
import transformer from '../src/index';

const transform = (beforeText: string, afterText: string, path: string) => {
  const j = jscodeshift.withParser('html');
  const actual = transformer(
    { source: beforeText, path },
    { j, jscodeshift: j },
    {}
  )?.replace(/\s/gm, '');

  const expected = afterText.replace(/\s/gm, '');

  return {
    actual,
    expected,
  };
};

describe('html', () => {
  it('test #1', async () => {
    const INPUT = await readFile(new URL('../__testfixtures__/fixture1.input.html', import.meta.url), 'utf-8');
    const OUTPUT = await readFile(new URL('../__testfixtures__/fixture1.output.html', import.meta.url), 'utf-8');
    
    const { actual, expected } = transform(
      INPUT,
      OUTPUT,
      'index.html',
    );

    assert.deepEqual(actual, expected);
  });
});

