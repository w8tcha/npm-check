import {readFileSync} from 'node:fs';

export default function readPackageJson(filename) {
    let pkg;
    let error;
    try {
        pkg = JSON.parse(readFileSync(filename, 'utf8'));
    } catch (error_) {
        error = new Error(error_.code === 'ENOENT' ? `A package.json was not found at ${filename}` : `A package.json was found at ${filename}, but it is not valid.`);
    }

    return {
        devDependencies: {}, dependencies: {}, error, ...pkg,
    };
}
