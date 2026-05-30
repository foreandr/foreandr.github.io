const OCR_SYMBOLS = /[£¥€¢§©®™¶¦¬±×÷]/g;
const NOISE_TOKEN_RE = /^(?=.*[A-Z])[A-Z0-9]{1,4}$/;
const SAFE_PUNCT_RE = /[^0-9A-Za-z\s.,;:!?'"()[\]\-]/g;

function normalizeWhitespace(text) {
  return text.replace(/\r/g, '\n').replace(/\t/g, ' ').replace(/\u00a0/g, ' ');
}

function normalizeQuotesAndDashes(text) {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');
}

function normalizeCommonOcrMistakes(text) {
  return text
    .replace(/\bTnspect\b/g, 'Inspect')
    .replace(/\bVe\b/g, 'We')
    .replace(/\bsentiiice\b/gi, 'sentence')
    .replace(/\bies(?=\s+\d)/gi, 'series')
    .replace(/\bth are\b/gi, 'these are')
    .replace(/\bconsid=\s*ered\b/gi, 'considered')
    .replace(/\bin=\s*tended\b/gi, 'intended')
    .replace(/\bpe of\b/gi, 'type of')
    .replace(/\ba ule\b/gi, 'a rule')
    .replace(/\bctc\b/gi, 'etc.')
    .replace(/\brom\b(?=\s+[A-Z]?[a-z])/g, 'from');
}

function cleanToken(rawToken) {
  let token = rawToken.replace(OCR_SYMBOLS, '').replace(SAFE_PUNCT_RE, '');
  if (!token) return '';
  if (NOISE_TOKEN_RE.test(token) && !/^[IVXLCDM]+$/.test(token)) return '';
  if (/^[^A-Za-z0-9]+$/.test(token)) return '';
  if (/[A-Za-z]/.test(token) && (token.match(/[A-Z]/g) || []).length === token.length && token.length <= 4 && !/[AEIOUY]/.test(token) && !/^[IVXLCDM]+$/.test(token)) return '';
  return token;
}

function mergeBrokenWords(tokens) {
  const merged = [];
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    if (!token) continue;

    if (token.endsWith('-')) {
      const next = tokens[i + 1] || '';
      if (/^[A-Za-z]{2,}$/.test(next)) {
        merged.push(token.slice(0, -1) + next);
        i++;
        continue;
      }
    }

    if (/^[A-Za-z]{2,}$/.test(token) && i + 2 < tokens.length) {
      const middle = tokens[i + 1] || '';
      const next = tokens[i + 2] || '';
      if (middle && NOISE_TOKEN_RE.test(middle) && /^[A-Za-z]{2,}$/.test(next)) {
        merged.push(token + next);
        i += 2;
        continue;
      }
    }

    if (/^[A-Za-z]{1,4}=$/.test(token)) {
      const next = tokens[i + 1] || '';
      if (/^[A-Za-z]{2,}$/.test(next)) {
        merged.push(token.slice(0, -1) + next);
        i++;
        continue;
      }
    }

    merged.push(token);
  }
  return merged;
}

function lineLooksLikePageMarker(line) {
  return /^(?:page\s+)?[\divxlcdm]+(?:\s+of\s+\d+)?$/i.test(line.trim());
}

function isGarbageLine(line) {
  if (!line) return true;
  if (lineLooksLikePageMarker(line)) return true;
  if (/^(?:photo|national library|archive of|all photographs|private collection)\b/i.test(line)) return true;
  const chars = line.replace(/\s+/g, '');
  if (!chars) return true;
  const alphaNum = (chars.match(/[A-Za-z0-9]/g) || []).length;
  if (alphaNum / chars.length < 0.55) return true;
  const weirdCaps = line.split(/\s+/).filter(token => token && NOISE_TOKEN_RE.test(token)).length;
  if (weirdCaps >= 2) return true;
  return false;
}

function cleanOcrText(raw) {
  let text = normalizeQuotesAndDashes(normalizeWhitespace(raw || ''));
  text = text.replace(/%/g, ' percent ');
  text = text.replace(/[|]/g, 'I');
  text = text.replace(OCR_SYMBOLS, ' ');
  text = normalizeCommonOcrMistakes(text);

  const lines = text.split('\n');
  const keptLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      if (keptLines.length && keptLines[keptLines.length - 1] !== '') keptLines.push('');
      continue;
    }

    line = line.replace(/\s+/g, ' ');
    const cleanedTokens = mergeBrokenWords(line.split(/\s+/).map(cleanToken).filter(Boolean));
    line = cleanedTokens.join(' ');
    line = normalizeCommonOcrMistakes(line)
      .replace(/\b([A-Za-z]{2,})\s*-\s*([A-Za-z]{2,})\b/g, '$1$2')
      .replace(/\b([A-Za-z]{2,})=\s*([A-Za-z]{2,})\b/g, '$1$2')
      .replace(/\b([A-Za-z])\s+([,.;:!?])/g, '$1$2')
      .replace(/(\d),(\d)/g, '$1, $2')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([,.;:!?])([A-Za-z])/g, '$1 $2')
      .replace(/ {2,}/g, ' ')
      .trim();

    if (!line || isGarbageLine(line)) continue;
    keptLines.push(line);
  }

  const paragraphs = [];
  let current = '';
  for (const line of keptLines) {
    if (!line) {
      if (current) {
        paragraphs.push(current.trim());
        current = '';
      }
      continue;
    }

    const startsList = /^\d+\.\s+/.test(line);
    const keepSeparate = startsList || /^[A-Z][A-Z0-9 ,.'"-]{3,}$/.test(line) || line.length < 26;

    if (!current) {
      current = line;
      if (keepSeparate) {
        paragraphs.push(current.trim());
        current = '';
      }
      continue;
    }

    if (keepSeparate || /[.!?:"']$/.test(current)) {
      paragraphs.push(current.trim());
      current = line;
      if (keepSeparate) {
        paragraphs.push(current.trim());
        current = '';
      }
      continue;
    }

    current += (current.endsWith('-') ? '' : ' ') + line;
  }
  if (current) paragraphs.push(current.trim());

  return paragraphs
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function qualityScoreText(text) {
  const sample = (text || '').trim();
  if (!sample) return 0;
  const words = sample.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) || [];
  const alphaNum = (sample.match(/[A-Za-z0-9]/g) || []).length;
  const badSymbols = (sample.match(/[^A-Za-z0-9\s.,;:!?'"()[\]\-]/g) || []).length;
  const noiseTokens = sample.split(/\s+/).filter(token => NOISE_TOKEN_RE.test(token)).length;
  const paragraphs = sample.split(/\n{2,}/).filter(Boolean).length;

  let score = 0;
  score += Math.min(words.length, 140) * 2;
  score += Math.min(paragraphs, 12) * 6;
  score += Math.min(alphaNum, 900) * 0.04;
  score -= badSymbols * 12;
  score -= noiseTokens * 14;
  if (/[a-z]{3,}\s+[a-z]{3,}/.test(sample)) score += 30;
  if (/^\d+\.\s+/m.test(sample)) score += 10;
  return score;
}

function isLikelyBlankPage(text) {
  const cleaned = cleanOcrText(text || '');
  const words = cleaned.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) || [];
  return words.length < 5 || qualityScoreText(cleaned) < 45;
}

function extractStructuredPdfText(items, viewportWidth) {
  if (!items?.length) return '';

  const usable = items
    .filter(item => item?.str && item.str.trim())
    .map(item => ({
      str: normalizeQuotesAndDashes(item.str).replace(/\s+/g, ' ').trim(),
      x: item.transform?.[4] || 0,
      y: item.transform?.[5] || 0,
      width: item.width || 0,
      height: Math.abs(item.height || item.transform?.[3] || 10) || 10,
      hasEOL: Boolean(item.hasEOL)
    }))
    .filter(item => item.str);

  if (usable.length < 8) return '';

  const sorted = usable.sort((a, b) => {
    const dy = b.y - a.y;
    return Math.abs(dy) > 2 ? dy : a.x - b.x;
  });

  const heights = sorted.map(item => item.height).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 10;
  const sameLineTolerance = Math.max(2, medianHeight * 0.55);
  const pageCenter = viewportWidth / 2;

  const lines = [];
  let currentLine = [];
  let currentY = sorted[0].y;

  function flushLine() {
    if (!currentLine.length) return;
    currentLine.sort((a, b) => a.x - b.x);
    let text = '';
    for (let i = 0; i < currentLine.length; i++) {
      const part = currentLine[i];
      const prev = currentLine[i - 1];
      const gap = prev ? part.x - (prev.x + prev.width) : 0;
      const joinWithoutSpace = prev && /[-/]$/.test(prev.str);
      if (i > 0 && !joinWithoutSpace && gap > medianHeight * 0.12) text += ' ';
      text += part.str;
    }

    const x0 = currentLine[0].x;
    const x1 = currentLine[currentLine.length - 1].x + currentLine[currentLine.length - 1].width;
    const width = Math.max(1, x1 - x0);
    const center = x0 + width / 2;
    const indent = x0;
    lines.push({
      text: text.trim(),
      y: currentY,
      indent,
      width,
      centered: Math.abs(center - pageCenter) < viewportWidth * 0.12 && width < viewportWidth * 0.7,
      isList: /^\d+\.\s+/.test(text.trim())
    });
    currentLine = [];
  }

  for (const item of sorted) {
    if (!currentLine.length) {
      currentLine.push(item);
      currentY = item.y;
      continue;
    }

    if (Math.abs(item.y - currentY) <= sameLineTolerance) {
      currentLine.push(item);
      continue;
    }

    flushLine();
    currentLine.push(item);
    currentY = item.y;
  }
  flushLine();

  if (!lines.length) return '';

  const blocks = [];
  let block = [];

  function flushBlock() {
    if (!block.length) return;
    const first = block[0];
    if (first.centered || block.every(line => line.isList)) {
      blocks.push(block.map(line => line.text).join('\n'));
    } else {
      const merged = [];
      for (let i = 0; i < block.length; i++) {
        const line = block[i].text;
        if (!merged.length) {
          merged.push(line);
          continue;
        }

        const prev = merged[merged.length - 1];
        if (/^\d+\.\s+/.test(line)) {
          merged.push(line);
        } else if (/[.!?:"']$/.test(prev)) {
          merged.push(line);
        } else {
          merged[merged.length - 1] = prev + (prev.endsWith('-') ? '' : ' ') + line;
        }
      }
      blocks.push(merged.join('\n'));
    }
    block = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = lines[i - 1];
    if (!prev) {
      block.push(line);
      continue;
    }

    const gap = prev.y - line.y;
    const indentDelta = Math.abs(line.indent - prev.indent);
    const styleBreak = line.centered !== prev.centered || line.isList !== prev.isList;
    const paragraphBreak = gap > medianHeight * 1.6 || indentDelta > medianHeight * 2.4;

    if (styleBreak || paragraphBreak) {
      flushBlock();
    }
    block.push(line);
  }
  flushBlock();

  return cleanOcrText(blocks.join('\n\n'));
}

const api = {
  cleanOcrText,
  extractStructuredPdfText,
  isLikelyBlankPage,
  qualityScoreText
};

if (typeof window !== 'undefined') {
  window.AudiobookExtractionCore = api;
}

export { cleanOcrText, extractStructuredPdfText, isLikelyBlankPage, qualityScoreText };
