"""Offline bounded job planner. It never submits jobs or executes API requests."""
from optional.settings import require


def plan(config, identifiers):
    require(config, 'bulk')
    max_items = config['bulk'].get('max_items', 100)
    concurrency = config['bulk'].get('concurrency', 1)
    if type(max_items) is not int or not 1 <= max_items <= 10000:
        raise ValueError('max_items must be 1–10000')
    if type(concurrency) is not int or not 1 <= concurrency <= 8:
        raise ValueError('concurrency must be 1–8')
    if len(identifiers) > max_items:
        raise ValueError('Job exceeds configured item limit')
    return {'dry_run': True, 'items': list(dict.fromkeys(identifiers)), 'concurrency': concurrency,
            'submitted': False, 'estimated_cost': 'unknown; requires provider-specific pricing'}
