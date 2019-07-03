import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import {
  ISettingRegistry,
  PageConfig,
} from '@jupyterlab/coreutils';

import {
  IDocumentManager,
} from '@jupyterlab/docmanager';

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
  export const addOrRemoveFavorite = `${PluginIDs.favorites}:add-or-remove-favorite`;
  export const removeFavorite = `${PluginIDs}:remove-favorite`;
}

namespace types {
  export type Favorite = {
    root: string;
    path: string;
    contentType: string;
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

namespace utils {
  export function getName(path: string) {
    let name = '';
    const parts = path.split('/');
    if (parts.length > 0) {
      name = parts[parts.length - 1];
    }
    return name;
  }
}

class FavoritesManager {
  public serverRoot: string;
  public favoritesChanged = new Signal<this, Array<types.Favorite>>(this);
  public visibilityChanged = new Signal<this, boolean>(this);
  private settingsRegistry: ISettingRegistry;
  private commandRegistry: CommandRegistry;
  private _favorites: Array<types.Favorite>;

  constructor(commands: CommandRegistry, settings: ISettingRegistry) {
    this.serverRoot = PageConfig.getOption('serverRoot');
    this.commandRegistry = commands;
    this.settingsRegistry = settings;
    this.favorites = [];
    // Listen for updates to settings
    this.settingsRegistry.pluginChanged.connect(async (_, pluginName) => {
      if (pluginName === SettingIDs.themes) {
        this.refreshIcons();
      }
      if (pluginName === SettingIDs.favorites) {
        this.loadFavorites();
      }
    });
    // Listen for update to own favorites
    this.favoritesChanged.connect(async (_, ) => {
      this.checkVisibility();
    });
  }

  async init() {
    await this.refreshIcons();
    await this.loadFavorites();
  }

  private async refreshIcons() {
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
    this.favoritesChanged.emit(this.visibleFavorites());
  }

  hasFavorite(path: string) {
    return this.favorites.findIndex(f => f.path === path) >= 0;
  }

  visibleFavorites() {
    return this.favorites.filter(f => !f.hidden).sort((a, b) => {
      if (a.contentType === b.contentType) {
        return utils.getName(a.path) <= utils.getName(b.path) ? -1 : 1;
      }
      else {
        return a.contentType < b.contentType ? -1 : 1;
      }
    });
  }

  private async loadFavorites() {
    const favorites = await this.settingsRegistry.get(SettingIDs.favorites, 'favorites');
    this.favorites = favorites.composite as Array<types.Favorite>;
  }

  private async saveFavorites(favorites: Array<types.Favorite>) {
    const newSettings = JSON.stringify({ favorites });
    return this.settingsRegistry.upload(SettingIDs.favorites, newSettings);
  }

  private async checkVisibility() {
    let isVisible = this.visibleFavorites().length > 0;
    if (isVisible) {
      const showWidgetSettings = await this.settingsRegistry.get(SettingIDs.favorites, 'showWidget');
      const showWidget = showWidgetSettings.composite;
      if (showWidget !== undefined) {
        isVisible = isVisible && (showWidget as boolean);
      }
    }
    this.visibilityChanged.emit(isVisible);
  }

  async addFavorite(favorite: types.Favorite) {
    const favorites = this._favorites.slice();
    const index = favorites.findIndex(f => f.root === this.serverRoot && f.path === favorite.path);
    const existing = favorites[index];
    if (existing) {
      if (existing.hidden) {
        existing.hidden = false;
        this.saveFavorites(favorites);
      }
    }
    else {
      this.saveFavorites(favorites.concat([favorite]));
    }
  }

  async removeFavorite(path: string) {
    const favorites = this._favorites.slice();
    const index = favorites.findIndex(f => f.root === this.serverRoot && f.path === path);
    const existing = favorites[index];
    if (existing) {
      if (existing.default) {
        existing.hidden = true;
      }
      else {
        favorites.splice(index, 1);
      }
      this.saveFavorites(favorites);
    }
  }

  handleClick(favorite: types.Favorite) {
    this.commandRegistry.execute('filebrowser:open-path', { path: favorite.path });
  }
}

const FavoriteComponent = (props: types.FavoriteComponentProps) => {
  const { favorite, handleClick } = props;
  let displayName = utils.getName(favorite.path);
  if (favorite.name) {
    displayName = favorite.name;
  }

  return (
    <div
      className="jp-Favorites-item"
      title={favorite.path}
      onClick={e => { handleClick(favorite); }}
    >
      <span className={`jp-Favorites-itemIcon ${favorite.iconClass}`}></span>
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

    this.manager.visibilityChanged.connect((_, isVisible) => {
      if (isVisible) {
        this.show();
      }
      else {
        this.hide();
      }
    });
  }

  render() {
    return (
      <UseSignal
        signal={this.manager.favoritesChanged}
        initialSender={this.manager}
        initialArgs={this.manager.visibleFavorites()}
      >
        {(sender: FavoritesManager, visibleFavorites: Array<types.Favorite>) => (
          <div>
            <div style={{ height: '20px' }}></div>
            <div className="jp-Favorites-header">Favorites</div>
            <div className="jp-Favorites-container">
              {visibleFavorites.map(f =>
                <FavoriteComponent
                  key={`favorites-item-${f.path}`}
                  favorite={f}
                  handleClick={sender.handleClick.bind(sender)}
                />
              )}
            </div>
            <div className="jp-FileBrowser-header">File Browser</div>
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
    IDocumentManager,
    IFileBrowserFactory,
    ISettingRegistry,
    IMainMenu,
  ],
  activate: async (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    factory: IFileBrowserFactory,
    settingsRegistry: ISettingRegistry,
    mainMenu: IMainMenu
  ) => {
    console.log('JupyterLab extension jupyterlab-favorites is activated!');
    const docRegistry = docManager.registry;
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
    commands.addCommand(CommandIDs.addOrRemoveFavorite, {
      execute: () => {
        const selectedItems = getSelectedItems();
        if (selectedItems.length > 0) {
          const selectedItem = selectedItems[0];
          const shouldRemove = favoritesManager.hasFavorite(selectedItem.path);
          if (shouldRemove) {
            favoritesManager.removeFavorite(selectedItem.path);
          }
          else {
            const fileType = docRegistry.getFileTypeForModel(selectedItem);
            favoritesManager.addFavorite({
              root: favoritesManager.serverRoot,
              path: selectedItem.path,
              contentType: fileType.contentType,
              iconClass: fileType.iconClass,
            });
          }
        }
        // selectedItem.mimetype;
      },
      isVisible: () => {
        const selectedItems = getSelectedItems();
        return selectedItems.length === 1;
      },
      iconClass: () => {
        const selectedItems = getSelectedItems();
        const selectedItem = selectedItems[0];
        const showFilled = !favoritesManager.hasFavorite(selectedItem.path);
        return `jp-MaterialIcon jp-FavoritesIcon-${showFilled ? 'filled' : 'unfilled'}`;
      },
      label: () => {
        const selectedItems = getSelectedItems();
        const selectedItem = selectedItems[0];
        const showRemove = favoritesManager.hasFavorite(selectedItem.path);
        return `${showRemove ? 'Remove' : 'Add'} Favorite`;
      },
    });
    app.contextMenu.addItem({
      command: CommandIDs.addOrRemoveFavorite,
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
      },
      isVisible: () => true,
      iconClass: 'jp-MaterialIcon jp-FavoritesIcon-unfilled',
      label: 'Remove Favorite',
    });
    app.contextMenu.addItem({
      command: CommandIDs.removeFavorite,
      selector: '.jp-Favorites-item',
      rank: 0,
    });
  },
};

export default favorites;
