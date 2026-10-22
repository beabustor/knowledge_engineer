"""Actual guided business journey: every visible action, wrong choices and scoped SQLite."""
import os,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'04-app'))
from test_browser import demo_server
from playwright.sync_api import sync_playwright,expect

def main():
 with demo_server() as url,sync_playwright() as p:
  options={'headless':True}
  if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
  browser=p.chromium.launch(**options)
  page=browser.new_page(viewport={'width':390,'height':844},locale='es-ES',is_mobile=True,has_touch=True)
  errors=[];network=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:network.append(r.url))
  try:
   for language in ('es','en'):
    page.goto(url);page.locator('#language').select_option(language)
    expect(page.locator('.case-progress [aria-current=step]')).to_contain_text('1')
    expect(page.locator('.case-flow')).to_contain_text('180')
    assert page.locator('#case-proof').count()==0
    page.locator('#case-next').tap()
    expect(page.locator('.case-progress [aria-current=step]')).to_contain_text('2')
    expect(page.locator('.case-node.broken')).to_have_count(2)
    # Back visibly restores the previous state instead of silently changing offscreen numbers.
    page.locator('#case-back').tap();expect(page.locator('.case-progress [aria-current=step]')).to_contain_text('1')
    page.locator('#case-next').tap();page.locator('#case-next').tap()
    expect(page.locator('.case-progress [aria-current=step]')).to_contain_text('3')
    page.locator('#case-next').tap()
    expect(page.locator('#case-feedback')).to_contain_text('categoría' if language=='es' else 'category')
    expect(page.locator('.case-progress [aria-current=step]')).to_contain_text('3')
    page.locator('#choice-nitrile-LatexGlove').tap()
    expect(page.locator('.choice-wrong')).to_be_visible()
    page.locator('#choice-latex-LatexGlove').tap();page.locator('#case-next').tap()
    expect(page.locator('.case-progress [aria-current=step]')).to_contain_text('3')
    page.locator('#choice-nitrile-NitrileGlove').tap()
    expect(page.locator('.choice-correct')).to_have_count(2)
    page.locator('#case-next').tap()
    expect(page.locator('.case-progress [aria-current=step]')).to_contain_text('4')
    expect(page.locator('#case-result .case-report-row')).to_have_count(2)
    expect(page.locator('#case-result')).to_contain_text('90')
    assert page.locator('#case-proof').evaluate('(el)=>!el.open')
    page.locator('#case-proof > summary').click()
    expect(page.locator('.case-source-list li')).to_have_count(6)
    expect(page.locator('.case-checks li')).to_have_count(3)
    page.locator('#case-run-sql').click()
    expect(page.locator('#case-sql-status')).to_contain_text('Verificado' if language=='es' else 'Verified',timeout=20000)
    expect(page.locator('.case-query-results li')).to_have_count(2)
    page.locator('#language').select_option('en' if language=='es' else 'es')
    expect(page.locator('#case-sql-status')).to_contain_text('Verified' if language=='es' else 'Verificado')
    page.locator('#language').select_option(language)
    for width in (320,360,390,414,768,1280):
     page.set_viewport_size({'width':width,'height':844})
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(language,width)
    page.set_viewport_size({'width':390,'height':844})
    # Every technical disclosure opens the actual same-case data/code.
    for detail in page.locator('#case-proof > details').all():
     detail.locator(':scope > summary').click()
     expect(detail.locator('pre')).to_be_visible()
     detail.locator(':scope > summary').click()
    page.locator('#case-back').tap()
    expect(page.locator('#choice-nitrile-NitrileGlove')).to_have_attribute('aria-pressed','true')
    page.locator('#case-next').tap();page.locator('#case-reset').tap()
    expect(page.locator('.case-progress [aria-current=step]')).to_contain_text('1')
    page.locator('#case-next').tap();page.locator('#case-next').tap()
    expect(page.locator('#choice-nitrile-NitrileGlove')).to_have_attribute('aria-pressed','false')
   assert not errors,errors
   # No external API is needed for the story, diagrams or SQL.
   assert all(u.startswith(url) or u.startswith('data:') for u in network),network
   print('Guided journey: all buttons, wrong/missing choices, back/reset, EN/ES, touch, mobile, SVG diagrams and actual 180-line SQLite query passed')
  except Exception:
   folder=Path('04-app/test-results');folder.mkdir(exist_ok=True)
   page.screenshot(path=str(folder/'guided-case-failure.png'),full_page=True)
   raise
  finally:browser.close()
if __name__=='__main__':main()
