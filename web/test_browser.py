"""Run after building and serving web/dist. Browser tests / Pruebas de navegador."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def main():
    with sync_playwright() as p:
        options = {'headless': True}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**options)
        context = browser.new_context(locale='es-ES', accept_downloads=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(os.environ.get('DEMO_URL', 'http://127.0.0.1:4173'))
        expect(page.locator('html')).to_have_attribute('lang', 'es')
        expect(page.locator('#json-download')).to_be_disabled()
        page.get_by_role('button', name='Síntomas respiratorios', exact=True).click()
        expect(page.locator('.candidate').first).to_contain_text('Resfriado de ejemplo')
        expect(page.locator('.candidate').first).to_contain_text('3 puntos')
        expect(page.locator('.graph-node.positive')).to_have_count(3)
        page.locator('.candidate-heading').nth(1).click()
        expect(page.locator('.candidate-heading').nth(1)).to_have_attribute('aria-pressed', 'true')
        page.locator('#language').select_option('en')
        expect(page.locator('html')).to_have_attribute('lang', 'en')
        expect(page.locator('.candidate').first).to_contain_text('Example common cold')
        expect(page.locator('#description')).to_have_value('Tengo fiebre, tos y dolor de garganta')
        page.get_by_role('button', name='Negation & synonyms', exact=True).click()
        expect(page.locator('.candidate').first).to_contain_text('Example migraine')
        expect(page.locator('.candidate').nth(1).locator('.conflicts')).to_contain_text('Fever')
        with page.expect_download() as download:
            page.locator('#json-download').click()
        data = json.loads(Path(download.value.path()).read_text())
        assert data['candidates'][0]['id'] == 'ExampleMigraine'
        for selector, content in [('#rdf-download', 'owl:Ontology'), ('#cypher-download', 'KnowledgeDemo')]:
            with page.expect_download() as download:
                page.locator(selector).click()
            assert content in Path(download.value.path()).read_text()
        page.get_by_role('button', name='An ambiguous word', exact=True).click()
        expect(page.locator('#ambiguity')).to_contain_text('Cold weather')
        expect(page.locator('#count')).to_have_text('0')
        page.locator('#description').fill('<img src=x onerror=alert(1)> unknown')
        expect(page.locator('#json-download')).to_be_disabled()
        page.get_by_role('button', name='Analyze description →').click()
        expect(page.locator('#count')).to_have_text('0')
        assert page.locator('#results img').count() == 0
        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.locator('#language').select_option('es')
        page.get_by_role('button', name='Negación y sinónimos', exact=True).click()
        expect(page.locator('.candidate').first).to_contain_text('Migraña de ejemplo')
        assert not errors, errors
        browser.close()
        print('Browser: bilingual analysis, negation, graph, ambiguity, downloads, stale-state reset and mobile layout passed')


if __name__ == '__main__':
    main()
