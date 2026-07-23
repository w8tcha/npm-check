import {cpus} from 'node:os';
import semver from 'semver';
import packageJson from 'package-json';
import throatFactory from 'throat';
import bestGuessHomepage from './best-guess-homepage.js';

const cpuCount = cpus().length;
const throat = throatFactory(cpuCount);

export default function getNpmInfo(packageName) {
    return throat(() => packageJson(packageName, {fullMetadata: true, allVersions: true}))
        .then(rawData => {
            const CRAZY_HIGH_SEMVER = '8000.0.0';

            const sortedVersions = Object.keys(rawData.versions)
                .filter(version => semver.gt(CRAZY_HIGH_SEMVER, version))
                .toSorted(semver.compare);

            const {latest} = rawData['dist-tags'];
            const {next} = rawData['dist-tags'];
            const latestStableRelease = semver.satisfies(latest, '*')
                ? latest
                : semver.maxSatisfying(sortedVersions, '*');
            return {
                latest: latestStableRelease,
                next,
                versions: sortedVersions,
                homepage: bestGuessHomepage(rawData),
            };
        }).catch(error => {
            const errorMessage = `Registry error ${error.message}`;
            return {
                error: errorMessage,
            };
        });
}
