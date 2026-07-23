import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test, mock} from 'node:test';
import assert from 'node:assert/strict';
import createFakeState from '../helpers/fake-state.js';

// This test needs to run with --experimental-test-module-mocks (see the
// "test:unit" script in package.json) so it can fake the npm registry
// response instead of making a real network call for a fixture package
// that doesn't actually exist on npm.
//
// We use the process-wide mock.module (not t.mock.module) deliberately:
// create-package-summary.js statically imports get-latest-from-registry.js,
// which statically imports 'package-json'. By the time a per-test t.mock.module
// call runs, that import chain has already been evaluated and bound to the
// real 'package-json', so a later per-test mock never reaches it. Registering
// the mock once, before the single dynamic import below, is what actually
// takes effect.
// eslint-disable-next-line node-test/prefer-context-mock -- see comment above
mock.module('package-json', {
    exports: {
        async default(name) {
            const fixture = {
                'left-pad-fixture': {
                    versions: {'1.0.0': {}, '1.1.0': {}},
                    'dist-tags': {latest: '1.1.0'},
                },
                'missing-fixture': {
                    versions: {'2.0.0': {}},
                    'dist-tags': {latest: '2.0.0'},
                },
            }[name];

            if (!fixture) {
                throw new Error(`no registry fixture for "${name}"`);
            }

            return fixture;
        },
    },
});

const {default: createPackageSummary} = await import('../../lib/in/create-package-summary.js');

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureCwd = path.join(dirname, '..', 'fixtures', 'outdated-project');

const cwdPackageJson = {
    dependencies: {
        'left-pad-fixture': '^1.0.0',
        'missing-fixture': '^2.0.0',
    },
    devDependencies: {},
};

test('flags an installed dependency as needing an update when the registry has a newer version', async () => {
    const state = createFakeState({cwd: fixtureCwd, cwdPackageJson});

    const summary = await createPackageSummary('left-pad-fixture', state);

    assert.equal(summary.notInstalled, false);
    assert.equal(summary.installed, '1.0.0');
    assert.equal(summary.latest, '1.1.0');
    assert.equal(summary.bump, 'minor');
});

test('flags a dependency listed in package.json that was never installed', async () => {
    const state = createFakeState({cwd: fixtureCwd, cwdPackageJson});

    const summary = await createPackageSummary('missing-fixture', state);

    assert.equal(summary.notInstalled, true);
});
