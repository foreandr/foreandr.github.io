import { ISA } from "./machine-core.js";

const REGISTER_CODES = {
  A: 0x00,
  B: 0x01,
  C: 0x02,
  D: 0x03,
  X: 0x04,
  Y: 0x05,
};

const ISA_BY_MNEMONIC = new Map(ISA.map((entry) => [entry.mnemonic, entry]));

function stripComment(line) {
  return line.replace(/[;#].*$/, "").trim();
}

function splitCsv(text) {
  return text.split(",").map((part) => part.trim()).filter(Boolean);
}

function isRegisterOperand(operandName) {
  return operandName.toLowerCase().includes("reg") || ["dst", "src", "left", "right"].includes(operandName);
}

function parseNumericLiteral(token) {
  if (/^0x[0-9a-f]+$/i.test(token)) return Number.parseInt(token.slice(2), 16);
  if (/^0b[01]+$/i.test(token)) return Number.parseInt(token.slice(2), 2);
  if (/^\d+$/.test(token)) return Number.parseInt(token, 10);
  return null;
}

function normalizeByte(value, context) {
  if (!Number.isFinite(value) || value < 0 || value > 0xff) {
    throw new Error(`${context} is out of 8-bit range: ${value}`);
  }
  return value & 0xff;
}

function parseLine(rawLine, lineNumber) {
  const line = stripComment(rawLine);
  if (!line) return null;

  let rest = line;
  const labels = [];
  while (true) {
    const match = rest.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
    if (!match) break;
    labels.push(match[1].toUpperCase());
    rest = rest.slice(match[0].length).trim();
  }

  if (!rest) {
    return { type: "labels", labels, lineNumber };
  }

  const constantMatch = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
  if (constantMatch) {
    return {
      type: "constant",
      labels,
      name: constantMatch[1].toUpperCase(),
      valueToken: constantMatch[2].trim(),
      lineNumber,
    };
  }

  const directiveMatch = rest.match(/^DB\b(.*)$/i);
  if (directiveMatch) {
    return {
      type: "db",
      labels,
      args: splitCsv(directiveMatch[1]),
      lineNumber,
    };
  }

  const [mnemonicToken, ...tail] = rest.split(/\s+/);
  const mnemonic = mnemonicToken.toUpperCase();
  const argString = rest.slice(mnemonicToken.length).trim();
  const args = argString ? splitCsv(argString) : [];
  return {
    type: "instruction",
    labels,
    mnemonic,
    args,
    lineNumber,
  };
}

function resolveValue(token, symbols, context) {
  const normalized = token.toUpperCase();
  const numeric = parseNumericLiteral(normalized);
  if (numeric !== null) {
    return normalizeByte(numeric, context);
  }
  if (normalized in symbols) {
    return normalizeByte(symbols[normalized], context);
  }
  throw new Error(`${context} could not resolve symbol: ${token}`);
}

export function assemble(source) {
  const parsedLines = source
    .split(/\r?\n/)
    .map((line, index) => parseLine(line, index + 1))
    .filter(Boolean);

  const symbols = {};
  const entries = [];
  let address = 0;

  for (const line of parsedLines) {
    if (line.type === "constant") {
      const value = resolveValue(line.valueToken, symbols, `Line ${line.lineNumber} constant ${line.name}`);
      symbols[line.name] = value;
      for (const label of line.labels) {
        symbols[label] = address;
      }
      continue;
    }

    for (const label of line.labels ?? []) {
      symbols[label] = address;
    }

    if (line.type === "labels") {
      continue;
    }

    if (line.type === "db") {
      entries.push({ ...line, address });
      address += line.args.length;
      continue;
    }

    const spec = ISA_BY_MNEMONIC.get(line.mnemonic);
    if (!spec) {
      throw new Error(`Line ${line.lineNumber}: unknown mnemonic ${line.mnemonic}`);
    }
    if (line.args.length !== spec.operands.length) {
      throw new Error(`Line ${line.lineNumber}: ${line.mnemonic} expects ${spec.operands.length} operand(s), got ${line.args.length}`);
    }
    entries.push({ ...line, spec, address });
    address += 1 + spec.operands.length;
  }

  const bytes = [];
  const listing = [];

  for (const entry of entries) {
    if (entry.type === "db") {
      const data = entry.args.map((arg) => resolveValue(arg, symbols, `Line ${entry.lineNumber} DB`));
      bytes.push(...data);
      listing.push({ address: entry.address, text: `DB ${entry.args.join(", ")}`, bytes: data });
      continue;
    }

    const encoded = [entry.spec.opcode];
    entry.spec.operands.forEach((operandName, index) => {
      const token = entry.args[index];
      if (isRegisterOperand(operandName)) {
        const registerCode = REGISTER_CODES[token.toUpperCase()];
        if (registerCode === undefined) {
          throw new Error(`Line ${entry.lineNumber}: unknown register ${token}`);
        }
        encoded.push(registerCode);
      } else {
        encoded.push(resolveValue(token, symbols, `Line ${entry.lineNumber} operand ${operandName}`));
      }
    });
    bytes.push(...encoded);
    listing.push({
      address: entry.address,
      text: `${entry.mnemonic} ${entry.args.join(", ")}`.trim(),
      bytes: encoded,
    });
  }

  return { bytes, symbols, listing };
}
