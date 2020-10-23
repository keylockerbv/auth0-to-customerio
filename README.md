# Auth0 - Logs to Customer.io

This extension will take some of your Auth0 logs and export them to Customer.io.

The core functionality of this extension can be found in `server/lib/`.

## Usage

In the Auth0 management, go to Extensions and create a new extension. Enter the URL of this repository when asked for an URL for the extension.

## Releasing an update

Perform the following steps to release a new version of this extension:

1. Bump the version in `package.json` and `webtask.json`.
2. Run `npm run build`
3. Commit and push the changed files and all files in `dist/` and `build/`
4. Press the update extension button in Auth0. This may not show up directly.
   - If the update should be applied immediately, recreate the extension. Make sure to set `START_FROM` to the ID of the last process log entry.

## Attribution

This project is forked from https://github.com/cotalabs/cota-auth0-to-logdna/, which itself is based on a log sync extension made by Auth0.
