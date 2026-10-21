"""Opt-in real UI→OLS→graph acceptance, separate from fixture-based CI tests."""
from datetime import datetime,timezone
import json
import os
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'web'))
from test_browser import demo_server,open_details
from playwright.sync_api import sync_playwright,expect


def main():
    report={'observed_at_utc':datetime.now(timezone.utc).isoformat(),'source':'OLS',
            'mode':'real browser fetch, CORS and graph update; no fixtures','status':'failed'}
    try:
        with demo_server() as url,sync_playwright() as p:
            options={'headless':True}
            if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
            proxy=os.environ.get('HTTPS_PROXY')
            if proxy:options['proxy']={'server':proxy,'bypass':'127.0.0.1,localhost'}
            browser=p.chromium.launch(**options)
            try:
                page=browser.new_page(locale='en-US')
                failures=[]
                page.on('requestfailed',lambda r:failures.append(r.failure))
                report['browser_request_failures']=failures
                page.goto(url)
                page.locator('#description').fill('cough')
                expect(page.locator('.concept-detail')).to_contain_text('R05')
                open_details(page,'.advanced-controls')
                page.locator('#lookup-source').select_option('ols')
                page.locator('#lookup-term').fill('cough')
                page.get_by_role('button',name='Look up and add graph candidates',exact=True).click()
                expect(page.get_by_role('button',name='Look up and add graph candidates',exact=True)).to_be_enabled(timeout=15000)
                if not page.locator('.annotation-candidate').count():
                    raise AssertionError('No live candidates; browser network failures: '+repr(failures))
                expect(page.locator('#primary-graph')).to_contain_text('candidateMatch?',timeout=5000)
                results=page.locator('.annotation-candidate > button').all_text_contents()
                assert results,'No real terminology candidates rendered'
                report.update(status='passed',rendered_candidates=results[:5],tls_verification='enabled')
            finally:browser.close()
    except Exception as error:
        report['error_type']=type(error).__name__;report['error']=str(error)[:400]
    path=Path(__file__).with_name('browser-live-report.json');path.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    if report['status']!='passed':raise SystemExit(1)


if __name__=='__main__':main()
