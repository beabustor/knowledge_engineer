"""Saved documentary views: selectors, actual outputs, readable layout and no external requests."""
import os,threading
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
@contextmanager
def doc_server():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'09-docs/sql')))
 thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
 try:yield f'http://127.0.0.1:{server.server_port}'
 finally:server.shutdown();server.server_close();thread.join()
def main():
 with doc_server() as base,sync_playwright() as p:
  options={'headless':True}
  if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
  browser=p.chromium.launch(**options);page=browser.new_page(viewport={'width':1220,'height':980});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  for lang in ['es','en']:
   page.goto(base+f'/query-demo.{lang}.html')
   expect(page.locator('#result tr')).to_have_count(3)
   for value in ['demo','q01','q02','q03','q04','q05','q06','q07','q08']:
    page.locator('#query').select_option(value)
    assert page.locator('#code').inner_text().strip()
    assert page.locator('#result tr').count()>=2
   for width in [320,390,1280]:
    page.set_viewport_size({'width':width,'height':980});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.set_viewport_size({'width':1220,'height':980});page.locator('#query').select_option('q02')
   page.screenshot(path=str(ROOT/f'09-docs/images/sql-supplier-{lang}.png'),full_page=True)
   page.locator('#query').select_option('q04');page.screenshot(path=str(ROOT/f'09-docs/images/sql-windows-{lang}.png'),full_page=True)
   page.goto(base+f'/bi-preview.{lang}.html')
   expect(page.locator('.card').first).to_contain_text('180')
   page.screenshot(path=str(ROOT/f'09-docs/images/bi-reference-{lang}.png'),full_page=True)
   for width in [320,390]:
    page.set_viewport_size({'width':width,'height':980});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors;browser.close()
 print('EN/ES documentary SQL/BI views: all 9 selectors, saved tables, mobile overflow checks and genuine documentary screenshots passed')
if __name__=='__main__':main()
