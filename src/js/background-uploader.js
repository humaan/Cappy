/**
 *	This is an event page that handles uploading in the background, and can be queried for its state.
 */

// Store an array of jobs to chug through.
var jobs = [];
var jobCounter = 0;
var isUploading = false;
var errors = [];

/**
 * Listen for incoming jobs and queue them.
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    if (request.message === 'uploadScreenshot') {

        // It's a new job
        jobCounter++;
        request.formData.jobId = jobCounter;
        jobs.push(request.formData);
        uploadNextJob();
        sendResponse({jobId:jobCounter});
    }
    else if (request.message === 'getUploadErrors') {

        sendResponse({errors: errors});

        // Getting the queue clears it
        errors = [];
    }
    else if (request.message === 'restoreIcon') {

        var manifest = chrome.runtime.getManifest();
        chrome.browserAction.setIcon({
            path: manifest.browser_action.default_icon
        });

    }
});

/**
 * Listen for shutdown notice, and ensure everything is tidied up.
 */
chrome.runtime.onSuspend.addListener(function() {

    chrome.browserAction.setBadgeText({text: ""});
});

/**
 * Loops over the job queue, uploading each in turn. If already uploading, just returns.
 */
function uploadNextJob() {

    // Check if there's another job to process
    if (jobs.length == 0) {

        // Shutdown
        chrome.browserAction.setBadgeText({text: ""});
        chrome.browserAction.setTitle({title: "Hi"});
        return;
    }
    else {

        var count = jobs.length;
        if (isUploading) {

            count++;
        }
        chrome.browserAction.setBadgeText({text: "" + count});
    }

    // If already uploading, no need to do anything. I.e. another file just got added to the queue
    if (isUploading) {

        return;
    }
    isUploading = true;

    // Get next job
    var data = jobs.shift();

    // Build form data https://developer.mozilla.org/en-US/docs/Web/API/FormData
    var formData = new FormData();
    formData.append('title', data.title);
    formData.append('tags', data.tags);
    formData.append('tags_tag', data.tagsTag);
    formData.append('palette', data.palette);
    formData.append('dominant', data.dominant);
    formData.append('notes', data.notes);
    formData.append('url', data.url);
    formData.append('favicon_url', data.faviconUrl);
    formData.append('auth_token', data.authToken);
    formData.append('fullpage', dataUriToBlob(data.fullPageDataUri), 'fullpage.png');
    formData.append('current_screen', dataUriToBlob(data.currentScreenDataUri), 'current-screen.png');
    formData.append('cappyApiVersion', TARGET_CAPPY_API_VERSION);

    // Submit request
    $.ajax({
        url: data.endpointUrl + 'api/uploader.php',
        data: formData,
        type: 'POST',
        xhr: function() {  // custom xhr

            myXhr = $.ajaxSettings.xhr();
            if(myXhr.upload){ // if upload property exists
                myXhr.upload.addEventListener('progress', function(e) {

                    if (e.total == 0) {
                        return;
                    }
                    var percentComplete = Math.round((e.loaded / e.total) * 100);
                    chrome.browserAction.setTitle({title: "Uploading screenshot 1 of " + (jobs.length + 1) + ": " + percentComplete + "%"});
                    chrome.runtime.sendMessage({
                        message:"uploadProgress",
                        jobId: data.jobId,
                        percentComplete: percentComplete
                    });
                }, false); // progressbar
            }
            return myXhr;
        },
        // Options to tell JQuery not to process data or worry about content-type
        cache: false,
        contentType: false,
        processData: false
    })
        .done(function (response) {

            response = $.parseJSON(response);
            var isTokenInvalid = (
                typeof response.is_token_invalid !== 'undefined' &&
                response.is_token_invalid
            );
            if (isTokenInvalid) { // User needs to log in again

                onUploadError({
                    message:"uploadFailed",
                    title: data.title,
                    url: data.url,
                    jobId: data.jobId,
                    isTokenInvalid: isTokenInvalid
                });
            }
            else if (typeof response.error !== 'undefined') { // Server-side error

                onUploadError({
                    message:"uploadFailed",
                    title: data.title,
                    url: data.url,
                    jobId: data.jobId,
                    error: response.error
                });
            }
            else { // Success

                // Notify pop-up
                chrome.runtime.sendMessage({
                    message:"uploadDone",
                    jobId: data.jobId
                });
            }
            isUploading = false;
            uploadNextJob();
        } )
        .fail(function (response) { // Network error

            onUploadError({
                message:"uploadFailed",
                title: data.title,
                url: data.url,
                jobId: data.jobId
            });

            // Move on
            isUploading = false;
            uploadNextJob();
        });
}

/**
 * Updates the app icon and sends the given error to the popup. However, if popup is not open,
 * the message goes into a queue, for the pop-up to read when it's opened next.
 * @param message
 */
function onUploadError(message) {

    // Set the icon to error mode
    chrome.browserAction.setIcon({
        path: 'images/icon.error.png'
    });

    // Put the message into the queue
    errors.push(message);

    // Send the message
    chrome.runtime.sendMessage(message, function (response) {

        // The message was received, so take it back off the queue
        if (typeof response !== 'undefined') {

            errors.pop();
        }
    });
}


function dataUriToBlob(dataUri) {

    // standard dataURI can be too big, let's blob instead
    // http://code.google.com/p/chromium/issues/detail?id=69227#c27

    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs
    var byteString = atob(dataUri.split(',')[1]);

    // separate out the mime component
    var mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // create a blob for writing to a file
    return new Blob([ab], {type: mimeString});
}
