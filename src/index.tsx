import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import {
  ISettingRegistry,
  IStateDB,
} from '@jupyterlab/coreutils';

import {
  IDocumentManager,
} from '@jupyterlab/docmanager';

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
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  Signal,
} from '@phosphor/signaling';

import {
  PanelLayout,
} from '@phosphor/widgets';

import {
  toArray,
} from '@phosphor/algorithm';

import React from 'react';

import '../style/index.css';

namespace Favorites {
  export const id = 'jupyterlab-favorites';

  export interface IItem {
    title: string;
    iconClass: string;
    path: string;
  }

  export interface IProps {
    favorites: Array<IItem>;
  }

  export interface IFavorites {
    default: Array<any>;
    valid: Array<any> | undefined;
    invalid: Array<any> | undefined;
  }
}

class FavoritesManager {
  settingsID = `${Favorites.id}:favorites`;
  settingsRegistry: ISettingRegistry;
  favoritesChanged = new Signal<this, Favorites.IFavorites>(this);
  private _favorites: Favorites.IFavorites;
  private _openPath: (args?: ReadonlyJSONObject) => Promise<any>;

  constructor(openPath: (args?: ReadonlyJSONObject) => Promise<any>, settingsRegistry: ISettingRegistry) {
    this._openPath = openPath;
    this.settingsRegistry = settingsRegistry;
    // this.handleClick = this.handleClick.bind(this);
    // console.log('this: ', this);
    // console.log('handleClick: ', this.handleClick);
  }

  get favorites(): Favorites.IFavorites {
    return this._favorites;
  }

  set favorites(favorites: Favorites.IFavorites) {
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

  private async saveFavorites(favorites: Array<Favorites.IItem>) {
    const newSettings = JSON.stringify({ favorites });
    await this.settingsRegistry.upload(this.settingsID, newSettings);
    await this.fetchFavorites();
  }

  async addFavorite(favorite: Favorites.IItem) {
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

  handleClick(favorite: Favorites.IItem) {//}, event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    console.log('inside handleClick for: ', favorite);
    this._openPath({ path: favorite.path });
  }

  has(path: string) {
    return this.validFavorites().filter(favorite => favorite.path === path).length > 0;
  }

  async updateIconThemes() {
    const themeSetting = await this.settingsRegistry.get('@jupyterlab/apputils-extension:themes', 'theme');
    const theme = (themeSetting.composite as string).split(' ')[1].toLowerCase();
    console.log('theme: ', theme);
    const favoritesIcons = document.getElementsByClassName('jp-FavoritesIcon');
    for (let element of favoritesIcons) {
      (element as HTMLElement).style.backgroundImage = `icons/md/${theme}/baseline-star-24px.svg`;
      console.log('element: ', element);
    }
  }
}

class FavoritesWidget extends ReactWidget {
  public manager: FavoritesManager;

  constructor(favoritesManager: FavoritesManager) {
    super();
    this.manager = favoritesManager;
    this.addClass('jp-Favorites');
  }

  render() {
    return (
      <UseSignal
        signal={this.manager.favoritesChanged}
        initialArgs={this.manager.favorites}
        initialSender={this.manager}
      >
        {(sender: FavoritesManager, favorites: Favorites.IFavorites) => (
          <div>
            <div className="jp-Favorites-header">
              {"Favorites"}
            </div>
            <div className="jp-Favorites-container">
              {((favorites.valid || favorites.default) as Array<Favorites.IItem>).map(f =>
                <div
                  className="jp-Favorites-item"
                  title={f.path}
                  onClick={e => {
                    console.log('manager: ', this.manager);
                    this.manager.handleClick(f);
                  }}
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
 * The command IDs used by the favorites plugin.
 */
namespace CommandIDs {
  export const addFavorite = 'jupyterlab-favorites:add-favorite';
  export const removeFavorite = 'jupyterlab-favorites:remove-favorite';
}

/**
 * Initialization data for the jupyterlab-favorites extension.
 */
const favorites: JupyterFrontEndPlugin<void> = {
  id: Favorites.id,
  autoStart: true,
  requires: [
    IFileBrowserFactory,
    ISettingRegistry,
    IStateDB,
    IDocumentManager,
    IMainMenu,
  ],
  activate: async (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    // read/write favorites here
    settingsRegistry: ISettingRegistry,
    // write recent files here
    stateDB: IStateDB,
    // open favorites with this?
    docManager: IDocumentManager,
    // add command to open recents
    menu: IMainMenu
  ) => {
    console.log('JupyterLab extension jupyterlab-favorites is activated!');
    const filebrowser = factory.defaultBrowser;
    const layout = filebrowser.layout as PanelLayout;
    const { commands } = app;
    const openPath = commands.execute.bind(commands, 'filebrowser:open-path');
    const favoritesManager = new FavoritesManager(openPath, settingsRegistry);
    favoritesManager.init();
    const favoritesWidget = new FavoritesWidget(favoritesManager);

    let breadCrumbsIndex = 0;
    layout.widgets.forEach((widget, index) => {
      if (widget.node.className.includes('jp-BreadCrumbs')) {
        breadCrumbsIndex = index;
      }
    })
    // Insert the Favorites widget just ahead of the BreadCrumbs
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
      iconClass: 'jp-MaterialIcon jp-FavoritesIcon',
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
      iconClass: 'jp-MaterialIcon jp-FavoritesIcon',
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
