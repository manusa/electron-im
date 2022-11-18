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
const {ipcRenderer} = window;

import {
  APP_EVENTS, html, render, useReducer, IconButton, NavigationRail, TopAppBar
} from '../components/index.mjs';
import {
  reducer, activatePane, dictionariesEnabled, isPaneActive
} from './settings.reducer.browser.mjs';
import {
  OtherPane
} from './settings.other.browser.mjs';
import {
  ServicesPane
} from './settings.services.browser.mjs';
import {
  SpellCheckPane
} from './settings.spell-check.browser.mjs';

const settingsRoot = () => document.querySelector('.settings');

const Settings = ({initialState}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const enabledDictionaries = dictionariesEnabled(state);
  const onActivatePane = activatePane({dispatch});
  const save = () => ipcRenderer.send(APP_EVENTS.settingsSave, {
    tabs: state.tabs,
    useNativeSpellChecker: state.useNativeSpellChecker,
    enabledDictionaries,
    disableNotificationsGlobally: state.disableNotificationsGlobally,
    theme: state.theme
  });
  const cancel = () => ipcRenderer.send(APP_EVENTS.closeDialog);
  return html`
    <${TopAppBar} headline='Settings' icon='\uE5C4' iconClick=${cancel}
      trailingIcon=${html`<${IconButton}
          className='settings__submit' icon='\ue161' onClick=${save}
          disabled=${!state.canSave || state.invalidTabs.size !== 0}/>`}
    />
    <${NavigationRail}>
      <${NavigationRail.Button} label='Services' icon='\ue5c3'
        active=${isPaneActive(state)(ServicesPane.id)} onClick=${() => onActivatePane(ServicesPane.id)} />
      <${NavigationRail.Button} label='Spell check' icon='\ue8ce'
        active=${isPaneActive(state)(SpellCheckPane.id)} onClick=${() => onActivatePane(SpellCheckPane.id)} />
      <${NavigationRail.Button} label='Other' icon='\ue619'
        active=${isPaneActive(state)(OtherPane.id)} onClick=${() => onActivatePane(OtherPane.id)} />
    </${NavigationRail}>
    <div class="container">
      <div class="form">
        <${ServicesPane} dispatch=${dispatch} state=${state} />
        <${SpellCheckPane} dispatch=${dispatch} state=${state} />
        <${OtherPane} dispatch=${dispatch} state=${state} />
      </div>
    </div>
  `;
};

Promise.all([
  ipcRenderer.invoke(APP_EVENTS.settingsLoad),
  ipcRenderer.invoke(APP_EVENTS.dictionaryGetAvailable),
  ipcRenderer.invoke(APP_EVENTS.dictionaryGetAvailableNative),
  ipcRenderer.invoke(APP_EVENTS.dictionaryGetEnabled)
]).then(
  (
    [currentSettings, availableDictionaries, availableNativeDictionaries, enabledDictionaries]
  ) => {
    const initialState = {
      activePane: ServicesPane.id,
      invalidTabs: new Set(),
      canSave: currentSettings.tabs.length > 0,
      dictionaries: {
        available: availableDictionaries,
        availableNative: availableNativeDictionaries,
        enabled: enabledDictionaries
      },
      useNativeSpellChecker: currentSettings.useNativeSpellChecker,
      tabs: currentSettings.tabs,
      expandedTabs: [],
      newTabValid: false,
      newTabValue: '',
      disableNotificationsGlobally: currentSettings.disableNotificationsGlobally,
      theme: currentSettings.theme
    };
    render(html`<${Settings} initialState=${initialState} />`, settingsRoot());
  }
);
