"""Explicit configuration gates. Importing this module never performs I/O remotely."""
import json
from pathlib import Path

DEFAULT = Path(__file__).with_name('config.example.json')


def load(path=DEFAULT):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def require(config, feature):
    if config.get(feature, {}).get('enabled') is not True:
        raise PermissionError(f'{feature} disabled / desactivado')


def readiness(config):
    """Report switches, never values of environment credentials."""
    return {name: config.get(name, {}).get('enabled') is True
            for name in ('api', 'terminology', 'ai', 'bulk', 'storage', 'research')}
