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
const fs = require('fs');
const path = require('path');
const HOME_DIR = require('os').homedir();
const {showDialog} = require('../browser-window');

const APP_DIR = '.electronim';
const SETTINGS_FILE = 'settings.json';
const DEFAULT_SETTINGS = {tabs: [], enabledDictionaries: ['en-US']};

const webPreferences = {
  contextIsolation: false,
  nativeWindowOpen: true,
  nodeIntegration: true,
  preload: `${__dirname}/preload.js`,
  partition: 'persist:electronim'
};

const appDir = path.join(HOME_DIR, APP_DIR);
const settingsPath = path.join(appDir, SETTINGS_FILE);

const containsTabId = tabs => tabId => tabs.map(({id}) => id).includes(tabId);

const ensureActiveTab = settings => {
  let {activeTab} = settings;
  const enabledTabs = settings.tabs.filter(({disabled}) => !disabled);
  if (enabledTabs.length > 0 && !containsTabId(enabledTabs)(activeTab)) {
    activeTab = enabledTabs[0].id;
  }
  return {...settings, activeTab};
};

const initAppDir = () => fs.mkdirSync(appDir, {recursive: true});

const loadSettings = () => {
  initAppDir();
  let loadedSettings = {};
  if (fs.existsSync(settingsPath)) {
    loadedSettings = JSON.parse(fs.readFileSync(settingsPath));
  }
  return ensureActiveTab(Object.assign(DEFAULT_SETTINGS, loadedSettings));
};

const writeSettings = settings => {
  initAppDir();
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
};

const updateSettings = settings =>
  writeSettings(ensureActiveTab({...loadSettings(), ...settings}));

const openSettingsDialog = mainWindow => {
  const settingsView = new BrowserView({webPreferences});
  settingsView.webContents.loadURL(`file://${__dirname}/index.html`);
  showDialog(mainWindow, settingsView);
};

module.exports = {loadSettings, updateSettings, openSettingsDialog};
