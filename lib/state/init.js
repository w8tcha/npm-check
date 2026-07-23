import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import _ from 'lodash';
import globalModulesPath from 'global-modules';
import chalk from 'chalk';
import readPackageJson from '../in/read-package-json.js';
import globalPackages from '../in/get-installed-packages.js';
import emoji from '../out/emoji.js';

export default async function init(currentState, userOptions) {
    _.each(userOptions, (value, key) => currentState.set(key, value));

    if (currentState.get('global')) {
        let modulesPath = globalModulesPath;

        if (process.env.NODE_PATH) {
            if (process.env.NODE_PATH.includes(path.delimiter)) {
                modulesPath = process.env.NODE_PATH.split(path.delimiter)[0];
                console.log(chalk.yellow('warning: Using the first of multiple paths specified in NODE_PATH'));
            } else {
                modulesPath = process.env.NODE_PATH;
            }
        }

        if (!fs.existsSync(modulesPath)) {
            throw new Error('Path "' + modulesPath + '" does not exist. Please check the NODE_PATH environment variable.');
        }

        console.log(chalk.green('The global path you are searching is: ' + modulesPath));

        currentState.set('cwd', globalModulesPath);
        currentState.set('globalPackages', globalPackages(modulesPath));
    } else {
        const cwd = path.resolve(currentState.get('cwd'));
        const pkg = readPackageJson(path.join(cwd, 'package.json'));
        currentState.set('cwdPackageJson', pkg);
        currentState.set('cwd', cwd);
    }

    emoji.enabled(currentState.get('emoji'));

    if (currentState.get('cwdPackageJson').error) {
        throw currentState.get('cwdPackageJson').error;
    }

    return currentState;
}
