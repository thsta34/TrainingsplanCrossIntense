const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const advanceSource = source.match(/function advanceWorkoutEntry\(current, direction, event, finishAtEnd = true\) \{[\s\S]*?\n\}/)?.[0];
const navigateSource = source.match(/function navigateWorkoutEntry\(event\) \{[\s\S]*?\n\}/)?.[0];
const submitSource = source.match(/function submitWorkoutEntry\(event\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(advanceSource && navigateSource && submitSource, 'workout navigation functions must exist');

const inputs = Array.from({ length: 4 }, (_, index) => ({
  index,
  blurred: false,
  closest(selector) { return selector === 'input[data-workout-entry]' ? this : null; },
  blur() { this.blurred = true; },
}));
const focused = [];
const context = {
  workoutKeyboardNavigationActive: false,
  workoutEntryInputs: () => inputs,
  isCurrentWorkoutTarget: () => true,
  focusWorkoutEntry: input => focused.push(input.index),
  window: { setTimeout: callback => callback() },
  document: { activeElement: null },
};
vm.createContext(context);
vm.runInContext(`${advanceSource}\n${navigateSource}\n${submitSource}`, context);

function event(target, key, shiftKey = false) {
  return {
    target,
    key,
    shiftKey,
    isComposing: false,
    code: key,
    keyCode: 0,
    which: 0,
    inputType: '',
    prevented: false,
    preventDefault() { this.prevented = true; },
  };
}

let action = event(inputs[0], 'Tab');
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(focused.at(-1), 1, 'Tab moves forward');

action = event(inputs[2], 'Tab', true);
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(focused.at(-1), 1, 'Shift+Tab moves backward');

action = event(inputs[2], 'Enter');
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(focused.at(-1), 3, 'Enter continues from a manually selected field');

action = event(inputs[3], 'Enter');
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(inputs[3].blurred, true, 'Enter closes the final field');

action = event(inputs[3], 'Tab');
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, false, 'Tab can leave the final field normally');

action = event(inputs[1], 'Unidentified');
action.code = '';
action.keyCode = 13;
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(focused.at(-1), 2, 'Android keyCode 13 moves forward');

action = event(inputs[1], 'Unidentified');
action.code = '';
action.inputType = 'insertLineBreak';
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(focused.at(-1), 2, 'mobile beforeinput line break moves forward');

context.document.activeElement = inputs[2];
action = event(inputs[2], 'submit');
context.submitWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(focused.at(-1), 3, 'form submit fallback moves forward');

assert.match(source, /data-workout-entry data-reps/);
assert.match(source, /data-workout-entry data-band-extra/);
assert.match(source, /data-workout-entry data-kettlebell-weight/);
assert.match(source, /data-workout-entry data-bar/);
assert.match(source, /enterKeyHint = index === inputs\.length - 1 \? "done" : "next"/);

console.log('PASS: PC and Android Enter variants, submit fallback, Tab and Shift+Tab navigate from the current workout field.');
