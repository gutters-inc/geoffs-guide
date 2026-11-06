"""Compose Geoff's animated broadcast using generated poses and sourced horse photos."""
import json,pathlib,subprocess,tempfile,textwrap
root=pathlib.Path(__file__).resolve().parent.parent
asset=root/'dist/assets'; guide=json.loads((root/'dist/welcome-preview.json').read_text())
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold=font.replace('Sans.ttf','Sans-Bold.ttf')
data=json.loads((root/'dist/data.json').read_text());media=json.loads((root/'dist/media.json').read_text())
def horse(r,name):return next(h for h in data['races'][r-1]['horses'] if h['name']==name)['inputs']['stats']
a=horse(7,'AUTUMN GLOW');c=horse(8,'COSMIC CRUSADER')
def wins(record):
 starts,parts=record.split(':');return f'{parts.split(",")[0]} wins / {starts} starts'
scenes=[
 ('STAKES DAY','Your guide in 30 seconds','autumn-glow.jpg','Flemington | Saturday 7 November','Next to jump. Full field. Fresh checks.'),
 ('START WITH THE FIELD','AUTUMN GLOW | Champions Mile','autumn-glow.jpg','CAREER  '+wins(a['career']),'SOFT TRACK  '+wins(a['Soft'])),
 ('THE FORM, CONNECTED','COSMIC CRUSADER | Stakes','cosmic-crusader.jpg','FLEMINGTON  '+wins(c['track']),'Ladder: shared races explain each link'),
 ('LATE MAIL | TEN OUT','Check what changed','cosmic-crusader.jpg','Track  /  Riders  /  Gear  /  Scratchings','Fresh evidence revises the baseline'),
 ('THREE GROUP ONES','Sprint. Mile. Stakes.','autumn-glow.jpg','Tips: Adam Page + Glenn Ingram','Confidence reflects evidence quality'),
 ('RESULTS, THEN LEARN','Next race. Better informed.','cosmic-crusader.jpg','INTERIM  >  OFFICIAL  >  REASSESS','Historical stats are not win probabilities')]
with tempfile.TemporaryDirectory(prefix='geoff-tv-') as folder:
 tmp=pathlib.Path(folder);parts=[]
 for i,(kicker,title,photo,stat1,stat2) in enumerate(scenes):
  # Switch mouth poses at 7Hz; blink once per shot; gesture towards the stats.
  x="if(between(t,2.5,2.65),0,if(between(t,3.3,4.2),512*(1+mod(floor(t*7),2)),512*mod(floor(t*7),3)))"
  y="if(between(t,2.5,2.65)+between(t,3.3,4.2),512,0)"
  filters=[f"[1:v]crop=512:512:x='{x}':y='{y}',scale=330:330[host]", "[2:v]scale=550:310:force_original_aspect_ratio=increase,crop=550:280,zoompan=z='min(zoom+0.00045,1.06)':d=120:s=550x280:fps=24[photo]", "[0:v][photo]overlay=380:91:shortest=1[screen]", "[screen][host]overlay=20:y='117+2*sin(t*2)'[base]"]
  chain='[base]drawbox=x=0:y=0:w=960:h=67:color=0xe61e1e:t=fill,drawbox=x=0:y=431:w=960:h=109:color=0x171717:t=fill,drawbox=x=20:y=409:w=330:h=26:color=0xe61e1e:t=fill,drawbox=x=380:y=265:w=550:h=169:color=0x171717@0.92:t=fill'
  def draw(text,x,y,size,color='white',weight=False):
   nonlocal_dummy=None
   p=tmp/f'text-{i}-{len(list(tmp.iterdir()))}.txt';p.write_text(text)
   return f',drawtext=fontfile={bold if weight else font}:textfile={p}:x={x}:y={y}:fontsize={size}:fontcolor={color}:line_spacing=6'
  chain+=draw('GEOFFS GUIDE',24,21,25,weight=True)+draw('STAKES DAY / 07 NOV',655,25,17)
  chain+=draw('GEOFF  /  ANIMATED PRESENTER',37,414,14,weight=True)
  chain+=draw(kicker,399,281,17,'0xff7777',True)+draw(title,399,309,25,weight=True)
  chain+=draw(stat1,399,352,21)+draw(stat2,399,387,18,'0xdddddd')
  credit='Bradley Photos / Just Horse Racing' if photo=='autumn-glow.jpg' else 'Racing Photos / TBWA'
  chain+=draw(credit,390,98,11)
  chain+=draw(textwrap.fill(guide['scenes'][i]['narration'],76),26,458,22)
  chain+=draw('Synthetic English narration | Historical source form | 06 NOV 2026',26,524,10,'0xbbbbbb')
  chain+=",drawbox=x=0:y=537:w=960:h=3:color=0xe61e1e:t=fill[out]";filters.append(chain)
  part=tmp/f'scene{i}.mp4';parts.append(part)
  subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=0x25252a:s=960x540:r=24:d=5','-loop','1','-i',str(root/'art/geoff-presenter-sprites.png'),'-loop','1','-i',str(asset/photo),'-filter_complex',';'.join(filters),'-map','[out]','-t','5','-an','-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p',str(part)],check=True)
 listing=tmp/'parts.txt';listing.write_text(''.join(f"file '{p}'\n" for p in parts))
 silent=tmp/'silent.mp4'
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(listing),'-c','copy',str(silent)],check=True)
 target=asset/'geoff-tv-welcome-30s.mp4'
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(silent),'-i',str(asset/'geoff-welcome-narrated-30s.mp4'),'-map','0:v','-map','1:a','-c','copy','-t','30','-movflags','+faststart',str(target)],check=True)
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss','6','-i',str(target),'-frames:v','1',str(asset/'geoff-tv-poster.jpg')],check=True)
 guide['video']='assets/geoff-tv-welcome-30s.mp4';guide['poster']='assets/geoff-tv-poster.jpg'
 guide['animation']={'kind':'illustrated pose animation','gestures':['talking','blink','point'],'statsAsOf':'2026-11-06','note':'Animated likeness with synthetic English narration. Mouth poses are stylised, not phoneme-accurate lip sync. Historical stats are not win probabilities.'}
 for name in ['AUTUMN GLOW','COSMIC CRUSADER']:
  m=media[name]
  if not any(s['url']==m['source'] for s in guide['sources']):guide['sources'].append({'title':name.title()+' photo: '+m['credit'],'url':m['source']})
 guide['sources'].append({'title':'TABtouch: declared field and historical form statistics','url':'https://www.tabtouch.com.au/racing/2026-11-07/mr/7'})
 (root/'dist/welcome-preview.json').write_text(json.dumps(guide,indent=2)+'\n')
 print('Rendered animated TV welcome:',target.stat().st_size,'bytes')
