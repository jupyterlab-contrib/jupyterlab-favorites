import { FileBrowser } from '@jupyterlab/filebrowser';
import {
  folderIcon,
  LabIcon,
  fileIcon,
  ReactWidget,
  UseSignal
} from '@jupyterlab/ui-components';
import { Signal } from '@lumino/signaling';
import * as React from 'react';
import { FavoritesManager } from './manager';
import { IFavorites } from './token';
import {
  getFavoritesIcon,
  getName,
  getPinnerActionDescription,
  mergePaths
} from './utils';

/**
 * The parent node class for Favorites content.
 */
const FAVORITE_MAIN_CLASS = 'jp-Favorites';

/**
 * The class name for the node containing the Favorites label that appears above
 * favorited items when there are favorited items.  When there are no favorited items,
 * this class is hidden.
 */
const FAVORITE_HEADER_CLASS = 'jp-Favorites-header';

/**
 * The class name for the node that contains favorited items.
 */
const FAVORITE_CONTAINER_CLASS = 'jp-Favorites-container';

/**
 * The class name for the parent node of a favorited item that appears in the favorited items section.
 */
const FAVORITE_ITEM_CLASS = 'jp-Favorites-item';

/**
 * The class name for the icon that appears to the left of the favorited item.
 */
const FAVORITE_ITEM_ICON_CLASS = 'jp-Favorites-itemIcon';

/**
 * The class name for the text that describes the favorited item.
 */
const FAVORITE_ITEM_TEXT_CLASS = 'jp-Favorites-itemText';

/**
 * The class name for the FileBrowser label that appears above FileBrowser content when there are favorited items.
 * When there are no favorited items, this class is hidden.
 */
const FILEBROWSER_HEADER_CLASS = 'jp-FileBrowser-header';

/**
 * The class name for the the BreadCrumbs favorite icon.
 * This icon is overlaid on top of the FileBrowser content via CSS.
 */
const FAVORITE_BREADCRUMB_ICON_CLASS = 'jp-Favorites-BreadCrumbs-Icon';

namespace types {
  export type FavoriteComponentProps = {
    favorite: IFavorites.Favorite;
    handleClick: (favorite: IFavorites.Favorite) => void;
  };

  export interface IFavoritesBreadCrumbProps {
    currentPath: string;
    manager: FavoritesManager;
    handleClick: (path: string) => void;
  }
}

const FavoriteComponent = (props: types.FavoriteComponentProps) => {
  const { favorite, handleClick } = props;

  let [displayName, dirname] = getName(favorite.path);
  if (favorite.name) {
    displayName = favorite.name;
    // Hide path name if a display name is defined
    dirname = '';
  } else {
    dirname = '/' + dirname;
  }

  let FavoriteIcon: LabIcon;
  if (favorite.iconLabel) {
    FavoriteIcon = LabIcon.resolve({ icon: favorite.iconLabel });
  } else {
    // Fallback for favorite using the v1 setting definition
    if (favorite.contentType === 'directory') {
      FavoriteIcon = folderIcon;
    } else {
      FavoriteIcon = fileIcon;
    }
  }

  return (
    <div
      className={FAVORITE_ITEM_CLASS}
      title={mergePaths(favorite.root, favorite.path)}
      onClick={e => {
        handleClick(favorite);
      }}
      data-path={favorite.path}
    >
      <FavoriteIcon.react className={FAVORITE_ITEM_ICON_CLASS} tag="span" />
      <span className={FAVORITE_ITEM_TEXT_CLASS}>
        {displayName}
        <span className="jp-Favorites-dirname">{dirname}</span>
      </span>
    </div>
  );
};

export const FavoritesBreadCrumbs: React.FunctionComponent<
  types.IFavoritesBreadCrumbProps
> = (props: types.IFavoritesBreadCrumbProps): JSX.Element | null => {
  const currentPath = props.currentPath;
  if (!currentPath) {
    return null;
  }
  return (
    <UseSignal
      signal={props.manager.favoritesChanged}
      initialSender={props.manager}
    >
      {manager => {
        const isFavorite = manager?.hasFavorite(currentPath) ?? false;
        const icon = getFavoritesIcon(isFavorite);
        return (
          <button
            className="jp-ToolbarButtonComponent"
            title={getPinnerActionDescription(isFavorite)}
            onClick={e => {
              props.handleClick(currentPath);
            }}
          >
            <icon.react className={FAVORITE_BREADCRUMB_ICON_CLASS} tag="span" />
          </button>
        );
      }}
    </UseSignal>
  );
};

export class FavoritesWidget extends ReactWidget {
  private manager: FavoritesManager;
  private filebrowser: FileBrowser;
  private pathChanged = new Signal<this, string>(this);

  constructor(manager: FavoritesManager, filebrowser: FileBrowser) {
    super();
    this.manager = manager;
    this.filebrowser = filebrowser;
    this.addClass(FAVORITE_MAIN_CLASS);

    this.filebrowser.model.pathChanged.connect((_, changedArgs) => {
      const path = changedArgs.newValue;
      this.pathChanged.emit(path);
    });
  }

  render(): JSX.Element {
    return (
      <UseSignal
        signal={this.manager.favoritesChanged}
        initialSender={this.manager}
        initialArgs={this.manager.visibleFavorites()}
      >
        {(
          manager?: FavoritesManager,
          visibleFavorites?: Array<IFavorites.Favorite>
        ) => (
          <div>
            <UseSignal
              signal={manager!.visibilityChanged}
              initialSender={manager}
              initialArgs={manager!.isVisible()}
            >
              {(manager?: FavoritesManager, isVisible?: boolean) =>
                isVisible && (
                  <>
                    <div className={FAVORITE_HEADER_CLASS}>Favorites</div>
                    <div className={FAVORITE_CONTAINER_CLASS}>
                      {(visibleFavorites ?? []).map(f => (
                        <FavoriteComponent
                          key={`favorites-item-${f.path}`}
                          favorite={f}
                          handleClick={manager!.handleClick.bind(manager)}
                        />
                      ))}
                    </div>
                    <div className={FILEBROWSER_HEADER_CLASS}>File Browser</div>
                  </>
                )
              }
            </UseSignal>
          </div>
        )}
      </UseSignal>
    );
  }
}
