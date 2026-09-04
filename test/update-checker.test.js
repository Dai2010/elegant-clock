const test = require('node:test');
const assert = require('node:assert/strict');

const {
  compareVersions,
  createUpdateInfo,
  getProxyDownloadUrl,
  selectUpdateAsset
} = require('../src/update-checker');

const checksum = 'a'.repeat(64);

function createAsset(name) {
  return {
    name,
    browser_download_url: `https://github.com/Dai2010/elegant-clock/releases/download/v1.2.0/${name}`,
    size: 1024,
    digest: `sha256:${checksum}`
  };
}

test('compares semantic versions with tags and prereleases', () => {
  assert.equal(compareVersions('v1.2.0', '1.1.9'), 1);
  assert.equal(compareVersions('1.0.2', 'v1.0.2'), 0);
  assert.equal(compareVersions('2.0.0-beta.2', '2.0.0-beta.11'), -1);
  assert.equal(compareVersions('2.0.0', '2.0.0-rc.1'), 1);
  assert.equal(compareVersions('not-a-version', '1.0.0'), null);
});

test('creates update information only for a newer stable release', () => {
  const release = {
    tag_name: 'v1.2.0',
    name: 'Elegant Clock v1.2.0',
    body: '- Added an update check',
    html_url: 'https://github.com/Dai2010/elegant-clock/releases/tag/v1.2.0',
    published_at: '2026-09-05T10:00:00Z',
    draft: false,
    prerelease: false,
    assets: [createAsset('Elegant-Clock-1.2.0-Windows-x64.exe')]
  };

  const info = createUpdateInfo(release, '1.0.2', 'win32', 'x64');
  assert.equal(info.currentVersion, '1.0.2');
  assert.equal(info.latestVersion, '1.2.0');
  assert.equal(info.asset.name, 'Elegant-Clock-1.2.0-Windows-x64.exe');
  assert.equal(createUpdateInfo(release, '1.2.0', 'win32', 'x64'), null);
  assert.equal(createUpdateInfo({ ...release, prerelease: true }, '1.0.2', 'win32', 'x64'), null);
});

test('selects the platform package and requires a GitHub digest', () => {
  const assets = [
    createAsset('Elegant-Clock-1.2.0-Windows-x64.exe'),
    createAsset('Elegant-Clock-1.2.0-Linux-amd64.deb'),
    createAsset('Elegant-Clock-1.2.0-Linux-x86_64.rpm'),
    createAsset('Elegant-Clock-1.2.0-Arch-x86_64.pkg.tar.zst')
  ];

  assert.match(selectUpdateAsset(assets, 'win32', 'x64').name, /Windows-x64\.exe$/);
  assert.match(selectUpdateAsset(assets, 'linux', 'x64', ['ubuntu', 'debian']).name, /amd64\.deb$/);
  assert.match(selectUpdateAsset(assets, 'linux', 'x64', ['fedora']).name, /x86_64\.rpm$/);
  assert.match(selectUpdateAsset(assets, 'linux', 'x64', ['arch']).name, /pkg\.tar\.zst$/);
  assert.equal(selectUpdateAsset(assets, 'linux', 'x64', ['unknown']), null);
  assert.equal(selectUpdateAsset(assets, 'linux', 'arm64'), null);
  assert.equal(selectUpdateAsset([{ ...assets[0], digest: null }], 'win32', 'x64'), null);
  assert.equal(selectUpdateAsset([{ ...assets[0], size: 2 * 1024 ** 3 }], 'win32', 'x64'), null);
});

test('builds proxy URLs only from trusted project release assets', () => {
  const assetUrl = 'https://github.com/Dai2010/elegant-clock/releases/download/v1.2.0/update.exe';
  assert.equal(getProxyDownloadUrl(assetUrl), `https://ghfast.top/${assetUrl}`);
  assert.throws(() => getProxyDownloadUrl('https://example.com/update.exe'));
});
