
/**
 * Add a View Gallery link if the user has set the value
 */
chrome.runtime.onInstalled.addListener(function () {

    chrome.contextMenus.create({
        id: 'view-gallery',
        title: 'View Gallery',
        contexts: ['browser_action'],
        enabled: false
    });

    return true;
});

/**
 * Event handler for when context menu item clicked
 */
chrome.contextMenus.onClicked.addListener(function (info, tab) {

    // View Gallery clicked
    if (info.menuItemId === 'view-gallery') {

        // Get local state
        chrome.storage.local.get({
            endpointUrl: ''
        }, function (data) {

            if (data.endpointUrl !== '') {

                // Open link
                window.open(data.endpointUrl);
            }
        });
    }
});
