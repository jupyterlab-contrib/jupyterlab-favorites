import { LabIcon, ToolbarButton } from '@jupyterlab/ui-components';
import { filledStarIcon, starIcon } from './icons';
import { PathExt } from '@jupyterlab/coreutils';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { Notebook } from '@jupyterlab/notebook';

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

export function updateCellFavoriteButton(button: ToolbarButton, cell: ICellModel) {
  const tags = cell.getMetadata("tags");
  const isFavorite = Array.isArray(tags) && tags.includes("fav");
  // Update tooltip
  const tooltip = isFavorite ? "Unfavorite cell" : "Favorite cell";
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
  let tags = cell.getMetadata("tags");
  if (Array.isArray(tags)) {
    const favIndex = tags.indexOf("fav");
    if (favIndex === -1) {
      tags = [...tags, "fav"];
    } else {
      tags = tags.filter(tag => tag !== "fav");
    }
    if (tags.length === 0) {
      cell.deleteMetadata("tags");
    } else {
      cell.setMetadata("tags", tags);
    }
  } else {
    cell.setMetadata("tags", ["fav"]);
  }
}

export function updateCellClasses(notebook: Notebook) {
    console.log("Calling updateCellClasses!")
    let count = 0
    notebook.widgets.forEach(widget => {
      count +=1
      const cell = widget as Cell;
      const tags = cell.model.getMetadata('tags') as string[] | undefined;
      const isFav = Array.isArray(tags) && tags.includes('fav');
      
      if (isFav) {
        cell.node.classList.add('favorite-cell');
      } else {
        cell.node.classList.remove('favorite-cell');
      }
    });
    console.log("updated",count,"cells")
  }