"""Browser acceptance tests; external services are fixtures, not live validation."""
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
        raise RuntimeError('Build first: npm run build --prefix web')
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(directory)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_port}'
    finally:
        server.shutdown(); server.server_close(); thread.join()


def open_details(page, selector):
    if not page.locator(selector).evaluate('(el)=>el.open'):
        page.locator(selector+' > summary').click()


def main():
    with demo_server() as url, sync_playwright() as p:
        options={'headless':True}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**options)
        context=browser.new_context(locale='es-ES',accept_downloads=True)
        page=context.new_page()
        errors=[]; requests=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.on('request',lambda request: requests.append(request.url))
        context.tracing.start(screenshots=True,snapshots=True,sources=True)
        try:
            page.goto(url+'?view=annotation')
            open_details(page,'#text-workbench')
            expect(page.locator('#primary-graph')).to_contain_text('denotes')
            assert page.locator('#primary-graph').bounding_box()['y'] > page.locator('#description').bounding_box()['y']
            assert page.locator('.candidate').count()==0
            expect(page.locator('#description')).to_have_attribute('maxlength','100')
            page.locator('#description').fill('Sin fiebre, pero tengo tos')
            expect(page.locator('.concept-match')).to_have_count(2)
            expect(page.locator('.concept-match').filter(has_text='R50.9')).to_contain_text('Mención negada')
            expect(page.locator('#primary-graph .kind-negated')).to_have_count(1)
            expect(page.locator('#primary-graph')).to_contain_text('denotes')
            assert not any('.xls' in u for u in requests)
            open_details(page,'.interview-disclosure')
            page.get_by_role('button',name='Explorar con preguntas',exact=True).click()
            page.locator('[data-answer=no]').click()
            expect(page.locator('#primary-graph')).to_contain_text('answerState')
            page.locator('[data-answer=unknown]').click()
            expect(page.locator('.interview-answers')).to_contain_text('No sé')
            open_details(page,'.technical-views')
            page.get_by_role('tab',name='OWL / RDF/XML',exact=True).click()
            expect(page.locator('#representation-panel code')).to_contain_text('provenanceKind')
            page.locator('#language').select_option('en')
            expect(page.locator('#description')).to_have_value('Sin fiebre, pero tengo tos')
            expect(page.locator('.concept-match')).to_have_count(2)
            page.locator('#description').fill('Acetylsalicylic acid and water')
            expect(page.locator('.concept-match')).to_have_count(2)
            expect(page.locator('.concept-detail')).to_contain_text('CHEBI:15365')
            expect(page.locator('.interview-answers')).to_have_count(0)
            expect(page.locator('#primary-graph')).not_to_contain_text('answerState')
            open_details(page,'.technical-views')
            page.get_by_role('tab',name='SQL',exact=True).click()
            expect(page.locator('#representation-panel code')).to_contain_text('C9H8O4')
            page.get_by_role('tab',name='Protégé',exact=True).click()
            expect(page.locator('.ontology-tree')).to_contain_text('Attribute')
            page.locator('#description').fill('I am 35 years old and report 38.5 degrees Celsius')
            expect(page.locator('#observation-TextAge0')).to_contain_text('35')
            page.locator('#observation-TextAge0').click()
            open_details(page,'.technical-views')
            page.get_by_role('tab',name='Preview sheet',exact=True).click()
            expect(page.locator('.preview-sheet')).to_contain_text('reportedAgeValue')
            with page.expect_download() as download:
                page.locator('#representation-download').click()
            assert 'reportedAgeValue' in Path(download.value.path()).read_text()
            page.locator('#description').fill('x'*101)
            page.get_by_role('button',name='Analyze description →').click()
            assert page.locator('#description').evaluate('(el)=>el.value.length<=100 || !el.checkValidity()')
            page.locator('#description').fill('<img src=x onerror=alert(1)> unknown')
            expect(page.locator('.concept-match')).to_have_count(0)
            assert page.locator('#concept-explorer img').count()==0
            assert page.locator('.concept-detail').count()==0
            # Mocked source integration and exact browser request ceiling.
            page.locator('#lookup-source').select_option('ols')
            external=[]
            def source_fixture(route):
                external.append(route.request.url)
                route.fulfill(json={'response':{'docs':[{'label':'Cough','short_form':'HP:0012735','iri':'http://purl.obolibrary.org/obo/HP_0012735','ontology_name':'hp'}]}})
            page.route('https://www.ebi.ac.uk/ols4/api/search?*',source_fixture)
            page.locator('#description').fill('cough')
            expect(page.locator('.concept-detail')).to_contain_text('R05')
            open_details(page,'.advanced-controls')
            for i in range(6):
                page.locator('#lookup-term').fill('cough' if i==0 else 'term'+str(i))
                page.get_by_role('button',name='Look up and add graph candidates',exact=True).click()
                expect(page.get_by_role('button',name='Look up and add graph candidates',exact=True)).to_be_enabled()
            expect(page.locator('#primary-graph')).to_contain_text('candidateMatch?')
            # Source proposals are reviewable annotations, never equivalence assertions.
            candidate=page.locator('.annotation-candidate').first
            candidate.locator('[data-review=accepted]').click()
            expect(candidate).to_contain_text('Accepted by you')
            expect(page.locator('#primary-graph')).to_contain_text('reviewStatus')
            candidate.locator('[data-review=rejected]').click()
            expect(candidate).to_contain_text('Rejected by you')
            expect(page.locator('#primary-graph .kind-remote')).to_have_count(0)
            expect(page.locator('#primary-graph')).not_to_contain_text('candidateMatch?')
            candidate.locator('[data-review=pending]').click()

            page.locator('#lookup-term').fill('over-quota')
            page.get_by_role('button',name='Look up and add graph candidates',exact=True).click()
            expect(page.locator('#concept-explorer')).to_contain_text('Limit reached')
            assert len(external)==6
            for language in ('en','es'):
                page.locator('#language').select_option(language)
                for width in (320,360,390,414,768,1280):
                    page.set_viewport_size({'width':width,'height':844})
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(language,width)
            # Late source responses cannot repopulate a newer search.
            isolated=browser.new_context(locale='en-US');fresh=isolated.new_page();held=[]
            fresh.route('https://www.ebi.ac.uk/ols4/api/search?*',lambda route:held.append(route))
            fresh.goto(url+'?view=annotation');open_details(fresh,'#text-workbench');fresh.locator('#description').fill('cough')
            expect(fresh.locator('.concept-detail')).to_contain_text('R05')
            open_details(fresh,'.advanced-controls')
            fresh.locator('#lookup-source').select_option('ols')
            fresh.locator('#lookup-term').fill('cough')
            fresh.get_by_role('button',name='Look up and add graph candidates',exact=True).click()
            fresh.locator('#description').fill('fever')
            expect(fresh.locator('.concept-match')).to_have_count(1)
            expect(fresh.locator('.concept-detail')).to_contain_text('R50.9')
            expect(fresh.locator('#primary-graph')).not_to_contain_text('Cough')
            assert held
            held[0].fulfill(json={'response':{'docs':[{'label':'Cough','short_form':'HP:0012735','iri':'http://purl.obolibrary.org/obo/HP_0012735','ontology_name':'hp'}]}})
            fresh.wait_for_timeout(100)
            expect(fresh.locator('#primary-graph')).not_to_contain_text('HP:0012735')
            fresh.locator('#description').fill('')
            expect(fresh.locator('.concept-detail')).to_have_count(0)
            isolated.close()
            adapters=browser.new_context(locale='en-US');all_sources=adapters.new_page()
            adapters.route('https://www.wikidata.org/w/api.php?*',lambda route:route.fulfill(json={'search':[{'id':'Q283','label':'water','display':{'label':{'language':'en'}}}]}))
            adapters.route('https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?*',lambda route:route.fulfill(json=[1,['R50.9'],None,[['R50.9','Fever, unspecified']]]))
            adapters.route('https://cima.aemps.es/cima/rest/medicamentos?*',lambda route:route.fulfill(json={'resultados':[{'nombre':'PARACETAMOL','nregistro':'77758'}]}))
            adapters.route('https://www.ebi.ac.uk/ols4/api/search?*',lambda route:route.fulfill(json={'response':{'docs':[{'label':'Cough','obo_id':'HP:0012735','ontology_name':'hp','iri':'http://purl.obolibrary.org/obo/HP_0012735'} if 'ontology=hp' in route.request.url else {'label':'water','obo_id':'CHEBI:15377','ontology_name':'chebi','iri':'http://purl.obolibrary.org/obo/CHEBI_15377'}]}}))
            all_sources.goto(url+'?view=annotation');open_details(all_sources,'#text-workbench')
            for source,phrase,span,code in [('wikidata','water','water','Q283'),('chebi','water','water','CHEBI:15377'),('hpo','cough','cough','HP:0012735'),('icd10','fever','fever','R50.9'),('cima','paracetamol','paracetamol','77758')]:
                all_sources.locator('#description').fill(phrase)
                expect(all_sources.locator('#query-counter')).to_contain_text(str(len(phrase))+' /')
                all_sources.wait_for_timeout(400)
                all_sources.locator('#lookup-source').select_option(source)
                all_sources.locator('#annotation-span').fill(span)
                all_sources.locator('#lookup-term').fill(span)
                all_sources.get_by_role('button',name='Look up and add graph candidates',exact=True).click()
                expect(all_sources.get_by_role('button',name='Look up and add graph candidates',exact=True)).to_be_enabled()
                card=all_sources.locator('.annotation-candidate').filter(has_text=code).first
                card.locator('[data-review=accepted]').click()
                expect(card).to_contain_text('Accepted by you')
                expect(all_sources.locator('#primary-graph')).to_contain_text('reviewStatus')
                card.locator('button.linked-concept').click()
                all_sources.get_by_role('tab',name='RDF / Turtle',exact=True).click()
                expect(all_sources.locator('#representation-panel code')).to_contain_text('prov:wasDerivedFrom')
                expect(all_sources.locator('#representation-panel code')).to_contain_text('skos:prefLabel')
                expect(all_sources.locator('#representation-panel code')).to_contain_text('reviewStatus')
            adapters.close();assert not errors,errors
        except Exception:
            folder=Path(__file__).parent/'test-results';folder.mkdir(exist_ok=True)
            page.screenshot(path=str(folder/'failure.png'),full_page=True)
            context.tracing.stop(path=str(folder/'trace.zip'))
            raise
        else:
            context.tracing.stop()
        finally:
            browser.close()
        print('Browser acceptance: evidence, graph, provenance, code views, quotas, accessibility basics, mobile and reset passed')


if __name__=='__main__':
    main()
