Cappy Chrome Extension
=

Cappy is a Chrome extension for taking screenshots and sharing them to a gallery website. It's designed to be used by teams and communities for sharing design inspiration.

When you capture a web page, Cappy takes a screenshot of your current screen _and_ the full page. You can describe and tag the screenshots then publish them with one click.

Cappy was designed to work with a gallery website we built but isn't open-source. That said, it would be easy enough to adapt Cappy to post screenshots to some other location as it simply does a form POST with the data (the screenshots come through as file attachments).

Cappy has authentication built into it, so if using it on your own project you would need to modify or remove that component.

Here's an example of capturing the Apple homepage:

![Screenshot of Cappy capturing apple.com](/demo/screenshot-thumb.png?raw=true)   
([View larger](/demo/screenshot.png?raw=true))

And the screenshots taken: [Current screen](/demo/example-current-screen.png?raw=true),  [Fullpage](/demo/example-fullpage.png?raw=true).

Instructions
-

To load the dev version, simply download the `/src` directory, install dependencies (`npm install`), then load the `/src` directory as an unpacked extension in Chrome.

To make a release build (mostly just excludes unneeded dependencies):

1. cd ./src
2. npm install
3. gulp dist

The unpacked release build is output to /src/extension, and a zip file ready for the Chrome Web Store is output to /src/extension.zip.

Credits
-

While Cappy was mostly written from scratch, the first version of this project started life as a fork of Peter Coles'
Full Page Screen Capture plugin (https://github.com/mrcoles/full-page-screen-capture-chrome-extension). Cappy still
benefits from a number of solutions implemented in Peter's plugin, so thank you Peter (and others) for all your work!
