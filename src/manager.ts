import { Menu } from '@lumino/widgets';
import { Signal } from '@lumino/signaling';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import { ContentsManager } from '@jupyterlab/services';
import { IFavorites, SettingIDs, CommandIDs } from './token';
import { getName } from './utils';

export class FavoritesManager {
  favoritesMenu: Menu;
  favoritesChanged = new Signal<this, Array<IFavorites.Favorite>>(this);
  visibilityChanged = new Signal<this, boolean>(this);

  constructor(
    serverRoot: string,
    commands: CommandRegistry,
    settings: ISettingRegistry,
    contents: ContentsManager
  ) {
    this._serverRoot = serverRoot;
    this._commandRegistry = commands;
    this._settingsRegistry = settings;
    this._contentsManager = contents;
    // This menu will appear in the File menu
    this.favoritesMenu = new Menu({ commands: this._commandRegistry });
    this.favoritesMenu.title.label = 'Favorites';
    // Listen for updates to settings
    this._settingsRegistry.pluginChanged.connect(async (_, pluginName) => {
      if (pluginName === SettingIDs.favorites) {
        // Triggers favoritesChanged, so showWidget will also get loaded
        this.loadFavorites();
      }
    });
    // Listen for update to own favorites
    this.favoritesChanged.connect(async (_) => {
      this._showWidget = await this.loadShowWidget();
      this.syncFavoritesMenu();
      this.visibilityChanged.emit(this.isVisible());
    });
  }

  get serverRoot(): string {
    return this._serverRoot;
  }

  get favorites(): Array<IFavorites.Favorite> {
    const favorites = this._favorites || [];
    return favorites.filter((f) => f.root === this.serverRoot);
  }

  set favorites(favorites: Array<IFavorites.Favorite>) {
    this._favorites = favorites;
    this.favoritesChanged.emit(this.visibleFavorites());
  }

  async addFavorite(favorite: IFavorites.Favorite) {
    const favorites = this._favorites.slice();
    const index = favorites.findIndex(
      (f) => f.root === this.serverRoot && f.path === favorite.path
    );
    const existing = favorites[index];
    if (existing) {
      if (existing.hidden) {
        existing.hidden = false;
        this.saveSettings({ favorites });
      }
    } else {
      this.saveSettings({ favorites: favorites.concat([favorite]) });
    }
  }

  clearFavorites() {
    this.clearFavoritesOrRestoreDefaults(true);
  }

  init() {
    this.loadFavorites();
  }

  isVisible() {
    return this._showWidget && this.visibleFavorites().length > 0;
  }

  hasFavorite(path: string) {
    return this.visibleFavorites().findIndex((f) => f.path === path) >= 0;
  }

  handleClick(favorite: IFavorites.Favorite) {
    this._commandRegistry.execute(CommandIDs.openFavorite, { favorite });
  }

  async overwriteSettings(settings: IFavorites.FavoritesSettings) {
    const newSettings = JSON.stringify(settings, null, 4);
    this._settingsRegistry.upload(SettingIDs.favorites, newSettings);
  }

  async removeFavorite(path: string) {
    const favorites = this._favorites.slice();
    const index = favorites.findIndex(
      (f) => f.root === this.serverRoot && f.path === path
    );
    const existing = favorites[index];
    if (existing) {
      if (existing.default) {
        existing.hidden = true;
      } else {
        favorites.splice(index, 1);
      }
      this.saveSettings({ favorites });
    }
  }

  async removeFavoriteIfInvalid(favorite: IFavorites.Favorite) {
    this._contentsManager
      .get(favorite.path, { content: false })
      .catch((error) => {
        if (error.response.status === 404) {
          this.removeFavorite(favorite.path);
        }
      });
  }

  restoreDefaults() {
    this.clearFavoritesOrRestoreDefaults(false);
  }

  async saveSettings(settings: IFavorites.FavoritesSettings) {
    if (settings.favorites !== undefined) {
      await this._settingsRegistry.set(
        SettingIDs.favorites,
        'favorites',
        settings.favorites
      );
    }
    if (settings.showWidget !== undefined) {
      this._settingsRegistry.set(
        SettingIDs.favorites,
        'showWidget',
        settings.showWidget
      );
    }
  }

  visibleFavorites(): IFavorites.Favorite[] {
    return this.favorites
      .filter((f) => !f.hidden)
      .sort((a, b) => {
        if (a.contentType === b.contentType) {
          return getName(a.path) <= getName(b.path) ? -1 : 1;
        } else {
          return a.contentType < b.contentType ? -1 : 1;
        }
      });
  }

  private clearFavoritesOrRestoreDefaults(hidden: boolean) {
    const favorites = this._favorites;
    const defaultFavorites: Array<IFavorites.Favorite> = [];
    favorites.forEach((favorite) => {
      if (favorite.default) {
        favorite.hidden = hidden;
        defaultFavorites.push(favorite);
      }
    });
    this.overwriteSettings({ favorites: defaultFavorites });
  }

  private async loadFavorites() {
    const favorites = await this._settingsRegistry.get(
      SettingIDs.favorites,
      'favorites'
    );
    this.favorites = favorites.composite as IFavorites.Favorite[];
  }

  private async loadShowWidget() {
    const showWidgetSettings = await this._settingsRegistry.get(
      SettingIDs.favorites,
      'showWidget'
    );
    return showWidgetSettings.composite as boolean;
  }

  private syncFavoritesMenu() {
    this.favoritesMenu.clearItems();
    const visibleFavorites = this.visibleFavorites();
    if (visibleFavorites.length > 0) {
      visibleFavorites.forEach((favorite) => {
        this.favoritesMenu.addItem({
          command: CommandIDs.openFavorite,
          args: { favorite },
        });
      });
      this.favoritesMenu.addItem({ type: 'separator' });
    }
    const showWidget = this._showWidget;
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

  private _settingsRegistry: ISettingRegistry;
  private _commandRegistry: CommandRegistry;
  private _contentsManager: ContentsManager;
  private _favorites: IFavorites.Favorite[];
  private _serverRoot: string;
  private _showWidget: boolean;
}
