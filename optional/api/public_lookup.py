"""Bounded public-source proxy. No raw IP/query logging; single-process limits."""
from collections import OrderedDict
import hashlib
import json
import secrets
import threading
import time
from urllib.parse import urlencode
from urllib.request import urlopen

PER_MINUTE, PER_DAY, GLOBAL_MINUTE, GLOBAL_DAY = 6, 30, 60, 500


class LimitReached(Exception):
    pass


class PublicLookup:
    def __init__(self, fetch=None, clock=time.time):
        self.clock = clock
        self.fetch = fetch or self._fetch
        self.salt = secrets.token_bytes(32)
        self.clients = {}
        self.global_times = []
        self.cache = OrderedDict()
        self.lock = threading.Lock()
        self.slots = threading.BoundedSemaphore(2)

    @staticmethod
    def _fetch(url):
        with urlopen(url, timeout=10) as response:
            raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Source response too large')
        return json.loads(raw)

    def search(self, ip, source, term):
        if source not in ('ols', 'cima') or not 2 <= len(term.strip()) <= 80:
            raise ValueError('Use source ols/cima and a term of 2–80 characters')
        term = term.strip()
        client = hashlib.blake2b(ip.encode(), key=self.salt, digest_size=16).hexdigest()
        now = self.clock()
        with self.lock:
            self.clients = {k: [t for t in ts if t > now - 86400]
                            for k, ts in self.clients.items() if ts and ts[-1] > now - 86400}
            times = self.clients.get(client, [])
            if (client not in self.clients and len(self.clients) >= 1000) or len(times) >= PER_DAY or sum(t > now-60 for t in times) >= PER_MINUTE:
                raise LimitReached('IP quota exceeded: 6/minute, 30/24h')
            self.clients[client] = times + [now]
            key = (source, term.casefold())
            if key in self.cache and now - self.cache[key][0] < 86400:
                self.cache.move_to_end(key)
                return self.cache[key][1]
            self.global_times = [t for t in self.global_times if t > now - 86400]
            if len(self.global_times) >= GLOBAL_DAY or sum(t > now-60 for t in self.global_times) >= GLOBAL_MINUTE:
                raise LimitReached('Global upstream quota exceeded')
            self.global_times.append(now)
        if not self.slots.acquire(blocking=False):
            raise LimitReached('Two upstream requests already in flight')
        try:
            url = ('https://www.ebi.ac.uk/ols4/api/search?' + urlencode({'q': term, 'rows': 5})
                   if source == 'ols' else 'https://cima.aemps.es/cima/rest/medicamentos?' + urlencode({'nombre': term}))
            result = self.fetch(url)
            with self.lock:
                self.cache[key] = (now, result)
                while len(self.cache) > 128:
                    self.cache.popitem(last=False)
            return result
        finally:
            self.slots.release()
