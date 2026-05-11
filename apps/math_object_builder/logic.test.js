const assert = require("assert");
const {
  NUMBER_SYSTEMS,
  OBJECT_FAMILIES,
  getObjectFamilyState,
  buildObjectProfile,
  createInitialChain,
  listAvailableMoves,
  applyMove,
} = require("./logic.js");

function testCoreCatalogExists() {
  assert.ok(NUMBER_SYSTEMS.some((item) => item.id === "naturals"));
  assert.ok(NUMBER_SYSTEMS.some((item) => item.id === "complex"));
  assert.ok(OBJECT_FAMILIES.some((item) => item.id === "vector_space"));
  assert.ok(OBJECT_FAMILIES.some((item) => item.id === "hilbert_space"));
}

function testNaturalsCannotSupportVectorSpace() {
  const state = getObjectFamilyState("naturals", "vector_space");
  assert.strictEqual(state.available, false);
  assert.ok(state.reason.includes("field"));
}

function testRealsCanSupportVectorSpace() {
  const state = getObjectFamilyState("reals", "vector_space");
  assert.strictEqual(state.available, true);
  assert.ok(state.reason.includes("scalar field"));
}

function testQuaternionsAreNotMarkedAsField() {
  const state = getObjectFamilyState("quaternions", "field");
  assert.strictEqual(state.available, false);
  assert.ok(state.reason.includes("not commutative"));
}

function testVectorSpaceProfileShowsActions() {
  const profile = buildObjectProfile({
    baseId: "reals",
    familyId: "vector_space",
    dimension: 3,
  });
  assert.strictEqual(profile.title, "Real Vector Space");
  assert.ok(profile.notation.includes("R^3"));
  assert.ok(profile.actions.some((action) => action.label === "Vector addition"));
  assert.ok(profile.actions.some((action) => action.label === "Scalar multiplication"));
}

function testRealBaseUnlocksVectorSpaceAndFieldMoves() {
  const chain = createInitialChain("reals");
  const moves = listAvailableMoves(chain).map((move) => move.id);
  assert.ok(moves.includes("vector_space"));
  assert.ok(moves.includes("field"));
}

function testIntegerBaseBlocksVectorSpaceButAllowsModule() {
  const chain = createInitialChain("integers");
  const moves = listAvailableMoves(chain).map((move) => move.id);
  assert.ok(!moves.includes("vector_space"));
  assert.ok(moves.includes("module"));
}

function testVectorSpaceCanExtendToLinearMap() {
  let chain = createInitialChain("reals");
  chain = applyMove(chain, "vector_space", { dimension: 3 });
  const moves = listAvailableMoves(chain).map((move) => move.id);
  assert.ok(moves.includes("linear_map"));
  assert.ok(moves.includes("algebra"));
}

function testLinearMapProducesTargetVectorSpace() {
  let chain = createInitialChain("reals");
  chain = applyMove(chain, "vector_space", { dimension: 3 });
  chain = applyMove(chain, "linear_map", { targetDimension: 2, property: "surjective" });
  const last = chain[chain.length - 1];
  assert.strictEqual(last.kind, "object");
  assert.strictEqual(last.family, "vector_space");
  assert.strictEqual(last.dimension, 2);
}

testCoreCatalogExists();
testNaturalsCannotSupportVectorSpace();
testRealsCanSupportVectorSpace();
testQuaternionsAreNotMarkedAsField();
testVectorSpaceProfileShowsActions();
testRealBaseUnlocksVectorSpaceAndFieldMoves();
testIntegerBaseBlocksVectorSpaceButAllowsModule();
testVectorSpaceCanExtendToLinearMap();
testLinearMapProducesTargetVectorSpace();

console.log("math_object_builder logic tests passed");
