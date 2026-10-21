"""Opt-in provider adapters; explicit calls only, no retries or automatic fallbacks."""
import json
import os
import urllib.request
from optional.settings import require


def build_request(config, prompt):
    require(config, 'ai')
    ai = config['ai']
    if ai.get('allow_paid_requests') is not True:
        raise PermissionError('Paid calls disabled / Llamadas de pago desactivadas')
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 12000:
        raise ValueError('Prompt must contain 1–12000 characters')
    model = ai.get('model', '')
    tokens = ai.get('max_output_tokens', 256)
    if not model or not isinstance(tokens, int) or isinstance(tokens, bool) or not 1 <= tokens <= 2048:
        raise ValueError('Explicit model and 1–2048 output tokens required')
    provider = ai.get('provider')
    if provider == 'openai':
        key = os.environ.get('OPENAI_API_KEY')
        url = 'https://api.openai.com/v1/responses'
        body = {'model': model, 'input': prompt, 'max_output_tokens': tokens}
        headers = {'Authorization': 'Bearer ' + (key or '')}
    elif provider == 'anthropic':
        key = os.environ.get('ANTHROPIC_API_KEY')
        url = 'https://api.anthropic.com/v1/messages'
        body = {'model': model, 'max_tokens': tokens, 'messages': [{'role': 'user', 'content': prompt}]}
        headers = {'x-api-key': key or '', 'anthropic-version': '2023-06-01'}
    else:
        raise ValueError('Supported adapters: openai, anthropic. Azure uses a separate future adapter.')
    if not key:
        raise PermissionError('Configure server-side API credentials; never send them to the browser')
    headers['Content-Type'] = 'application/json'
    return urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method='POST')


def complete(config, prompt):
    """One billable request when explicitly enabled. No clinical decision is authorized."""
    request = build_request(config, prompt)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read(1024 * 1024))
