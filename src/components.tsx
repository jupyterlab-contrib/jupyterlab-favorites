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
import { Drag } from '@lumino/dragdrop';
import { IDisposable } from '@lumino/disposable';

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

/**
 * The spacing from the bottom of the FileBrowser to leave when resizing the Favorites container.
 */
const BOTTOM_SPACING = 100;

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
            className="jp-ToolbarButtonComponent jp-Button jp-mod-minimal"
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

interface IFavoritesContainerProps {
  visibleFavorites?: Array<IFavorites.Favorite>;
  manager?: FavoritesManager;
}

function FavoritesContainer({
  visibleFavorites,
  manager
}: IFavoritesContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = React.useState(false);
  const cursorDisposableRef = React.useRef<IDisposable | null>(null);

  const handleMouseDown = () => {
    setIsResizing(true);
    cursorDisposableRef.current = Drag.overrideCursor('ns-resize');
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isResizing) {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }
      // Height of filebrowser widget
      const parentElement = container.closest('.jp-FileBrowser');
      const parentRect = parentElement?.getBoundingClientRect();
      if (!parentRect) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const newHeight = e.clientY - rect.top;
      const maxHeight = parentRect.height - BOTTOM_SPACING;

      if (newHeight > 24 && newHeight < maxHeight) {
        container.style.maxHeight = maxHeight + 'px'; // To ensure default max-height of css is overridden
        container.style.height = newHeight + 'px';
      }
    },
    [isResizing]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
    cursorDisposableRef.current?.dispose();
    cursorDisposableRef.current = null;
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  React.useEffect(() => {
    return () => {
      cursorDisposableRef.current?.dispose();
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className={FAVORITE_CONTAINER_CLASS}>
        {(visibleFavorites ?? []).map(f => (
          <FavoriteComponent
            key={`favorites-item-${f.path}`}
            favorite={f}
            handleClick={manager!.handleClick.bind(manager)}
          />
        ))}
      </div>
      <div
        className={
          'jp-Favorites-resize-handle' + (isResizing ? ' jp-mod-active' : '')
        }
        onMouseDown={handleMouseDown}
      ></div>
    </>
  );
}
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
                    <FavoritesContainer
                      visibleFavorites={visibleFavorites}
                      manager={manager}
                    />
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
