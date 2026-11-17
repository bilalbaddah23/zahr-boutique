from pathlib import Path
from html.parser import HTMLParser
import json,urllib.request,urllib.error,urllib.parse,http.cookiejar,re,gzip,sys
ROOT=Path(sys.argv[1]);BASE=sys.argv[2];OUT=ROOT/'qa';OUT.mkdir(exist_ok=True)
settings=json.loads((ROOT/'src/Content/catalog.json').read_text(encoding='utf-8-sig'))
manufacturer='Start a clothing brand' in settings.get('services',[])
shop='/portfolio' if manufacturer else '/shop';detail='/production/' if manufacturer else '/product/'
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(jar))
class Page(HTMLParser):
 def __init__(self):super().__init__();self.assets=set();self.links=set();self.h1=0;self.ids=[];self.visible=[];self.slot=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='h1':self.h1+=1
  if tag in ['img','script'] and a.get('src'):self.assets.add(a['src'])
  if tag=='link' and a.get('href'):self.assets.add(a['href'])
  if tag=='a' and a.get('href'):self.links.add(a['href'])
  if a.get('id'):self.ids.append(a['id'])
  if tag=='div' and 'product-slot' in a.get('class','').split():self.slot='hidden' not in a
  if tag=='article' and a.get('data-product') and self.slot:self.visible.append(a['data-product'])
def get(path,headers=None):
 try:
  with client.open(urllib.request.Request(BASE+path,headers=headers or {}),timeout=20) as r:return r.status,r.read(),r.headers
 except urllib.error.HTTPError as e:return e.code,e.read(),e.headers
checks=[];assets=set();links=set();catalog=json.loads(get('/api/catalog')[1]);assert len(catalog)==len(settings['products'])
routes=['/',shop,'/saved','/our-world','/contact','/privacy','/lookbook']+(['/request-quote'] if manufacturer else ['/style-guide','/bag','/checkout'])+[detail+p['id'] for p in catalog]
for path in routes:
 status,body,headers=get(path);assert status==200,(path,status,body[:100]);doc=Page();doc.feed(body.decode());assert doc.h1==1,(path,doc.h1)
 assert len(set(doc.ids))==len(doc.ids),(path,'duplicate IDs');assert headers['X-Robots-Tag']=='noindex, nofollow';assert "frame-ancestors 'none'" in headers['Content-Security-Policy']
 assert not any(x in body for x in [b'Lolita',b'Essenza',b'LYS',b'__TITLE__',b'__NAME__']),path
 if settings.get('contactMode')=='instagram':assert not any('wa.me' in x for x in doc.links),(path,'unverified WhatsApp link')
 assets.update(x for x in doc.assets if x.startswith('/'));links.update(x.split('#')[0] for x in doc.links if x.startswith('/') and not x.startswith('//'))
checks.append('All page/example routes: HTTP200, one H1, unique IDs, security/noindex headers and correct brand')
for path in sorted(assets|links):assert get(path)[0]==200,path
for f in (ROOT/'src/wwwroot/images').iterdir():assert get('/images/'+f.name)[0]==200,f.name
checks.append('All internal links, scripts/styles/fonts and image assets return200')
p=next((x for x in catalog if x['id']=='brown-handbag-detail'),catalog[0]);cat=p['collection'];q=' '.join(reversed(p['name'].split()))
for query,expected in [({'q':q},{p['id']}),({'collection':cat},{x['id'] for x in catalog if x['collection']==cat}),({'q':'zzznothing'},set())]:
 status,body,_=get(shop+'?'+urllib.parse.urlencode(query));doc=Page();doc.feed(body.decode());assert set(doc.visible)==expected,(query,doc.visible,expected)
assert b'<script>alert(1)</script>' not in get(shop+'?q='+urllib.parse.quote('<script>alert(1)</script>'))[1]
checks.append('Server search/reversed terms, category filter, empty state and HTML encoding')
private=[detail+'not-real','/not-real','/Content/catalog.json','/App_Data/keys/private.xml','/research/research.json','/.git/config']+(['/bag','/checkout','/shop','/api/order-draft'] if manufacturer else [])
for path in private:
 status,body,_=get(path);assert status==404,(path,status);assert b'StackTrace' not in body
_,body,headers=get('/',{'Accept-Encoding':'gzip'});assert headers.get('Content-Encoding')=='gzip';assert b'<html' in gzip.decompress(body)
assert 'immutable' in get('/css/site.css?v=check')[2]['Cache-Control'];assert json.loads(get('/health')[1])['status']=='ok'
checks.append('Unknown/private paths404, retail routes absent on manufacturer, health, gzip and versioned asset caching')
_,body,_=get('/request-quote' if manufacturer else '/checkout');token=re.search(r'name="csrf-token" content="([^"]+)"',body.decode())[1];postcount=0
def post(payload,csrf=token,kind='application/json'):
 global postcount
 postcount+=1;data=payload if isinstance(payload,bytes) else json.dumps(payload).encode();endpoint='/api/project-draft' if manufacturer else '/api/order-draft'
 req=urllib.request.Request(BASE+endpoint,data=data,headers={'Content-Type':kind,'X-CSRF-TOKEN':csrf},method='POST')
 try:
  with client.open(req,timeout=20) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  b=e.read()
  try:return e.code,json.loads(b)
  except:return e.code,b.decode(errors='replace')
if manufacturer:
 payload=dict(name='Website Test',phone='+96170000000',city='Beirut',service=settings['services'][0],reference=p['id'],quantity=250,notes='Test only; not sent')
 invalid=[{'name':''},{'name':'Test\nInjected'},{'phone':'abc'},{'city':''},{'service':'fake'},{'reference':'fake'},{'quantity':0},{'quantity':1000001},{'notes':'a'*1001}]
else:
 line=dict(id=p['id'],size=p['sizes'][0],quantity=1);payload=dict(name='Website Test',phone='+96170000000',city='Beirut',items=[line],address='',notes='')
 invalid=[{'name':''},{'phone':'abc'},{'city':''},{'items':[]},{'items':[None]},{'items':[{**line,'id':'fake'}]},{'items':[{**line,'quantity':11}]},{'items':[{**line,'size':'fake'}]},{'items':[{**line,'quantity':10}]*2}]
status,result=post(payload);assert status==200,(status,result)
assert urllib.parse.urlsplit(result['url']).path=='/'+settings['phone'] if settings.get('contactMode')=='whatsapp' else result['url']==settings['instagram']
assert settings['brand'] in result['message'] and '$0.00' not in result['message'];assert post({**payload,'price':.01,'total':.01})[1]['message']==result['message']
if manufacturer:
 assert 'not a confirmed production order' in result['message'] and '250' in result['message'];assert post({**payload,'quantity':None,'reference':''})[0]==200
for change in invalid:assert post({**payload,**change})[0]==400,change
assert post(payload,csrf='bad')[0]==400;assert post(b'{bad')[0]==400;assert post(payload,kind='text/plain')[0]==415;assert post(None)[0]==400
checks.append('Correct contact and brand; draft only, no false order; server validation rejects tampering, bad inputs, missing CSRF, malformed JSON/null and wrong content type')
while postcount<21:status,_=post(payload)
assert status==429,status;checks.append('Per-IP enquiry rate limit429')
report=dict(result='PASS',brand=settings['brand'],businessFlow='manufacturing-project-enquiry' if manufacturer else 'retail-collection-enquiry',checks=checks,routes=routes,products=len(catalog),internalAssetsAndLinks=len(assets|links),images=len(list((ROOT/'src/wwwroot/images').iterdir())),scope='Local compiled ASP.NET10 release. No messages sent, orders placed, payments or VPS load test.')
(OUT/'http-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report),flush=True)
