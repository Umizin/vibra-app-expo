// Frontend tests run with the existing backend tsx/node:test toolchain.
// @ts-nocheck
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { voltarOuIrPara } from '@/utils/navegacao';

test('usa o histórico existente ao voltar', () => {
  const calls = [];
  const router = {
    canGoBack: () => true,
    back: () => calls.push('back'),
    replace: (href) => calls.push(['replace', href]),
  };

  voltarOuIrPara(router, '/(tabs)');

  assert.deepEqual(calls, ['back']);
});

test('usa o fallback específico quando a tela foi aberta diretamente', () => {
  const calls = [];
  const router = {
    canGoBack: () => false,
    back: () => calls.push('back'),
    replace: (href) => calls.push(['replace', href]),
  };

  voltarOuIrPara(router, '/(tabs)/biblioteca');

  assert.deepEqual(calls, [['replace', '/(tabs)/biblioteca']]);
});
