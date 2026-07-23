import process from 'node:process';
import chalk from 'chalk';
import _ from 'lodash';
import table from 'text-table';
import stripAnsi from 'strip-ansi';
import emoji from './emoji.js';

function uppercaseFirstLetter(string_) {
    return string_[0].toUpperCase() + string_.slice(1);
}

function buildUpgradeArguments(currentState, isYarn) {
    const args = [isYarn ? 'add' : 'install'];
    if (currentState.get('global')) {
        if (isYarn) {
            args.unshift('global');
        } else {
            args.push('--global');
        }
    }

    return args;
}

function buildUpgradeFlags(pkg, isYarn) {
    if (isYarn) {
        return pkg.devDependency ? ['--dev'] : [];
    }

    return [pkg.devDependency ? '--save-dev' : '--save'];
}

function notInstalledMessage(pkg) {
    return pkg.notInstalled ? chalk.bgRed.white.bold(emoji(' :worried: ') + ' MISSING! ') + ' Not installed.' : '';
}

function notInPackageJsonMessage(pkg) {
    return pkg.notInPackageJson
        ? chalk.bgRed.white.bold(emoji(' :worried: ') + ' PKG ERR! ') + ' Not in the package.json. ' + pkg.notInPackageJson
        : '';
}

function pkgErrorMessage(pkg) {
    return pkg.pkgError && !pkg.notInstalled
        ? chalk.bgGreen.white.bold(emoji(' :worried: ') + ' PKG ERR! ') + ' ' + chalk.red(pkg.pkgError.message)
        : '';
}

function easyUpgradeMessage(pkg, indent, upgradeMessage) {
    if (!pkg.bump || !pkg.easyUpgrade) {
        return '';
    }

    return [
        chalk.bgGreen.white.bold(emoji(' :heart_eyes: ') + ' UPDATE!  ') + ' Your local install is out of date. ' + chalk.blue.underline(pkg.homepage || ''),
        indent + upgradeMessage,
    ];
}

function hardUpgradeMessage(pkg, indent, upgradeMessage) {
    if (!pkg.bump || pkg.easyUpgrade) {
        return '';
    }

    const label = pkg.bump === 'nonSemver'
        ? emoji(' :sunglasses: ') + ' new ver! '.toUpperCase()
        : emoji(' :sunglasses: ') + ' ' + pkg.bump.toUpperCase() + ' UP ';

    return [
        chalk.white.bold.bgGreen(label) + ' ' + uppercaseFirstLetter(pkg.bump) + ' update available. ' + chalk.blue.underline(pkg.homepage || ''),
        indent + upgradeMessage,
    ];
}

function unusedMessage(pkg, indent, packageName, isYarn) {
    if (!pkg.unused) {
        return '';
    }

    const removeCommand = isYarn
        ? `yarn remove ${packageName} ${pkg.devDependency ? '--dev' : ''}`
        : `npm uninstall ${packageName} --save${pkg.devDependency ? '-dev' : ''}`;

    return [
        chalk.black.bold.bgWhite(emoji(' :confused: ') + ' NOTUSED? ') + ` ${chalk.yellow(`Still using ${packageName}?`)}`,
        indent + `Depcheck did not find code similar to ${chalk.green(`require('${packageName}')`)} or ${chalk.green(`import from '${packageName}'`)}.`,
        indent + 'Check your code before removing as depcheck isn\'t able to foresee all ways dependencies can be used.',
        indent + 'Use rc file options to remove unused check, but still monitor for outdated version:',
        indent + `    .npmcheckrc {"depcheck": {"ignoreMatches": ["${packageName}"]}}`,
        indent + `Use ${chalk.green('--skip-unused')} to skip this check.`,
        indent + `To remove this package: ${chalk.green(removeCommand)}`,
    ];
}

function mismatchMessage(pkg) {
    return pkg.mismatch && !pkg.bump
        ? chalk.bgRed.yellow.bold(emoji(' :interrobang: ') + ' MISMATCH ') + ' Installed version does not match package.json. ' + pkg.installed + ' ≠ ' + pkg.packageJson
        : '';
}

function regErrorMessage(pkg) {
    return pkg.regError ? chalk.bgRed.white.bold(emoji(' :no_entry: ') + ' NPM ERR! ') + ' ' + chalk.red(pkg.regError) : '';
}

function render(pkg, currentState) {
    const packageName = pkg.moduleName;
    const rows = [];

    const indent = ' '.repeat(11) + emoji(' '.repeat(3));

    const installer = currentState.get('installer');
    const isYarn = installer === 'yarn';

    const args = buildUpgradeArguments(currentState, isYarn);
    const flags = buildUpgradeFlags(pkg, isYarn);

    const upgradeCommand = `${installer} ${args.join(' ')} ${packageName}@${pkg.latest} ${flags.join(' ')}`;
    const upgradeMessage = `${chalk.green(upgradeCommand)} to go from ${pkg.installed} to ${pkg.latest}`;

    const status = _([
        notInstalledMessage(pkg),
        notInPackageJsonMessage(pkg),
        pkgErrorMessage(pkg),
        easyUpgradeMessage(pkg, indent, upgradeMessage),
        hardUpgradeMessage(pkg, indent, upgradeMessage),
        unusedMessage(pkg, indent, packageName, isYarn),
        mismatchMessage(pkg),
        regErrorMessage(pkg),
    ])
        .flatten()
        .compact()
        .valueOf();

    if (status.length === 0) {
        return false;
    }

    rows.push([
        chalk.yellow(packageName),
        status.shift(),
    ]);

    while (status.length > 0) {
        rows.push([
            ' ',
            status.shift(),
        ]);
    }

    rows.push([
        ' ',
    ]);

    return rows;
}

export default function outputConsole(currentState) {
    const packages = currentState.get('packages');

    const rows = packages.flatMap(pkg => render(pkg, currentState) || []);

    if (rows.length > 0) {
        const renderedTable = table(rows, {
            stringLength: s => stripAnsi(s).length,
        });

        console.log('');
        console.log(renderedTable);
        console.log(`Use ${chalk.green(`npm-check -${currentState.get('global') ? 'g' : ''}u`)} for interactive update.`);
        process.exitCode = 1;
    } else {
        console.log(`${emoji(':heart:  ')}Your modules look ${chalk.bold('amazing')}. Keep up the great work.${emoji(' :heart:')}`);
        process.exitCode = 0;
    }
}
