# jupyterlab-favorites

[![Extension status](https://img.shields.io/badge/status-ready-success 'ready to be used')](https://jupyterlab-contrib.github.io/)
[![Github Actions Status](https://github.com/jupyterlab-contrib/jupyterlab-favorites/workflows/Build/badge.svg)](https://github.com/jupyterlab-contrib/jupyterlab-favorites/actions?query=workflow%3ABuild)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupyterlab-contrib/jupyterlab-favorites/main?urlpath=lab)
[![npm](https://img.shields.io/npm/v/@jlab-enhanced/favorites)](https://www.npmjs.com/package/@jlab-enhanced/favorites)
[![PyPI](https://img.shields.io/pypi/v/jupyterlab-favorites)](https://pypi.org/project/jupyterlab-favorites)
[![conda-forge](https://img.shields.io/conda/vn/conda-forge/jupyterlab-favorites)](https://anaconda.org/conda-forge/jupyterlab-favorites)

Add the ability to save favorite folders to JupyterLab for quicker browsing.

![JupyterLab Favorites extension demonstration](https://raw.githubusercontent.com/jupyterlab-contrib/jupyterlab-favorites/main/jupyterlab-favorites.gif)

## Requirements

- JupyterLab >= 4.0.0 or Notebook >= 7.0.0

> For JupyterLab 3, you can install jupyterlab-favorites 3.1.x using pip for example:

```sh
pip install "jupyterlab-favorites~=3.1.1"
```

## Install

To install the extension, execute:

```bash
pip install jupyterlab_favorites
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyterlab_favorites
```

## History

This extension was orginally developed by [National Energy Research Scientific Computing Center](https://github.com/NERSC/).

The original (archived) repository can be found here: [NERSC/jupyterlab-favorites](https://github.com/NERSC/jupyterlab-favorites).

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab_favorites directory
# Install package in development mode
pip install -e "."
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
pip uninstall jupyterlab_favorites
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `@jlab-enhanced/favorites` within that folder.

### Packaging the extension

See [RELEASE](RELEASE.md)
