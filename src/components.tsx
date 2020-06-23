import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { FileBrowser } from '@jupyterlab/filebrowser';
import { folderIcon, LabIcon, fileIcon } from '@jupyterlab/ui-components';
import { Signal } from '@lumino/signaling';
import * as React from 'react';
import { FavoritesManager } from './manager';
import { IFavorites } from './token';
import {
  getFavoritesIcon,
  getName,
  getPinnerActionDescription,
  mergePaths,
} from './utils';

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
  let displayName = getName(favorite.path);
  if (favorite.name) {
    displayName = favorite.name;
  }

  let FavoriteIcon: LabIcon;
  if (favorite.iconLabel) {
    FavoriteIcon = LabIcon.resolve({ icon: favorite.iconLabel });
  } else {
    // Fallback for favorite using the v1 setting definition
    if (favorite.contentType === "directory") {
      FavoriteIcon = folderIcon;
    } else {
      FavoriteIcon = fileIcon;
    }
  }

  return (
    <div
      className="jp-Favorites-item"
      title={mergePaths(favorite.root, favorite.path)}
      onClick={(e) => {
        handleClick(favorite);
      }}
    >
      <FavoriteIcon.react className="jp-Favorites-itemIcon" tag="span" />
      <span className="jp-Favorites-itemText">{displayName}</span>
    </div>
  );
};

const FavoritesBreadCrumbs: React.FunctionComponent<types.IFavoritesBreadCrumbProps> = (
  props: types.IFavoritesBreadCrumbProps
): JSX.Element => {
  if (props.currentPath) {
    const FavoriteIcon = getFavoritesIcon(
      props.manager.hasFavorite(props.currentPath)
    );
    return (
      <div
        className="jp-Favorites-pinner"
        title={getPinnerActionDescription(
          props.manager.hasFavorite(props.currentPath)
        )}
        onClick={(e) => props.handleClick(props.currentPath)}
      >
        <FavoriteIcon.react
          className={'jp-Favorites-BreadCrumbs-Icon'}
          tag="span"
        />
      </div>
    );
  }
  return null;
};

export class FavoritesWidget extends ReactWidget {
  private manager: FavoritesManager;
  private filebrowser: FileBrowser;
  private pathChanged = new Signal<this, string>(this);

  constructor(manager: FavoritesManager, filebrowser: FileBrowser) {
    super();
    this.manager = manager;
    this.filebrowser = filebrowser;
    this.addClass('jp-Favorites');

    this.filebrowser.model.pathChanged.connect((_, changedArgs) => {
      const path = changedArgs.newValue;
      this.pathChanged.emit(path);
    });
  }

  handlePinnerClick(path: string) {
    const shouldRemove = this.manager.hasFavorite(path);
    if (shouldRemove) {
      this.manager.removeFavorite(path);
    } else {
      const favorite = {
        root: this.manager.serverRoot,
        contentType: 'directory',
        iconLabel: folderIcon.name,
        path,
      } as IFavorites.Favorite;
      this.manager.addFavorite(favorite);
    }
  }

  render() {
    return (
      <UseSignal
        signal={this.manager.favoritesChanged}
        initialSender={this.manager}
        initialArgs={this.manager.visibleFavorites()}
      >
        {(
          manager: FavoritesManager,
          visibleFavorites: Array<IFavorites.Favorite>
        ) => (
          <div>
            <UseSignal
              signal={manager.visibilityChanged}
              initialSender={manager}
              initialArgs={manager.isVisible()}
            >
              {(manager: FavoritesManager, isVisible: boolean) =>
                isVisible && (
                  <>
                    <div className="jp-Favorites-header">Favorites</div>
                    <div className="jp-Favorites-container">
                      {visibleFavorites.map((f) => (
                        <FavoriteComponent
                          key={`favorites-item-${f.path}`}
                          favorite={f}
                          handleClick={manager.handleClick.bind(manager)}
                        />
                      ))}
                    </div>
                    <div className="jp-FileBrowser-header">File Browser</div>
                  </>
                )
              }
            </UseSignal>
            <UseSignal
              signal={this.pathChanged}
              initialSender={this}
              initialArgs={this.filebrowser.model.path}
            >
              {(widget: FavoritesWidget, currentPath: string) => (
                <FavoritesBreadCrumbs
                  currentPath={currentPath}
                  handleClick={widget.handlePinnerClick}
                  manager={widget.manager}
                />
              )}
            </UseSignal>
          </div>
        )}
      </UseSignal>
    );
  }
}
