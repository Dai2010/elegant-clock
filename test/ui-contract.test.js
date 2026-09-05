const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const sourceDirectory = path.join(__dirname, '..', 'src');

function readSource(name) {
  return readFileSync(path.join(sourceDirectory, name), 'utf8');
}

function getButtonMarkup(html, id) {
  return html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`))?.[0] || '';
}

test('uses the original release address as the default update action', () => {
  const html = readSource('update.html');
  const directButton = getButtonMarkup(html, 'direct-update-button');
  const proxyButton = getButtonMarkup(html, 'proxy-update-button');

  assert.match(directButton, /class="primary-button"/);
  assert.match(directButton, /\sautofocus(?:\s|>)/);
  assert.match(proxyButton, /class="secondary-button"/);
  assert.doesNotMatch(proxyButton, /primary-button/);
});

test('keeps settings grouped and exposes a validated background hex input', () => {
  const html = readSource('settings.html');
  const moduleCount = html.match(/<section class="settings-module"/g)?.length || 0;

  assert.equal(moduleCount, 6);
  assert.match(html, />窗口行为</);
  assert.match(html, />时钟外观</);
  assert.match(html, />启动与更新</);
  assert.match(html, /id="update-check-button"/);
  assert.match(html, /id="background-color-hex-input"/);
  assert.match(html, /maxlength="7"/);
});
