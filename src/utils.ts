import { LabIcon, ToolbarButton } from '@jupyterlab/ui-components';
import { filledStarIcon, starIcon } from './icons';
import { PathExt } from '@jupyterlab/coreutils';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { Notebook, NotebookPanel } from '@jupyterlab/notebook';

const FAVORITE_CELL_CLASS = 'jp-favorite-cell';
const FAVORITE_TAG = 'favorite';
const SHOW_ALL_STARS = 'jp-Favorites-show-all-stars';

export function getFavoritesIcon(filled: boolean): LabIcon {
  return filled ? filledStarIcon : starIcon;
}

/**
 * Split the file path in two parts: the name and the folder
 * @param path Path to display
 * @returns [name, folder]
 */
export function getName(path: string): [string, string] {
  return [PathExt.basename(path), PathExt.dirname(path)];
}

export function getPinnerActionDescription(showRemove: boolean): string {
  return `${showRemove ? 'Remove' : 'Add'} Favorite`;
}

export function mergePaths(root: string, path: string): string {
  return PathExt.join(root, path);
}

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export function updateCellFavoriteButton(
  button: ToolbarButton,
  cell: Cell<ICellModel>
) {
  const tags = cell.model.getMetadata('tags');
  const isFavorite = Array.isArray(tags) && tags.includes(FAVORITE_TAG);
  if (isFavorite) {
    cell.addClass(FAVORITE_CELL_CLASS);
  } else {
    cell.removeClass(FAVORITE_CELL_CLASS);
  }
  // Update tooltip
  const tooltip = isFavorite ? 'Unfavorite cell' : 'Favorite cell';
  const jpButton = button.node.querySelector('jp-button');
  if (jpButton) {
    jpButton.setAttribute('aria-label', tooltip);
    jpButton.setAttribute('title', tooltip);
  }
  button.node.setAttribute('title', tooltip);
  // Replace the SVG in the button
  const icon = getFavoritesIcon(isFavorite);
  const svgElement = button.node.querySelector('svg');
  if (svgElement) {
    svgElement.outerHTML = icon.svgstr;
  } else {
    button.node.innerHTML = icon.svgstr;
  }
}

export function toggleCellFavorite(cell: ICellModel): void {
  let tags = cell.getMetadata('tags');
  if (Array.isArray(tags)) {
    const favIndex = tags.indexOf(FAVORITE_TAG);
    if (favIndex === -1) {
      tags = [...tags, FAVORITE_TAG];
    } else {
      tags = tags.filter(tag => tag !== FAVORITE_TAG);
    }
    if (tags.length === 0) {
      cell.deleteMetadata('tags');
    } else {
      cell.setMetadata('tags', tags);
    }
  } else {
    cell.setMetadata('tags', [FAVORITE_TAG]);
  }
}

export function updateCellClasses(notebook: Notebook) {
  notebook.widgets.forEach(widget => {
    const cell = widget as Cell;
    const tags = cell.model.getMetadata('tags') as string[] | undefined;
    const isFav = Array.isArray(tags) && tags.includes(FAVORITE_TAG);

    if (isFav) {
      cell.node.classList.add(FAVORITE_CELL_CLASS);
    } else {
      cell.node.classList.remove(FAVORITE_CELL_CLASS);
    }
  });
}

export function updateSingleCellClass(cell: Cell<ICellModel>) {
  const tags = cell.model.getMetadata('tags') as string[] | undefined;
  const isFav = Array.isArray(tags) && tags.includes(FAVORITE_TAG);
  if (isFav) {
    cell.addClass(FAVORITE_CELL_CLASS);
  } else {
    cell.removeClass(FAVORITE_CELL_CLASS);
  }
}

export function changeShowStarsOnAllCells(
  show: boolean,
  notebookPanel: NotebookPanel | null
) {
  if (!notebookPanel || !notebookPanel.content) {
    return;
  }
  const notebook = notebookPanel.content;
  if (show) {
    notebook.node.classList.add(SHOW_ALL_STARS);
  } else {
    notebook.node.classList.remove(SHOW_ALL_STARS);
  }
}
