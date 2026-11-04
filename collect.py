import sys, json, re, urllib.request, concurrent.futures, datetime, pathlib, http.client
sys.path.insert(0, '/tmp/oaks-deps')
from bs4 import BeautifulSoup
ROOT=pathlib.Path(__file__).parent
names=['TCL Trophy','Sharp EIT Subzero','Chester Manifold Stakes','Inglis Bracelet','Sigma Trophy','Country Final','Crown Red Roses Stakes','Crown Oaks','Century Stakes']
times=['13:00','13:35','14:10','14:45','15:20','15:55','16:30','17:10','17:50']
def clean(s):
    return re.sub(r'\s*\((?:[A-Z]{2,3}|EM\d+)\)', '',s.upper()).strip()
def get(n):
    url=f'https://www.tabtouch.com.au/racing/2026-11-05/mr/{n}'
    if '--cached' in sys.argv:raw=(ROOT/'raw'/f'race{n}.html').read_text()
    else:
        for attempt in range(3):
            try:
                raw=urllib.request.urlopen(url,timeout=45).read().decode()
                break
            except (OSError,http.client.IncompleteRead):
                if attempt==2:raise
    (ROOT/'raw').mkdir(exist_ok=True)
    (ROOT/'raw'/f'race{n}.html').write_text(raw)
    model=json.JSONDecoder().raw_decode(raw.split('var model = ',1)[1])[0]
    soup=BeautifulSoup(raw,'html.parser')
    starters=model['pool']['legs'][0]['starters']
    horses=[]
    for h in starters:
        f=soup.select_one(f'#form-starter-{h["number"]}')
        hist=[]
        if f:
            for tr in f.select('tbody tr'):
                c=[x.get_text(' ',strip=True) for x in tr.find_all('td',recursive=False)]
                if len(c)<17 or not re.match(r'^\d+-\d+$',c[0]) or 'Trial' in c[5]:continue
                try:
                    pos,total=map(int,c[0].split('-'))
                    date=datetime.datetime.strptime(c[3],'%d %b %y').strftime('%Y-%m-%d')
                    margin=float(c[16]); distance=int(c[4])
                    winner=clean(c[15].split(' / ')[0])
                    # A winner's displayed margin is its winning margin, not its deficit.
                    winner_weight=re.search(r'\s(\d+(?:\.\d+)?)kg(?:\s|$)',c[15])
                    hist.append(dict(pos=pos,total=total,track=c[1],date=date,distance=distance,grade=c[5],raceTime=c[12],going=c[6],weight=c[9],winner=winner,winnerWeight=float(winner_weight[1]) if winner_weight else None,margin=0 if pos==1 else margin,winMargin=margin if pos==1 else None))
                except (ValueError,IndexError):pass
        price=float(h.get('fixedWinDiv') or 0) if re.match(r'^\d+(?:\.\d+)?$',str(h.get('fixedWinDiv') or '')) else 0
        horses.append(dict(number=h['number'],name=clean(h['name']),display=clean(h['name']).title(),barrier=h['barrier'],weight=h['weight'],jockey=h['rider'].title(),trainer=h['trainer'],form=h['last4Starts'],odds=price if price>1 else None,scratched=h.get('isFobScratched',False) or h.get('isToteOff',False),emergency='(EM' in h['name'],history=hist))
    return dict(number=n,name=names[n-1],time=times[n-1],distance=model['raceInfo']['distance'],going=model['raceInfo']['condition'],source=url,oddsTimestamp=model['raceInfo'].get('timestamp'),horses=horses)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    races=sorted(pool.map(get,range(1,10)),key=lambda x:x['number'])
known={h['name'] for r in races for h in r['horses']}
known.update(s['winner'] for r in races for h in r['horses'] for s in h['history'] if not s['winner'].endswith('..'))
for r in races:
    for h in r['horses']:
        for s in h['history']:
            if s['winner'].endswith('..'):
                matches=[n for n in known if n.startswith(s['winner'][:-2])]
                if len(matches)==1:s['winner']=matches[0]
stamp=json.loads((ROOT/'dist'/'data.json').read_text())['retrieved'] if '--cached' in sys.argv else datetime.datetime.now(datetime.timezone.utc).isoformat()
data=dict(meeting='Flemington',date='2026-11-05',retrieved=stamp,races=races)
(ROOT/'dist'/'data.json').write_text(json.dumps(data,separators=(',',':')))
for r in races:print(r['number'],r['name'],len(r['horses']),'runners',sum(len(h['history']) for h in r['horses']),'runs')
