import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import readPackageJson from '../../lib/in/read-package-json.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(dirname, '..', 'fixtures');

test('reads a valid package.json', () => {
    const pkg = readPackageJson(path.join(fixturesDir, 'unused-project', 'package.json'));

    assert.equal(pkg.name, 'unused-project-fixture');
    assert.equal(pkg.error, undefined);
});

test('reports a missing file as an error instead of throwing', () => {
    const pkg = readPackageJson(path.join(fixturesDir, 'does-not-exist', 'package.json'));

    assert.ok(pkg.error);
    assert.match(pkg.error.message, /was not found/v);
});

test('reports invalid JSON as an error instead of throwing', () => {
    const pkg = readPackageJson(path.join(fixturesDir, 'invalid-json', 'package.json'));

    assert.ok(pkg.error);
    assert.match(pkg.error.message, /not valid/v);
});

test('always returns dependencies/devDependencies objects, even when absent', () => {
    const pkg = readPackageJson(path.join(fixturesDir, 'unused-project', 'package.json'));

    assert.deepEqual(pkg.devDependencies, {});
});
