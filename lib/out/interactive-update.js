import process from 'node:process';
import _ from 'lodash';
import inquirer from 'inquirer';
import chalk from 'chalk';
import table from 'text-table';
import stripAnsi from 'strip-ansi';
import installPackages from './install-packages.js';
import emoji from './emoji.js';

const UI_GROUPS = [
    {
        title: chalk.bold.underline.green('Update package.json to match version installed.'),
        filter: {mismatch: true, bump: null},
    },
    {
        title: `${chalk.bold.underline.green('Missing.')} ${chalk.green('You probably want these.')}`,
        filter: {notInstalled: true, bump: null},
    },
    {
        title: `${chalk.bold.underline.green('Patch Update')} ${chalk.green('Backwards-compatible bug fixes.')}`,
        filter: {bump: 'patch'},
    },
    {
        title: `${chalk.yellow.underline.bold('Minor Update')} ${chalk.yellow('New backwards-compatible features.')}`,
        bgColor: 'yellow',
        filter: {bump: 'minor'},
    },
    {
        title: `${chalk.red.underline.bold('Major Update')} ${chalk.red('Potentially breaking API changes. Use caution.')}`,
        filter: {bump: 'major'},
    },
    {
        title: `${chalk.magenta.underline.bold('Non-Semver')} ${chalk.magenta('Versions less than 1.0.0, caution.')}`,
        filter: {bump: 'nonSemver'},
    },
];

function label(pkg) {
    const bumpInstalled = pkg.bump ? pkg.installed : '';
    const installed = pkg.mismatch ? pkg.packageJson : bumpInstalled;
    const name = chalk.yellow(pkg.moduleName);
    const type = pkg.devDependency ? chalk.green(' devDep') : '';
    const missing = pkg.notInstalled ? chalk.red(' missing') : '';
    const homepage = pkg.homepage ? chalk.blue.underline(pkg.homepage) : '';
    return [
        name + type + missing,
        installed,
        installed && '❯',
        chalk.bold(pkg.latest || ''),
        pkg.latest ? homepage : pkg.regError || pkg.pkgError,
    ];
}

function short(pkg) {
    return `${pkg.moduleName}@${pkg.latest}`;
}

function choice(pkg) {
    if (!pkg.mismatch && !pkg.bump && !pkg.notInstalled) {
        return false;
    }

    return {
        value: pkg,
        name: label(pkg),
        short: short(pkg),
    };
}

function unselectable(options) {
    return new inquirer.Separator(chalk.reset(options ? options.title : ' '));
}

function createChoices(packages, options) {
    const filteredChoices = _.filter(packages, options.filter);

    const choices = filteredChoices.map(pkg => choice(pkg))
        .filter(Boolean);

    const choicesAsATable = table(_.map(choices, 'name'), {
        align: ['l', 'l', 'l'],
        stringLength(string_) {
            return stripAnsi(string_).length;
        },
    }).split('\n');

    const choicesWithTableFormating = _.map(choices, (item, i) => {
        item.name = choicesAsATable[i];
        return item;
    });

    if (choicesWithTableFormating.length > 0) {
        choices.unshift(unselectable(), unselectable(options));
        return choices;
    }
}

function buildPackageToUpdate(moduleName, version, isYarn, saveExact) {
    // Handle adding ^ for yarn, npm seems to handle this if not exact
    return moduleName + '@' + (isYarn && !saveExact ? '^' : '') + version;
}

export default function interactive(currentState) {
    const packages = currentState.get('packages');

    if (currentState.get('debug')) {
        console.log('packages', packages);
    }

    const choicesGrouped = UI_GROUPS.map(group => createChoices(packages, group))
        .filter(Boolean);

    const choices = choicesGrouped.flat();

    if (choices.length === 0) {
        console.log(`${emoji(':heart:  ')}Your modules look ${chalk.bold('amazing')}. Keep up the great work.${emoji(' :heart:')}`);
        return;
    }

    choices.push(unselectable(), unselectable({title: 'Space to select. Enter to start upgrading. Control-C to cancel.'}));

    const questions = [
        {
            name: 'packages',
            message: 'Choose which packages to update.',
            type: 'checkbox',
            choices: [...choices, unselectable()],
            pageSize: process.stdout.rows - 2,
        },
    ];

    return inquirer.prompt(questions).then(answers => {
        const packagesToUpdate = answers.packages;

        if (!packagesToUpdate || packagesToUpdate.length === 0) {
            console.log('No packages selected for update.');
            return false;
        }

        const isYarn = currentState.get('installer') === 'yarn';
        const saveExact = currentState.get('saveExact');

        const saveDependencies = packagesToUpdate
            .filter(pkg => !pkg.devDependency)
            .map(pkg => buildPackageToUpdate(pkg.moduleName, pkg.latest, isYarn, saveExact));

        const saveDevDependencies = packagesToUpdate
            .filter(pkg => pkg.devDependency)
            .map(pkg => buildPackageToUpdate(pkg.moduleName, pkg.latest, isYarn, saveExact));

        const updatedPackages = packagesToUpdate
            .map(pkg => buildPackageToUpdate(pkg.moduleName, pkg.latest, isYarn, saveExact)).join(', ');

        if (!currentState.get('global')) {
            if (saveDependencies.length > 0 && !isYarn) {
                saveDependencies.push('--save');
            }

            if (saveDevDependencies.length > 0) {
                if (isYarn) {
                    saveDevDependencies.push('--dev');
                } else {
                    saveDevDependencies.push('--save-dev');
                }
            }
        }

        return installPackages(saveDependencies, currentState)
            .then(state => installPackages(saveDevDependencies, state))
            .then(state => {
                console.log('');
                console.log(chalk.green('[npm-check] Update complete!'));
                console.log(chalk.green('[npm-check] ' + updatedPackages));
                console.log(chalk.green('[npm-check] You should re-run your tests to make sure everything works with the updates.'));
                return state;
            });
    });
}
