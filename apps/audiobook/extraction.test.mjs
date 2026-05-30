import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanOcrText,
  extractStructuredPdfText,
  isLikelyBlankPage,
  qualityScoreText
} from './extraction-core.js';

test('cleanOcrText strips OCR junk and repairs broken prose', () => {
  const input = `We have, for instance, an apparent memorandum in 1 £ which the awkwardness
of the wording, or some other fac- BOX DS tor, has drawn our attention to the possibility of cipher: FROY¥
"Tnspect details for Trigleth - acknowledge the bonds 5% E11 rom Fewell. Ve arrange these words in"`;

  const output = cleanOcrText(input);
  assert.match(output, /some other factor, has drawn our attention/i);
  assert.doesNotMatch(output, /BOX DS|FROY|£|¥|E11/);
});

test('cleanOcrText preserves readable punctuation while fixing OCR joins', () => {
  const input = `Many writers have shown alphabets of the biform and triform types applied
to open-letter communications by making the significant factor the number of vowels
contained in successive words. Thus, the sentiiice given above yields a ies 1,3, 1, 2, 1, 4, 4, 1, 4.
Using a biform alphabet, th are usually consid= ered simply as odd and even; with a triform alphabet,
some disposition must be made of numbers larger than 3.`;

  const output = cleanOcrText(input);
  assert.match(output, /sentence given above yields a series 1, 3, 1, 2, 1, 4, 4, 1, 4\./i);
  assert.match(output, /these are usually considered simply as odd and even/i);
});

test('extractStructuredPdfText keeps headings paragraphs and numbered lists separate', () => {
  const items = [
    { str: 'CHAPTER I', transform: [0, 0, 0, 0, 290, 740], width: 90, height: 14, hasEOL: false },
    { str: 'GENERAL INFORMATION', transform: [0, 0, 0, 0, 250, 710], width: 160, height: 12, hasEOL: false },
    { str: 'The subject which we are about to study is the analysis and solution of cipher,', transform: [0, 0, 0, 0, 120, 650], width: 360, height: 10, hasEOL: false },
    { str: 'though not including code, which is a very special form of cipher.', transform: [0, 0, 0, 0, 120, 636], width: 330, height: 10, hasEOL: false },
    { str: 'Ciphers, in general, fall into three major classifications:', transform: [0, 0, 0, 0, 120, 560], width: 320, height: 10, hasEOL: false },
    { str: '1. Concealment Cipher', transform: [0, 0, 0, 0, 165, 540], width: 160, height: 10, hasEOL: false },
    { str: '2. Transposition Cipher', transform: [0, 0, 0, 0, 165, 526], width: 170, height: 10, hasEOL: false },
    { str: '3. Substitution Cipher', transform: [0, 0, 0, 0, 165, 512], width: 165, height: 10, hasEOL: false }
  ];

  const text = extractStructuredPdfText(items, 600);
  assert.match(text, /CHAPTER I\s*\n\s*GENERAL INFORMATION/);
  assert.match(text, /cipher,\s+though not including code/i);
  assert.match(text, /classifications:\s*\n1\. Concealment Cipher\s*\n2\. Transposition Cipher\s*\n3\. Substitution Cipher/i);
});

test('blank-page detection drops empty or junk-only pages', () => {
  assert.equal(isLikelyBlankPage(''), true);
  assert.equal(isLikelyBlankPage('PAGE 14'), true);
  assert.equal(isLikelyBlankPage('¥ £ BOX DS FROY'), true);
  assert.equal(isLikelyBlankPage('This is a real paragraph with enough readable words to keep.'), false);
});

test('qualityScoreText prefers readable prose over OCR garbage', () => {
  const clean = 'This is a readable paragraph with normal punctuation and stable word boundaries.';
  const junk = 'FROY¥ E11 BOX DS 1 £ ???';
  assert.ok(qualityScoreText(clean) > qualityScoreText(junk));
});
