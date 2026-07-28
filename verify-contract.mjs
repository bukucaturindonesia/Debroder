import assert from 'node:assert/strict';

function pairCompatible(rules, placementId, printSizeId) {
  return rules.some((rule) =>
    (rule.placementId === null || rule.placementId === placementId)
    && (rule.printSizeId === null || rule.printSizeId === printSizeId)
  );
}

function parseSelection(selection, requireCompleteDesignPairs) {
  const placementId = typeof selection.placementId === 'string' && selection.placementId ? selection.placementId : null;
  const printSizeId = typeof selection.printSizeId === 'string' && selection.printSizeId ? selection.printSizeId : null;
  if (requireCompleteDesignPairs && (placementId === null) !== (printSizeId === null)) return null;
  return { ...selection, placementId, printSizeId };
}

function updatePlacement(selection, rules, nextPlacementId) {
  const placementId = nextPlacementId || null;
  const printSizeId = placementId && selection.printSizeId && pairCompatible(rules, placementId, selection.printSizeId)
    ? selection.printSizeId
    : null;
  return { ...selection, placementId, printSizeId };
}

function canonicalDesignPricing({ quantity, placement, printSize, rules, requiresPair = true }) {
  if (placement && !printSize) return { ok: false, issue: `Pilih Ukuran Desain untuk posisi ${placement.name}.` };
  if (!placement && printSize) return { ok: false, issue: `Pilih Posisi Desain untuk ukuran ${printSize.name}.` };
  if (requiresPair && (!placement || !printSize)) return { ok: false, issue: 'Pilih Posisi Desain dan Ukuran Desain.' };
  if (placement && printSize && !pairCompatible(rules, placement.id, printSize.id)) {
    return { ok: false, issue: `Ukuran Desain ${printSize.name} tidak tersedia untuk posisi ${placement.name}.` };
  }
  if (!placement || !printSize) return { ok: true, total: 0, positionAdjustment: 0, designSizeAdjustment: 0 };
  if (!Number.isSafeInteger(printSize.priceAdjustment) || printSize.priceAdjustment < 0) {
    return { ok: false, issue: `Adjustment Ukuran Desain ${printSize.name} tidak valid.` };
  }
  return {
    ok: true,
    positionAdjustment: 0,
    designSizeAdjustment: printSize.priceAdjustment,
    total: printSize.priceAdjustment * quantity
  };
}

const rules = [
  { placementId: 'dada', printSizeId: 'a4' },
  { placementId: 'belakang', printSizeId: 'a3' }
];
const dada = { id: 'dada', name: 'Dada Depan', priceAdjustment: 999_999 };
const belakang = { id: 'belakang', name: 'Belakang', priceAdjustment: 10_000 };
const a4 = { id: 'a4', name: 'A4', priceAdjustment: 15_000 };
const a3 = { id: 'a3', name: 'A3', priceAdjustment: 20_000 };

assert.equal(parseSelection({ placementId: 'dada', printSizeId: 'a4' }, true)?.printSizeId, 'a4');
assert.equal(parseSelection({ placementId: 'dada', printSizeId: null }, true), null);
assert.equal(parseSelection({ placementId: null, printSizeId: 'a4' }, true), null);
assert.notEqual(parseSelection({ placementId: 'dada', printSizeId: null }, false), null);

const valid = canonicalDesignPricing({ quantity: 3, placement: dada, printSize: a4, rules });
assert.deepEqual(valid, { ok: true, positionAdjustment: 0, designSizeAdjustment: 15_000, total: 45_000 });
assert.equal(valid.total, 45_000);
assert.equal(valid.positionAdjustment, 0);

const missingSize = canonicalDesignPricing({ quantity: 1, placement: dada, printSize: null, rules });
assert.equal(missingSize.ok, false);
assert.match(missingSize.issue, /Pilih Ukuran Desain untuk posisi Dada Depan/);

const missingPosition = canonicalDesignPricing({ quantity: 1, placement: null, printSize: a4, rules });
assert.equal(missingPosition.ok, false);
assert.match(missingPosition.issue, /Pilih Posisi Desain untuk ukuran A4/);

const invalidPair = canonicalDesignPricing({ quantity: 1, placement: belakang, printSize: a4, rules });
assert.equal(invalidPair.ok, false);
assert.match(invalidPair.issue, /tidak tersedia/);

const retained = updatePlacement({ placementId: 'dada', printSizeId: 'a4' }, rules, 'dada');
assert.equal(retained.printSizeId, 'a4');
const clearedOnChange = updatePlacement({ placementId: 'dada', printSizeId: 'a4' }, rules, 'belakang');
assert.equal(clearedOnChange.printSizeId, null);
const clearedOnDelete = updatePlacement({ placementId: 'dada', printSizeId: 'a4' }, rules, '');
assert.deepEqual({ placementId: clearedOnDelete.placementId, printSizeId: clearedOnDelete.printSizeId }, { placementId: null, printSizeId: null });

const zeroSize = canonicalDesignPricing({ quantity: 5, placement: dada, printSize: { ...a4, priceAdjustment: 0 }, rules });
assert.equal(zeroSize.ok, true);
assert.equal(zeroSize.total, 0);
const negativeSize = canonicalDesignPricing({ quantity: 1, placement: dada, printSize: { ...a4, priceAdjustment: -1 }, rules });
assert.equal(negativeSize.ok, false);

console.log(JSON.stringify({
  status: 'PASS',
  assertions: 18,
  invariant: 'positionAdjustment=0; designAdjustmentTotal=designSizeAdjustment',
  validPairTotal: valid.total,
  stalePairCleared: clearedOnChange.printSizeId === null,
  partialCanonicalRejected: true,
  partialDraftPreservedAsInProgress: true
}, null, 2));
