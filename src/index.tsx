import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PageConfig } from '@jupyterlab/coreutils';
import {
  IDefaultFileBrowser,
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ReactWidget, UseSignal, folderIcon } from '@jupyterlab/ui-components';
import { toArray } from '@lumino/algorithm';
import { Throttler } from '@lumino/polling';
import { Menu, PanelLayout, Widget } from '@lumino/widgets';
import React from 'react';
import { FavoritesBreadCrumbs, FavoritesWidget } from './components';
import { starIcon } from './icons';
import { FavoritesManager } from './manager';
import { IFavorites, PluginIDs, CommandIDs } from './token';
import {
  getFavoritesIcon,
  getPinnerActionDescription,
  mergePaths
} from './utils';
import { InputDialog } from '@jupyterlab/apputils';

export { IFavorites } from './token';

const BREADCRUMBS_CLASS = 'jp-FileBrowser-crumbs';

/**
 * The class name for the node containing the FileBrowser BreadCrumbs favorite icon.  This node
 * is also responsible for click actions on the icon.
 */
const FAVORITE_ITEM_PINNER_CLASS = 'jp-Favorites-pinner';

/**
 * Initialization data for the jupyterlab-favorites extension.
 */
const favorites: JupyterFrontEndPlugin<IFavorites> = {
  id: PluginIDs.favorites,
  autoStart: true,
  requires: [IFileBrowserFactory, ISettingRegistry],
  provides: IFavorites,
  optional: [IDefaultFileBrowser, IMainMenu],
  activate: (
    app: JupyterFrontEnd,
    factory: IFileBrowserFactory,
    settingsRegistry: ISettingRegistry,
    filebrowser: IDefaultFileBrowser | null,
    mainMenu: IMainMenu | null
  ): IFavorites => {
    console.log('JupyterLab extension jupyterlab-favorites is activated!');
    const docRegistry = app.docRegistry;
    const { commands, serviceManager } = app;
    const favoritesManager = new FavoritesManager(
      PageConfig.getOption('serverRoot') || 'Jupyter Server Root',
      commands,
      settingsRegistry,
      serviceManager.contents
    );
    favoritesManager.init();

    if (filebrowser) {
      const favoritesWidget = new FavoritesWidget(
        favoritesManager,
        filebrowser
      );
      const layout = filebrowser.layout as PanelLayout;
      layout.insertWidget(0, favoritesWidget);

      const breadcrumbs = filebrowser.node.querySelector(
        `.${BREADCRUMBS_CLASS}`
      );
      if (breadcrumbs) {
        const initializeBreadcrumbsIcon = () => {
          if (!breadcrumbs.isConnected) {
            return;
          }
          filebrowser.model.pathChanged.disconnect(initializeBreadcrumbsIcon);
          const favoriteIcon = ReactWidget.create(
            <UseSignal
              signal={filebrowser.model.pathChanged}
              initialSender={filebrowser.model}
            >
              {model => (
                <FavoritesBreadCrumbs
                  currentPath={model?.path || ''}
                  manager={favoritesManager}
                  handleClick={(path: string) => {
                    const shouldRemove = favoritesManager.hasFavorite(path);
                    if (shouldRemove) {
                      favoritesManager.removeFavorite(path);
                    } else {
                      const favorite = {
                        root: favoritesManager.serverRoot,
                        contentType: 'directory',
                        iconLabel: folderIcon.name,
                        path
                      } as IFavorites.Favorite;
                      favoritesManager.addFavorite(favorite);
                    }
                  }}
                ></FavoritesBreadCrumbs>
              )}
            </UseSignal>
          );
          favoriteIcon.addClass(FAVORITE_ITEM_PINNER_CLASS);
          Widget.attach(favoriteIcon, breadcrumbs as HTMLElement);
          const throttler = new Throttler(() => {
            breadcrumbs.insertAdjacentElement('beforeend', favoriteIcon.node);
          });
          const observer = new MutationObserver(() => {
            throttler.invoke();
          });

          observer.observe(breadcrumbs, { childList: true });

          filebrowser.disposed.connect(() => {
            throttler.dispose();
            observer.disconnect();
          });
        };

        filebrowser.model.pathChanged.connect(initializeBreadcrumbsIcon);
        initializeBreadcrumbsIcon();
      }
    }

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
              iconLabel: fileType.icon?.name
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
      }
    });

    commands.addCommand(CommandIDs.removeFavorite, {
      execute: () => {
        const contextNode: HTMLElement = app.contextMenuHitTest(node =>
          node.classList.contains('jp-Favorites-item')
        )!;
        const path = contextNode.dataset['path']!;
        favoritesManager.removeFavorite(path);
      },
      icon: starIcon,
      label: 'Remove Favorite'
    });

    commands.addCommand(CommandIDs.renameFavorite, {
      execute: async args => {
        let { path, displayName } = args as {
          path?: string;
          displayName?: string;
        };
        if (!path) {
          const contextNode: HTMLElement = app.contextMenuHitTest(node =>
            node.classList.contains('jp-Favorites-item')
          )!;
          path = contextNode.dataset['path'];
        }

        if (!path) {
          return;
        }

        if (!displayName) {
          const result = await InputDialog.getText({
            title: 'Rename favorite',
            label: `Name for favorite at '${path}'`,
            okLabel: 'Rename',
            placeholder: 'Display name'
          });

          displayName = result.button.accept ? result.value ?? '' : '';
        }

        if (!displayName) {
          return;
        }

        favoritesManager.renameFavorite(path, displayName);
      },
      label: 'Rename Favorite'
    });

    // Commands
    commands.addCommand(CommandIDs.openFavorite, {
      execute: async args => {
        const favorite = args.favorite as IFavorites.Favorite;
        const path = favorite.path === '' ? '/' : favorite.path;
        await commands.execute('filebrowser:open-path', { path });
      },
      label: args => {
        const favorite = args.favorite as IFavorites.Favorite;
        return mergePaths(favorite.root, favorite.path);
      }
    });
    commands.addCommand(CommandIDs.toggleFavoritesWidget, {
      execute: async args => {
        const showWidget = args.showWidget as boolean;
        favoritesManager.saveSettings({ showWidget: !showWidget });
      },
      label: args => {
        const showWidget = args.showWidget as boolean;
        return `${showWidget ? 'Hide' : 'Show'} Favorites Widget`;
      },
      isVisible: () => favoritesManager.visibleFavorites().length > 0
    });
    commands.addCommand(CommandIDs.restoreDefaults, {
      execute: () => favoritesManager.restoreDefaults(),
      label: 'Restore Defaults'
    });
    commands.addCommand(CommandIDs.clearFavorites, {
      execute: () => favoritesManager.clearFavorites(),
      label: 'Clear Favorites'
    });

    // Main Menu
    if (mainMenu) {
      mainMenu.fileMenu.addGroup(
        [
          {
            type: 'submenu' as Menu.ItemType,
            submenu: favoritesManager.favoritesMenu
          }
        ],
        1
      );
      // Try to merge with existing Group 1
      try {
        const groups = (mainMenu.fileMenu as any)._ranks;
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
    }

    return favoritesManager;
  }
};

export default favorites;
