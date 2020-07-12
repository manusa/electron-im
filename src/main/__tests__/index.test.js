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
describe('Main module test suite', () => {
  let mockBrowserWindow;
  let mockNotification;
  let mockApp;
  let mockIpc;
  let mockTabContainer;
  let mockSettings;
  let settingsModule;
  let spellCheckModule;
  let tabManagerModule;
  let userAgentModule;
  let main;
  beforeEach(() => {
    mockBrowserWindow = {
      listeners: {},
      on: jest.fn((eventName, func) => {
        mockBrowserWindow.listeners[eventName] = func;
      }),
      removeMenu: jest.fn()
    };
    mockNotification = jest.fn();
    mockApp = {};
    mockIpc = {
      listeners: {},
      on: jest.fn((eventName, func) => {
        mockIpc.listeners[eventName] = func;
      })
    };
    mockTabContainer = {};
    mockSettings = {};
    jest.resetModules();
    jest.mock('electron', () => ({
      BrowserWindow: jest.fn(() => mockBrowserWindow),
      Notification: jest.fn(() => mockNotification),
      app: mockApp,
      ipcMain: mockIpc
    }));
    jest.mock('../../chrome-tabs', () => ({
      TABS_CONTAINER_HEIGHT: 46,
      initTabContainer: () => mockTabContainer
    }));
    require('../../chrome-tabs');
    jest.mock('../../settings');
    settingsModule = require('../../settings');
    settingsModule.loadSettings.mockImplementation(() => mockSettings);
    settingsModule.openSettingsDialog.mockImplementation();
    settingsModule.updateSettings.mockImplementation();
    jest.mock('../../spell-check');
    spellCheckModule = require('../../spell-check');
    jest.mock('../../tab-manager');
    tabManagerModule = require('../../tab-manager');
    tabManagerModule.getActiveTab.mockImplementation();
    jest.mock('../../user-agent');
    userAgentModule = require('../../user-agent');
    userAgentModule.userAgentForView.mockImplementation(() => 'UserAgent String');
    userAgentModule.initBrowserVersions.mockImplementation(() => ({then: func => {
      func.call();
      return {catch: () => {}};
    }}));
    main = require('../');
  });
  describe('init - environment preparation', () => {
    test('initBrowserVersions, successful, should be set to defaultUserAgent', () => {
      // When
      main.init();
      // Then
      expect(mockApp.userAgentFallback).toBe('UserAgent String');
    });
    test('initBrowserVersions, throws error, should be set to defaultUserAgent and show Notification', () => {
      // Given
      userAgentModule.initBrowserVersions.mockImplementation(() => ({then: () => ({catch: func => func.call()})}));
      mockNotification.show = jest.fn();
      // When
      main.init();
      // Then
      expect(mockApp.userAgentFallback).toBe('UserAgent String');
      expect(mockNotification.show).toHaveBeenCalledTimes(1);
    });
  });
  describe('mainWindow events', () => {
    test('maximize, should activate current tab (Will force a BrowserView resize)', () => {
      // Given
      main.init();
      // When
      mockBrowserWindow.listeners.maximize();
      // Then
      expect(tabManagerModule.getActiveTab).toHaveBeenCalledTimes(1);
    });
    test('resize, should store new size in configuration file', () => {
      // Given
      mockBrowserWindow.getSize = jest.fn(() => ([13, 37]));
      main.init();
      // When
      mockBrowserWindow.listeners.resize();
      // Then
      expect(settingsModule.updateSettings).toHaveBeenCalledWith({width: 13, height: 37});
    });
  });
  describe('initTabListener ipc events', () => {
    describe('tabsReady', () => {
      let addTabsNested;
      beforeEach(() => {
        addTabsNested = jest.fn();
        tabManagerModule.addTabs.mockImplementation(() => addTabsNested);
      });
      test('No tabs in settings, should open settings dialog', () => {
        // Given
        settingsModule.loadSettings.mockImplementation(() => ({tabs: []}));
        main.init();
        // When
        mockIpc.listeners.tabsReady({});
        // Then
        expect(tabManagerModule.addTabs).not.toHaveBeenCalled();
        expect(addTabsNested).not.toHaveBeenCalled();
        expect(settingsModule.openSettingsDialog).toHaveBeenCalledTimes(1);
      });
      test('Previous saved tabs in loaded settings, should add tabs to manager and activate them as they are added', () => {
        // Given
        const event = {sender: {send: jest.fn()}};
        settingsModule.loadSettings.mockImplementation(() => ({tabs: [
          {id: '1337', otherInfo: 'A Tab'},
          {id: 'disabled-1337', disabled: true, otherInfo: 'I should be ignored'}
        ]}));
        main.init();
        // When
        mockIpc.listeners.tabsReady(event);
        // Then
        expect(tabManagerModule.addTabs).toHaveBeenCalledWith(event.sender);
        expect(addTabsNested).toHaveBeenCalledTimes(1);
        expect(addTabsNested).toHaveBeenCalledWith([{id: '1337', otherInfo: 'A Tab', active: false}]);
        expect(settingsModule.openSettingsDialog).not.toHaveBeenCalled();
      });
    });
    describe('activateTab', () => {
      let activeTab;
      beforeEach(() => {
        activeTab = {
          setBounds: jest.fn(),
          webContents: {focus: jest.fn()}
        };
        mockTabContainer.setBounds = jest.fn();
        mockBrowserWindow.setBrowserView = jest.fn();
        mockBrowserWindow.addBrowserView = jest.fn();
        tabManagerModule.getTab = jest.fn(id => (id === 'validId' ? activeTab : null));
      });
      test('no active tab, should do nothing', () => {
        // Given
        main.init();
        // When
        mockIpc.listeners.activateTab({}, {id: 'not here'});
        // Then
        expect(mockBrowserWindow.setBrowserView).not.toHaveBeenCalled();
        expect(mockBrowserWindow.addBrowserView).not.toHaveBeenCalled();
      });
      test('active tab, should resize tab and set it as the main window browser view', () => {
        // Given
        mockBrowserWindow.getContentBounds = jest.fn(() => ({width: 13, height: 83}));
        main.init();
        // When
        mockIpc.listeners.activateTab({}, {id: 'validId'});
        // Then
        expect(activeTab.setBounds).toHaveBeenCalledWith({x: 0, y: 46, width: 13, height: 37});
        expect(mockBrowserWindow.setBrowserView).toHaveBeenCalledWith(mockTabContainer);
        expect(mockBrowserWindow.addBrowserView).toHaveBeenCalledWith(activeTab);
        expect(activeTab.webContents.focus).toHaveBeenCalledTimes(1);
      });
      test('#23, setBounds should be called AFTER adding view to BrowserWindow', () => {
        // Given
        mockBrowserWindow.getContentBounds = jest.fn(() => ({width: 13, height: 83}));
        main.init();
        // When
        mockIpc.listeners.activateTab({}, {id: 'validId'});
        // Then
        expect(mockBrowserWindow.setBrowserView).toHaveBeenCalledBefore(mockTabContainer.setBounds);
        expect(mockBrowserWindow.addBrowserView).toHaveBeenCalledBefore(mockTabContainer.setBounds);
        expect(mockBrowserWindow.setBrowserView).toHaveBeenCalledBefore(activeTab.setBounds);
        expect(mockBrowserWindow.addBrowserView).toHaveBeenCalledBefore(activeTab.setBounds);
      });
    });
    test('notificationClick, should restore window and activate tab', () => {
      // Given
      mockTabContainer.webContents = {send: jest.fn()};
      mockBrowserWindow.restore = jest.fn();
      mockBrowserWindow.show = jest.fn();
      main.init();
      // When
      mockIpc.listeners.notificationClick({}, {tabId: 'validId'});
      // Then
      expect(mockTabContainer.webContents.send).toHaveBeenCalledWith('activateTabInContainer', {tabId: 'validId'});
      expect(mockBrowserWindow.restore).toHaveBeenCalledTimes(1);
      expect(mockBrowserWindow.show).toHaveBeenCalledTimes(1);
      expect(tabManagerModule.getTab).toHaveBeenCalledWith('validId');
    });
    test('handleReload', () => {
      const event = {sender: {reloadIgnoringCache: jest.fn()}};
      main.init();
      // When
      mockIpc.listeners.reload(event);
      // Then
      expect(event.sender.reloadIgnoringCache).toHaveBeenCalledTimes(1);
    });
    test('handleZoomIn', () => {
      const event = {sender: {
        getZoomFactor: jest.fn(() => 0),
        setZoomFactor: jest.fn()
      }};
      main.init();
      // When
      mockIpc.listeners.zoomIn(event);
      // Then
      expect(event.sender.setZoomFactor).toHaveBeenCalledTimes(1);
      expect(event.sender.setZoomFactor).toHaveBeenCalledWith(0.1);
    });
    describe('handleZoomOut', () => {
      test('with valid initial zoom factor, should zoom out', () => {
        const event = {sender: {
          getZoomFactor: jest.fn(() => 0.200001),
          setZoomFactor: jest.fn()
        }};
        main.init();
        // When
        mockIpc.listeners.zoomOut(event);
        // Then
        expect(event.sender.setZoomFactor).toHaveBeenCalledTimes(1);
        expect(event.sender.setZoomFactor).toHaveBeenCalledWith(0.100001);
      });
      test('with invalid initial zoom factor, should do nothing', () => {
        const event = {sender: {
          getZoomFactor: jest.fn(() => 0.199999999999999),
          setZoomFactor: jest.fn()
        }};
        main.init();
        // When
        mockIpc.listeners.zoomOut(event);
        // Then
        expect(event.sender.setZoomFactor).not.toHaveBeenCalled();
      });
    });
    test('handleZoomReset', () => {
      const event = {sender: {setZoomFactor: jest.fn()}};
      main.init();
      // When
      mockIpc.listeners.zoomReset(event);
      // Then
      expect(event.sender.setZoomFactor).toHaveBeenCalledTimes(1);
      expect(event.sender.setZoomFactor).toHaveBeenCalledWith(1);
    });
    describe('handleTabReorder', () => {
      test('Several tabs, order changed, should update settings', () => {
        // Given
        mockSettings = {
          tabs: [{id: '1337'}, {id: '313373'}]
        };
        main.init();
        // When
        mockIpc.listeners.tabReorder({}, {tabIds: ['313373', '1337']});
        // Then
        expect(settingsModule.updateSettings).toHaveBeenCalledWith({tabs: [{id: '313373'}, {id: '1337'}]});
      });
      test('Several tabs with hidden, order changed, should update settings keeping hidden tags', () => {
        // Given
        mockSettings = {
          tabs: [{id: '1337'}, {id: 'hidden'}, {id: '313373'}, {id: 'hidden-too'}]
        };
        main.init();
        // When
        mockIpc.listeners.tabReorder({}, {tabIds: ['313373', '1337']});
        // Then
        expect(settingsModule.updateSettings).toHaveBeenCalledWith({tabs: [
          {id: '313373'}, {id: '1337'}, {id: 'hidden'}, {id: 'hidden-too'}
        ]});
      });
    });
    test('settingsOpenDialog, should open settings dialog', () => {
      // Given
      main.init();
      // When
      mockIpc.listeners.settingsOpenDialog();
      // Then
      expect(settingsModule.openSettingsDialog).toHaveBeenCalledTimes(1);
    });
  });
  describe('initSettingsListener ipc events', () => {
    let settingsView;
    beforeEach(() => {
      settingsView = {destroy: jest.fn()};
      mockBrowserWindow.getBrowserView = jest.fn(() => settingsView);
    });
    test('saveSettings, should reload settings and reset all views', () => {
      // Given
      mockBrowserWindow.removeBrowserView = jest.fn();
      mockTabContainer.destroy = jest.fn();
      main.init();
      // When
      mockIpc.listeners.settingsSave({}, {tabs: [], enabledDictionaries: []});
      // Then
      expect(spellCheckModule.loadDictionaries).toHaveBeenCalledTimes(2);
      expect(settingsModule.updateSettings).toHaveBeenCalledTimes(1);
      expect(settingsModule.updateTabUrls).toHaveBeenCalledTimes(1);
      expect(mockBrowserWindow.removeBrowserView).toHaveBeenCalledTimes(1);
      expect(mockBrowserWindow.removeBrowserView).toHaveBeenCalledWith(settingsView);
      expect(tabManagerModule.removeAll).toHaveBeenCalledTimes(1);
      expect(settingsView.destroy).toHaveBeenCalledTimes(1);
      expect(mockTabContainer.destroy).toHaveBeenCalledTimes(1);
    });
    test('closeSettings, should destroy settings view and activate current tab', () => {
      // Given
      main.init();
      // When
      mockIpc.listeners.settingsCancel();
      // Then
      expect(settingsModule.updateSettings).not.toHaveBeenCalled();
      expect(settingsModule.updateTabUrls).not.toHaveBeenCalled();
      expect(tabManagerModule.getActiveTab).toHaveBeenCalledTimes(1);
      expect(settingsView.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
