"""Run after building and serving web/dist. Browser tests / Pruebas de navegador."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import threading
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


@contextmanager
def demo_server():
    if os.environ.get('DEMO_URL'):
        yield os.environ['DEMO_URL']
        return
    directory = Path(__file__).parent / 'dist'
    if not (directory / 'index.html').is_file():
        raise RuntimeError('Build first / Compilar primero: npm run build --prefix web')
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(directory)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_port}'
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def main():
    with demo_server() as url, sync_playwright() as p:
        options = {'headless': True}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**options)
        context = browser.new_context(locale='es-ES')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        try:
            page.goto(url)
            expect(page.locator('html')).to_have_attribute('lang', 'es')
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
            page.get_by_role('button', name='An ambiguous word', exact=True).click()
            expect(page.locator('#ambiguity')).to_contain_text('Cold weather')
            expect(page.locator('#count')).to_have_text('0')
            page.locator('#description').fill('<img src=x onerror=alert(1)> unknown')
            page.get_by_role('button', name='Analyze description →').click()
            expect(page.locator('#count')).to_have_text('0')
            assert page.locator('#results img').count() == 0
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('#language').select_option('es')
            page.get_by_role('button', name='Negación y sinónimos', exact=True).click()
            expect(page.locator('.candidate').first).to_contain_text('Migraña de ejemplo')
            page.get_by_role('button', name='Entidad química', exact=True).click()
            expect(page.locator('.concept-detail')).to_contain_text('CHEBI:15365')
            page.get_by_role('tab', name='OWL / RDF/XML', exact=True).click()
            expect(page.locator('#representation-panel code')).to_contain_text('rdf:Description')
            page.get_by_role('tab', name='Protégé', exact=True).click()
            expect(page.locator('.ontology-tree')).to_contain_text('Atributo')
            page.get_by_role('tab', name='SQL', exact=True).click()
            expect(page.locator('#representation-panel code')).to_contain_text('C9H8O4')
            page.get_by_role('tab', name='Neo4j / Cypher', exact=True).click()
            expect(page.locator('#representation-panel code')).to_contain_text('IS_A')
            page.get_by_role('tab', name='RDF / Turtle', exact=True).click()
            expect(page.locator('#representation-panel code')).to_contain_text('rdfs:seeAlso')
            page.locator('#description').fill('sin tos, tomo aspirina')
            page.get_by_role('button', name='Analizar descripción →').click()
            expect(page.locator('.concept-match').filter(has_text='R05')).to_contain_text('Mención negada')
            page.locator('#catalog-domain').select_option('chemical')
            expect(page.locator('.concept-match')).to_have_count(1)
            page.locator('#catalog-domain').select_option('all')
            page.locator('#catalog-domain').select_option('modeling')
            page.locator('#concept-explorer .examples button').filter(has_text='Medición de ejemplo').click()
            page.get_by_role('tab', name='Grafo del concepto', exact=True).click()
            expect(page.locator('.semantic-graph')).to_contain_text('38.5')
            expect(page.locator('.semantic-graph')).to_contain_text('Realizada por')
            page.get_by_role('tab', name='Protégé', exact=True).click()
            expect(page.locator('.ontology-inspector')).to_contain_text('Profesional de ejemplo')
            page.get_by_role('tab', name='OWL / RDF/XML', exact=True).click()
            expect(page.locator('#representation-panel code')).to_contain_text('NamedIndividual')
            page.get_by_role('tab', name='SQL', exact=True).click()
            expect(page.locator('#representation-panel code')).to_contain_text('38.5')
            page.get_by_role('tab', name='Hoja de previsualización', exact=True).click()
            expect(page.locator('.preview-sheet')).to_contain_text('38.5')
            with page.expect_download() as download:
                page.locator('#representation-download').click()
            assert '38.5' in Path(download.value.path()).read_text()
            expect(page.locator('#description')).to_have_attribute('maxlength','1000')
            page.locator('#catalog-domain').select_option('all')
            page.locator('#description').fill('tengo fiebre de 38 grados y me encuentro sin fuerzas')
            expect(page.locator('#query-counter')).to_contain_text('/ 1000')
            expect(page.locator('.concept-match').filter(has_text='R53')).to_contain_text('Término mencionado')
            expect(page.locator('#observation-TextTemperature0')).to_contain_text('38')
            page.locator('#observation-TextTemperature0').click()
            expect(page.locator('.preview-sheet')).to_contain_text('reportedValue')
            expect(page.locator('.preview-sheet')).to_contain_text('unspecified')
            page.locator('#description').fill('x'*1001)
            page.get_by_role('button',name='Analizar descripción →').click()
            assert page.locator('#description').evaluate('(el)=>el.value.length<=1000 || !el.checkValidity()')
            page.locator('#description').fill('sin fiebre, con debilidad')
            page.locator('#catalog-domain').select_option('all')
            page.get_by_role('button',name='Analizar descripción →').click()
            expect(page.locator('.concept-match').filter(has_text='R50.9')).to_contain_text('Mención negada')
            for language in ('en', 'es'):
                page.locator('#language').select_option(language)
                for width in (320, 360, 390, 414, 768, 1280):
                    page.set_viewport_size({'width': width, 'height': 844})
                    dimensions = page.evaluate("""() => ({
                        viewport: innerWidth, scroll: document.documentElement.scrollWidth,
                        overflowing: [...document.querySelectorAll('body *')]
                            .filter(el => el.getBoundingClientRect().right > innerWidth + 1)
                            .map(el => el.tagName + '.' + el.className)
                    })""")
                    assert dimensions['scroll'] <= width, (language, dimensions)
            assert not errors, errors
        except Exception:
            artifacts = Path(__file__).parent / 'test-results'
            artifacts.mkdir(exist_ok=True)
            page.screenshot(path=str(artifacts / 'failure.png'), full_page=True)
            context.tracing.stop(path=str(artifacts / 'trace.zip'))
            print('Browser URL:', page.url)
            print('Browser errors:', errors)
            raise
        else:
            context.tracing.stop()
        finally:
            browser.close()
        print('Browser: bilingual analysis, negation, graph, ambiguity, on-screen representations, modeling, stale-state reset and mobile layout passed')


if __name__ == '__main__':
    main()
