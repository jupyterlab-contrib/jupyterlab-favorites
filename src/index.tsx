import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import {
  ISettingRegistry,
  PageConfig,
} from '@jupyterlab/coreutils';

// Can possibly use these to grab the appropriate icons by mimeType
// import {
//   defaultFileTypes,
// } from '@jupyterlab/docregistry';

import {
  IMainMenu
} from '@jupyterlab/mainmenu';

import {
  IFileBrowserFactory,
} from '@jupyterlab/filebrowser';

import {
  ServerConnection,
} from '@jupyterlab/services';

import {
  UseSignal,
  ReactWidget,
} from '@jupyterlab/apputils';

import {
  CommandRegistry,
} from '@phosphor/commands';

import {
  Signal,
} from '@phosphor/signaling';

import {
  PanelLayout,
} from '@phosphor/widgets';

import {
  toArray,
} from '@phosphor/algorithm';

import * as React from 'react';

import '../style/index.css';

namespace PluginIDs {
  export const favorites = 'jupyterlab-favorites';
}

namespace SettingIDs {
  export const themes = '@jupyterlab/apputils-extension:themes';
  export const favorites = `${PluginIDs.favorites}:favorites`;
}

namespace CommandIDs {
  export const addFavorite = `${PluginIDs.favorites}:add-favorite`;
  export const removeFavorite = `${PluginIDs}:remove-favorite`;
}

namespace types {
  export type Favorite = {
    title: string;
    iconClass: string;
    path: string;
  }

  export type FavoritesStore = {
    default: Array<Favorite>;
    valid: Array<Favorite> | undefined;
    invalid: Array<Favorite> | undefined;
  }
}

class FavoritesManager {
  public settingsID = SettingIDs.favorites;
  public favoritesChanged = new Signal<this, types.FavoritesStore>(this);
  private settingsRegistry: ISettingRegistry;
  private commandRegistry: CommandRegistry;
  private serverRoot: string;
  private _favorites: types.FavoritesStore;

  constructor(commands: CommandRegistry, settings: ISettingRegistry) {
    this.commandRegistry = commands;
    this.settingsRegistry = settings;
    this.settingsRegistry.pluginChanged.connect((_, pluginName) => {
      if (pluginName === SettingIDs.themes) {
        this.refreshIcons();
      }
    });
    this.serverRoot = PageConfig.getOption('serverRoot');
  }

  get favorites(): types.FavoritesStore {
    return this._favorites;
  }

  set favorites(favorites: types.FavoritesStore) {
    this._favorites = favorites;
  }

  async init() {
    await this.fetchFavorites();
    // Transform the plugin object to return different schema than the default.
    this.settingsRegistry.transform(this.settingsID, {
      fetch: plugin => {
        const transformed = {
          ...plugin,
          schema: {
            ...plugin.schema,
            properties: {
              ...plugin.schema.properties,
              favorites: {
                ...plugin.schema.properties.favorites,
                default: this.favorites.default,
              }
            }
          }
        }
        return transformed;
      }
    });
    await this.refreshIcons();
  }

  async fetchFavorites() {
    const serverSettings = ServerConnection.makeSettings();
    try {
      const response = await ServerConnection.makeRequest(
        `${serverSettings.baseUrl}favorites`,
        { method: 'GET' },
        serverSettings,
      );
      if (response.status !== 200) {
        throw Error(response.statusText);
      }
      else {
        this.favorites = await response.json();
        this.favoritesChanged.emit(this.favorites);
      }
    }
    catch (error) {
      console.log(error);
    }
  }

  validFavorites() {
    return this.favorites.valid || [];
  }

  composedFavorites() {
    return this.favorites.valid || this.favorites.default || [];
  }

  private async saveFavorites(favorites: Array<types.Favorite>) {
    const newSettings = JSON.stringify({ favorites });
    await this.settingsRegistry.upload(this.settingsID, newSettings);
    await this.fetchFavorites();
  }

  async addFavorite(favorite: types.Favorite) {
    if (this.has(favorite.path)) {
      return;
    }
    console.log('adding favorite: ', favorite);
    const valid = this.validFavorites();
    valid.push(favorite);
    this.saveFavorites(valid);
  }

  async removeFavorite(path: string) {
    console.log('removing favorite with path: ', path);
    const valid = this.validFavorites();
    const index = valid.findIndex(favorite => favorite.path === path);
    valid.splice(index, 1);
    this.saveFavorites(valid);
  }

  handleClick(favorite: types.Favorite) {
    console.log('inside new handleClick for: ', favorite);
    this.commandRegistry.execute('filebrowser:open-path', { path: favorite.path });
  }

  has(path: string) {
    return this.validFavorites().filter(favorite => favorite.path === path).length > 0;
  }

  async refreshIcons() {
    const themeSetting = await this.settingsRegistry.get(SettingIDs.themes, 'theme');
    const theme = (themeSetting.composite as string).split(' ')[1].toLowerCase();
    const root = document.documentElement;
    root.style.setProperty('--jp-icon-favorite-filled', `var(--jp-icon-favorite-filled-${theme})`);
    root.style.setProperty('--jp-icon-favorite-unfilled', `var(--jp-icon-favorite-unfilled-${theme})`);
  }
}

class FavoritesWidget extends ReactWidget {
  private manager: FavoritesManager;

  constructor(manager: FavoritesManager) {
    super();
    this.manager = manager;
    this.addClass('jp-Favorites');
  }

  render() {
    return (
      <UseSignal
        signal={this.manager.favoritesChanged}
        initialArgs={this.manager.favorites}
        initialSender={this.manager}
      >
        {(sender: FavoritesManager, favorites: types.FavoritesStore) => (
          <div>
            <div className="jp-Favorites-header">
              {"Favorites"}
            </div>
            <div className="jp-Favorites-container">
              {this.manager.composedFavorites().map(f =>
                <div
                  className="jp-Favorites-item"
                  title={f.path}
                  onClick={e => { this.manager.handleClick(f); }}
                  key={`favorites-item-${f.path}`}
                >
                  <span className={`jp-MaterialIcon jp-Favorites-itemIcon ${f.iconClass}`}></span>
                  <span className="jp-Favorites-itemText">{f.title}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </UseSignal>
    )
  }
}

/**
 * Initialization data for the jupyterlab-favorites extension.
 */
const favorites: JupyterFrontEndPlugin<void> = {
  id: PluginIDs.favorites,
  autoStart: true,
  requires: [
    IFileBrowserFactory,
    ISettingRegistry,
    IMainMenu,
  ],
  activate: async (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    settingsRegistry: ISettingRegistry,
    mainMenu: IMainMenu
  ) => {
    console.log('JupyterLab extension jupyterlab-favorites is activated!');
    const filebrowser = factory.defaultBrowser;
    const layout = filebrowser.layout as PanelLayout;
    const { commands } = app;
    const favoritesManager = new FavoritesManager(commands, settingsRegistry);
    favoritesManager.init();
    const favoritesWidget = new FavoritesWidget(favoritesManager);
    // Insert the Favorites widget just ahead of the BreadCrumbs
    let breadCrumbsIndex = 0;
    layout.widgets.forEach((widget, index) => {
      if (widget.node.className.includes('jp-BreadCrumbs')) {
        breadCrumbsIndex = index;
      }
    })
    layout.insertWidget(breadCrumbsIndex, favoritesWidget);
    // Context Menu commands
    const getSelectedItems = () => {
      const widget = tracker.currentWidget;
      if (!widget) {
        return [];
      }
      return toArray(widget.selectedItems());
    }
    const { tracker } = factory;
    commands.addCommand(CommandIDs.addFavorite, {
      execute: () => {
        const selectedItems = getSelectedItems();
        if (selectedItems.length > 0) {
          const selectedItem = selectedItems[0];
          favoritesManager.addFavorite({
            title: selectedItem.name,
            path: selectedItem.path,
            iconClass: 'jp-FolderIcon',
          });
        }
        // selectedItem.mimetype;
      },
      isVisible: () => {
        const selectedItems = getSelectedItems();
        return selectedItems.length === 1 && !favoritesManager.has(selectedItems[0].path);
      },
      iconClass: 'jp-MaterialIcon jp-FavoritesIcon-filled',
      label: 'Add Favorite',
    });
    // // matches only non-directory items
    // const selectorNotDir = '.jp-DirListing-item[data-isdir="false"]';
    app.contextMenu.addItem({
      command: CommandIDs.addFavorite,
      selector: '.jp-DirListing-item[data-isdir]',
      rank: 3
    });
    commands.addCommand(CommandIDs.removeFavorite, {
      execute: () => {
        // TODO: Fix this
        // This only removes the item last selected in the filebrowser
        const selectedItems = getSelectedItems();
        if (selectedItems.length > 0) {
          const selectedItem = selectedItems[0];
          favoritesManager.removeFavorite(selectedItem.path);
        };
      },
      // isVisible: () => {
      //   const selectedItems = getSelectedItems();
      //   return selectedItems.length === 1 && favoritesManager.has(selectedItems[0].path);
      // },
      isVisible: () => true,
      iconClass: 'jp-MaterialIcon jp-FavoritesIcon-unfilled',
      label: 'Remove Favorite',
    });
    app.contextMenu.addItem({
      command: CommandIDs.removeFavorite,
      selector: '.jp-Favorites-item',
      rank: 3,
    });
  },
};

const plugins: JupyterFrontEndPlugin<any>[] = [
  favorites,
];

export default plugins;
