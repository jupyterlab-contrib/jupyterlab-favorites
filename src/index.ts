import {
  JupyterLab,
  JupyterLabPlugin,
} from '@jupyterlab/application';

import {
  BreadCrumbs,
  FileBrowserModel,
  IFileBrowserFactory,
} from '@jupyterlab/filebrowser';

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
    this._favorites_items = Private.createFavoritesItems();
    this._favorites = Private.createFavorites(this._favorites_items);
    this.node.appendChild(this._favorites);
    this._model.refreshed.connect(this.update, this);
  }

  private _model: FileBrowserModel;
  private _favorites: HTMLElement;
  private _favorites_items: ReadonlyArray<HTMLElement>;

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
        // let index = ArrayExt.findFirstIndex(
        //   this._favorites_items,
        //   value => value === node
        // );
        // TODO: Make this path actually dependent on the favorite
        console.log('trying to cd...');
        this._model
          .cd('~/')
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
}

/**
 * The namespace for the crumbs private data.
 */
namespace Private {
  /**
   * Create the favorites items nodes.
   */
  export function createFavoritesItems(): ReadonlyArray<HTMLElement> {
    let home = document.createElement('div');
    home.className = FAVORITES_ITEM_CLASS;
    home.title = 'Home';
    let homeIcon = document.createElement('span');
    homeIcon.className = `${MATERIAL_CLASS} ${FAVORITES_HOME_CLASS} ${FAVORITES_ITEM_ICON_CLASS}`;
    home.appendChild(homeIcon);
    let homeText = document.createElement('span');
    homeText.className = FAVORITES_ITEM_TEXT_CLASS;
    homeText.innerHTML = '~/';
    home.appendChild(homeText);
    return [home];
  }

  /**
   * Create the favorites node.
   */
  export function createFavorites(
    favorites_items: ReadonlyArray<HTMLElement>
  ): HTMLElement {
    let favorites = document.createElement('div');
    let favorites_header = document.createElement('div');
    favorites_header.innerHTML = 'Favorites';
    favorites_header.className = FAVORITES_HEADER_CLASS;
    favorites.appendChild(favorites_header);
    let favorites_container = document.createElement('div');
    favorites_container.className = FAVORITES_CONTAINER_CLASS;
    favorites.appendChild(favorites_container);
    favorites_items.forEach(favorites_item => {
      favorites_container.appendChild(favorites_item);
    });
    return favorites;
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
    // let { commands } = app;
    // commands.execute('filebrowser:navigate', { path: '/nersc/jupyterlab-favorites' })
  }
};

export default extension;
