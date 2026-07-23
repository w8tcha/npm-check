import chalk from 'chalk';
import {execa} from 'execa';
import ora from 'ora';

export function buildInstallArgs(packages, currentState) {
    const installer = currentState.get('installer');
    const isYarn = installer === 'yarn';
    const color = chalk.supportsColor ? '--color=always' : null;

    const installCmd = isYarn ? 'add' : 'install';
    const npmArgs = [installCmd];

    if (currentState.get('global')) {
        if (isYarn) {
            // Yarn's global install syntax is `yarn global add`, not `yarn add global`.
            npmArgs.unshift('global');
        } else {
            npmArgs.push('--global');
        }
    }

    if (currentState.get('saveExact')) {
        npmArgs.push(isYarn ? '--exact' : '--save-exact');
    }

    npmArgs.push(...packages);

    if (color) {
        npmArgs.push(color);
    }

    return npmArgs;
}

export default function install(packages, currentState) {
    if (packages.length === 0) {
        return Promise.resolve(currentState);
    }

    const installer = currentState.get('installer');
    const npmArgs = buildInstallArgs(packages, currentState);

    console.log('');
    console.log(`$ ${chalk.green(installer)} ${chalk.green(npmArgs.join(' '))}`);
    const spinner = ora(`Installing using ${chalk.green(installer)}...`);
    spinner.enabled &&= currentState.get('spinner');
    spinner.start();

    return execa(installer, npmArgs, {cwd: currentState.get('cwd')}).then(output => {
        spinner.stop();
        console.log(output.stdout);
        console.log(output.stderr);

        return currentState;
    }).catch(error => {
        spinner.stop();
        throw error;
    });
}
