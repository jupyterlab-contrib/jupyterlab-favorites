import {
  JupyterLab,
  JupyterLabPlugin,
} from '@jupyterlab/application';

import {
  BreadCrumbs,
  FileBrowserModel,
  IFileBrowserFactory,
} from '@jupyterlab/filebrowser';

import {
  ServerConnection
} from '@jupyterlab/services';

import {
  ArrayExt
} from '@phosphor/algorithm';

import '../style/index.css';

import {
  Widget,
  PanelLayout,
} from '@phosphor/widgets';

import { Message } from '@phosphor/messaging';

import { showErrorMessage } from '@jupyterlab/apputils';

/**
 * The class name we expect to find on the BreadCrumbs node.
 * We'll insert the Favorites widget just before it.
 */
const BREADCRUMBS_CLASS = 'jp-BreadCrumbs';

/**
 * The class name we will add to the root folder in the BreadCrumbs.
 */
const ROOT_FOLDER_CLASS = 'jp-FolderIcon';

/**
 * The class name added to material icons
 */
const MATERIAL_CLASS = 'jp-MaterialIcon';

/**
 * The class name added to the favorites node.
 */
const FAVORITES_CLASS = 'jp-Favorites';

/**
 * The class name added to the favorites header.
 */
const FAVORITES_HEADER_CLASS = 'jp-Favorites-header';

/**
 * The class name added to the favorites header.
 */
const FAVORITES_CONTAINER_CLASS = 'jp-Favorites-container';

/**
 * The class name added to add the home icon for the favorites
 */
const FAVORITES_HOME_CLASS = 'jp-HomeIcon';

/**
 * The class name added to the favorite item node.
 */
const FAVORITES_ITEM_CLASS = 'jp-Favorites-item';

/**
 * The class name added to the favorite item's icon node.
 */
const FAVORITES_ITEM_ICON_CLASS = 'jp-Favorites-itemIcon';

/**
 * The class name added to the favorite item's text node.
 */
const FAVORITES_ITEM_TEXT_CLASS = 'jp-Favorites-itemText';

/**
 * A class which hosts shortcuts to favorite folders.
 */
class Favorites extends Widget {
  /**
   * Construct a new file browser crumb widget.
   *
   * @param model - The file browser view model.
   */
  constructor(options: Favorites.IOptions) {
    super();
    this._model = options.model;
    this.addClass(FAVORITES_CLASS);
    this.hide();
    this._favorites_header = Private.createFavoritesHeader();
    this.node.appendChild(this._favorites_header);
    this._favorites_container = Private.createFavoritesContainer();
    this.node.appendChild(this._favorites_container);
    this._favorites_data = [];
    this._favorites_items = [];
  }

  private _model: FileBrowserModel;
  private _favorites_data: Array<Favorites.ItemData>;
  private _favorites_header: HTMLElement;
  private _favorites_container: HTMLElement;
  private _favorites_items: ReadonlyArray<HTMLElement>;

  /**
   * Set backing data according to server.
   */
  public setFavoritesData(favoritesData: Array<Favorites.ItemData>): void {
    this._favorites_data = favoritesData;
    this.update();
  }

  /**
   * Handle the DOM events for the favorites.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'click':
        this._evtClick(event as MouseEvent);
        break;
      default:
        return;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    let node = this.node;
    node.addEventListener('click', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    let node = this.node;
    node.removeEventListener('click', this);
  }

  /**
   * A handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    // Update the favorites rendered.
    while (this._favorites_container.firstChild) {
      this._favorites_container.firstChild.remove();
    }
    this._favorites_items = Private.createFavoritesItems(this._favorites_data);
    if (this._favorites_items.length > 0) {
      this._favorites_items.forEach(favorites_item => {
        this._favorites_container.appendChild(favorites_item);
      })
      this.show();
    }
    else {
      this.hide();
    }
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private _evtClick(event: MouseEvent): void {
    console.log('handling click...');
    // Do nothing if it's not a left mouse press.
    if (event.button !== 0) {
      return;
    }

    // Find a valid click target.
    let node = event.target as HTMLElement;
    console.log(`looking at node with class list: ${node.classList}`);
    while (node && node !== this.node) {
      if (node.classList.contains(FAVORITES_ITEM_CLASS)) {
        let index = ArrayExt.findFirstIndex(
          this._favorites_items,
          value => value === node
        );
        let path = this._favorites_data[index].path;
        console.log('trying to cd to: ', path);
        this._model
          .cd(path)
          .catch(error => showErrorMessage('Open Error', error));

        // Stop the event propagation.
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      node = node.parentElement as HTMLElement;
    }
  }
}

/**
 * The namespace for the `Favorites` class statics.
 */
namespace Favorites {
  /**
   * An options object for initializing a favorites widget.
   */
  export interface IOptions {
    /**
     * A file browser model instance.
     */
    model: FileBrowserModel;
  }

  export interface ItemData {
    title: string;
    iconClass: string;
    path: string;
  }
}

/**
 * The namespace for the crumbs private data.
 */
namespace Private {
  /**
   * Create the favorites items nodes.
   */
  export function createFavoritesItems(favoritesData: ReadonlyArray<Favorites.ItemData>): ReadonlyArray<HTMLElement> {
    let favoritesItems: Array<HTMLElement> = [];
    favoritesData.forEach(({ title, iconClass, path }) => {
      let favorite = document.createElement('div');
      favorite.className = FAVORITES_ITEM_CLASS;
      favorite.title = path;
      let icon = document.createElement('span');
      icon.className = `${MATERIAL_CLASS} ${iconClass} ${FAVORITES_ITEM_ICON_CLASS}`;
      favorite.appendChild(icon);
      let text = document.createElement('span');
      text.className = FAVORITES_ITEM_TEXT_CLASS;
      text.innerHTML = title;
      favorite.append(text);
      favoritesItems.push(favorite);
    })
    return favoritesItems;
  }

  /**
   * Create the favorites header node.
   */
  export function createFavoritesHeader(): HTMLElement {
    let favorites_header = document.createElement('div');
    favorites_header.innerHTML = 'Favorites';
    favorites_header.className = FAVORITES_HEADER_CLASS;
    return favorites_header;
  }

  /**
   * Create the favorites container node.
   */
  export function createFavoritesContainer(): HTMLElement {
    let favorites_container = document.createElement('div');
    favorites_container.className = FAVORITES_CONTAINER_CLASS;
    return favorites_container;
  }
}

/**
 * Initialization data for the jupyterlab-favorites extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab-favorites',
  autoStart: true,
  requires: [IFileBrowserFactory],
  activate: (app: JupyterLab, factory: IFileBrowserFactory) => {
    console.log('JupyterLab extension jupyterlab-favorites is activated!');
    let filebrowser = factory.defaultBrowser;
    let layout = <PanelLayout>filebrowser.layout;
    let model = filebrowser.model;
    let favorites = new Favorites({ model });
    let breadCrumbsIndex = 0;
    layout.widgets.forEach((widget, index) => {
      if (widget.node.className.includes(BREADCRUMBS_CLASS)) {
        breadCrumbsIndex = index;
      }
    })
    // Change the icon of the BreadCrumbs widget as we'll have a new "Home"
    let BreadCrumbs = <BreadCrumbs>layout.widgets[breadCrumbsIndex];
    let elementsWithHome: any = BreadCrumbs.node.getElementsByClassName(FAVORITES_HOME_CLASS);
    for (let element of elementsWithHome) {
      element.className = element.className.replace(FAVORITES_HOME_CLASS, ROOT_FOLDER_CLASS);
    }
    // Insert the Favorites widget just ahead of the BreadCrumbs
    layout.insertWidget(breadCrumbsIndex, favorites);
    // Request favorites from the server
    let settings = ServerConnection.makeSettings();
    let init = {
      method: 'GET',
    }
    let url = `${settings.baseUrl}favorites`;
    console.log('url: ', url);
    ServerConnection.makeRequest(url, init, settings).then(response => {
      if (response.status !== 200) {
        throw Error(response.statusText);
      }
      return response.json();
    }).then(data => {
      console.log('received favorites: ', data);
      favorites.setFavoritesData(data.favorites || []);
    }).catch(error => {
      console.log(error);
    });
    // let { commands } = app;
    // commands.execute('filebrowser:navigate', { path: '/nersc/jupyterlab-favorites' })
  }
};

export default extension;
