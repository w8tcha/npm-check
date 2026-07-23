import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildInstallArgs} from '../../lib/out/install-packages.js';
import createFakeState from '../helpers/fake-state.js';

// BuildInstallArgs is the pure command-building step used before install-packages.js
// shells out via execa. Asserting on its output lets us test "what command would we
// have run" without actually running npm/yarn install against a real project.
function withoutColorFlag(args) {
    return args.filter(arg => arg !== '--color=always');
}

test('npm local install', () => {
    const state = createFakeState({installer: 'npm'});

    const args = withoutColorFlag(buildInstallArgs(['left-pad@2.0.0'], state));

    assert.deepEqual(args, ['install', 'left-pad@2.0.0']);
});

test('npm global install uses --global', () => {
    const state = createFakeState({installer: 'npm', global: true});

    const args = withoutColorFlag(buildInstallArgs(['left-pad@2.0.0'], state));

    assert.deepEqual(args, ['install', '--global', 'left-pad@2.0.0']);
});

test('yarn local install', () => {
    const state = createFakeState({installer: 'yarn'});

    const args = withoutColorFlag(buildInstallArgs(['left-pad@2.0.0'], state));

    assert.deepEqual(args, ['add', 'left-pad@2.0.0']);
});

test('yarn global install uses "yarn global add", not "yarn add global"', () => {
    const state = createFakeState({installer: 'yarn', global: true});

    const args = withoutColorFlag(buildInstallArgs(['left-pad@2.0.0'], state));

    assert.deepEqual(args, ['global', 'add', 'left-pad@2.0.0']);
});

test('saveExact adds --save-exact for npm and --exact for yarn', () => {
    const npmState = createFakeState({installer: 'npm', saveExact: true});
    const yarnState = createFakeState({installer: 'yarn', saveExact: true});

    assert.deepEqual(withoutColorFlag(buildInstallArgs(['a@1.0.0'], npmState)), ['install', '--save-exact', 'a@1.0.0']);
    assert.deepEqual(withoutColorFlag(buildInstallArgs(['a@1.0.0'], yarnState)), ['add', '--exact', 'a@1.0.0']);
});

test('installs multiple packages in one command', () => {
    const state = createFakeState({installer: 'npm'});

    const args = withoutColorFlag(buildInstallArgs(['a@1.0.0', 'b@2.0.0'], state));

    assert.deepEqual(args, ['install', 'a@1.0.0', 'b@2.0.0']);
});
