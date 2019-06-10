import os
import json
from pathlib import Path

from notebook.base.handlers import IPythonHandler
from jupyterlab.commands import get_user_settings_dir

class FavoritesHandler(IPythonHandler):
    def get(self):
        """
        Get a list a favorites from data on disk.
        """
        user_settings_dir = get_user_settings_dir()
        favorites_settings_path = Path(user_settings_dir)/'jupyterlab-favorites'
        favorites = []
        try:
            favorites_settings_path = favorites_settings_path.resolve(strict=True)
        except FileNotFoundError:
            self.__write_default_favorites(favorites_settings_path)
        else:
            with open(favorites_settings_path, 'r') as f:
                contents = f.read()
                if not contents or not json.loads(contents):
                    favorites = self.__write_default_favorites(favorites_settings_path)
                else:
                    for favorites_data in json.loads(contents).get('favorites', []):
                        favorites.append(favorites_data)
        self.write(json.dumps({ 'favorites': favorites }))

    def __write_default_favorites(self, favorites_settings_path):
        """
        Establish default favorites if there are none otherwise.
        """
        favorites = []
        home_dir = os.getenv('HOME', '')
        if home_dir:
            favorites.append({
                'title': 'Home',
                'iconClass': 'jp-HomeIcon',
                'path': home_dir,
            })
        scratch_dir = os.getenv('SCRATCH', '')
        if scratch_dir:
            favorites.append({
                'title': 'Scratch',
                'iconClass': 'jp-FolderIcon',
                'path': scratch_dir,
            })
        with open(favorites_settings_path, 'w') as f:
            print('writing favorites: ', favorites)
            json.dump({ 'favorites': favorites }, f)
        return favorites
