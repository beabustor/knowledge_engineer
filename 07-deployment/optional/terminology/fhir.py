"""Optional FHIR ValueSet/$expand adapter for an authorized ICD-10 terminology server.
This is NOT a guessed WHO ICD-10 API endpoint and does not use ICD-11 as ICD-10.
"""
import json
import os
from urllib.parse import urlparse, urlencode
from urllib.request import Request, urlopen
from optional.settings import require


def build_request(config, term):
    require(config, 'terminology')
    settings = config['terminology']
    if settings.get('license_verified') is not True:
        raise PermissionError('Verify edition, API access and reuse rights first')
    base = settings.get('fhir_base_url', '')
    parsed = urlparse(base)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.hostname != settings.get('allowed_host') or parsed.query or parsed.fragment):
        raise ValueError('Explicit authorized HTTPS FHIR host required')
    if not settings.get('value_set_url') or not settings.get('edition'):
        raise ValueError('An authorized edition-specific ValueSet URL is required')
    if not term.strip() or len(term) > 200:
        raise ValueError('Term must contain 1–200 characters')
    query = urlencode({'url': settings['value_set_url'], 'filter': term, 'count': 20})
    headers = {'Accept': 'application/fhir+json'}
    token = os.environ.get('TERMINOLOGY_ACCESS_TOKEN')
    if token:
        headers['Authorization'] = 'Bearer ' + token
    return Request(base.rstrip('/') + '/ValueSet/$expand?' + query, headers=headers)


def search(config, term):
    # Server-side integration only; errors never fall back to a paid AI provider.
    with urlopen(build_request(config, term), timeout=20) as response:
        data = json.loads(response.read(1024 * 1024))
    if data.get('resourceType') != 'ValueSet':
        raise ValueError('Expected FHIR ValueSet; verify server capabilities')
    return data
