import copy
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch
from optional.settings import load, readiness
from optional.ai.providers import build_request, complete
from optional.ai.grounding import validate_selection
from optional.terminology.fhir import build_request as terminology_request
from optional.bulk.plan import plan
from research.common.prepare import training_plan


class DisabledByDefaultTests(unittest.TestCase):
    def setUp(self):
        self.config = load()

    def test_every_feature_off_and_no_network(self):
        self.assertFalse(any(readiness(self.config).values()))
        with patch('urllib.request.urlopen') as network:
            with self.assertRaises(PermissionError):
                complete(self.config, 'Synthetic prompt')
            network.assert_not_called()
        with self.assertRaises(PermissionError):
            terminology_request(self.config, 'cough')
        with self.assertRaises(PermissionError):
            plan(self.config, ['Cough'])

    def test_ai_requires_both_gates_model_and_credentials(self):
        config = copy.deepcopy(self.config)
        config['ai'].update(enabled=True, model='operator-selected-model', provider='openai')
        with self.assertRaises(PermissionError):
            build_request(config, 'test')
        config['ai']['allow_paid_requests'] = True
        for provider, variable, host in [('openai','OPENAI_API_KEY','api.openai.com'),
                                          ('anthropic','ANTHROPIC_API_KEY','api.anthropic.com')]:
            config['ai']['provider'] = provider
            with patch.dict(os.environ, {variable: 'synthetic-test-key'}):
                request = build_request(config, 'synthetic-only')
                self.assertIn(host, request.full_url)
                self.assertIn('operator-selected-model', request.data.decode())

    def test_terminology_edition_host_and_license(self):
        config = copy.deepcopy(self.config)
        config['terminology']['enabled'] = True
        with self.assertRaises(PermissionError):
            terminology_request(config, 'tos')
        config['terminology'].update(license_verified=True, fhir_base_url='https://terminology.example.org/fhir',
                                     allowed_host='terminology.example.org', value_set_url='urn:example:icd10:2019')
        request = terminology_request(config, 'cough & fever')
        self.assertIn('filter=cough+%26+fever', request.full_url)
        config['terminology']['allowed_host'] = 'other.example.org'
        with self.assertRaises(ValueError):
            terminology_request(config, 'cough')

    def test_bounded_dry_run_and_grounding(self):
        self.config['bulk'].update(enabled=True, max_items=2)
        self.assertFalse(plan(self.config, ['a','b'])['submitted'])
        with self.assertRaises(ValueError):
            plan(self.config, ['a','b','c'])
        with self.assertRaises(ValueError):
            validate_selection({'selected_ids':['invented']}, [{'id':'R05'}])
        self.assertTrue(validate_selection({'selected_ids':['R05']}, [{'id':'R05'}])['needs_review'])

    def test_research_review_pending(self):
        root = Path(__file__).resolve().parents[2]
        with self.assertRaises(PermissionError):
            training_plan(root / 'research/common/rights-review.example.json', 'snomed')
        self.assertFalse(load()['research']['enabled'])


if __name__ == '__main__':
    unittest.main()
