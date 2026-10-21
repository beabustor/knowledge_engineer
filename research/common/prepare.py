"""Offline manifest gate only; deliberately not a scraper or training runner."""
from pathlib import Path
import json


def training_plan(review_path, source):
    review = json.loads(Path(review_path).read_text(encoding='utf-8'))
    needed = ('download', 'extract', 'store', 'text_and_data_mining', 'train')
    if review.get('status') != 'approved' or review.get('source') != source:
        raise PermissionError('Source-specific rights review is missing or pending')
    if not review.get('reviewer') or not review.get('license_document_reference'):
        raise PermissionError('Documented reviewer and license reference required')
    if any(review.get('permissions', {}).get(p) is not True for p in needed):
        raise PermissionError('Required permissions not recorded')
    return {'source': source, 'mode': 'plan_only', 'training_started': False,
            'external_upload_allowed': review['permissions'].get('send_to_external_model') is True,
            'dataset_publication_allowed': review['permissions'].get('publish_dataset') is True,
            'weights_publication_allowed': review['permissions'].get('publish_weights') is True}
