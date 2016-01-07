
var options = {
    name: '',
    endpointUrl: ''
};

/**
 * Return the user's stored options from Chrome.
 */
function getStoredOptionsPromise(options) {

    return new Promise(function (resolve) {

        chrome.storage.local.get(options, function (data) {

            resolve(data);
        });
    });
}

/**
 * Merges the given options with the existing options.
 */
function mergeOptions(newOptions) {

    options = $.extend(options, newOptions);
    return options;
}

/**
 * For the given options, ensures all the required fields are complete.
 */
function validateOptions(options) {

    var isValid = (
        typeof options.name === 'string' &&
        options.name.trim() !== '' &&
        typeof options.endpointUrl === 'string' &&
        options.endpointUrl.trim() !== ''
    );
    isValid = true; // TODO: remove
    if (!isValid) {

        throw {"name": "invalidOptions"};
    }
}

/**
 * Returns a promise to return the user's current tab in Chrome.
 */
function getCurrentTabPromise() {

    return new Promise(function (resolve) {

        chrome.tabs.getSelected(null, function (tab) {

            resolve(tab);
        });
    });
}

/**
 * Checks the URL of the given tab to see if it looks like something Chrome is going to give us access to.
 */
function validateTabUrl(tab) {

    var url = tab.url;

    // URL must not match the following
    var noMatches = [/^https?:\/\/chrome.google.com\/.*$/];
    for (var i = noMatches.length - 1; i >= 0; i--) {

        if (noMatches[i].test(url)) {

            throw {"name": "invalidTabUrl"};
        }
    }

    // URL must match one of the following
    var matches = ['http://*/*', 'https://*/*', 'ftp://*/*', 'file://*/*'];
    for (i = matches.length - 1; i >= 0; i--) {

        var regex = new RegExp('^' + matches[i].replace(/\*/g, '.*') + '$');
        if (regex.test(url)) {

            // Matched a required pattern, valid
            return tab;
        }
    }

    // Failed to match any required pattern
    throw {"name": "invalidTabUrl"};
}

/**
 * Injects the page JS. If this doesn't complete, then errors out.
 */
function injectPageScriptPromise(tab) {

    return new Promise(function (resolve, reject) {

        var isPageScriptInjected = false;
        chrome.tabs.executeScript(tab.id, {file: 'js/page.js'}, function() {

            isPageScriptInjected = true;

            // Done
            resolve(tab);
        });
        window.setTimeout(function() {

            if (!isPageScriptInjected) {

                reject('Injecting page script failed.');
            }
        }, 1000);
    });
}

/**
 * Displays an error message based on the error provided.
 */
function onInitError(error) {

    $('#form-wrapper').hide();

    if (error.name === "invalidOptions") {

        // Show config required
        $('#configuration-required-panel').show();
    }
    else if (error.name === "invalidTabUrl") {

        $('#invalid-panel').show();
    }
    else {

        $('#uh-oh-panel').show();
    }

    // Done
    console.log('Init failed.', error);
}

/**
 * Populates and displays the form.
 */
function showForm(tab) {

    // Init tabs
    $('#tags').tagsInput({
        autocomplete_url: options.endpointUrl + 'api/tags.php',
        height: 'auto',
        width: 'auto',
        delimiter: [',', ';', ' ']
    });

    // Inject info
    $('#title').val(tab.title);
    $('#url').val(tab.url);
    $('#favicon-url').val(tab.favIconUrl);

    // Wire event handlers
    $('#submit').unbind('click').bind('click', submitForm);

    // Show
    $('#form-wrapper').show();
}

function hideHiddenElements() {

    $('.hidden').hide();
}

/**
 * Sends an upload job to the background uploader and updates the UI accordingly.
 */
function submitForm() {

    // TODO...

    // Done
    return false;
}

/**
 * Opens the options screen.
 */
function openOptionsScreen() {

    if (chrome.runtime.openOptionsPage) {

        chrome.runtime.openOptionsPage();
    }
    else {

        window.open(chrome.runtime.getURL('options.html'));
    }
}

/**
 *  Sets up required resources. If anything fails, displays error feedback and stops.
 */
function init() {

    // Set any option screen links
    $('.options-link' ).bind('click', openOptionsScreen);

    // As most Chrome resources are fetched async, build a sequential promise chain to run through
    // the init steps in order.
    Promise.resolve()
        // Stored options
        .then(getStoredOptionsPromise)
        .then(mergeOptions)
        .then(validateOptions)
        // Current tab
        .then(getCurrentTabPromise)
        .then(validateTabUrl)
        .then(injectPageScriptPromise)
        // Done, show form and start taking screenshot
        .then(showForm)
        .catch(onInitError);
}

// Go!
init();

