const TOKEN_REGEX = /\s+|0x[0-9a-fA-F]+|0b[01]+|\d+|==|!=|<<|>>|[A-Za-z_][A-Za-z0-9_]*|[{}()[\];,+\-=&|^<>]/gy;
const VAR_BASE = 0xd0;
const SCREEN_BASE = 0x80;
const INPUT_UP_ADDR = 0xc0;
const INPUT_DOWN_ADDR = 0xc1;
const INPUT_START_ADDR = 0xc2;
const VAR_LIMIT = 0x100;

function tokenize(source) {
  const tokens = [];
  const cleaned = source.replace(/\/\/.*$/gm, "");
  TOKEN_REGEX.lastIndex = 0;
  let match;
  while ((match = TOKEN_REGEX.exec(cleaned))) {
    const value = match[0];
    if (!value.trim()) continue;
    tokens.push(value);
  }
  return tokens;
}

function parseNumber(token) {
  if (/^0x/i.test(token)) return Number.parseInt(token.slice(2), 16);
  if (/^0b/i.test(token)) return Number.parseInt(token.slice(2), 2);
  if (/^\d+$/.test(token)) return Number.parseInt(token, 10);
  return null;
}

function isIdentifier(token) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(token);
}

function parser(tokens) {
  let index = 0;

  function peek(offset = 0) {
    return tokens[index + offset];
  }

  function consume(expected) {
    const token = tokens[index];
    if (expected && token !== expected) {
      throw new Error(`Expected '${expected}' but found '${token ?? "EOF"}'`);
    }
    index += 1;
    return token;
  }

  function parsePrimary() {
    const token = peek();
    if (token === "(") {
      consume("(");
      const expr = parseExpression();
      consume(")");
      return expr;
    }
    const numeric = parseNumber(token);
    if (numeric !== null) {
      consume();
      return { type: "literal", value: numeric & 0xff };
    }
    if (isIdentifier(token)) {
      consume();
      return { type: "identifier", name: token };
    }
    throw new Error(`Unexpected token in expression: ${token ?? "EOF"}`);
  }

  function parseShift() {
    let node = parsePrimary();
    while (peek() === "<<" || peek() === ">>") {
      const op = consume();
      const right = parsePrimary();
      node = { type: "binary", op, left: node, right };
    }
    return node;
  }

  function parseAdditive() {
    let node = parseShift();
    while (["+", "-", "&", "|", "^"].includes(peek())) {
      const op = consume();
      const right = parseShift();
      node = { type: "binary", op, left: node, right };
    }
    return node;
  }

  function parseExpression() {
    return parseAdditive();
  }

  function parseCondition() {
    const left = parseExpression();
    if (peek() === "==" || peek() === "!=") {
      const op = consume();
      const right = parseExpression();
      return { type: "compare", op, left, right };
    }
    return { type: "truthy", expr: left };
  }

  function parseBlock() {
    consume("{");
    const statements = [];
    while (peek() !== "}") {
      if (peek() == null) throw new Error("Unexpected EOF inside block");
      statements.push(parseStatement());
    }
    consume("}");
    return statements;
  }

  function parseDeclaration() {
    consume("uint8");
    const name = consume();
    if (!isIdentifier(name)) throw new Error(`Bad identifier: ${name}`);
    let init = null;
    if (peek() === "=") {
      consume("=");
      init = parseExpression();
    }
    consume(";");
    return { type: "declare", name, init };
  }

  function parseConst() {
    consume("const");
    const name = consume();
    if (!isIdentifier(name)) throw new Error(`Bad constant name: ${name}`);
    consume("=");
    const expr = parseExpression();
    consume(";");
    return { type: "const", name, expr };
  }

  function parseIf() {
    consume("if");
    consume("(");
    const condition = parseCondition();
    consume(")");
    const thenBlock = parseBlock();
    let elseBlock = null;
    if (peek() === "else") {
      consume("else");
      elseBlock = parseBlock();
    }
    return { type: "if", condition, thenBlock, elseBlock };
  }

  function parseWhile() {
    consume("while");
    consume("(");
    const condition = parseCondition();
    consume(")");
    const body = parseBlock();
    return { type: "while", condition, body };
  }

  function parseScreenWrite() {
    consume("screen");
    consume("[");
    const indexExpr = parseExpression();
    consume("]");
    consume("=");
    const valueExpr = parseExpression();
    consume(";");
    return { type: "screenWrite", indexExpr, valueExpr };
  }

  function parseAssignment() {
    const name = consume();
    consume("=");
    const expr = parseExpression();
    consume(";");
    return { type: "assign", name, expr };
  }

  function parseStatement() {
    const token = peek();
    if (token === "uint8") return parseDeclaration();
    if (token === "const") return parseConst();
    if (token === "if") return parseIf();
    if (token === "while") return parseWhile();
    if (token === "screen") return parseScreenWrite();
    if (token === "for") throw new Error("Unsupported syntax: for loops are not implemented yet");
    if (isIdentifier(token) && peek(1) === "=") return parseAssignment();
    throw new Error(`Unsupported or unexpected statement starting with '${token ?? "EOF"}'`);
  }

  const statements = [];
  while (peek() != null) {
    statements.push(parseStatement());
  }
  return statements;
}

function exprToConstant(node, constants) {
  if (node.type === "literal") return node.value & 0xff;
  if (node.type === "identifier" && node.name in constants) return constants[node.name];
  throw new Error("Constant expressions currently support only literals and const names");
}

function compileCLike(source) {
  const ast = parser(tokenize(source));
  const variables = {};
  const constants = {
    SCREEN: SCREEN_BASE,
    INPUT_UP: INPUT_UP_ADDR,
    INPUT_DOWN: INPUT_DOWN_ADDR,
    INPUT_START: INPUT_START_ADDR,
  };
  const ioReads = {
    key_up: "INPUT_UP",
    key_down: "INPUT_DOWN",
    key_start: "INPUT_START",
  };
  let nextVarAddress = VAR_BASE;
  let labelCounter = 0;
  const lines = ["SCREEN = 0x80"];

  function allocVar(name) {
    if (!(name in variables)) {
      variables[name] = nextVarAddress;
      nextVarAddress += 1;
      if (nextVarAddress >= VAR_LIMIT) {
        throw new Error("Out of variable space");
      }
    }
    return variables[name];
  }

  allocVar("__tmp_index");
  allocVar("__tmp_value");

  function label(prefix) {
    const safe = `${prefix}_${labelCounter}`;
    labelCounter += 1;
    return safe;
  }

  function addrOf(name) {
    if (name in variables) return variables[name];
    throw new Error(`Unknown variable: ${name}`);
  }

  function emit(...rows) {
    rows.forEach((row) => lines.push(row));
  }

  function chooseScratch(target, banned = []) {
    for (const reg of ["A", "B", "C", "D", "Y", "X"]) {
      if (reg !== target && !banned.includes(reg)) return reg;
    }
    throw new Error(`No scratch register available for ${target}`);
  }

  function compileExpr(node, target = "A", banned = []) {
    if (node.type === "literal") {
      emit(`LDI ${target}, 0x${(node.value & 0xff).toString(16).padStart(2, "0")}`);
      return;
    }
    if (node.type === "identifier") {
      if (node.name in ioReads) {
        emit(`LDM ${target}, ${ioReads[node.name]}`);
        return;
      }
      if (node.name in variables) {
        emit(`LDM ${target}, ${node.name}`);
        return;
      }
      if (node.name in constants) {
        emit(`LDI ${target}, 0x${constants[node.name].toString(16).padStart(2, "0")}`);
        return;
      }
      throw new Error(`Unknown identifier in expression: ${node.name}`);
    }
    if (node.type === "binary") {
      const scratch = chooseScratch(target, banned);
      compileExpr(node.left, target, [...banned, scratch]);
      if (node.op === "<<" || node.op === ">>") {
        const shiftCount = node.right.type === "literal" ? node.right.value : null;
        if (shiftCount == null) {
          throw new Error("Shift counts currently must be literal numbers");
        }
        const mnemonic = node.op === "<<" ? "SHL" : "SHR";
        for (let i = 0; i < shiftCount; i += 1) emit(`${mnemonic} ${target}`);
        return;
      }
      compileExpr(node.right, scratch, [...banned, target]);
      const opMap = {
        "+": "ADD",
        "-": "SUB",
        "&": "AND",
        "|": "OR",
        "^": "XOR",
      };
      const mnemonic = opMap[node.op];
      if (!mnemonic) throw new Error(`Unsupported operator: ${node.op}`);
      emit(`${mnemonic} ${target}, ${scratch}`);
      return;
    }
    throw new Error(`Unsupported expression node: ${node.type}`);
  }

  function compileCondition(node, falseLabel) {
    if (node.type === "truthy") {
      compileExpr(node.expr, "A");
      emit("LDI B, 0x00");
      emit("CMP A, B");
      emit(`JZ ${falseLabel}`);
      return;
    }
    if (node.type === "compare") {
      compileExpr(node.left, "A", ["B"]);
      compileExpr(node.right, "B", ["A"]);
      emit("CMP A, B");
      emit(`${node.op === "==" ? "JNZ" : "JZ"} ${falseLabel}`);
      return;
    }
    throw new Error(`Unsupported condition node: ${node.type}`);
  }

  function compileStatement(node) {
    if (node.type === "const") {
      const value = exprToConstant(node.expr, constants);
      constants[node.name] = value;
      emit(`${node.name} = 0x${value.toString(16).padStart(2, "0")}`);
      return;
    }

    if (node.type === "declare") {
      allocVar(node.name);
      if (node.init) {
        compileExpr(node.init, "A");
        emit(`STM A, ${node.name}`);
      }
      return;
    }

    if (node.type === "assign") {
      allocVar(node.name);
      compileExpr(node.expr, "A");
      emit(`STM A, ${node.name}`);
      return;
    }

    if (node.type === "screenWrite") {
      compileExpr(node.valueExpr, "A");
      emit("STM A, __tmp_value");
      compileExpr(node.indexExpr, "X", ["A"]);
      emit("STM X, __tmp_index");
      emit("LDI B, SCREEN");
      emit("LDM X, __tmp_index");
      emit("ADD X, B");
      emit("LDM A, __tmp_value");
      emit("STR A, X");
      return;
    }

    if (node.type === "if") {
      const elseLabel = label("if_else");
      const endLabel = label("if_end");
      compileCondition(node.condition, elseLabel);
      node.thenBlock.forEach(compileStatement);
      if (node.elseBlock) {
        emit(`JMP ${endLabel}`);
      }
      emit(`${elseLabel}:`);
      node.elseBlock?.forEach(compileStatement);
      if (node.elseBlock) emit(`${endLabel}:`);
      return;
    }

    if (node.type === "while") {
      const startLabel = label("while_start");
      const endLabel = label("while_end");
      emit(`${startLabel}:`);
      compileCondition(node.condition, endLabel);
      node.body.forEach(compileStatement);
      emit(`JMP ${startLabel}`);
      emit(`${endLabel}:`);
      return;
    }

    throw new Error(`Unsupported statement node: ${node.type}`);
  }

  ast.forEach(compileStatement);

  for (const [name, address] of Object.entries(variables)) {
    emit(`${name} = 0x${address.toString(16).padStart(2, "0")}`);
  }
  emit("HLT");

  return {
    assembly: lines.join("\n"),
    variables,
    constants,
  };
}

export { compileCLike };
