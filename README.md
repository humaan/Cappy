Cappy Chrome Extension
=

Structure
-

popup.html - ...

Instructions
-

To load the dev version, simple load the /src directory as an unpacked extension in Chrome.

To make a release build:

1. cd ./src
2. npm install
3. npm run build

The release version (mostly just excludes unneeded dependencies) will be in /src/extension.

Credits
-

While Cappy was mostly written from scratch, the first version of this project started life as a fork of Peter Coles'
Full Page Screen Capture plugin (https://github.com/mrcoles/full-page-screen-capture-chrome-extension). Cappy still
benefits from a number of solutions implemented in Peter's plugin, so thank you Peter (and others) for all your work!

