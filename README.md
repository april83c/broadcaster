# Broadcaster

Service to broadcast notifications over websockets for osuplace

## Installation

1. `yarn install`
2. Copy `.env.example` to `.env` and edit `.env` to configure the app
3. `yarn run build`
4. `yarn start`

## Usage

See [API.md](https://github.com/osuplace/broadcaster/blob/main/API.md).

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
