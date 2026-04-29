import assert from 'node:assert/strict';
import test from 'node:test';

import {
  syncPackageMetadata,
  syncReadmeContent,
} from '../../../../scripts/site-foundation/foundation-sync';

test('foundation sync rewrites package metadata from the active site profile', () => {
  const nextPackage = syncPackageMetadata(
    {
      name: 'shipany-template-nano-banana',
      author: 'ShipAny.ai',
      homepage: 'https://shipany.ai',
      repository: {
        type: 'git',
        url: 'https://github.com/example-org/shipany-template-two',
      },
      keywords: ['shipany', 'shipany-template-two'],
    },
    {
      appName: 'Square Face Generator',
      domain: 'square-face-generator-ai.xyz',
      supportEmail: 'support@square-face-generator-ai.xyz',
    }
  );

  assert.equal(nextPackage.name, 'square-face-generator');
  assert.equal(nextPackage.author, 'Square Face Generator');
  assert.equal(nextPackage.homepage, 'https://square-face-generator-ai.xyz');
  assert.equal(
    nextPackage.repository.url,
    'https://github.com/example-org/square-face-generator'
  );
  assert.deepEqual(nextPackage.keywords.slice(0, 3), [
    'square face generator',
    'square-face-generator',
    'square-face-generator-ai.xyz',
  ]);
});

test('foundation sync rewrites README branding and support links', () => {
  const nextReadme = syncReadmeContent(
    `# ShipAny Template Two

Read the docs at https://shipany.ai/docs/quick-start

Open issues at https://github.com/example-org/shipany-template-two/issues
`,
    {
      appName: 'Square Face Generator',
      domain: 'square-face-generator-ai.xyz',
      supportEmail: 'support@square-face-generator-ai.xyz',
    },
    'https://github.com/example-org/shipany-template-two'
  );

  assert.match(nextReadme, /# Square Face Generator/);
  assert.match(nextReadme, /https:\/\/square-face-generator-ai\.xyz/);
  assert.match(
    nextReadme,
    /https:\/\/github\.com\/example-org\/square-face-generator\/issues/
  );
  assert.doesNotMatch(nextReadme, /ShipAny Template Two/);
  assert.doesNotMatch(nextReadme, /shipany\.ai/);
});
