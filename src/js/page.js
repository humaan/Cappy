/**
 * 	This is a content script. It gets injected into the page being captured, and takes care of scrolling it,
 * 	hiding the scrollbars, etc, and letting the browser action know when to take each screenshot.
 */

/**
 * Based on the current window size, builds a queue of scrollpoints. Scrolls to each one and fires an event. The
 * provided callback is called once all points have been scrolled to.
 *
 * This works by dividing the page into screen-sized chunks, then getting all the x,y co-ordinates for each chunk.
 * We scroll to each chunk, send a message (which the popup can listen to), then after a delay scrolls again until
 * all done. The delay helps with rendering issues.
 */
function scrollPage(callback) {

    var MAX_WIDTH_PIXELS = 10000;
    var MAX_HEIGHT_PIXELS = 10000;
    var STICKY_HEADER_PADDING_PIXELS = 200;
    var CAPTURE_DELAY = 150;

    // Get current screen position and scrollbar state
    var originalOverflowStyle = document.documentElement.style.overflow;
    var originalX = window.scrollX;
    var originalY = window.scrollY;

    // Disable all scrollbars. We'll restore the scrollbar state when we're done scrolling.
    document.documentElement.style.overflow = 'hidden';

    // Calculate page segments
    var data = getPageSegmentData();
    var segments = data.segments;
    var totalSegments = segments.length;

    // Process segments
    processNextSegment();

    /**
     * Returns an array of points so as to cover the entire webpage if we scroll to each point.
     */
    function getPageSegmentData() {

        var widths = [
            document.documentElement.clientWidth,
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.offsetWidth
        ];
        var heights = [
            document.documentElement.clientHeight,
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight
        ];

        // Limit the max width and height in case of infinite scroll
        var fullWidth = Math.min(getMaxOfArray(widths), MAX_WIDTH_PIXELS);
        var fullHeight = Math.min(getMaxOfArray(heights), MAX_HEIGHT_PIXELS);

        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;

        var yPos = fullHeight - windowHeight;
        var xPos = 0;

        // Pad the vertical scrolling to try to deal with sticky headers. The value is arbitrary.
        var yDelta = windowHeight - (windowHeight > STICKY_HEADER_PADDING_PIXELS ? STICKY_HEADER_PADDING_PIXELS : 0);
        var xDelta = windowWidth;

        // During zooming, there can be weird off-by-1 types of things...
        if (fullWidth <= xDelta + 1) {

            fullWidth = xDelta;
        }

        var segments = [];
        while (yPos > -yDelta) {

            xPos = 0;
            while (xPos < fullWidth) {
                segments.push({x:xPos, y:yPos});
                xPos += xDelta;
            }
            yPos -= yDelta;
        }
        return {
            segments: segments,
            totalWidth: fullWidth,
            totalHeight: fullHeight
        };
    }

    /**
     * Gets the next segment, scrolls to it, and sends a message.
     */
    function processNextSegment() {

        // Check if finished
        if (segments.length === 0) {

            // Done
            cleanUp();
            if (callback) {

                callback();
            }
            return;
        }

        // Get next segment and scroll to it
        var next = segments.shift();
        window.scrollTo(next.x, next.y);

        // Send message after a slight delay to allow Mac scrollbars to hide themselves
        window.setTimeout(function() {

            // In case the below callback never returns, cleanup
            var cleanUpTimeout = window.setTimeout(cleanUp, 1250);

            var message = {
                message: 'onScroll',
                x: window.scrollX,
                y: window.scrollY,
                totalWidth: data.totalWidth,
                totalHeight: data.totalHeight,
                devicePixelRatio: window.devicePixelRatio,
                complete: (totalSegments - segments.length) / totalSegments
            };
            chrome.runtime.sendMessage(null, message, function(response) {

                window.clearTimeout(cleanUpTimeout);
                if (response) {

                    processNextSegment();
                }
                else {

                    cleanUp();
                }
            });
        }, CAPTURE_DELAY);
    }

    /**
     * Restore page state
     */
    function cleanUp() {

        document.documentElement.style.overflow = originalOverflowStyle;
        window.scrollTo(originalX, originalY);
    }

    /**
     * Given an array of numbers, returns the max value.
     * Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max
     */
    function getMaxOfArray(numArray) {

        return Math.max.apply(null, numArray);
    }
}

/**
 * Message handler. Ensure this is only set once as this script is called each time the browser action
 * is clicked. It's possible to only inject the script once, but that makes development harder as you
 * need to reload the page to see changes.
 */
if (!window.isCappyInjected) {

    window.isCappyInjected = true;
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

        // Request to scroll the page
        if (request.message === 'scrollPage') {

            scrollPage(sendResponse);
            // Must return true here otherwise the response isn't received
            return true;
        }
    });
}
