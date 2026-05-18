export const samplePrograms = [
  {
    key: "row-ramp",
    category: "Animations",
    title: "First row ramp",
    description: "Paint the first row with increasing colors.",
    pySource: `i = 0
color = 1

while i != 8:
    screen[i] = color
    color = color + 1
    i = i + 1`,
  },
  {
    key: "walker",
    category: "Animations",
    title: "Binary walker",
    description: "Shift one lit bit across the first row.",
    pySource: `i = 0
color = 1

while i != 8:
    screen[i] = color
    color = color << 1
    i = i + 1`,
  },
  {
    key: "checkerboard",
    category: "Animations",
    title: "Checkerboard fill",
    description: "Alternate two colors across all 64 pixels.",
    pySource: `i = 0

while i != 64:
    if (i & 1) != 0:
        screen[i] = 2
    if (i & 1) == 0:
        screen[i] = 12
    i = i + 1`,
  },
  {
    key: "screen-fill",
    category: "Animations",
    title: "Full screen fill",
    description: "Flood the whole display with one color.",
    pySource: `i = 0

while i != 64:
    screen[i] = 9
    i = i + 1`,
  },
  {
    key: "moving-pixel",
    category: "Animations",
    title: "Moving pixel loop",
    description: "Animate one pixel sweeping across the full 8x8 display forever.",
    pySource: `i = 0

while 1:
    screen[i] = 0
    i = i + 1
    if i == 64:
        i = 0
    screen[i] = 14`,
  },
  {
    key: "pong",
    category: "Games",
    title: "Tiny Pong lane",
    description: "Short hand-written assembly with two fixed paddles and a ball bouncing diagonally between them.",
    assemblySource: `SCREEN = 0x80
BALL = 0xD0
PREV = 0xD1
DELTA = 0xD2
WHITE = 0x01
ZERO = 0x00

START:
  LDI A, 0x9B
  STM A, BALL
  STM A, PREV
  LDI A, 0x09
  STM A, DELTA
  LDI A, WHITE
  LDI X, 0x90
  STR A, X
  ADDI X, 0x08
  STR A, X
  ADDI X, 0x08
  STR A, X
  LDI X, 0x97
  STR A, X
  ADDI X, 0x08
  STR A, X
  ADDI X, 0x08
  STR A, X
  LDI X, 0x9B
  STR A, X

LOOP:
  LDI A, ZERO
  LDM X, PREV
  STR A, X
  LDM A, BALL
  STM A, PREV
  LDM B, DELTA
  ADD A, B
  STM A, BALL
  LDI B, 0xAD
  CMP A, B
  JNZ CHECK_LEFT
  LDI B, 0xF7
  STM B, DELTA
CHECK_LEFT:
  LDI B, 0x91
  CMP A, B
  JNZ DRAW
  LDI B, 0x09
  STM B, DELTA
DRAW:
  LDI A, WHITE
  LDM X, BALL
  STR A, X
  JMP LOOP`,
  },
  {
    key: "color-pulse",
    category: "Animations",
    title: "Color pulse",
    description: "Cycle the whole screen through colors 1 to 15 forever.",
    pySource: `phase = 1
i = 0

while 1:
    i = 0
    while i != 64:
        screen[i] = phase
        i = i + 1
    phase = phase + 1
    if phase == 16:
        phase = 1`,
  },
  {
    key: "xor-shimmer",
    category: "Animations",
    title: "XOR shimmer",
    description: "Blend each pixel index with a changing phase for a shimmering color field.",
    pySource: `phase = 0
i = 0

while 1:
    i = 0
    while i != 64:
        screen[i] = i ^ phase
        i = i + 1
    phase = phase + 1`,
  },
  {
    key: "scroll-gradient",
    category: "Animations",
    title: "Scrolling gradient",
    description: "Slide a color gradient across the whole 8x8 display.",
    pySource: `phase = 0
i = 0

while 1:
    i = 0
    while i != 64:
        screen[i] = i + phase
        i = i + 1
    phase = phase + 1`,
  },
  {
    key: "band-swap",
    category: "Animations",
    title: "Band swap",
    description: "Flash the whole screen between two strong palette bands.",
    pySource: `phase = 3
i = 0

while 1:
    i = 0
    while i != 64:
        screen[i] = phase
        i = i + 1
    if phase == 3:
        phase = 11
    if phase != 3:
        phase = 3`,
  },
  {
    key: "diagonal-blend",
    category: "Animations",
    title: "Diagonal blend",
    description: "Mix shifted pixel indices with a changing phase for diagonal color motion.",
    pySource: `phase = 0
i = 0

while 1:
    i = 0
    while i != 64:
        screen[i] = (i >> 1) + phase
        i = i + 1
    phase = phase + 1`,
  },
  {
    key: "color-wipe-loop",
    category: "Animations",
    title: "Color wipe loop",
    description: "Walk a single color wipe through memory, then switch colors and repeat.",
    pySource: `i = 0
color = 1

while 1:
    screen[i] = color
    i = i + 1
    if i == 64:
        i = 0
        color = color + 1
    if color == 16:
        color = 1`,
  },
  {
    key: "blinker",
    category: "Animations",
    title: "Blinking screen",
    description: "Toggle the whole display between dark and bright frames forever.",
    pySource: `phase = 0
i = 0

while 1:
    i = 0
    while i != 64:
        screen[i] = phase
        i = i + 1
    if phase == 0:
        phase = 15
    if phase != 0:
        phase = 0`,
  },
  {
    key: "phase-stepper",
    category: "Animations",
    title: "Phase stepper",
    description: "Use bit shifts on the phase value to produce repeated color ladders.",
    pySource: `phase = 1
i = 0

while 1:
    i = 0
    while i != 64:
        screen[i] = (i >> 2) + phase
        i = i + 1
    phase = phase + 1
    if phase == 8:
        phase = 1`,
  },
  {
    key: "fault",
    category: "Demos",
    title: "Simple if demo",
    description: "Small branch example that writes one pixel if a value is non-zero.",
    pySource: `x = 5
if x != 0:
    screen[0] = x`,
    rawBytes: "0x10 0x00 0x05 0xFF",
  },
];
