/*
   Copyright 2024 Marc Nuri San Felix

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
import {jest} from '@jest/globals';
import {loadDOM} from '../../__tests__/index.mjs';

describe('Find in Page :: index.html test suite', () => {
  beforeEach(async () => {
    jest.resetModules();
    window.electron = {
      close: jest.fn(),
      findInPage: jest.fn(),
      onFindInPage: jest.fn()
    };
    await loadDOM({meta: import.meta, path: ['..', 'index.html']});
  });
  test('loads required styles', () => {
    expect(Array.from(document.querySelectorAll('link[rel=stylesheet]'))
      .map(link => link.getAttribute('href')))
      .toEqual(['./find-in-page.browser.css']);
  });
});
