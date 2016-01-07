/**
 * Adds save/restore functionality for the option popup.
 */

// TODO: this needs to be fleshed out with the new authentication process

/**
 * Saves options to chrome storage.
 */
function saveOptions() {

    // Validate
    //if ($('#name').val().trim() == '') {
    //
    //    $('.error' ).text('Your name is required.').show();
    //    return false;
    //}
    var endpointUrl = $('#endpoint-url').val().trim();
    console.log(endpointUrl);
    if (endpointUrl === '') {

        $('.error' ).text('Your Caapture URL is required.').show();
        return false;
    }

    // Ensure endpoint URL starts with http or https and ends with a slash
    if (endpointUrl.indexOf('http') !== 0) {

        endpointUrl = 'http://' + endpointUrl;
    }
    if (endpointUrl.substr(-1) != '/') {

        endpointUrl += '/';
    }
    $('#endpoint-url').val(endpointUrl);

    // Save options
    chrome.storage.local.set({
        //name: $('#name').val().trim(),
        endpointUrl: endpointUrl
    }, function() {

        // Show confirmation
        $('.success').stop(true, true).show().delay(2000).fadeOut();
    });

    return false;
}

/**
 * Restores options from chrome storage.
 */
function restoreOptions() {

    chrome.storage.local.get({
        name: '',
        endpointUrl: ''
    }, function(items) {
        //$('#name').val(items.name);
        $('#endpoint-url').val(items.endpointUrl);
    });
}

// Hide elements
$('.hidden' ).hide();

// Event handlers
$(document).bind('DOMContentLoaded', restoreOptions);
$('#submit').bind('click', saveOptions);
