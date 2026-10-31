import test from 'node:test';
import assert from 'node:assert/strict';
import { birthNumberValid, ibanValid, luhn, shannonEntropy } from '../src/util.ts';
import { birthNumber, luhnNumber } from '../corpus/build.ts';

test('luhn', () => {
  assert.ok(luhn('4111111111111111'));
  assert.ok(!luhn('4111111111111112'));
  assert.ok(luhn(luhnNumber('4929', 16)));
});

test('iban mod 97 and length', () => {
  assert.ok(ibanValid('CZ65 0800 0000 1920 0014 5399'));
  assert.ok(ibanValid('DE89370400440532013000'));
  assert.ok(!ibanValid('CZ00 0800 0000 1920 0014 5399'));
  assert.ok(!ibanValid('XX65 0800 0000 1920 0014 5399'));
});

test('birth number checksum and date', () => {
  assert.ok(birthNumberValid(birthNumber('850412', '123', false)));
  assert.ok(birthNumberValid(birthNumber('906215', '456', false))); // female month +50
  assert.ok(!birthNumberValid('8504991234'));
  assert.ok(!birthNumberValid('1234567890'));
});

test('entropy', () => {
  assert.ok(shannonEntropy('aaaaaaaa') < 0.1);
  assert.ok(shannonEntropy('a7Bc9Xk2Lm4Pq8Zr') > 3.5);
});
