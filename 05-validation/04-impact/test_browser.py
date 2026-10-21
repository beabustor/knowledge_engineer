"""Mobile, graph/data review, real bundled SQLite/WASM and validation acceptance."""
import os,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'04-app'))
from test_browser import demo_server
from playwright.sync_api import sync_playwright,expect

def main():
 with demo_server() as url,sync_playwright() as p:
  options={'headless':True}
  if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
  browser=p.chromium.launch(**options);page=browser.new_page(viewport={'width':390,'height':844},locale='es-ES');errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url)
  expect(page.locator('.impact-stat').nth(0)).to_contain_text('900')
  page.locator('#impact-technical > summary').click()
  invariant=page.locator('#impact-invariant').inner_text()
  page.locator('#impact-run-sql').click();expect(page.locator('#impact-sql-status')).to_contain_text('Coincide con el grafo',timeout=20000)
  page.locator('#impact-v1').click();expect(page.locator('.impact-stat').nth(0)).to_contain_text('0')
  page.locator('#impact-run-sql').click();expect(page.locator('#impact-sql-status')).to_contain_text('Coincide con el grafo',timeout=20000)
  page.locator('#impact-v2').click();page.locator('#change-ProtectiveGlove').click();page.locator('#impact-review-group').click()
  expect(page.locator('.impact-stat').nth(0)).to_contain_text('720')
  page.locator('#impact-review-all').click();expect(page.locator('.impact-stat').nth(0)).to_contain_text('0');expect(page.locator('.impact-stat').nth(2)).to_contain_text('180')
  assert page.locator('#impact-invariant').inner_text()==invariant
  page.locator('#impact-run-sql').click();expect(page.locator('#impact-sql-status')).to_contain_text('Coincide con el grafo',timeout=20000)
  page.locator('#impact-validate').click();expect(page.locator('.impact-validation-status')).to_contain_text('0 errores')
  page.locator('#impact-fault').click();page.locator('#impact-validate').click();expect(page.locator('.impact-error')).to_contain_text('Hierarchy cycle')
  expect(page.locator('#impact-run-sql')).to_be_disabled()
  page.locator('#impact-fault').click();page.locator('#impact-validate').click();expect(page.locator('.impact-validation-status')).to_contain_text('0 errores')
  for lang in ('en','es'):
   page.locator('#language').select_option(lang)
   for width in (320,360,390,414,768,1280):
    page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(lang,width)
  page.set_viewport_size({'width':390,'height':844});page.locator('#impact-v2').click();page.evaluate('window.scrollTo(0,0)')
  page.screenshot(path='/tmp/semantic-radar-mobile.png')
  assert not errors,errors;browser.close()
 print('Impact browser: all three SQLite states, evidence review, quarantine, cycle detection, bilingual mobile layout passed')
if __name__=='__main__':main()
