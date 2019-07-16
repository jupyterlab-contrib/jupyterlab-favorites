import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import {
  ISettingRegistry,
  PageConfig,
} from '@jupyterlab/coreutils';

import {
  IMainMenu,
} from '@jupyterlab/mainmenu';

import {
  IFileBrowserFactory,
  FileBrowser,
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
  Menu,
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
  export const removeFavorite = `${PluginIDs.favorites}:remove-favorite`;
  export const openFavorite = `${PluginIDs.favorites}:open-favorite`;
  export const toggleFavoritesWidget = `${PluginIDs.favorites}:toggle-favorites-widget`;
  export const restoreDefaults = `${PluginIDs.favorites}:restore-defaults`;
  export const clearFavorites = `${PluginIDs.favorites}:clear-favorites`;
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

  export type FavoritesSettings = {
    favorites?: Array<Favorite>;
    showWidget?: boolean;
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

  export function getFavoritesIconClass(filled: boolean) {
    return `jp-MaterialIcon jp-FavoritesIcon-${filled ? 'filled' : 'unfilled'}`;
  }

  export function getPinnerActionDescription(showRemove: boolean) {
    return `${showRemove ? 'Remove' : 'Add'} Favorite`;
  }

  export function mergePaths(root:string, path: string) {
    if (root.endsWith('/')) {
      root = root.slice(0, -1);
    }
    if (path.endsWith('/')) {
      path = path.slice(1);
    }
    return `${root}/${path}`;
  }
}

class FavoritesManager {
  public serverRoot: string;
  public favoritesMenu: Menu;
  public favoritesChanged = new Signal<this, Array<types.Favorite>>(this);
  public visibilityChanged = new Signal<this, boolean>(this);
  private settingsRegistry: ISettingRegistry;
  private commandRegistry: CommandRegistry;
  private _favorites: Array<types.Favorite>;
  private showWidget: boolean;

  constructor(commands: CommandRegistry, settings: ISettingRegistry) {
    this.serverRoot = PageConfig.getOption('serverRoot');
    this.commandRegistry = commands;
    this.settingsRegistry = settings;
    // This menu will appear in the File menu
    this.favoritesMenu = new Menu({ commands: this.commandRegistry });
    this.favoritesMenu.title.label = 'Favorites';
    // Listen for updates to settings
    this.settingsRegistry.pluginChanged.connect(async (_, pluginName) => {
      if (pluginName === SettingIDs.themes) {
        this.refreshIcons();
      }
      if (pluginName === SettingIDs.favorites) {
        // Triggers favoritesChanged, so showWidget will also get loaded
        this.loadFavorites();
      }
    });
    // Listen for update to own favorites
    this.favoritesChanged.connect(async (_, ) => {
      this.showWidget = await this.loadShowWidget();
      this.syncFavoritesMenu();
      this.visibilityChanged.emit(this.isVisible());
    });
  }

  async init() {
    await this.refreshIcons();
    await this.loadFavorites();
  }

  public isVisible() {
    return this.showWidget && this.visibleFavorites().length > 0;
  }

  private async refreshIcons() {
    const themeSetting = await this.settingsRegistry.get(SettingIDs.themes, 'theme');
    const theme = (themeSetting.composite as string).split(' ')[1].toLowerCase();
    const root = document.documentElement;
    root.style.setProperty('--jp-icon-favorite-filled', `var(--jp-icon-favorite-filled-${theme})`);
    root.style.setProperty('--jp-icon-favorite-unfilled', `var(--jp-icon-favorite-unfilled-${theme})`);
  }

  get favorites(): Array<types.Favorite> {
    const favorites = this._favorites || [];
    return favorites.filter(f => f.root === this.serverRoot);
  }

  set favorites(favorites: Array<types.Favorite>) {
    this._favorites = favorites;
    this.favoritesChanged.emit(this.visibleFavorites());
  }

  hasFavorite(path: string) {
    return this.visibleFavorites().findIndex(f => f.path === path) >= 0;
  }

  visibleFavorites() {
    return this.favorites.filter(f => !f.hidden).sort((a, b) => {
      if (a.contentType === b.contentType) {
        const aIsHome = a.iconClass.includes('jp-HomeIcon');
        const bIsHome = b.iconClass.includes('jp-HomeIcon');
        if (!(aIsHome && bIsHome)) {
          if (aIsHome) {
            return -1;
          }
          if (bIsHome) {
            return 1;
          }
        }
        return utils.getName(a.path) <= utils.getName(b.path) ? -1 : 1;
      }
      else {
        return a.contentType < b.contentType ? -1 : 1;
      }
    });
  }

  private async loadShowWidget() {
    const showWidgetSettings = await this.settingsRegistry.get(SettingIDs.favorites, 'showWidget');
    return showWidgetSettings.composite as boolean;
  }

  private async loadFavorites() {
    const favorites = await this.settingsRegistry.get(SettingIDs.favorites, 'favorites');
    this.favorites = favorites.composite as Array<types.Favorite>;
  }

  public async saveSettings(settings: types.FavoritesSettings) {
    if (settings.favorites !== undefined) {
      await this.settingsRegistry.set(SettingIDs.favorites, 'favorites', settings.favorites);
    }
    if (settings.showWidget !== undefined) {
      await this.settingsRegistry.set(SettingIDs.favorites, 'showWidget', settings.showWidget);
    }
  }

  public async overwriteSettings(settings: types.FavoritesSettings) {
    const newSettings = JSON.stringify(settings, null, 4);
    await this.settingsRegistry.upload(SettingIDs.favorites, newSettings);
  }

  async addFavorite(favorite: types.Favorite) {
    const favorites = this._favorites.slice();
    const index = favorites.findIndex(f => f.root === this.serverRoot && f.path === favorite.path);
    const existing = favorites[index];
    if (existing) {
      if (existing.hidden) {
        existing.hidden = false;
        this.saveSettings({ favorites });
      }
    }
    else {
      this.saveSettings({ favorites: favorites.concat([favorite]) });
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
      this.saveSettings({ favorites });
    }
  }

  private clearFavoritesOrRestoreDefaults(hidden: boolean) {
    const favorites = this._favorites;
    const defaultFavorites: Array<types.Favorite> = [];
    favorites.forEach(favorite => {
      if (favorite.default) {
        favorite.hidden = hidden;
        defaultFavorites.push(favorite);
      }
    });
    this.overwriteSettings({ favorites: defaultFavorites });
  }

  restoreDefaults() {
    this.clearFavoritesOrRestoreDefaults(false);
  }

  clearFavorites() {
    this.clearFavoritesOrRestoreDefaults(true);
  }

  private syncFavoritesMenu() {
    this.favoritesMenu.clearItems();
    const visibleFavorites = this.visibleFavorites();
    if (visibleFavorites.length > 0) {
      visibleFavorites.forEach(favorite => {
        this.favoritesMenu.addItem({
          command: CommandIDs.openFavorite,
          args: { favorite },
        });
      });
      this.favoritesMenu.addItem({ type: 'separator' });
    }
    const showWidget = this.showWidget;
    this.favoritesMenu.addItem({
      command: CommandIDs.toggleFavoritesWidget,
      args: { showWidget },
    });
    this.favoritesMenu.addItem({
      command: CommandIDs.restoreDefaults,
    });
    this.favoritesMenu.addItem({
      command: CommandIDs.clearFavorites,
    });
  }

  handleClick(favorite: types.Favorite) {
    this.commandRegistry.execute(CommandIDs.openFavorite, { favorite });
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
      title={utils.mergePaths(favorite.root, favorite.path)}
      onClick={e => { handleClick(favorite); }}
    >
      <span className={`jp-Favorites-itemIcon ${favorite.iconClass}`}></span>
      <span className="jp-Favorites-itemText">{displayName}</span>
    </div>
  )
}

class FavoritesWidget extends ReactWidget {
  private manager: FavoritesManager;
  private filebrowser: FileBrowser;
  private pathChanged = new Signal<this, string>(this);

  constructor(manager: FavoritesManager, filebrowser: FileBrowser) {
    super();
    this.manager = manager;
    this.filebrowser = filebrowser;
    this.addClass('jp-Favorites');

    this.filebrowser.model.pathChanged.connect((_, changedArgs) => {
      const path = changedArgs.newValue;
      this.pathChanged.emit(path);
    });
  }

  handlePinnerClick(path: string) {
    const shouldRemove = this.manager.hasFavorite(path);
    if (shouldRemove) {
      this.manager.removeFavorite(path);
    }
    else {
      const favorite = {
        root: this.manager.serverRoot,
        contentType: 'directory',
        iconClass: 'jp-MaterialIcon jp-FolderIcon',
        path,
      } as types.Favorite;
      this.manager.addFavorite(favorite);
    }
  }

  render() {
    return (
      <UseSignal
        signal={this.manager.favoritesChanged}
        initialSender={this.manager}
        initialArgs={this.manager.visibleFavorites()}
      >
        {(manager: FavoritesManager, visibleFavorites: Array<types.Favorite>) => (
          <div>
            <UseSignal
              signal={manager.visibilityChanged}
              initialSender={manager}
              initialArgs={manager.isVisible()}
            >
              {(manager: FavoritesManager, isVisible: boolean) => (
                isVisible &&
                <div>
                  <div style={{ height: '20px' }}></div>
                  <div className="jp-Favorites-header">Favorites</div>
                  <div className="jp-Favorites-container">
                    {visibleFavorites.map(f =>
                      <FavoriteComponent
                        key={`favorites-item-${f.path}`}
                        favorite={f}
                        handleClick={manager.handleClick.bind(manager)}
                      />
                    )}
                  </div>
                  <div className="jp-FileBrowser-header">File Browser</div>
                </div>
              )}
            </UseSignal>
            <UseSignal
              signal={this.pathChanged}
              initialSender={this}
              initialArgs={this.filebrowser.model.path}
            >
              {(widget: FavoritesWidget, currentPath: string) => (
                currentPath &&
                <div className="jp-Favorites-pinner">
                  <span
                    className={utils.getFavoritesIconClass(widget.manager.hasFavorite(currentPath))}
                    title={utils.getPinnerActionDescription(widget.manager.hasFavorite(currentPath))}
                    onClick={e => widget.handlePinnerClick(currentPath)}
                  ></span>
                </div>
              )}
            </UseSignal>
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
  ],
  optional: [IMainMenu],
  activate: async (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    settingsRegistry: ISettingRegistry,
    mainMenu: IMainMenu
  ) => {
    console.log('JupyterLab extension jupyterlab-favorites is activated!');
    const docRegistry = app.docRegistry;
    const filebrowser = factory.defaultBrowser;
    const layout = filebrowser.layout as PanelLayout;
    const { commands } = app;
    const favoritesManager = new FavoritesManager(commands, settingsRegistry);
    favoritesManager.init();
    const favoritesWidget = new FavoritesWidget(favoritesManager, filebrowser);
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
      },
      isVisible: () => {
        const selectedItems = getSelectedItems();
        return selectedItems.length === 1;
      },
      iconClass: () => {
        const selectedItems = getSelectedItems();
        const selectedItem = selectedItems[0];
        const showFilled = !favoritesManager.hasFavorite(selectedItem.path);
        return utils.getFavoritesIconClass(showFilled);
      },
      label: () => {
        const selectedItems = getSelectedItems();
        const selectedItem = selectedItems[0];
        const showRemove = favoritesManager.hasFavorite(selectedItem.path);
        return utils.getPinnerActionDescription(showRemove);
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
    // Main Menu
    if (mainMenu) {
      mainMenu.fileMenu.addGroup([{
        type: 'submenu' as Menu.ItemType,
        submenu: favoritesManager.favoritesMenu,
      }], 1);
    }
    // Try to merge with existing Group 1
    try {
      const groups = (mainMenu.fileMenu as any)._groups;
      let numRankOneGroups = 0;
      let openGroupIndex = -1;
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        if (group.rank === 1) {
          numRankOneGroups += 1;
          if (openGroupIndex < 0) {
            openGroupIndex = i;
          }
        }
      }
      if (numRankOneGroups === 2) {
        const openGroup = groups[openGroupIndex];
        openGroup.size = openGroup.size + 1;
        groups.splice(openGroupIndex + 1, 1);
        const fileMenu = (mainMenu.fileMenu as any).menu;
        const fileMenuItems = fileMenu._items;
        let removeSeparators = false;
        for (let i = fileMenuItems.length - 1; i > 0; i--) {
          const fileMenuItem = fileMenuItems[i];
          if (fileMenuItem.command === 'filebrowser:open-path') {
            break;
          }
          if (removeSeparators && fileMenuItem.type === 'separator') {
            fileMenu.removeItemAt(i);
          }
          else if (fileMenuItem.type === 'submenu') {
            const label = fileMenuItem.submenu.title.label;
            if (label === 'Favorites') {
              removeSeparators = true;
            }
          }
        }
      }
    }
    catch (e) {}
    // Commands
    commands.addCommand(CommandIDs.openFavorite, {
      execute: args => {
        const favorite = args.favorite as types.Favorite;
        const path = favorite.path === '' ? '/' : favorite.path;
        commands.execute('filebrowser:open-path', { path });
      },
      label: args => {
        const favorite = args.favorite as types.Favorite;
        return utils.mergePaths(favorite.root, favorite.path);
      },
    });
    commands.addCommand(CommandIDs.toggleFavoritesWidget, {
      execute: async args => {
        const showWidget = args.showWidget as boolean;
        await favoritesManager.saveSettings({ showWidget: !showWidget });
      },
      label: args => {
        const showWidget = args.showWidget as boolean;
        return `${showWidget ? 'Hide' : 'Show'} Favorites Widget`;
      },
      isVisible: () => favoritesManager.visibleFavorites().length > 0,
    });
    commands.addCommand(CommandIDs.restoreDefaults, {
      execute: () => favoritesManager.restoreDefaults(),
      label: 'Restore Defaults',
    })
    commands.addCommand(CommandIDs.clearFavorites, {
      execute: () => favoritesManager.clearFavorites(),
      label: 'Clear Favorites',
    });
  },
};

export default favorites;
