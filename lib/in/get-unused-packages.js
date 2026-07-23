import depcheck from 'depcheck';
import ora from 'ora';
import _ from 'lodash';
import {rcFile} from 'rc-config-loader';

function skipUnused(currentState) {
    return currentState.get('skipUnused') // Manual option to ignore this
        || currentState.get('global') // global modules
        || currentState.get('update') // In the process of doing an update
        || currentState.get('updateAll') // In the process of doing an update
        || !currentState.get('cwdPackageJson').name; // There's no package.json
}

function loadRcFile(rcFileName) {
    try {
        const results = rcFile(rcFileName);
        // Not Found
        if (!results) {
            return {};
        }

        return results.config;
    } catch (error) {
        console.error(`Error parsing rc file; skipping it; error: ${error.message}`);
        return {}; // Default value
    }
}

function getSpecialParsers(currentState) {
    const specialsInput = currentState.get('specials');
    if (!specialsInput) {
        return;
    }

    return specialsInput
        .split(',')
        .map(special => depcheck.special[special])
        .filter(Boolean);
}

export default async function checkUnused(currentState) {
    const spinner = ora('Checking for unused packages. --skip-unused if you don\'t want this.');
    spinner.enabled &&= currentState.get('spinner');
    spinner.start();

    if (skipUnused(currentState)) {
        spinner.stop();
        return currentState;
    }

    const depcheckDefaults = {
        ignoreDirs: [
            'sandbox',
            'dist',
            'generated',
            '.generated',
            'build',
            'fixtures',
            'jspm_packages',
        ],
        ignoreMatches: [
            'gulp-*',
            'grunt-*',
            'karma-*',
            'angular-*',
            'babel-*',
            'metalsmith-*',
            'eslint-plugin-*',
            '@types/*',
            'grunt',
            'mocha',
            'ava',
        ],
        specials: getSpecialParsers(currentState),
    };

    const npmCheckRc = loadRcFile('npmcheck');

    const depcheckOptions = {
        ...depcheckDefaults,
        ...npmCheckRc.depcheck,
    };

    const depCheckResults = await new Promise(resolve => {
        depcheck(currentState.get('cwd'), depcheckOptions, resolve);
    });

    spinner.stop();
    const unusedDependencies = [...depCheckResults.dependencies, ...depCheckResults.devDependencies];
    currentState.set('unusedDependencies', unusedDependencies);

    const cwdPackageJson = currentState.get('cwdPackageJson');

    // Currently missing will return devDependencies that aren't really missing
    const missingFromPackageJson = _.omit(
        depCheckResults.missing || {},
        Object.keys(cwdPackageJson.dependencies),
        Object.keys(cwdPackageJson.devDependencies),
    );
    currentState.set('missingFromPackageJson', missingFromPackageJson);
    return currentState;
}
