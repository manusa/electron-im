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
describe('browser-window util module test suite', () => {
  let browserWindow;
  beforeEach(() => {
    browserWindow = require('../');
  });
  test('showDialog, should fill provided window with provided BrowserView', () => {
    // Given
    const window = {
      getContentBounds: jest.fn(() => ({width: 13, height: 37})),
      setBrowserView: jest.fn()
    };
    const dialog = {
      setBounds: jest.fn(),
      setAutoResize: jest.fn()
    };
    // When
    browserWindow.showDialog(window, dialog);
    // Then
    expect(window.setBrowserView).toHaveBeenCalledWith(dialog);
    expect(window.setBrowserView).toHaveBeenCalledBefore(dialog.setBounds);
    expect(dialog.setBounds).toHaveBeenCalledTimes(1);
    expect(dialog.setBounds).toHaveBeenCalledWith({x: 0, y: 0, width: 13, height: 37});
    expect(dialog.setAutoResize).toHaveBeenCalledTimes(1);
    expect(dialog.setAutoResize)
      .toHaveBeenCalledWith({width: true, horizontal: true, height: true, vertical: true});
  });
});
