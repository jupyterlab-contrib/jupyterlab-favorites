import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { toArray } from '@lumino/algorithm';
import { Menu, PanelLayout } from '@lumino/widgets';
import { FavoritesWidget } from './components';
import { starIcon } from './icons';
import { FavoritesManager } from './manager';
import { IFavorites, PluginIDs, CommandIDs } from './token';
import {
  getFavoritesIcon,
  getPinnerActionDescription,
  mergePaths,
} from './utils';
import { PageConfig } from '@jupyterlab/coreutils';

const TOOLBAR_CLASS = 'jp-FileBrowser-toolbar';

/**
 * Initialization data for the jupyterlab-favorites extension.
 */
const favorites: JupyterFrontEndPlugin<void> = {
  id: PluginIDs.favorites,
  autoStart: true,
  requires: [IFileBrowserFactory, ISettingRegistry],
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
    const { commands, serviceManager } = app;
    const favoritesManager = new FavoritesManager(
      PageConfig.getOption('serverRoot') || 'Jupyter Server Root',
      commands,
      settingsRegistry,
      serviceManager.contents
    );
    favoritesManager.init();
    const favoritesWidget = new FavoritesWidget(favoritesManager, filebrowser);
    // Insert the Favorites widget contents at the top of the FileBrowser area under the toolbar
    let insertIndex = 0;
    layout.widgets.forEach((widget, index) => {
      if (widget.node.className.includes(TOOLBAR_CLASS)) {
        insertIndex = index + 1;
        return; // no reason to continue to iterate once the className is found
      }
    });
    layout.insertWidget(insertIndex, favoritesWidget);

    // Context Menu commands
    const getSelectedItems = () => {
      const widget = tracker.currentWidget;
      if (!widget) {
        return [];
      }
      return toArray(widget.selectedItems());
    };
    const { tracker } = factory;
    commands.addCommand(CommandIDs.addOrRemoveFavorite, {
      execute: () => {
        const selectedItems = getSelectedItems();
        if (selectedItems.length > 0) {
          const selectedItem = selectedItems[0];
          const shouldRemove = favoritesManager.hasFavorite(selectedItem.path);
          if (shouldRemove) {
            favoritesManager.removeFavorite(selectedItem.path);
          } else {
            const fileType = docRegistry.getFileTypeForModel(selectedItem);
            favoritesManager.addFavorite({
              root: favoritesManager.serverRoot,
              path: selectedItem.path,
              contentType: fileType.contentType,
              iconLabel: fileType.icon.name,
            });
          }
        }
      },
      isVisible: () => {
        const selectedItems = getSelectedItems();
        return selectedItems.length === 1;
      },
      icon: () => {
        const selectedItems = getSelectedItems();
        const selectedItem = selectedItems[0];
        const showFilled = !favoritesManager.hasFavorite(selectedItem.path);
        return getFavoritesIcon(showFilled);
      },
      label: () => {
        const selectedItems = getSelectedItems();
        const selectedItem = selectedItems[0];
        const showRemove = favoritesManager.hasFavorite(selectedItem.path);
        return getPinnerActionDescription(showRemove);
      },
    });
    app.contextMenu.addItem({
      command: CommandIDs.addOrRemoveFavorite,
      selector: '.jp-DirListing-item[data-isdir]',
      rank: 3,
    });
    commands.addCommand(CommandIDs.removeFavorite, {
      execute: () => {
        const contextNode: HTMLElement = app.contextMenuHitTest((node) =>
          node.classList.contains('jp-Favorites-item')
        );
        const fullPath = contextNode.getAttribute('title');
        let path = fullPath.replace(favoritesManager.serverRoot, '');
        if (path.startsWith('/')) {
          path = path.slice(1);
        }
        favoritesManager.removeFavorite(path);
      },
      icon: starIcon,
      label: 'Remove Favorite',
    });
    app.contextMenu.addItem({
      command: CommandIDs.removeFavorite,
      selector: '.jp-Favorites-item',
      rank: 0,
    });
    // Main Menu
    if (mainMenu) {
      mainMenu.fileMenu.addGroup(
        [
          {
            type: 'submenu' as Menu.ItemType,
            submenu: favoritesManager.favoritesMenu,
          },
        ],
        1
      );
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
          } else if (fileMenuItem.type === 'submenu') {
            const label = fileMenuItem.submenu.title.label;
            if (label === 'Favorites') {
              removeSeparators = true;
            }
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
    // Commands
    commands.addCommand(CommandIDs.openFavorite, {
      execute: async (args) => {
        const favorite = args.favorite as IFavorites.Favorite;
        const path = favorite.path === '' ? '/' : favorite.path;
        await commands.execute('filebrowser:open-path', { path });
      },
      label: (args) => {
        const favorite = args.favorite as IFavorites.Favorite;
        return mergePaths(favorite.root, favorite.path);
      },
    });
    commands.addCommand(CommandIDs.toggleFavoritesWidget, {
      execute: async (args) => {
        const showWidget = args.showWidget as boolean;
        favoritesManager.saveSettings({ showWidget: !showWidget });
      },
      label: (args) => {
        const showWidget = args.showWidget as boolean;
        return `${showWidget ? 'Hide' : 'Show'} Favorites Widget`;
      },
      isVisible: () => favoritesManager.visibleFavorites().length > 0,
    });
    commands.addCommand(CommandIDs.restoreDefaults, {
      execute: () => favoritesManager.restoreDefaults(),
      label: 'Restore Defaults',
    });
    commands.addCommand(CommandIDs.clearFavorites, {
      execute: () => favoritesManager.clearFavorites(),
      label: 'Clear Favorites',
    });
  },
};

export default favorites;
