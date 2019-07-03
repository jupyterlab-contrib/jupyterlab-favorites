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
    root: string;
    path: string;
    iconClass: string;
    name?: string;
    default?: boolean;
    hidden?: boolean;
  }

  export type FavoriteComponentProps = {
    favorite: Favorite;
    handleClick: (favorite: Favorite) => void;
  }
}

class FavoritesManager {
  public serverRoot: string;
  public favoritesChanged = new Signal<this, Array<types.Favorite>>(this);
  private settingsRegistry: ISettingRegistry;
  private commandRegistry: CommandRegistry;
  private _favorites: Array<types.Favorite>;

  constructor(commands: CommandRegistry, settings: ISettingRegistry) {
    this.serverRoot = PageConfig.getOption('serverRoot');
    this.commandRegistry = commands;
    this.settingsRegistry = settings;
    this._favorites = [];
    // Listen for updates to settings
    this.settingsRegistry.pluginChanged.connect(async (_, pluginName) => {
      if (pluginName === SettingIDs.themes) {
        this.refreshIcons();
      }
      if (pluginName === SettingIDs.favorites) {
        this.loadFavorites();
      }
    });
  }

  async init() {
    await this.refreshIcons();
    await this.loadFavorites();
  }

  async refreshIcons() {
    const themeSetting = await this.settingsRegistry.get(SettingIDs.themes, 'theme');
    const theme = (themeSetting.composite as string).split(' ')[1].toLowerCase();
    const root = document.documentElement;
    root.style.setProperty('--jp-icon-favorite-filled', `var(--jp-icon-favorite-filled-${theme})`);
    root.style.setProperty('--jp-icon-favorite-unfilled', `var(--jp-icon-favorite-unfilled-${theme})`);
  }

  get favorites(): Array<types.Favorite> {
    return this._favorites.filter(f => f.root === this.serverRoot);
  }

  set favorites(favorites: Array<types.Favorite>) {
    this._favorites = favorites;
  }

  has(path: string) {
    return this.favorites.findIndex(f => f.path === path) >= 0;
  }

  visibleFavorites() {
    return this.favorites.filter(f => !f.hidden);
  }

  private async loadFavorites() {
    const favorites = await this.settingsRegistry.get(SettingIDs.favorites, 'favorites');
    this._favorites =  favorites.composite as Array<types.Favorite>;
    this.favoritesChanged.emit(this.favorites);
  }

  private async saveFavorites(favorites: Array<types.Favorite>) {
    const newSettings = JSON.stringify({ favorites });
    return this.settingsRegistry.upload(SettingIDs.favorites, newSettings);
  }

  async addFavorite(favorite: types.Favorite) {
    if (this.has(favorite.path)) {
      return;
    }
    this.saveFavorites(this._favorites.slice().concat([favorite]));
  }

  async removeFavorite(path: string) {
    const favorites = this._favorites.slice();
    const index = favorites.findIndex(f => f.root === this.serverRoot && f.path === path);
    favorites.splice(index, 1);
    this.saveFavorites(favorites);
  }

  handleClick(favorite: types.Favorite) {
    this.commandRegistry.execute('filebrowser:open-path', { path: favorite.path });
  }
}

const FavoriteComponent = (props: types.FavoriteComponentProps) => {
  const { favorite, handleClick } = props;
  let displayName = '';
  if (favorite.name) {
    displayName = favorite.name;
  }
  const parts = favorite.path.split('/');
  if (parts.length > 0) {
    displayName = parts[parts.length - 1];
  }

  return (
    <div
      className="jp-Favorites-item"
      title={favorite.path}
      onClick={e => { handleClick(favorite); }}
    >
      <span className={`jp-MaterialIcon jp-Favorites-itemIcon ${favorite.iconClass}`}></span>
      <span className="jp-Favorites-itemText">{displayName}</span>
    </div>
  )
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
      <UseSignal signal={this.manager.favoritesChanged}>
        {(sender: FavoritesManager, favorites: Array<types.Favorite>) => (
          <div>
            <div className="jp-Favorites-header">
              {"Favorites"}
            </div>
            <div className="jp-Favorites-container">
              {this.manager.visibleFavorites().map(f =>
                <FavoriteComponent
                  key={`favorites-item-${f.path}`}
                  favorite={f}
                  handleClick={this.manager.handleClick.bind(this.manager)}
                />
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
            root: favoritesManager.serverRoot,
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
        const contextNode: HTMLElement = app.contextMenuHitTest(
          node => node.classList.contains('jp-Favorites-item')
        );
        const path = contextNode.getAttribute('title');
        favoritesManager.removeFavorite(path);
        // const selectedItems = getSelectedItems();
        // if (selectedItems.length > 0) {
        //   const selectedItem = selectedItems[0];
        //   favoritesManager.removeFavorite(selectedItem.path);
        // };
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

export default favorites;
