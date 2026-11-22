// Frontend tests run with the existing backend tsx/node:test toolchain.
// @ts-nocheck
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calcularProgressoPercentual, obterAudioUrlValida } from '@/utils/audio';

test('aceita apenas URLs HTTPS válidas para o áudio', () => {
  assert.equal(obterAudioUrlValida('https://audio.example/faixa.mp3'), 'https://audio.example/faixa.mp3');
  assert.equal(obterAudioUrlValida(undefined), null);
  assert.equal(obterAudioUrlValida(''), null);
  assert.equal(obterAudioUrlValida('javascript:alert(1)'), null);
  assert.equal(obterAudioUrlValida('http://audio.example/faixa.mp3'), null);
  assert.equal(obterAudioUrlValida('url inválida'), null);
});

test('limita o progresso à duração e evita percentuais inválidos', () => {
  assert.equal(calcularProgressoPercentual(25, 100), 25);
  assert.equal(calcularProgressoPercentual(-1, 100), 0);
  assert.equal(calcularProgressoPercentual(120, 100), 100);
  assert.equal(calcularProgressoPercentual(20, 0), 0);
  assert.equal(calcularProgressoPercentual(Number.NaN, 100), 0);
});
