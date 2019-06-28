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

import {
  UseSignal,
  ReactWidget,
} from '@jupyterlab/apputils';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  Signal,
} from '@phosphor/signaling';

import {
  PanelLayout,
} from '@phosphor/widgets';

import {
  toArray,
} from '@phosphor/algorithm';

import React from 'react';

import '../style/index.css';

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

  export interface IFavorites {
    default: Array<any>;
    valid: Array<any> | undefined;
    invalid: Array<any> | undefined;
  }
}

class FavoritesManager {
  settingsID = `${Favorites.id}:favorites`;
  settingsRegistry: ISettingRegistry;
  favoritesChanged = new Signal<this, Favorites.IFavorites>(this);
  private _favorites: Favorites.IFavorites;
  private _openPath: (args?: ReadonlyJSONObject) => Promise<any>;

  constructor(openPath: (args?: ReadonlyJSONObject) => Promise<any>, settingsRegistry: ISettingRegistry) {
    this._openPath = openPath;
    this.settingsRegistry = settingsRegistry;
    // this.handleClick = this.handleClick.bind(this);
    // console.log('this: ', this);
    // console.log('handleClick: ', this.handleClick);
  }

  get favorites(): Favorites.IFavorites {
    return this._favorites;
  }

  set favorites(favorites: Favorites.IFavorites) {
    this._favorites = favorites;
  }

  async init() {
    await this.fetchFavorites();
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

  async fetchFavorites() {
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
        this.favoritesChanged.emit(this.favorites);
      }
    }
    catch (error) {
      console.log(error);
    }
  }

  async addFavorite(favorite: Favorites.IItem) {
    console.log('adding favorite: ', favorite);
    const valid = this.favorites.valid || [];
    valid.push(favorite);
    const newSettings = JSON.stringify({ favorites: valid });
    await this.settingsRegistry.upload(this.settingsID, newSettings);
    await this.fetchFavorites();
  }

  handleClick(favorite: Favorites.IItem) {//}, event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    console.log('inside handleClick for: ', favorite);
    this._openPath({ path: favorite.path });
  }
}

// return (
//   <UseSignal
//     signal={props.manager.runningChanged}
//     initialArgs={initialModels}
//   >
//     {(sender: any, args: Array<M>) => render(args)}
// </UseSignal>

type FavoritesProps = {
  manager: FavoritesManager;
};

function FavoritesComponent(props: FavoritesProps) {
  return (
    <UseSignal
      signal={props.manager.favoritesChanged}
      initialArgs={props.manager.favorites}
      initialSender={props.manager}
    >
      {(sender: FavoritesManager, favorites: Favorites.IFavorites) => (
        <div className="jp-Favorites">
          <div className="jp-Favorites-header">
            {"Favorites"}
          </div>
          <div className="jp-Favorites-container">
            {((favorites.valid || favorites.default) as Array<Favorites.IItem>).map(f =>
              <div
                className="jp-Favorites-item"
                title={f.path}
                onClick={e => {
                  console.log('manager: ', props.manager);
                  props.manager.handleClick(f);
                }}
                key={`favorites-item-${f.path}`}
              >
                <span className={`jp-MaterialIcon jp-Favorites-itemIcon ${f.iconClass}`}></span>
                <span className="jp-Favorites-itemText">{f.title}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </UseSignal>
  );
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
    const { commands } = app;
    const openPath = commands.execute.bind(commands, 'filebrowser:open-path');
    const favoritesManager = new FavoritesManager(openPath, settingsRegistry);
    favoritesManager.init();
    const favoritesWidget = ReactWidget.create(
      <FavoritesComponent manager={favoritesManager}/>
    );

    let breadCrumbsIndex = 0;
    layout.widgets.forEach((widget, index) => {
      if (widget.node.className.includes('jp-BreadCrumbs')) {
        breadCrumbsIndex = index;
      }
    })
    // Insert the Favorites widget just ahead of the BreadCrumbs
    layout.insertWidget(breadCrumbsIndex, favoritesWidget);
    const { tracker } = factory;
    commands.addCommand(CommandIDs.addFavorite, {
      execute: () => {
        const widget = tracker.currentWidget;
        if (!widget) {
          return;
        }
        const selectedItem = widget.selectedItems().next();
        favoritesManager.addFavorite({
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
