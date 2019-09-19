'use strict';

const regulationsUrl = 'https://www.worldcubeassociation.org/regulations/';
const guidelinesUrl = 'https://www.worldcubeassociation.org/guidelines/';

const tippyClassName = 'tippy-popper';
const themeClassName = 'wca-regulations-finder';

let regulations = {};
let guidelines = {};
let regnumsSortedByLen = [];

let observer = null;

// Append Regulations/Guidelines Tooltips!
const appendRegulationsTips = () => {
    //console.log('Start appending Regulations tips......');
    if (observer !== null) {
        observer.disconnect();
    }

    // Retrieve all text nodes by TreeWalker, and search for nodes that
    // - are not input or script tags,
    // - are not already marked words,
    // - are not Tippy, and
    // - contain at least one word likely Regulations number by RegExp
    const rejectTags = [
        'input', 'textarea',
        'audio', 'canvas', 'img', 'map', 'noscript', 'object', 'script', 'style', 'svg', 'video'
    ];
    const re = /([1-9][0-9]?[a-z][1-9]?[0-9]?[a-z]?|[A-Z][1-9][0-9]?[a-z]?[1-9]?[0-9]?)/;
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (rejectTags.includes(node.nodeName.toLowerCase())) {
                return NodeFilter.FILTER_REJECT;
            }
            if (node.classList.contains(themeClassName) || node.classList.contains(tippyClassName)) {
                return NodeFilter.FILTER_REJECT;
            }
        } else if (node.nodeType === Node.TEXT_NODE) {
            if (re.test(node.nodeValue)) {
                return NodeFilter.FILTER_ACCEPT;
            }
        }
        return NodeFilter.FILTER_SKIP;
    }, false);

    // Extract Regulations numbers
    const extracted = [];
    let node;
    while (node = tw.nextNode()) {
        //console.log('Serching... ' + node.nodeValue);
        const ranges = []; // for overlap check
        for (const regnum of regnumsSortedByLen) {
            const idxStart = node.nodeValue.indexOf(regnum);
            if (idxStart !== -1) {
                const idxEnd = idxStart + regnum.length;
                if (!checkOverlap(idxStart, idxEnd, ranges)) {
                    //console.log('Found: ' + regnum);
                    const r = document.createRange();
                    r.setStart(node, idxStart);
                    r.setEnd(node, idxEnd);
                    extracted.push({num: regnum, range: r});
                    ranges.push({'s': idxStart, 'e': idxEnd});
                }
            }
        }
    }

    // Mark Regulations numbers with Tippy.js
    const appearNums = new Set();
    for (const ext of extracted) {
        const mark = document.createElement('mark');
        mark.classList.add(themeClassName, `${themeClassName}-${ext.num}`);
        ext.range.surroundContents(mark);
        appearNums.add(ext.num);
    }
    for (const num of appearNums) {
        let regContent = '';
        regContent += `<strong><a href="${regulationsUrl}#${num}" class="${themeClassName}-num">${num}</a></strong>`
                + convertMd(regulations[num]);
        for (const gNum in guidelines[num]) {
            regContent += `<strong><a href="${guidelinesUrl}#${num}" class="${themeClassName}-num">${gNum}</a></strong>`
                    + convertMd(guidelines[num][gNum]);
        }
        tippy(`.${themeClassName}-${num}`, {
            content: regContent,
            arrow: true,
            interactive: true,
            maxWidth: 600,
            //trigger: 'click', // for debug
            theme: themeClassName,
        });
    }
    //console.log('Finish appending Regulations tips.');

    // Mutation Observer for DOM
    // if DOM changes (except Tippy and WCA Regulations Finder), re-append new tips and remove unnecessary tips
    //console.log('Setting up an observer......');
    observer = new MutationObserver((records) => {
        // When Tippy added
        if ((records.length === 1)
                && (records[0].type === 'childList')
                && (records[0].addedNodes.length === 1)
                && (records[0].addedNodes[0].classList.contains(tippyClassName))
                && (records[0].removedNodes.length === 0)) {
            //console.log('Tippy added');
            return;
        }
        // When Tippy removed
        if ((records.length === 1)
                && (records[0].type === 'childList')
                && (records[0].addedNodes.length === 0)
                && (records[0].removedNodes.length === 1)
                && (records[0].removedNodes[0].classList.contains(tippyClassName))) {
            //console.log('Tippy removed');
            return;
        }

        appendRegulationsTips();
    });
    observer.observe(document.body, {
        characterData: true,
        childList: true,
        subtree: true
    });
    //console.log('Started the observer.');

};

// Load Regulations and Guidelines
// then append tooltips
chrome.runtime.sendMessage({want: 'all'}, (response) => {
    regulations = response.regulations;
    guidelines = response.guidelines;
    //console.log(regulations);
    //console.log(guidelines);
    //console.log('Got the Regulations and Guidelines');

    // Regulations numbers sorted by their lengths
    regnumsSortedByLen = Object.keys(regulations);
    regnumsSortedByLen.sort((a, b) => b.length - a.length);

    appendRegulationsTips();
});


// Functions:

// Checks overlap
const checkOverlap = (start, end, ranges) => {
    for (const r of ranges) {
        if ((start <= r.e) && (r.s <= end)) {
            return true;
        }
    }
    return false;
}

// Convert Markdown to HTML by Markied
const convertMd = (markdown) => {
    markdown = markdown.replace('regulations:article:', regulationsUrl + '#');
    markdown = markdown.replace('regulations:regulation:', regulationsUrl + '#');
    markdown = markdown.replace('guidelines:guideline:', guidelinesUrl + '#');
    return marked(markdown);
}
