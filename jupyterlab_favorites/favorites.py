import os
import json
from pathlib import Path

from notebook.base.handlers import IPythonHandler
from jupyterlab.commands import get_user_settings_dir

class FavoritesHandler(IPythonHandler):
    def get(self):
        """
        Get default favorites and user favorites that are still valid on disk."
        """
        user_settings_dir = get_user_settings_dir()
        favorites_settings_dir = Path(user_settings_dir)/'jupyterlab-favorites'
        favorites_settings_file = favorites_settings_dir/'favorites.jupyterlab-settings'
        response = {
            'default': [],
        }
        # Parse saved user favorites into what's valid and what's invalid
        try:
            with open(favorites_settings_file, 'r') as f:
                contents = f.read()
                for favorites_data in json.loads(contents).get('favorites', []):
                    path = favorites_data['path']
                    try:
                        file = favorites_settings_file.resolve(strict=True)
                        if file:
                            if 'valid' not in response:
                                response['valid'] = []
                            response['valid'].append(favorites_data)
                    except FileNotFoundError:
                        if 'invalid' not in response:
                            response['invalid'] = []
                        response['invalid'].append(favorites_data)
        except:
            pass
        # Write defaults
        try:
            home_dir = os.environ['HOME']
            home_dir = Path(home_dir).resolve(strict=True)
            response['default'].append({
                'title': 'Home',
                'iconClass': 'jp-HomeIcon',
                'path': str(home_dir),
            })
        except:
            pass
        try:
            scratch_dir = os.environ['SCRATCH']
            scratch_dir = Path(scratch_dir).resolve(strict=True)
            response['default'].append({
                'title': 'Scratch',
                'iconClass': 'jp-FolderIcon',
                'path': str(scratch_dir),
            })
        except:
            pass

        self.write(json.dumps(response))
