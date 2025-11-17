import { Token } from '@lumino/coreutils';

export namespace PluginIDs {
  export const favorites = 'jupyterlab-favorites';
  export const notebookFactory = 'favorites-notebook-factory';
}

export type ShowStarsTypes =
  | 'all Cells'
  | 'only Favourite Cells'
  | 'never';

export namespace CommandIDs {
  export const addOrRemoveFavorite = `${PluginIDs.favorites}:add-or-remove-favorite`;
  export const removeFavorite = `${PluginIDs.favorites}:remove-favorite`;
  export const renameFavorite = `${PluginIDs.favorites}:rename-favorite`;
  export const openFavorite = `${PluginIDs.favorites}:open-favorite`;
  export const toggleFavoritesWidget = `${PluginIDs.favorites}:toggle-favorites-widget`;
  export const restoreDefaults = `${PluginIDs.favorites}:restore-defaults`;
  export const clearFavorites = `${PluginIDs.favorites}:clear-favorites`;
  export const toggleCellsVisibility = `${PluginIDs.favorites}:toggle-cell-visibility`;
  export const addFavoriteClasses = `${PluginIDs.favorites}:toggle-favorite-classes`;
  export const toggleCellFavorite = `${PluginIDs.favorites}:toggle-cell-favorite`;
}

export namespace SettingIDs {
  export const themes = '@jupyterlab/apputils-extension:themes';
  export const favorites = '@jlab-enhanced/favorites:favorites';
}

export namespace IFavorites {
  export type Favorite = {
    root: string;
    path: string;
    contentType: string;
    iconLabel?: string;
    name?: string;
    default?: boolean;
    hidden?: boolean;
  };

  export type FavoritesSettings = {
    favorites?: Array<IFavorites.Favorite>;
    showWidget?: boolean;
  };
}

export const IFavorites = new Token<IFavorites>(
  'jupyterlab-favorites:IFavorites'
);

export interface IFavorites {
  readonly favorites: IFavorites.Favorite[];
}
