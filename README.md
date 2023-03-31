# Broadcaster

Service to broadcast notifications over websockets for osuplace

> ⚠️ This is a work in progress and is **not ready for production use**.

## Installation

1. `yarn install`
2. Copy `.env.example` to `.env` and edit `.env` to configure the app
3. `yarn run build`
4. `yarn start`

## Usage

See [API.md](https://github.com/osuplace/broadcaster/blob/main/API.md).

### Panel

For humans, there's a panel/GUI at `/panel`.

### Logging

By default, Broadcaster does not log outgoing notifications to a file. However, it does log them to `stdout`, so if you'd like a log of the notifications, you can just save that to a file.

## Development setup

To get modules to work correctly in Visual Studio Code:

1. `yarn dlx @yarnpkg/sdks vscode` (You might not need to do this one???)
2. Ctrl+Shift+P in a .ts file
3. Select TypeScript Version
4. Use workspace version

[Source](https://yarnpkg.com/getting-started/editor-sdks)

Also, [be careful upgrading TypeScript](https://github.com/yarnpkg/berry/issues/5125)

# License & Copyright

See `LICENSE` file.
