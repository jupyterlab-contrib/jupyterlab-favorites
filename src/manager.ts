import { Menu } from '@lumino/widgets';
import { Signal } from '@lumino/signaling';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import { Contents } from '@jupyterlab/services';
import { IFavorites, SettingIDs, CommandIDs } from './token';
import { getName, Optional } from './utils';

export class FavoritesManager {
  favoritesMenu: Menu;
  favoritesChanged = new Signal<this, Array<IFavorites.Favorite>>(this);
  visibilityChanged = new Signal<this, boolean>(this);

  constructor(
    serverRoot: string,
    commands: CommandRegistry,
    settings: ISettingRegistry,
    contents: Contents.IManager
  ) {
    this._showWidget = true;
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
    this.favoritesChanged.connect(async _ => {
      this._showWidget = await this.loadShowWidget();
      this.syncFavoritesMenu();
      this.visibilityChanged.emit(this.isVisible());
    });
  }

  get serverRoot(): string {
    return this._serverRoot;
  }

  get favorites(): Array<IFavorites.Favorite> {
    const favorites = this._favorites;
    return favorites.filter(f => f.root === this.serverRoot);
  }

  set favorites(favorites: Array<IFavorites.Favorite>) {
    this._favorites = favorites;
    this.favoritesChanged.emit(this.visibleFavorites());
  }

  async addFavorite(favorite: IFavorites.Favorite): Promise<void> {
    const favorites = this._favorites.slice();
    const index = favorites.findIndex(
      f => f.root === this.serverRoot && f.path === favorite.path
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

  clearFavorites(): void {
    this.clearFavoritesOrRestoreDefaults(true);
  }

  init(): void {
    this.loadFavorites();
  }

  isVisible(): boolean {
    return this._showWidget && this.visibleFavorites(false).length > 0;
  }

  hasFavorite(path: string): boolean {
    return this.visibleFavorites(false).findIndex(f => f.path === path) >= 0;
  }

  handleClick(favorite: IFavorites.Favorite): void {
    this._commandRegistry.execute(CommandIDs.openFavorite, { favorite });
  }

  async overwriteSettings(
    settings: IFavorites.FavoritesSettings
  ): Promise<void> {
    const newSettings = JSON.stringify(settings, null, 4);
    this._settingsRegistry.upload(SettingIDs.favorites, newSettings);
  }

  /**
   * Rename a favorite
   * @param path Favorite path
   * @param displayName Favorite name
   */
  async renameFavorite(path: string, displayName: string): Promise<void> {
    // Copy the favorites
    const favorites = this._favorites.slice();
    const favorite = favorites.find(
      f => f.root === this.serverRoot && f.path === path
    );
    if (favorite) {
      favorite.name = displayName;
      this.saveSettings({ favorites });
    }
  }

  async removeFavorite(path: string): Promise<void> {
    const favorites = this._favorites.slice();
    const index = favorites.findIndex(
      f => f.root === this.serverRoot && f.path === path
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

  async removeFavoriteIfInvalid(favorite: IFavorites.Favorite): Promise<void> {
    this._contentsManager
      .get(favorite.path, { content: false })
      .catch(error => {
        if (error.response.status === 404) {
          this.removeFavorite(favorite.path);
        }
      });
  }

  restoreDefaults(): void {
    this.clearFavoritesOrRestoreDefaults(false);
  }

  async saveSettings(settings: IFavorites.FavoritesSettings): Promise<void> {
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

  visibleFavorites(sort: boolean = true): IFavorites.Favorite[] {
    const filtered = this.favorites.filter(f => !f.hidden);
    if (!sort) {
      return filtered;
    }
    return filtered.sort((a, b) => {
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
    favorites.forEach(favorite => {
      if (favorite.default) {
        favorite.hidden = hidden;
        defaultFavorites.push(favorite);
      }
    });
    this.overwriteSettings({ favorites: defaultFavorites });
  }

  private async loadFavorites() {
    const setting = await this._settingsRegistry.get(
      SettingIDs.favorites,
      'favorites'
    );
    const favorites = (setting.composite ?? []) as Optional<
      IFavorites.Favorite,
      'root'
    >[];
    this.favorites = favorites.map(favorite => {
      return { ...favorite, root: favorite.root ?? this.serverRoot };
    });
  }

  private async loadShowWidget() {
    const showWidgetSettings = await this._settingsRegistry.get(
      SettingIDs.favorites,
      'showWidget'
    );
    return (showWidgetSettings.composite ?? false) as boolean;
  }

  private syncFavoritesMenu() {
    this.favoritesMenu.clearItems();
    const visibleFavorites = this.visibleFavorites();
    if (visibleFavorites.length > 0) {
      visibleFavorites.forEach(favorite => {
        this.favoritesMenu.addItem({
          command: CommandIDs.openFavorite,
          args: { favorite }
        });
      });
      this.favoritesMenu.addItem({ type: 'separator' });
    }
    const showWidget = this._showWidget;
    this.favoritesMenu.addItem({
      command: CommandIDs.toggleFavoritesWidget,
      args: { showWidget }
    });
    this.favoritesMenu.addItem({
      command: CommandIDs.restoreDefaults
    });
    this.favoritesMenu.addItem({
      command: CommandIDs.clearFavorites
    });
  }

  private _settingsRegistry: ISettingRegistry;
  private _commandRegistry: CommandRegistry;
  private _contentsManager: Contents.IManager;
  private _favorites: IFavorites.Favorite[] = [];
  private _serverRoot: string;
  private _showWidget = false;
}
