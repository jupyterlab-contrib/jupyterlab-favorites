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

import '../style/index.css';

import {
  PanelLayout,
} from '@phosphor/widgets';

import {
  ReactWidget,
} from '@jupyterlab/apputils';

import {
  toArray,
} from '@phosphor/algorithm';

import React from 'react';

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

  export interface IWidgetState {
    default: Array<any>;
    valid: Array<any> | undefined;
    invalid: Array<any> | undefined;
  }
}

function FavoritesComponent(props: Favorites.IProps) {
  return (
    <div className="jp-Favorites">
      <div className="jp-Favorites-header">
        {"Favorites"}
      </div>
      <div className="jp-Favorites-container">
        {props.favorites.map(f =>
          <div className="jp-Favorites-item" title={f.path} key={`favorites-item-${f.path}`}>
            <span className={`jp-MaterialIcon jp-Favorites-itemIcon ${f.iconClass}`}></span>
            <span className="jp-Favorites-itemText">{f.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

class FavoritesWidget extends ReactWidget {
  settingsID = `${Favorites.id}:favorites`;
  settingsRegistry: ISettingRegistry;
  favorites: Favorites.IWidgetState;

  constructor(settingsRegistry: ISettingRegistry) {
    super();
    this.settingsRegistry = settingsRegistry;
  }

  async init() {
    await this.getFavorites();
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

  async getFavorites() {
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
      }
    }
    catch (error) {
      console.log(error);
    }
  }

  addFavorite(favorite: Favorites.IItem) {
    console.log('adding favorite (just to client): ', favorite);
    const valid = this.favorites.valid || [];
    valid.push(favorite);
    this.favorites.valid = valid;
    console.log('forcing render with favorites: ', this.favorites.valid);
    this.render();
  }

  render() {
    const favorites = this.favorites.valid || this.favorites.default;
    return <FavoritesComponent favorites={favorites} />;
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
    const favoritesWidget = new FavoritesWidget(settingsRegistry);
    await favoritesWidget.init();
    let breadCrumbsIndex = 0;
    layout.widgets.forEach((widget, index) => {
      if (widget.node.className.includes('jp-BreadCrumbs')) {
        breadCrumbsIndex = index;
      }
    })
    // Insert the Favorites widget just ahead of the BreadCrumbs
    layout.insertWidget(breadCrumbsIndex, favoritesWidget);
    // Commands
    const { commands } = app;
    const { tracker } = factory;
    commands.addCommand(CommandIDs.addFavorite, {
      execute: () => {
        const widget = tracker.currentWidget;
        if (!widget) {
          return;
        }
        const selectedItem = widget.selectedItems().next();
        favoritesWidget.addFavorite({
          title: selectedItem.name,
          path: selectedItem.path,
          iconClass: 'jp-FolderIcon',
        });
        // selectedItem.mimetype;
      },
      isVisible: () =>
        tracker.currentWidget &&
        toArray(tracker.currentWidget.selectedItems()).length === 1,
      iconClass: 'jp-MaterialIcon jp-FavoritesIcon',
      label: 'Add Favorite',
    })
    // matches all filebrowser items
    const selectorItem = '.jp-DirListing-item[data-isdir]';
    // // matches only non-directory items
    // const selectorNotDir = '.jp-DirListing-item[data-isdir="false"]';
    app.contextMenu.addItem({
      command: CommandIDs.addFavorite,
      selector: selectorItem,
      rank: 3
    });

  },
};

const plugins: JupyterFrontEndPlugin<any>[] = [
  favorites,
];

export default plugins;
