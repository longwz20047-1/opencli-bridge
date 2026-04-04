const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { selectTrayIconCandidate } = require('../dist/tray.js');

test('prefers tray-icon.png when it is usable', () => {
  const calls = [];
  const trayImage = { id: 'tray', isEmpty: () => false };
  const iconImage = { id: 'icon', isEmpty: () => false };

  const selected = selectTrayIconCandidate('C:\\bridge\\assets', (iconPath) => {
    calls.push(path.basename(iconPath));
    return path.basename(iconPath) === 'tray-icon.png' ? trayImage : iconImage;
  });

  assert.equal(selected, trayImage);
  assert.deepEqual(calls, ['tray-icon.png']);
});

test('falls back to icon.png when tray-icon.png is empty', () => {
  const calls = [];
  const iconImage = { id: 'icon', isEmpty: () => false };

  const selected = selectTrayIconCandidate('C:\\bridge\\assets', (iconPath) => {
    calls.push(path.basename(iconPath));
    if (path.basename(iconPath) === 'tray-icon.png') {
      return { id: 'tray-empty', isEmpty: () => true };
    }
    return iconImage;
  });

  assert.equal(selected, iconImage);
  assert.deepEqual(calls, ['tray-icon.png', 'icon.png']);
});

test('returns null when both candidates are unusable', () => {
  const selected = selectTrayIconCandidate('C:\\bridge\\assets', () => ({ isEmpty: () => true }));
  assert.equal(selected, null);
});

test('keeps trying when tray-icon.png throws during load', () => {
  const calls = [];
  const iconImage = { id: 'icon', isEmpty: () => false };

  const selected = selectTrayIconCandidate('C:\\bridge\\assets', (iconPath) => {
    calls.push(path.basename(iconPath));
    if (path.basename(iconPath) === 'tray-icon.png') {
      throw new Error('missing tray icon');
    }
    return iconImage;
  });

  assert.equal(selected, iconImage);
  assert.deepEqual(calls, ['tray-icon.png', 'icon.png']);
});
