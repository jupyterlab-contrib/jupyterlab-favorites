import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import {
  IFileBrowserFactory,
} from '@jupyterlab/filebrowser';

import {
  ServerConnection
} from '@jupyterlab/services';

import '../style/index.css';

import {
  PanelLayout,
} from '@phosphor/widgets';

import {
  ReactWidget,
} from '@jupyterlab/apputils';

import React from 'react';

namespace Favorites {
  export interface IItem {
    title: string;
    iconClass: string;
    path: string;
  }
  export interface IState {
    favorites: Array<IItem>;
  }
}

export class FavoritesComponent extends React.Component {
  state: Favorites.IState = {
    favorites: [],
  };

  __get_favorites() {
    // Request favorites from the server
    const settings = ServerConnection.makeSettings();
    ServerConnection.makeRequest(
      `${settings.baseUrl}favorites`,
      { method: 'GET' },
      settings,
    ).then(response => {
      if (response.status !== 200) {
        throw Error(response.statusText);
      }
      return response.json();
    }).then(data => {
      console.log('received favorites: ', data);
      this.updateFavorites(data.favorites || []);
    }).catch(error => {
      console.log(error);
    });
  }

  componentDidMount() {
    console.log('inside componentDidMount');
    this.__get_favorites();
  }

  updateFavorites(favorites: Array<Favorites.IItem>) {
    this.setState(() => {
      return { favorites }
    })
  }

  render() {
    return (
      <div className="jp-Favorites">
        <div className="jp-Favorites-header">
          {"Favorites"}
        </div>
        <div className="jp-Favorites-container">
          {this.state.favorites.map(f =>
            <div className="jp-Favorites-item" title={f.path} key={`favorites-item-${f.path}`}>
              <span className={`jp-MaterialIcon jp-Favorites-itemIcon ${f.iconClass}`}></span>
              <span className="jp-Favorites-itemText">{f.title}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
}

/**
 * The command IDs used by the favorites plugin.
 */
// namespace CommandIDs {
//   export const addFavorite = 'jupyterlab-favorites:add-favorite';
//   export const removeFavorite = 'jupyterlab-favorites:remove-favorite';
// }

// /**
//  * Add a command to the right-click menu that adds a favorite.
//  */
// const addFavorite: JupyterFrontEndPlugin<void> = {
//   activate: (app, factory) => {
//     const { commands } = app;
//     const { tracker } = factory;

//     commands.addCommand(CommandIDs.addFavorite, {
//       execute: () => {
//         const widget = tracker.currentWidget;
//         if (!widget) {
//           return;
//         }
//         const path = widget.selectedItems().next().path;
//         const settings = ServerConnection.makeSettings();
//         // TODO: write path to file
//         ServerConnection.makeRequest(
//           `${settings.baseUrl}favorites`, {
//             method: 'PATCH',
//             body: JSON.stringify({ add: path }),
//           },
//           settings,
//         ).then(response => {
//           if (response.status !== 200) {
//             throw Error(response.statusText);
//           }
//           // TODO: Get the Favorites to update
//           return response.json();
//         }).catch(error => {
//           console.log(error);
//         });
//       },
//       isVisible: () =>
//         tracker.currentWidget &&
//         toArray(tracker.currentWidget.selectedItems()).length === 1,
//       iconClass: 'jp-MaterialIcon jp-LinkIcon',
//       label: 'Copy Shareable Link',
//     })
//   },
//   id: 'jupyterlab-favorites:add-favorite',
//   requires: [IFileBrowserFactory, IFavorites],
//   autoStart: true,
// }

// /**
//  * Add a command to the right-click menu that adds a favorite.
//  */
// const removeFavorite: JupyterFrontEndPlugin<void> = {
//   activate: (app, factory) => {
//     const { commands } = app;
//     const { tracker } = factory;

//     commands.addCommand(CommandIDs.removeFavorite, {
//       execute: () => {
//         const widget = tracker.currentWidget;
//         if (!widget) {
//           return;
//         }
//         const path = encodeURI(widget.selectedItems().next().path);
//         Clipboard.copyToSystem(URLExt.join(PageConfig.getTreeUrl(), path));
//       },
//       isVisible: () =>
//         tracker.currentWidget &&
//         toArray(tracker.currentWidget.selectedItems()).length === 1,
//       iconClass: 'jp-MaterialIcon jp-LinkIcon',
//       label: 'Copy Shareable Link',
//     })
//   },
//   id: 'jupyterlab-favorites:add-favorite',
//   requires: [IFileBrowserFactory],
//   autoStart: true,
// }

/**
 * Initialization data for the jupyterlab-favorites extension.
 */
const favorites: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-favorites',
  autoStart: true,
  requires: [IFileBrowserFactory],
  activate: (app: JupyterFrontEnd, factory: IFileBrowserFactory) => {
    console.log('JupyterLab extension jupyterlab-favorites is activated (with React)!');
    const filebrowser = factory.defaultBrowser;
    const layout = filebrowser.layout as PanelLayout;
    const favorites = ReactWidget.create(<FavoritesComponent />);
    let breadCrumbsIndex = 0;
    layout.widgets.forEach((widget, index) => {
      if (widget.node.className.includes('jp-BreadCrumbs')) {
        breadCrumbsIndex = index;
      }
    })
    // Insert the Favorites widget just ahead of the BreadCrumbs
    layout.insertWidget(breadCrumbsIndex, favorites);
  }
};

const plugins: JupyterFrontEndPlugin<any>[] = [
  favorites,
  // addFavorite,
  // removeFavorite,
];

export default plugins;
