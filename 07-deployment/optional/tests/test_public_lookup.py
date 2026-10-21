import unittest
from optional.api.public_lookup import PublicLookup, LimitReached


class PublicLookupTests(unittest.TestCase):
    def test_ip_limit_cache_and_no_raw_ip_storage(self):
        calls = []
        service = PublicLookup(fetch=lambda url: calls.append(url) or {'response': {'docs': []}}, clock=lambda: 100000)
        for _ in range(6):
            service.search('192.0.2.1', 'ols', 'cough')
        self.assertEqual(len(calls), 1)
        with self.assertRaises(LimitReached):
            service.search('192.0.2.1', 'ols', 'cough')
        service.search('192.0.2.2', 'ols', 'cough')
        self.assertNotIn('192.0.2.1', repr(service.clients))

    def test_day_window_global_limit_and_source_validation(self):
        now = [100000]
        service = PublicLookup(fetch=lambda _: {}, clock=lambda: now[0])
        for i in range(30):
            service.search('192.0.2.1', 'ols', str(i)+'cough')
            now[0] += 61
        with self.assertRaises(LimitReached):
            service.search('192.0.2.1', 'cima', 'test')
        now[0] += 86401
        service.search('192.0.2.1', 'cima', 'test')
        with self.assertRaises(ValueError):
            service.search('192.0.2.1', 'arbitrary-url', 'test')
        service.global_times = [now[0]] * 60
        with self.assertRaises(LimitReached):
            service.search('192.0.2.3', 'ols', 'new-term')

    def test_all_connectors_keep_fixed_hosts_and_language_specific_cache(self):
        from urllib.parse import urlparse, parse_qs
        calls = []
        service = PublicLookup(fetch=lambda url: calls.append(url) or {}, clock=lambda: 100000)
        for source in ('chebi', 'hpo', 'wikidata', 'icd10'):
            service.search('192.0.2.1', source, 'water', 'es')
        self.assertEqual(parse_qs(urlparse(calls[0]).query)['ontology'], ['chebi'])
        self.assertEqual(parse_qs(urlparse(calls[1]).query)['ontology'], ['hp'])
        self.assertEqual(urlparse(calls[2]).hostname, 'www.wikidata.org')
        self.assertEqual(parse_qs(urlparse(calls[2]).query)['language'], ['es'])
        self.assertEqual(urlparse(calls[3]).hostname, 'clinicaltables.nlm.nih.gov')
        service.search('192.0.2.1', 'wikidata', 'water', 'en')
        self.assertEqual(len(calls), 5)
        with self.assertRaises(ValueError):
            service.search('192.0.2.2', 'wikidata', 'water', 'unsupported')
