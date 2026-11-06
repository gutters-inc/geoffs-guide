"""Local finishing, no provider credits. Args: SOURCE_MP4 AUDIO_MP3 PREVIEW_JSON WORDS_JSON OUTPUT_MP4.
Preserve generated speech speed; create source-timed captions and a mobile presenter layout.
"""
import json,pathlib,subprocess,sys,tempfile,textwrap
source,audio,previewfile,wordfile,out=map(pathlib.Path,sys.argv[1:]);p=json.loads(previewfile.read_text());words=json.loads(wordfile.read_text())['words'];duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(audio)],text=True));assert 10<=duration<=45
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold=font.replace('Sans.ttf','Sans-Bold.ttf')
with tempfile.TemporaryDirectory() as folder:
 tmp=pathlib.Path(folder);filters=["[0:v]crop=w='trunc(iw*.82/2)*2':h='trunc(iw*.82/2)*2':x='iw*.09':y='ih*.337',scale=480:480[host]",'[2:v][host]overlay=0:90:shortest=1[base]'];chain='[base]drawbox=x=0:y=0:w=480:h=73:color=0xe61e1e:t=fill,drawbox=x=0:y=570:w=480:h=284:color=0x171717:t=fill'
 def draw(text,x,y,size,color='white',weight=False,a=None,b=None):
  f=tmp/f't{len(list(tmp.iterdir()))}.txt';f.write_text(text);return f',drawtext=fontfile={bold if weight else font}:textfile={f}:x={x}:y={y}:fontsize={size}:fontcolor={color}:line_spacing=7'+(f":enable='gte(t,{a})*lt(t,{b})'" if a is not None else '')
 chain+=draw(f'GEOFF / RACE {p["race"]}',20,24,25,weight=True)+draw('SAVED TEN-MINUTE VIEW',20,589,18,'0xff7777',True)
 chain+=draw(str((p.get('confidence') or {}).get('label','Evidence limited')),20,625,21)
 groups=[];group=[]
 for w in words:
  if group and len(' '.join(t['text'] for t in group)+' '+w['text'])>28:groups.append(group);group=[]
  group.append(w)
 if group:groups.append(group)
 def stamp(t):
  n=round(t*1000);return f'{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d}.{n%1000:03d}'
 vtt=['WEBVTT','']
 for g in groups:
  text=' '.join(w['text'] for w in g);a=g[0]['start'];b=min(duration,g[-1]['end']+.05);chain+=draw(textwrap.fill(text,22),20,681,27,weight=True,a=a,b=b);vtt += [stamp(a)+' --> '+stamp(b),text,'']
 chain+=draw('AI presenter · synthetic Geoff voice',20,811,12,'0xaaaaaa')+'[out]';filters.append(chain)
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(source),'-i',str(audio),'-f','lavfi','-i',f'color=c=0x171717:s=480x854:r=24:d={duration}','-filter_complex',';'.join(filters),'-map','[out]','-map','1:a','-t',str(duration),'-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-c:a','aac','-b:a','112k','-movflags','+faststart',str(out)],check=True)
 out.with_suffix('.vtt').write_text('\n'.join(vtt));print(json.dumps({'video':str(out),'captions':str(out.with_suffix('.vtt')),'duration':duration}),flush=True)
