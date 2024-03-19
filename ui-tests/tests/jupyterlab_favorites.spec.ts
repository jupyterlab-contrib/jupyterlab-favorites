import { expect, test } from '@jupyterlab/galata';

test.beforeEach(async ({ page }) => {
  await page.menu.clickMenuItem('File>New>Text File');
  await page
    .getByRole('main')
    .getByRole('tab', { name: 'untitled.txt' })
    .waitFor();
  await page.activity.closeAll();
  await page.getByTitle('New Folder').click();
  await page.locator('.jp-DirListing-editor').press('Escape');
});

test('should add a file as favorite', async ({ page }) => {
  await page.getByText('untitled.txt').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Add Favorite' }).click();

  await expect(
    page.locator('.jp-Favorites').getByText('untitled.txt')
  ).toHaveCount(1);
});

test('should add a folder as favorite', async ({ page }) => {
  await page.getByText('Untitled Folder').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Add Favorite' }).click();

  await expect(
    page.locator('.jp-Favorites').getByText('Untitled Folder')
  ).toHaveCount(1);
});

test('should remove a favorite from widget', async ({ page }) => {
  await page.getByText('untitled.txt').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Add Favorite' }).click();

  await page
    .locator('.jp-Favorites')
    .getByText('untitled.txt')
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Remove Favorite' }).click();

  await expect(
    page.locator('.jp-Favorites').getByText('untitled.txt')
  ).toHaveCount(0);
});

test('should remove a favorite from breadcrumb', async ({ page }) => {
  // Set folder as favorite
  await page.getByText('Untitled Folder').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Add Favorite' }).click();

  // Open folder such that the star icon is visible
  await page.getByText('Untitled Folder').dblclick();

  await page.getByTitle('Remove Favorite').click();

  await expect
    .soft(page.getByRole('button', { name: 'Add Favorite' }))
    .toBeVisible();

  await expect(
    page.locator('.jp-Favorites').getByText('Untitled Folder')
  ).toHaveCount(0);
});

test('should rename a favorite', async ({ page }) => {
  await page.getByText('untitled.txt').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Add Favorite' }).click();

  await page
    .locator('.jp-Favorites')
    .getByText('untitled.txt')
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Rename Favorite' }).click();

  await page.getByRole('textbox', { name: 'Name for favorite' }).fill('magics');

  await page.getByRole('button', { name: 'Rename' }).click();

  await expect(page.locator('.jp-Favorites').getByText('magics')).toBeVisible();
});
