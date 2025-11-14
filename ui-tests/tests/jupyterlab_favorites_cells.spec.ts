import { expect, test } from '@jupyterlab/galata';
import path from 'path';

test.describe('JupyterLab Favorites Extension', () => {
  test('should add favorite tag and show star icon when clicking toolbar button', async ({
    page
  }) => {
    await page.menu.clickMenuItem('File>New>Notebook');

    const kernelDialogAcceptButton = page.locator(
      '.jp-mod-accept:has-text("Select")'
    );
    await kernelDialogAcceptButton.waitFor({ state: 'attached' });
    await kernelDialogAcceptButton.click();
    await page.waitForSelector('.jp-NotebookPanel');
    await page.sidebar.close('left');

    await page.notebook.enterCellEditingMode(0);
    const cell = page.locator('.jp-Cell').first();

    const cellToolbarButton = cell.locator(
      '[data-jp-item-name="cellFavoriteToggle"]'
    );
    await cellToolbarButton.click();

    const cellStarButtonOn = cell.locator('.jp-Favorites-star-class');
    await expect(cellStarButtonOn).toBeVisible();

    await page.sidebar.open('right');
    await page
      .locator('.jp-Collapse-header:has-text("ADVANCED TOOLS")')
      .click();
    const metadata = page.locator('.jp-JSONEditor-host').first();
    await expect(metadata).toContainText('"tags"');
    await expect(metadata).toContainText('"favorite"');

    await cellToolbarButton.click();

    await expect(cellStarButtonOn).toBeHidden();
    await expect(metadata).not.toContainText('"tags"');
    await expect(metadata).not.toContainText('"favorite"');
  });

  test('should toggle favorite when clicking star icon on cell', async ({
    page
  }) => {
    await page.menu.clickMenuItem('File>New>Notebook');
    const kernelDialogAcceptButton = page.locator(
      '.jp-mod-accept:has-text("Select")'
    );
    await kernelDialogAcceptButton.waitFor({ state: 'attached' });
    await kernelDialogAcceptButton.click();
    await page.waitForSelector('.jp-NotebookPanel');
    await page.notebook.enterCellEditingMode(0);
    const cell = page.locator('.jp-Cell').first();

    const cellStarButtonOff = cell.locator('.jp-Favorites-star-class-off');
    const cellStarButtonOn = cell.locator('.jp-Favorites-star-class');
    await expect(cellStarButtonOff).not.toBeVisible();
    await expect(cellStarButtonOn).not.toBeVisible();

    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('settingeditor:open', {
        query: 'Favorites'
      });
    });
    const showStarsCheckbox = page.locator(
      'label:has-text("Show Stars on All Cells") input[type="checkbox"]'
    );
    await showStarsCheckbox.click();
    await page.keyboard.press('Control+Shift+[');
    await page.notebook.enterCellEditingMode(0);

    await expect(cellStarButtonOff).toBeVisible();
    await expect(cellStarButtonOn).not.toBeVisible();

    await cellStarButtonOff.click();

    await expect(cellStarButtonOn).toBeVisible();
    await expect(cellStarButtonOff).not.toBeVisible();

    await page.sidebar.open('right');
    await page
      .locator('.jp-Collapse-header:has-text("ADVANCED TOOLS")')
      .click();
    const metadata = page.locator('.jp-JSONEditor-host').first();

    await expect(metadata).toContainText('"tags"');
    await expect(metadata).toContainText('"favorite"');

    await cellStarButtonOn.click();
    await page.waitForTimeout(500);

    await expect(cellStarButtonOff).toBeVisible();
    await expect(metadata).not.toContainText('"favorite"');
  });

  test('should match snapshots for favorite cells and all cells', async ({
    page,
    tmpPath
  }) => {
    const fileName = 'favorite_cells.ipynb';
    await page.contents.uploadFile(
      path.resolve(__dirname, `./data/${fileName}`),
      `${tmpPath}/${fileName}`
    );
    await page.evaluate(async () => {
      await window.jupyterapp.commands.execute('filebrowser:refresh');
    });
    await page
      .locator(`.jp-DirListing-item:has-text("${fileName}")`)
      .dblclick();
    await page.waitForSelector('.jp-NotebookPanel');

    await page.menu.clickMenuItem('View>Cell Favourites>Show Favorite Cells');
    await page.waitForTimeout(500);

    const panel = page.locator('[role="main"] >> .jp-NotebookPanel');
    const document = panel.locator('.jp-Notebook');
    expect(await document.screenshot()).toMatchSnapshot(
      'favorite-cells-snapshot.png'
    );

    await page.menu.clickMenuItem('View>Cell Favourites>Show All Cells');
    await page.waitForTimeout(500);
    expect(await document.screenshot()).toMatchSnapshot(
      'all-cells-snapshot.png'
    );
  });
});
