export namespace PluginIDs {
  export const favorites = 'jupyterlab-favorites';
}

export namespace CommandIDs {
  export const addOrRemoveFavorite = `${PluginIDs.favorites}:add-or-remove-favorite`;
  export const removeFavorite = `${PluginIDs.favorites}:remove-favorite`;
  export const openFavorite = `${PluginIDs.favorites}:open-favorite`;
  export const toggleFavoritesWidget = `${PluginIDs.favorites}:toggle-favorites-widget`;
  export const restoreDefaults = `${PluginIDs.favorites}:restore-defaults`;
  export const clearFavorites = `${PluginIDs.favorites}:clear-favorites`;
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
