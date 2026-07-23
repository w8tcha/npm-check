import {readFileSync} from 'node:fs';

export default function readPackageJson(filename) {
    let pkg;
    let error;
    try {
        pkg = JSON.parse(readFileSync(filename, 'utf8'));
    } catch (error_) {
        error = error_.code === 'ENOENT' ? new Error(`A package.json was not found at ${filename}`) : new Error(`A package.json was found at ${filename}, but it is not valid.`);
    }

    return {
        devDependencies: {}, dependencies: {}, error, ...pkg,
    };
}
