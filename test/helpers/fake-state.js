import process from 'node:process';

// A minimal stand-in for lib/state/state.js's currentState, for unit tests
// that need to hand a few known values to functions taking `currentState`
// without running the real (async, filesystem-touching) state/init pipeline.
export default function createFakeState(overrides = {}) {
    const store = new Map(Object.entries({
        debug: false,
        global: false,
        update: false,
        updateAll: false,
        skipUnused: false,
        cwd: process.cwd(),
        cwdPackageJson: {dependencies: {}, devDependencies: {}},
        globalPackages: {},
        ignore: [],
        unusedDependencies: [],
        missingFromPackageJson: {},
        installer: 'npm',
        saveExact: false,
        spinner: false,
        specials: '',
        ...overrides,
    }));

    return {
        get(key) {
            if (!store.has(key)) {
                throw new Error(`fake-state: unknown option "${key}"`);
            }

            return store.get(key);
        },
        set(key, value) {
            store.set(key, value);
        },
    };
}
