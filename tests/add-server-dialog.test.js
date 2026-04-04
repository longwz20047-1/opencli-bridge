const test = require('node:test');
const assert = require('node:assert/strict');
const { getAddServerDialogContent } = require('../dist/tray.js');

test('shows Chinese clipboard guidance when clipboard does not contain a config string', () => {
  const dialog = getAddServerDialogContent('plain text');

  assert.equal(dialog.hasObkContent, false);
  assert.equal(dialog.message, '请先复制 obk:// 配置串到剪贴板，然后点击“读取剪贴板”。');
  assert.deepEqual(dialog.buttons, ['读取剪贴板', '取消']);
  assert.equal(dialog.detail, undefined);
});

test('shows Chinese confirm copy when clipboard already contains a config string', () => {
  const dialog = getAddServerDialogContent('obk://eyJ2IjoxfQ');

  assert.equal(dialog.hasObkContent, true);
  assert.equal(dialog.message, '检测到剪贴板中已有配置串，是否连接这个服务器？');
  assert.deepEqual(dialog.buttons, ['连接', '取消']);
  assert.equal(dialog.detail, 'obk://eyJ2IjoxfQ...');
});
