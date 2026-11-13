import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/data/seed.ts';
import { calcNutrition } from '../src/utils/nutrition.ts';

test('macro energy remains equal to the daily energy target', () => {
  const state = createInitialState();
  const result = calcNutrition(state);

  assert.equal(result.err, null);
  const macroEnergy = result.P * 4 + result.C * 4 + result.F * 9;
  assert.ok(Math.abs(macroEnergy - result.kcal) < 0.001);
});

test('carbohydrate is not silently clamped to an arbitrary minimum', () => {
  const state = createInitialState();
  state.w = 300;
  state.h = 120;
  state.age = 100;
  state.pal = 1.4;
  state.band = 'L';
  state.goal = 'cut';
  state.pct = -25;

  const result = calcNutrition(state);

  assert.equal(result.err, null);
  assert.ok(result.C > 0);
  assert.ok(result.C < 60);
  const macroEnergy = result.P * 4 + result.C * 4 + result.F * 9;
  assert.ok(Math.abs(macroEnergy - result.kcal) < 0.001);
});

test('health safety gate blocks automatic plans for minors', () => {
  const state = createInitialState();
  state.age = 17;

  const result = calcNutrition(state);

  assert.match(result.err ?? '', /أقل من 18/);
});

test('Katch-McArdle is used only when measured lean mass is supplied with sufficient reliability', () => {
  const state = createInitialState();
  state.lbm = 60;
  state.rel = 70;

  const result = calcNutrition(state);

  assert.equal(result.kat, true);
  assert.equal(result.bmr, 370 + 21.6 * 60);
});

test('PAL cannot escape its selected activity band', () => {
  const state = createInitialState();
  state.band = 'A';
  state.pal = 2.1;

  const result = calcNutrition(state);

  assert.match(result.err ?? '', /خارج نطاق/);
});

test('unreliable lean-mass measurements fall back to Mifflin with an explicit warning', () => {
  const state = createInitialState();
  state.lbm = 60;
  state.rel = 69;

  const result = calcNutrition(state);

  assert.equal(result.err, null);
  assert.equal(result.kat, false);
  assert.ok(result.warn.some((warning) => warning.includes('موثوقية القياس أقل من 70%')));
});
