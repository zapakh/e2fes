// ==UserScript==
// @name         e2fes
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  e2f enhancement suite - quality of life improvements for transcribing on e2f
// @author       Robert Price
// @match        https://dashboard.e2f.com/transcription/telephony/segments
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

//    setTimeout(window.sayHi, 6000);
    // Your code here...
    unsafeWindow.hello = 'world!';

    // Workaround for React.js controlled components.
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
        element.dispatchEvent(new Event('input', { bubbles: true })); // update it in React
    }

    function getTextArea() {
        return document.getElementsByTagName('TEXTAREA')[0];
    }

    function insertTag(s, spaceBefore=true, spaceAfter=true) {
        // s should include the square brackets if you want them.
        // TODO: Consider not clobbering the selection with, e.g., a [breath] tag.
        let ta = getTextArea();
        let curStart = ta.selectionStart;
        let curEnd = ta.selectionEnd;
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
        let curNew = curStart + s.length;
        ta.selectionStart = curNew;
        ta.selectionEnd = curNew;
    }

    function insertWrapperTag(s1, s2) {
        let ta = getTextArea();
        let curStart = ta.selectionStart;
        let curEnd = ta.selectionEnd;
        if (curStart == curEnd) {
            // no selection; nothing to wrap!
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

    let ctrlKeyTable = new Map();
    ctrlKeyTable.set('b', () => insertTag('[breath]'));
    ctrlKeyTable.set('e', () => insertXMLTag('overlap'));
    ctrlKeyTable.set('i', () => insertXMLTag('initial'));
    ctrlKeyTable.set('s', () => insertTag('[noise]'));
    ctrlKeyTable.set('p', () => insertTag('[no-speech]'));
    ctrlKeyTable.set('l', () => insertTag('[laugh]'));
    ctrlKeyTable.set('g', () => insertTag('[cough]'));
    ctrlKeyTable.set('q', () => insertWrapperTag('((', '))'));
    ctrlKeyTable.set('k', () => insertTag('[click]'));
    ctrlKeyTable.set('1', () => insertTag('like'));
    ctrlKeyTable.set('w', () => insertTag(''));  // I'm trying to disable Ctrl+W from closing the tab
      // The Ctrl+w disable doesn't work; we could try adding the confirmation alert thingy somehow.

    function keyDownHandler(e) {
        if (e.ctrlKey && ctrlKeyTable.has(e.key.toLowerCase())) {
            e.preventDefault();
//          e.returnValue = false;
            ctrlKeyTable.get(e.key.toLowerCase())();
        }
    }

    (function addKeyDownHandler() {
        let ta = getTextArea();
        if (typeof ta == "undefined") {
            setTimeout(addKeyDownHandler, 500);
        } else {
            ta.addEventListener('keydown', keyDownHandler);
        }
    })();
    /*
    setTimeout(() => {
        let ta = getTextArea();
        ta.addEventListener('keydown', keyDownHandler);}, 4000);*/
})();
