
var options = {
    name: '',
    endpointUrl: '',
    authToken: ''
};

var jobId = 0;
var initialWindowSize = null;
var fullPageScreenshot = null;
var currentScreenDataUri = null;

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
        typeof options.authToken === 'string' &&
        options.authToken.trim() !== '' &&
        typeof options.endpointUrl === 'string' &&
        options.endpointUrl.trim() !== ''
    );
    if (!isValid) {

        throw {"name": "invalidOptions"};
    }
}

/**
 * Returns a promise to return the user's current tab in Chrome.
 */
function getCurrentTabPromise() {

    return new Promise(function (resolve, reject) {

        var currentTabQuery = {
            "active": true,
            "currentWindow": true
        };
        chrome.tabs.query(currentTabQuery, function (tab) {

            if (tab.length !== 1) {

                reject('Expected 1 tab but got ' + tab.length + '.');
            }
            resolve(tab[0]);
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
 * Injects the page JS if not already done. If this doesn't complete, then errors out.
 */
function injectPageScriptPromise(tab) {

    return new Promise(function (resolve, reject) {

        // Inject script. Do this after a slight delay to let the page settle.
        var isPageScriptInjected = false;
        window.setTimeout(function() {

            chrome.tabs.executeScript(tab.id, {file: 'js/page.js'}, function () {

                isPageScriptInjected = true;

                // Done
                resolve(tab);
            });
        }, 500);
        window.setTimeout(function() {

            if (!isPageScriptInjected) {

                reject('Injecting page script failed.');
            }
        }, 1500);
    });
}

/**
 * Stores the current window size, then resizes the window to have a 4:3 aspect ratio if (and only if) the width is
 * greater than the height. Tries to do this by only adjusting the height, but will adjust both dimensions if required.
 */
function enforceWindowAspectRatioPromise(tab) {

    return new Promise(function (resolve) {

        // Get the current window
        chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, null, function(window) {

            // If the height is greater than the width, don't resize
            if (window.height > window.width) {

                // No resize required. Done.
                resolve(tab);
                return;
            }

            // Store the existing dimensions so we can restore
            initialWindowSize = {
                width: window.width,
                height: window.height
            };
            var requiredDimensions = {
                height: parseInt(window.width / 4 * 3)
            };
            // Check the screen can accommodate the change, otherwise adjust width and height to get the largest size we can
            if (requiredDimensions.height > screen.availHeight) {

                var shortfall = screen.availHeight / requiredDimensions.height;
                requiredDimensions.width = parseInt(window.width * shortfall);
                requiredDimensions.height = screen.availHeight;
            }
            chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, requiredDimensions, function () {

                // Done
                resolve(tab);
            });
        });
    });
}

/**
 * Restores the current window size using dimensions captured earlier.
 */
function restoreWindowSize() {

    if (initialWindowSize === null) {

        // Nothing to do
        return;
    }
    chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, null, function(window) {

        chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, initialWindowSize, function () {

            // Done
        });
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
        width: 'auto'
    });

    // Inject info
    $('#title').val(tab.title);
    $('#url').val(tab.url);
    $('#favicon-url').val(tab.favIconUrl);

    // Wire event handlers
    $('#submit').unbind('click').bind('click', submitForm);

    // Show
    $('#form-wrapper').show();

    return tab;
}

/**
 * Sends an upload job to the background uploader and updates the UI accordingly.
 */
function submitForm() {

    // Update UI
    $('#form-wrapper').hide();
    $('#uploading').show();

    // Pass job off to background task
    chrome.runtime.sendMessage({
        message: 'uploadScreenshot',
        'formData': {
            'title': $('#title').val().trim(),
            'tags': $('#tags').val().trim(),
            'tagsTag': $('#tags_tag').val().trim(),
            'palette': $('#palette').val().trim(),
            'notes': $('#notes').val().trim(),
            'url': $('#url').val().trim(),
            'faviconUrl': $('#favicon-url').val().trim(),
            'fullPageDataUri': fullPageScreenshot.canvas.toDataURL(),
            'currentScreenDataUri': currentScreenDataUri,
            'authToken': options.authToken,
            'endpointUrl': options.endpointUrl
        }
    }, function(response) {

        jobId = response.jobId;
    });

    // Done
    return false;
}

/**
 * Triggers the page to start scrolling.
 */
function sendScrollPageMessage(tab) {

    chrome.tabs.sendMessage(tab.id, {message: 'scrollPage'}, onFullPageScreenshotComplete);

    return tab;
}

/**
 *  Called each time the page has scrolled to a new segment. These events fire without waiting for
 *  a response.
 */
function onScroll(data, callback) {

    // Update progress
    $('#loading-percent').text(parseInt(data.complete * 100, 10) + '%');

    // Scale as required
    // Get window.devicePixelRatio from the page, not the popup
    var scale = (data.devicePixelRatio && data.devicePixelRatio) !== 1 ? (1 / data.devicePixelRatio) : 1;
    if (scale !== 1) {

        data.x = data.x / scale;
        data.y = data.y / scale;
        data.totalWidth = data.totalWidth / scale;
        data.totalHeight = data.totalHeight / scale;
    }

    // Ensure canvas elements created
    if (fullPageScreenshot === null) {

        var canvas = document.createElement('canvas');
        canvas.width = data.totalWidth;
        canvas.height = data.totalHeight;
        fullPageScreenshot = {
            canvas: canvas,
            context: canvas.getContext('2d')
        };
    }

    // Capture screen
    captureScreen(data.x, data.y, fullPageScreenshot.context, callback);
}

/**
 *  Captures the current screen adn writes it to the given context.
 */
function captureScreen(x, y, destinationContext, callback) {

    chrome.tabs.captureVisibleTab(null, {format: 'png', quality: 100}, function(dataUri) {

        if (!dataUri) {

            return;
        }
        var image = new Image();
        image.onload = function() {

            if (destinationContext) {

                destinationContext.drawImage(image, x, y);
            }
            if (callback) {

                callback({dataUri: dataUri, image: image});
            }
        };
        image.src = dataUri;
    });

}

/**
 * Captures just the current screen.
 */
function captureCurrentScreenPromise(tab) {

    return new Promise(function (resolve) {

        captureScreen(0, 0, null, function(data) {

            // Extract colour palette
            var vibrant = new Vibrant(data.image, 256, 3);
            var swatches = vibrant.swatches();
            for (var swatch in swatches) {

                if (swatches.hasOwnProperty(swatch) && swatches[swatch] && typeof swatches[swatch].getHex !== 'undefined') {

                    var hexCode = swatches[swatch].getHex();
                    $('#palette-list').append('<li style="background-color: ' + hexCode + ';">&nbsp;</li>');
                    $('#palette').val($('#palette').val() + hexCode);
                }
            }
            $('#palette-list li').width(100 / Math.max($('#palette-list li').length, 1) + '%');

            // Save screen
            currentScreenDataUri = data.dataUri;

            // Hide loading percent
            $('#loading-percent' ).hide();

            // Show image
            $('#preview').append(data.image);
            $('#preview').animate({'height':$('#preview img').height()}, 100);
            $('#preview img').fadeIn(100);

            // Enable submit
            $('#submit').removeAttr('disabled');

            resolve(tab);
        });
    });
}

/**
 * Sends a message to the injected page script to clean up. E.g. restore scrollbars
 */
function sendCleanUpMessagePromise(tab) {

    return new Promise(function (resolve) {

        chrome.tabs.sendMessage(tab.id, {message: 'cleanUp'}, function () {

            resolve(tab);
        });
    });
}

/**
 * Message handler.
 */
function onMessage(request, sender, sendResponse) {

    // Used to check if script has already been injected in page.
    if (request.message === 'onScroll') {

        onScroll(request, sendResponse);
    }
    else if (request.message === 'uploadProgress' && request.jobId == jobId) {

        $('.uploading-percent').text(request.percentComplete + '%');
    }
    else if (request.message === 'uploadDone' && request.jobId == jobId) {

        // Update UI
        $('#uploading').hide();
        $('#uploading-done').show();
    }
    else if (request.message === 'uploadFailed' && request.jobId == jobId) {

        // Update UI
        $('#uploading').hide();
        $('.endpoint-url' ).attr('href', options.endpointUrl);

        if (request.isTokenInvalid) {

            $('#uploading-auth-error').show();
        }
        else if (typeof request.error !== 'undefined') {

            $('#uploading-error .reason').text(request.error);
            $('#uploading-error').show();
        }
        else {

            $('#uploading-networking-error').show();
        }
    }

    // Must return true here otherwise the response isn't received
    return true;
}

/**
 * 	Once the fullpage screenshot is ready, triggers the creation of the current screen screenshot.
 * 	After that is ready, restores page to initial state, displays preview and enables submit.
 */
function onFullPageScreenshotComplete() {

    Promise.resolve()
        .then(getCurrentTabPromise)
        .then(captureCurrentScreenPromise)
        .then(sendCleanUpMessagePromise)
        .then(restoreWindowSize);
}

/**
 *  Sets up required resources. If anything fails, displays error feedback and stops.
 */
function init() {

    // Set any option screen links
    $('.options-link' ).bind('click', openOptionsScreen);

    // Set listeners
    chrome.runtime.onMessage.addListener(onMessage);

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
        .then(enforceWindowAspectRatioPromise)
        .then(injectPageScriptPromise)
        // Done, show form and start taking screenshot
        .then(showForm)
        .then(sendScrollPageMessage)
        .catch(onInitError);
}

// Go!
init();
