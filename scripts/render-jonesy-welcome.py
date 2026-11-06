"""Finish one ElevenLabs presenter performance; all overlays are local and reproducible.
Usage: python scripts/render-jonesy-welcome.py SOURCE_MP4 NARRATION_MP3 WORDS_JSON
"""
import json,pathlib,subprocess,sys,tempfile,textwrap,shutil
from PIL import ImageFont
root=pathlib.Path(__file__).resolve().parent.parent;assets=root/'dist/assets'
source,audio,wordfile=map(pathlib.Path,sys.argv[1:4]);words=json.loads(wordfile.read_text())['words'];duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(audio)],text=True))
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold=font.replace('Sans.ttf','Sans-Bold.ttf')
starts=[0,6.8,15.28,25.84,35.12,47.16,52.99];ends=starts[1:]+[duration];names=['WELCOME','FORM','LATE MAIL','TIPS','LADDER','RESULTS','GEOFF’S EDGE']
with tempfile.TemporaryDirectory(prefix='jonesy-edit-') as folder:
 tmp=pathlib.Path(folder)
 # Source framing is the supplied phone screenshot. Crop out its UI to the central portrait.
 filt=["[0:v]crop=w='trunc(iw*.82/2)*2':h='trunc(iw*.82/2)*2':x='iw*.09':y='ih*.337',scale=720:720[host]",'[4:v][host]overlay=0:220:shortest=1[base]', '[2:v]scale=720:480:force_original_aspect_ratio=increase,crop=720:480[autumn]', '[3:v]scale=720:480:force_original_aspect_ratio=increase,crop=720:480[cosmic]',"[base][autumn]overlay=0:240:enable='between(t,8.0,12.7)'[p1]","[p1][cosmic]overlay=0:240:enable='between(t,27.0,30.5)'[p2]"]
 chain='[p2]drawbox=x=0:y=0:w=720:h=83:color=0xe61e1e:t=fill,drawbox=x=0:y=940:w=720:h=340:color=0x171717:t=fill'
 def draw(text,x,y,size=30,color='white',weight=False,a=None,b=None):
  nonlocal_dummy=None
  p=tmp/f'text-{len(list(tmp.iterdir()))}.txt';p.write_text(text)
  return f',drawtext=fontfile={bold if weight else font}:textfile={p}:x={x}:y={y}:fontsize={size}:fontcolor={color}:line_spacing=10'+(f":enable='gte(t,{a})*lt(t,{b})'" if a is not None else '')
 chain+=draw('GEOFFS GUIDE',28,25,29,weight=True)+draw('JONESY',535,29,21)
 tabs=['Form','Late mail','Tips','Ladder','Results'];ranges=list(zip(starts[1:6],ends[1:6]))
 for i,label in enumerate(tabs):
  x=14+i*140;chain+=f',drawbox=x={x}:y=104:w=132:h=53:color=0x333338:t=fill'
  a,b=ranges[i];chain+=f",drawbox=x={x}:y=104:w=132:h=53:color=0xe61e1e:t=fill:enable='gte(t,{a})*lt(t,{b})'"+draw(label,x+12,122,18,weight=True)
 for label,a,b in zip(names,starts,ends):chain+=draw(label,28,181,23,'0xff7777',True,a,b)
 # Photo-stat cutaway, sourced in the guide. Hide the underlying portrait below it.
 for a,b in [(8,12.7),(27,30.5)]:chain+=f",drawbox=x=0:y=720:w=720:h=220:color=0x171717:t=fill:enable='between(t,{a},{b})'"
 chain+=draw('AUTUMN GLOW',28,749,36,weight=True,a=8,b=12.7)+draw('14 wins / 15 starts',28,804,34,a=8,b=12.7)+draw('Historical form example · source checked 6 Nov',28,859,19,'0xcccccc',a=8,b=12.7)+draw('Bradley Photos / Just Horse Racing',20,695,13,a=8,b=12.7)
 chain+=draw('Read the tip’s reasoning',28,753,33,weight=True,a=27,b=30.5)+draw('Track assumptions + the run needed',28,813,26,a=27,b=30.5)+draw('Cosmic Crusader · Racing Photos / TBWA',28,873,16,'0xcccccc',a=27,b=30.5)
 # Focused late-mail graphic, replacing the main picture for this explanatory beat.
 chain+=",drawbox=x=0:y=220:w=720:h=720:color=0x222226:t=fill:enable='between(t,18.1,23.8)'"
 chain+=draw('ORIGINAL',42,310,26,'0xaaaaaa',True,18.1,23.8)+draw('→  REVISED VIEW',42,375,40,'white',True,18.1,23.8)
 for j,label in enumerate(['Track conditions','Scratchings + riders','Fresh information']):
  a=18.1+j*.7;chain+=draw('✓  '+label,42,499+j*82,32,a=a,b=23.8)
 chain+=draw('Read the saved timestamp',42,824,25,'0xff7777',False,18.1,23.8)
 # Actual two-race link: no direct Vauban/Valiant King meeting in the guide's sample.
 chain+=",drawbox=x=0:y=220:w=720:h=720:color=0x222226:t=fill:enable='between(t,37.1,45.9)'"
 ladder=[('VALIANT KING','3.45L ahead · Flemington · 3 Oct 2026'),('BERKELEY SQUARE','1.97L ahead · Geelong · 21 Oct 2026'),('VAUBAN','Historical margins from different races')]
 for j,(name,detail) in enumerate(ladder):
  a=37.1+j*.9;y=293+j*182;chain+=draw(str(j+1)+'  '+name,35,y,35,weight=True,a=a,b=45.9)+draw(detail,35,y+65,20,'0xcccccc',a=a,b=45.9)
 chain+=draw('A shared-form link, not a forecast margin',35,888,21,'0xff7777',False,37.1,45.9)
 # Concise results state cue, avoiding invented race-day winners.
 chain+=draw('SAVED TIP  →  OFFICIAL RESULT',32,864,27,weight=True,a=48.3,b=52.7)
 chain+=draw('Come back five minutes before jump',28,867,29,weight=True,a=54,b=duration)
 # Captions follow measured words, not estimated scene times.
 captions=[];chunk=[]
 for w in words:
  if chunk and (len(' '.join(x['text'] for x in chunk))+len(w['text'])>44 or len(chunk)>=7):captions.append(chunk);chunk=[]
  chunk.append(w)
 if chunk:captions.append(chunk)
 def stamp(t):
  ms=round(t*1000);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}.{ms%1000:03d}'
 vtt=['WEBVTT','']
 for group in captions:
  text=' '.join(w['text'] for w in group);a=group[0]['start'];b=min(duration,group[-1]['end']+.07)
  captionfont=ImageFont.truetype(bold,38);lines=[];line=''
  for token in text.split():
   trial=(line+' '+token).strip()
   if line and captionfont.getlength(trial)>664:lines.append(line);line=token
   else:line=trial
  if line:lines.append(line)
  assert len(lines)<=2, text
  chain+=draw('\n'.join(lines),28,1000,38,weight=True,a=a,b=b);vtt += [stamp(a)+' --> '+stamp(b),text,'']
 chain+=draw('AI presenter + synthetic Jonesy voice',28,1209,15,'0xaaaaaa')+draw('Historical examples · Sources in the guide',28,1235,14,'0xaaaaaa')+'[out]';filt.append(chain)
 target=assets/'jonesy-guide-welcome.mp4'
 cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(source),'-i',str(audio),'-loop','1','-i',str(assets/'autumn-glow.jpg'),'-loop','1','-i',str(assets/'cosmic-crusader.jpg'),'-f','lavfi','-i',f'color=c=0x171717:s=720x1280:r=24:d={duration}', '-filter_complex',';'.join(filt),'-map','[out]','-map','1:a','-t',str(duration),'-r','24','-c:v','libx264','-preset','veryfast','-crf','26','-pix_fmt','yuv420p','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-c:a','aac','-b:a','112k','-movflags','+faststart',str(target)]
 subprocess.run(cmd,check=True)
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss','2','-i',str(target),'-frames:v','1',str(assets/'jonesy-guide-poster.jpg')],check=True)
 (assets/'jonesy-guide.vtt').write_text('\n'.join(vtt));subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(audio),'-af','loudnorm=I=-16:TP=-1.5:LRA=11','-c:a','libmp3lame','-b:a','128k',str(assets/'jonesy-guide-narration.mp3')],check=True)
 guide=json.loads((root/'dist/welcome-preview.json').read_text());brief=json.loads(pathlib.Path('/workspace/geoff-video/jonesy-production-brief.json').read_text())
 guide.update(id='jonesy-guide-welcome-2026',duration=duration,presenter='Jonesy',video='assets/jonesy-guide-welcome.mp4',poster='assets/jonesy-guide-poster.jpg',audio='assets/jonesy-guide-narration.mp3',captions='assets/jonesy-guide.vtt',scenes=[{'start':a,'end':b,'title':label.title(),'caption':label.title(),'narration':section['speech']} for a,b,label,section in zip(starts,ends,names,brief['sections'])])
 guide['voice']={'lang':'en-AU','kind':'synthetic','recorded':True,'embeddedAudio':True,'engine':'ElevenLabs eleven_v4','name':'Jonesy','voiceId':'HKfYneV95ngljSlkEAT4'};guide['animation']={'kind':'ElevenLabs Creatify Aurora photo animation','sourceResolution':'480p','exportResolution':'720x1280','naturalSpeechSpeed':True,'note':'User-supplied Jonesy photo and selected synthetic voice. Local captions, navigation graphics, horse photos and historical form example.'}
 (root/'dist/welcome-preview.json').write_text(json.dumps(guide,indent=2,ensure_ascii=False)+'\n');print('Exported',target,'duration',duration)
