
/**
 * Add a View Gallery link if the user has set the value
 */
chrome.runtime.onInstalled.addListener(function() {

    chrome.contextMenus.create({
        id: 'view-gallery',
        title: 'View Gallery',
        contexts: ['browser_action'],
        enabled: false
    });

    return true;
});
