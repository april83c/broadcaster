# Broadcaster

Service to broadcast notifications over websockets for osuplace

## Installation

1. `yarn install`
2. Copy `.env.example` to `.env` and edit `.env` to configure the app
3. `yarn run build`
4. `yarn start`
5. ⚠️ **IMPORTANT**: The first user that signs into a Broadcaster instance gets Manage permissions. So, you should open it in your browser and sign in now.

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

Copyright (c) 2023 April <april@dummy.cafe> 

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.