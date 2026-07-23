import {emojify} from 'node-emoji';

let isEmojiEnabled = true;

function output(name) {
    if (isEmojiEnabled) {
        return emojify(name);
    }

    return '';
}

function enabled(value) {
    isEmojiEnabled = value;
}

output.enabled = enabled;

export default output;
