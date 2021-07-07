'use strict';

const REGULATIONS_URL = 'https://raw.githubusercontent.com/thewca/wca-regulations/official/wca-regulations.md';
const GUIDELINES_URL = 'https://raw.githubusercontent.com/thewca/wca-regulations/official/wca-guidelines.md';

const regulations = {};
const guidelines = {};

let highlightEnabled = true;
const iconEnabled = 'icon/icon-enabled-128.png';
const iconDisabled = 'icon/icon-disabled-128.png';

const titleEnabled = 'WCA Regulations Finder (enabled)';
const titleDisabled = 'WCA Regulations Finder (disabled)';

const downloadAndCache = (url, cache) => {
    //console.log(`Downloading ${url} ...`);

    const req = new XMLHttpRequest();
    req.open('GET', url);
    req.send();

    req.onreadystatechange = function() {
        if (req.readyState === 4 && req.status === 200) {
            for (let line of req.responseText.split('\n')) {
                line = line.trim();
                // Filter only regulation lines, which start with '-'.
                // Also, ingore "- <label>" lines.
                if (line.charAt(0) === '-' && line.substr(0, 3) !== '- <') {
                    const terms = line.split(') ');
                    const num = terms[0].substr(2);
                    const text = terms.slice(1).join(') '); // in case the text has ') '
                    if (num.includes('+')) {
                        const numWithoutPlus = num.replace(/\+/g, '');
                        if (!(numWithoutPlus in cache)) {
                            cache[numWithoutPlus] = {};
                        }
                        cache[numWithoutPlus][num] = text;
                    } else {
                        cache[num] = text;
                    }
                }
            }
        }
    };
};

// Cache the Regulations/Guidelines.
downloadAndCache(REGULATIONS_URL, regulations);
downloadAndCache(GUIDELINES_URL, guidelines);

// Response Regulations/Guidelines.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    //console.log('Getting a request ...');
    //console.log(request);
    //console.log(sender);

    if (request.want === 'all') {
        sendResponse({
            'regulations': regulations,
            'guidelines': guidelines
        });
    } else if (request.want === 'regulations') {
        sendResponse(regulations);
    } else if (request.want === 'guidelines') {
        sendResponse(guidelines);
    } else {
        const results = {};
        for (const num of request.regnums) {
            const replacedNum = num.replace(/\+/g, '');
            results[replacedNum] = {
                regulations: regulations[replacedNum],
                guidelines: guidelines[replacedNum]
            };
        }
        sendResponse(results);
    }
});

// Event on the extension button clicked...
chrome.browserAction.onClicked.addListener((tab) => {
    if (highlightEnabled) {
        highlightEnabled = false;
        chrome.browserAction.setIcon({path: iconDisabled});
        chrome.browserAction.setTitle({title: titleDisabled});
        chrome.tabs.sendMessage(tab.id, 'disable');
    } else {
        highlightEnabled = true;
        chrome.browserAction.setIcon({path: iconEnabled});
        chrome.browserAction.setTitle({title: titleEnabled});
        chrome.tabs.sendMessage(tab.id, 'enable');
    }
});
