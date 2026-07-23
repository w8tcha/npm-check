import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import checkUnused from '../../lib/in/get-unused-packages.js';
import readPackageJson from '../../lib/in/read-package-json.js';
import createFakeState from '../helpers/fake-state.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureCwd = path.join(dirname, '..', 'fixtures', 'unused-project');
const cwdPackageJson = readPackageJson(path.join(fixtureCwd, 'package.json'));

test('flags a dependency depcheck cannot find any usage of', async () => {
    const state = createFakeState({cwd: fixtureCwd, cwdPackageJson});

    await checkUnused(state);

    assert.deepEqual(state.get('unusedDependencies'), ['unused-fixture']);
});

test('skips the scan when --skip-unused is set', async () => {
    const state = createFakeState({
        cwd: fixtureCwd,
        cwdPackageJson,
        skipUnused: true,
        unusedDependencies: 'untouched',
    });

    await checkUnused(state);

    assert.equal(state.get('unusedDependencies'), 'untouched');
});

test('skips the scan during --update-all, same as --update', async () => {
    const state = createFakeState({
        cwd: fixtureCwd,
        cwdPackageJson,
        updateAll: true,
        unusedDependencies: 'untouched',
    });

    await checkUnused(state);

    assert.equal(state.get('unusedDependencies'), 'untouched');
});
