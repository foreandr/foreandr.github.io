function countIndent(raw) {
  let count = 0;
  for (const char of raw) {
    if (char === " ") count += 1;
    else break;
  }
  return count;
}

function stripComment(line) {
  return line.replace(/#.*$/, "").trimEnd();
}

function parseLines(source) {
  const rows = source.replace(/\t/g, "    ").split(/\r?\n/);
  const result = [];
  for (let index = 0; index < rows.length; index += 1) {
    const raw = stripComment(rows[index]);
    if (!raw.trim()) continue;
    const indent = countIndent(raw);
    if (indent % 4 !== 0) {
      throw new Error(`Indentation must use multiples of 4 spaces on line ${index + 1}`);
    }
    result.push({
      lineNumber: index + 1,
      indent: indent / 4,
      text: raw.trim(),
    });
  }
  return result;
}

function transpilePyLite(source) {
  const lines = parseLines(source);
  const declared = new Set();
  const out = [];
  let currentIndent = 0;

  function closeTo(targetIndent) {
    while (currentIndent > targetIndent) {
      currentIndent -= 1;
      out.push(`${"  ".repeat(currentIndent)}}`);
    }
  }

  function emit(text) {
    out.push(`${"  ".repeat(currentIndent)}${text}`);
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1] ?? null;

    if (line.indent > currentIndent + 1) {
      throw new Error(`Indent jumps too far on line ${line.lineNumber}`);
    }
    if (line.indent < currentIndent) {
      closeTo(line.indent);
    }
    if (line.indent > currentIndent) {
      throw new Error(`Unexpected indent on line ${line.lineNumber}`);
    }

    const whileMatch = line.text.match(/^while\s+(.+):$/);
    if (whileMatch) {
      emit(`while (${whileMatch[1]}) {`);
      currentIndent += 1;
      if (!next || next.indent !== currentIndent) {
        throw new Error(`while on line ${line.lineNumber} must have an indented block`);
      }
      continue;
    }

    const ifMatch = line.text.match(/^if\s+(.+):$/);
    if (ifMatch) {
      emit(`if (${ifMatch[1]}) {`);
      currentIndent += 1;
      if (!next || next.indent !== currentIndent) {
        throw new Error(`if on line ${line.lineNumber} must have an indented block`);
      }
      continue;
    }

    const screenMatch = line.text.match(/^screen\[(.+)\]\s*=\s*(.+)$/);
    if (screenMatch) {
      emit(`screen[${screenMatch[1]}] = ${screenMatch[2]};`);
      continue;
    }

    const assignMatch = line.text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
    if (assignMatch) {
      const [, name, expr] = assignMatch;
      if (declared.has(name)) {
        emit(`${name} = ${expr};`);
      } else {
        declared.add(name);
        emit(`uint8 ${name} = ${expr};`);
      }
      continue;
    }

    throw new Error(`Unsupported python-like syntax on line ${line.lineNumber}: ${line.text}`);
  }

  closeTo(0);

  return {
    cSource: out.join("\n"),
  };
}

export { transpilePyLite };
