/**
 * Adds save/restore functionality for the option popup.
 */

/**
 * Checks if all required fields of the login form are populated, and toggled the disabled state of
 * the login button appropriately.
 */
function enableLoginIfComplete() {

    // Check if login enabled
    var isComplete = (
        $('#endpoint-url').val().trim() !== '' &&
        $('#email').val().trim() !== '' &&
        $('#password').val().trim() !== ''
    );

    // Validate each input
    (isComplete) ? $('#login').removeAttr('disabled') : $('#login').attr('disabled', 'disabled');

    return true;
}

/**
 * Saves options to chrome storage.
 */
function attemptLogin() {

    // Hide login button and old feedback, disable inputs
    $('.succes, .error').hide();
    $('#login').attr('disabled', 'disabled');
    $('input').attr('disabled', 'disabled');

    // Ensure endpoint URL starts with http or https and ends with a slash
    var endpointUrl = $('#endpoint-url').val().trim();
    if (endpointUrl.indexOf('http') !== 0) {

        endpointUrl = 'http://' + endpointUrl;
    }
    if (endpointUrl.substr(-1) != '/') {

        endpointUrl += '/';
    }
    $('#endpoint-url').val(endpointUrl);

    // Submit request
    $.ajax({
        url: endpointUrl + 'api/login.php',
        data: {
            email: $('#email').val().trim(),
            password: $('#password').val().trim()
        },
        type: 'POST',
        dataType: 'json'
    })
        .done(function (response) {

            // Got a valid response. Can still be an error though.
            if (typeof response.error !== 'undefined') {

                // Login failed
                showError(response.error);
                resetLoginForm();
            }
            else {

                // Login success

                // Clear form
                $('#endpoint-url').val('');
                $('#email').val('');
                $('#password').val('');

                // Save options
                var data = {
                    endpointUrl: endpointUrl,
                    name: response.data.name,
                    authToken: response.data.auth_token
                };
                chrome.storage.local.set(data, function () {

                    // Show details
                    showLoggedInDetails(data);
                });
            }
        })
        .fail(function (response) {

            // Networking error, etc
            var message = 'Unable to connect to your gallery site. Please check the URL is correct (';
                message += '<a href="' + endpointUrl + '">' + endpointUrl + '</a>';
                message += ') and that you have some internets.';
            showError(message);
            resetLoginForm();
        });

    return false;
}

/**
 * Displays the given message in an error box.
 */
function showError(message) {

    $('.error').html(message).show();
}

/**
 * Assuming there has been a failed login attempt, this method restores the form so user can retry.
 */
function resetLoginForm() {

    // Enable inputs
    $('input').removeAttr('disabled');
    enableLoginIfComplete();

    // Ensure the login form is visible
    $('#login-form').show();
    $('#logout-form').hide();
}

/**
 * Given the current user's details (from login or local store), displays their details in place of the
 * login form.
 */
function showLoggedInDetails(data) {

    // Populate
    $('.name').text(data.name);
    $('.gallery-url').html('<a href="' + data.endpointUrl + '">' + data.endpointUrl + '</a>');

    // Hide the form and show the logged in panel
    $('#login-form').hide();
    $('#logout-form').show();

    // Populate the endpoint URL for convenience
    $('#endpoint-url').val(data.endpointUrl);

    // Enable the View Gallery context link
    chrome.contextMenus.update('view-gallery', {enabled: true});
}

/**
 * Called to log user out and redisplay the login form.
 */
function logout() {

    // Clear local storage. Doesn't log out remotely
    chrome.storage.local.clear();

    // Show login form
    resetLoginForm();

    // Disable the View Gallery context link
    chrome.contextMenus.update('view-gallery', {enabled: false});

    return false;
}

/**
 * Restores options from chrome storage.
 */
function restoreOptions() {

    // showLoggedInDetails(response.data);
    chrome.storage.local.get({
        endpointUrl: '',
        name: '',
        authToken: ''
    }, function (data) {

        // If logged in, display details instead of login form
        if (data.authToken !== '') {

            showLoggedInDetails(data);
        }
    });
}

/**
 * Sets up options page.
 */
function init() {

    // Event handlers
    $(document).bind('DOMContentLoaded', restoreOptions);
    $('input').bind('keyup', enableLoginIfComplete);
    $('#login').bind('click', attemptLogin);
    $('#logout').bind('click', logout);
}

// Go!
init();
