// ==UserScript==
// @name         e2fes
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  e2f enhancement suite - quality of life improvements for transcribing on e2f
// @author       Robert Price
// @match        https://dashboard.e2f.com/transcription/telephony/segments
// @match        https://dashboard.e2f.com/transcription/media/segments
// @grant        unsafeWindow
// @updateURL    https://github.com/zapakh/e2fes/raw/master/e2fes.user.js
// @downloadURL  https://github.com/zapakh/e2fes/raw/master/e2fes.user.js
// ==/UserScript==
'use strict';

// ctrlKeyTable lists what happens when you press ctrl+key.
// You can change the hotkey bindings by changing this object.
let ctrlKeyTable = {
    'b': () => insertTag('[breath]'),
    'h': () => insertTag('[lipsmack]'),
    'e': () => insertXMLTag('overlap'),
    'i': () => insertXMLTag('initial'),
    'o': () => insertXMLTag('lang:Foreign'),
    ';': () => insertXMLTag('lang:Spanish'),
    's': () => insertTag('[noise]'),
    'p': () => insertTag('[no-speech]'),
    'l': () => insertTag('[laugh]'),
    'g': () => insertTag('[cough]'),
    'q': () => insertWrapperTag('((', '))'),
    'k': () => insertTag('[click]'),
    '1': () => insertTag('like'),
    '2': () => insertTag('you know,'),
    '3': () => insertTag('really'),
}


// Workaround for React.js controlled textarea.  Simply updating ta.value doesn't work.
// Source: https://github.com/facebook/react/issues/10135#issuecomment-314441175
function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

    if (valueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
    } else {
        valueSetter.call(element, value);
    }
    element.dispatchEvent(new Event('input', { bubbles: true })); // force React to update
}

function getTextArea() {
    let elem = document.activeElement;
    if (elem.type == 'textarea') {
        return elem;
    } else {
        // might happen if the audio clip has focus, etc.
        // FIXME: This doesn't actually seem to work when no textarea is active.
        return document.getElementsByTagName('textarea')[0];
    }
}

function insertTag(s, spaceBefore=true, spaceAfter=true) {
    // s should include the square brackets if you want them.
    let ta = getTextArea();
    let curStart = ta.selectionStart;
    let curEnd = ta.selectionEnd;
    let oldEnd = curEnd;
    // Don't clobber the selection.
    if (curEnd > curStart) {
        // e2f convention usually puts tags before the affected word.
        oldEnd = curEnd;
        curEnd = curStart;
    }
    let parts = [];
    if (!spaceBefore && curStart > 0 && ta.value.charAt(curStart - 1) == ' ') {
        curStart--;
    }
    if (!spaceAfter && curEnd < ta.value.length && ta.value.charAt(curEnd) == ' ') {
        curEnd++;
    }
    parts.push(ta.value.substr(0, curStart));
    if (spaceBefore && curStart > 0 && parts[0].substr(-1) != ' ') s = ' ' + s;
    if (spaceAfter && (curEnd >= ta.value.length || ta.value.charAt(curEnd) != ' ')) {
      s = s + ' ';
    }
    parts.push(s);
    parts.push(ta.value.substr(curEnd));
    setNativeValue(ta, parts.join(''));
    let curNew = curStart + s.length + oldEnd - curEnd;
    ta.selectionStart = curNew;
    ta.selectionEnd = curNew;
}

function insertWrapperTag(s1, s2) {
    let ta = getTextArea();
    let curStart = ta.selectionStart;
    let curEnd = ta.selectionEnd;
    if (curStart == curEnd) {
        // No selection means nothing to wrap!
        // We'll use insertTag instead, which handles word spacing.
        insertTag(s1+s2);
        return
    }
    let v = ta.value;
    let curNew = ta.selectionEnd + s1.length + s2.length;
    setNativeValue(ta,
                   v.substring(0, ta.selectionStart) +
                   s1 +
                   v.substring(ta.selectionStart, ta.selectionEnd) +
                   s2 +
                   v.substring(ta.selectionEnd));
    ta.selectionStart = curNew;
    ta.selectionEnd = curNew;
}

function insertXMLTag(s) {
    // s should not include the angle brackets ("sideways carets").
    let ta = getTextArea();
    let curStart = ta.selectionStart;
    if (curStart < ta.selectionEnd) {
        insertWrapperTag('<' + s + '>', '</' + s + '>');
    } else {
        let lastPos = ta.value.lastIndexOf(s + '>', curStart);
        if (lastPos < 1 || ta.value.charAt(lastPos-1) == '/') {
            insertTag('<' + s + '>', true, false);
        } else {
            insertTag('</' + s + '>', false, true);
        }
    }
}


function keyDownHandler(e) {
    if (e.ctrlKey && e.key.toLowerCase() in ctrlKeyTable) {
        e.preventDefault();
//          e.returnValue = false;
        ctrlKeyTable[e.key.toLowerCase()]();
    }
}

// We'll listen on DIV#root, so it can help out with all textareas on the page.
// Hopefully DIV#root is ready by the time this user script runs.
let rootElem = document.getElementById("root");
rootElem.addEventListener('keydown', keyDownHandler);
