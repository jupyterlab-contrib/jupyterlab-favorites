import { expect, test } from '@jupyterlab/galata';

test.use({ appPath: '/lab/workspaces/favorites-breadcrumb' });

test('should show the breadcrumb favorite icon on first load in a folder', async ({
  page,
  tmpPath
}) => {
  await expect(page.getByText(`/${tmpPath}/`)).toBeVisible();
  await expect(
    page.locator('.jp-Favorites-pinner').getByRole('button', {
      name: 'Add Favorite'
    })
  ).toBeVisible();
});
