import {emojify} from 'node-emoji';

let isEmojiEnabled = true;

function output(name) {
    return isEmojiEnabled ? emojify(name) : '';
}

function enabled(value) {
    isEmojiEnabled = value;
}

output.enabled = enabled;

export default output;
