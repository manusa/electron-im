/*
   Copyright 2019 Marc Nuri San Felix

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */
const {BrowserView} = require('electron');
const path = require('path');
const {handleRedirect} = require('../tab-manager/redirect');
const {showDialog} = require('../browser-window');

const webPreferences = {
  contextIsolation: false,
  nativeWindowOpen: true,
  nodeIntegration: false,
  sandbox: true,
  preload: path.resolve(__dirname, '..', '..', 'bundles', 'help.preload.js')
};

const openHelpDialog = mainWindow => () => {
  const helpView = new BrowserView({webPreferences});
  helpView.webContents.loadURL(`file://${__dirname}/index.html`);
  const handleRedirectForCurrentUrl = handleRedirect(helpView);
  helpView.webContents.on('will-navigate', handleRedirectForCurrentUrl);
  helpView.webContents.on('new-window', handleRedirectForCurrentUrl);
  showDialog(mainWindow, helpView);
};

module.exports = {openHelpDialog};
