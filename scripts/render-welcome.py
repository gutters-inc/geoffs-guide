"""Render a real 30-second captioned film with offline synthetic English narration."""
import pathlib,json,subprocess,tempfile,textwrap
root=pathlib.Path(__file__).resolve().parent.parent;asset=root/'dist/assets';guide=json.loads((root/'dist/welcome-preview.json').read_text());font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
with tempfile.TemporaryDirectory(prefix='geoff-intro-') as folder:
 tmp=pathlib.Path(folder);filters=['[1:v]crop=480:480:55:445,scale=164:164[geoff]','[0:v][geoff]overlay=40:150:shortest=1,drawbox=x=228:y=123:w=5:h=270:color=0xe61e1e:t=fill']
 def draw(text,x,y,size,color='white',weight=False,start=None,end=None):
  p=tmp/f'text{len(list(tmp.iterdir()))}.txt';p.write_text(text);f=f"drawtext=fontfile={bold if weight else font}:textfile={p}:x={x}:y={y}:fontsize={size}:fontcolor={color}:line_spacing=8"
  if start is not None:f+=f":enable='gte(t,{start})*lt(t,{end})'"
  filters[-1]+=','+f
 draw('GEOFFS GUIDE',40,28,24,weight=True);draw('STAKES DAY · SAT 7 NOV',590,32,18,color='0xc6c6ce');draw('GEOFF',85,330,20,weight=True);draw('SYNTHETIC PRESENTER',42,366,12,color='0xb6b6c0')
 titles=['Hello,\nStakes Day.','Start with\nthe field.','The form,\nconnected.','Late mail,\nten out.','Three\nGroup Ones.','Results,\nthen learn.']
 bodies=['Your 30-second guide\nFlemington · Saturday 7 November','Next to jump opens first\nTap a runner for form + silks','Ladder explains the links\nTips carries the published calls','Track. Riders. Scratchings.\nFresh checks before the jump','Champions Sprint · Mile · Stakes\nKeep evidence confidence in view','Interim means unconfirmed\nOfficial results inform later races']
 for i,scene in enumerate(guide['scenes']):
  draw(titles[i],270,116,55,weight=True,start=i*5,end=(i+1)*5);draw(bodies[i],270,280,25,color='0xc6c6ce',start=i*5,end=(i+1)*5)
  draw(textwrap.fill(scene['narration'],68),40,448,24,start=i*5,end=(i+1)*5)
 filters[-1]+=",drawbox=x=0:y=532:w='iw*t/30':h=8:color=0xe61e1e:t=fill[v]"
 cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=0x171717:s=960x540:r=24:d=30','-loop','1','-i',str(asset/'geoff-source.jpg'),'-filter_complex',';'.join(filters),'-map','[v]','-t','30','-an','-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',str(asset/'geoff-welcome-30s.mp4')]
 subprocess.run(cmd,check=True)
 # Render each spoken scene to its five-second caption slot, then mux AAC audio.
 audio=[]
 for i,scene in enumerate(guide['scenes']):
  text=tmp/f'voice-{i}.txt';text.write_text(scene['narration'].replace('’',"'").replace('—',','))
  raw=tmp/f'voice-{i}-raw.wav';part=tmp/f'voice-{i}.wav'
  subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','lavfi','-i',f'flite=textfile={text}:voice=rms','-c:a','pcm_s16le',str(raw)],check=True)
  duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(raw)],text=True))
  tempo=max(.9,duration/4.65)
  subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(raw),'-af',f'atempo={tempo:.6f},aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=9,apad=whole_dur=5,atrim=duration=5,afade=t=in:st=0:d=0.03,afade=t=out:st=4.94:d=0.06','-ar','48000','-c:a','pcm_s16le',str(part)],check=True)
  audio.append(part)
 listing=tmp/'audio-concat.txt';listing.write_text(''.join(f"file '{part}'\n" for part in audio))
 joined=tmp/'narration.wav'
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(listing),'-c:a','pcm_s16le',str(joined)],check=True)
 narrated=root/'dist'/guide['video']
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(asset/'geoff-welcome-30s.mp4'),'-i',str(joined),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-t','30','-movflags','+faststart',str(narrated)],check=True)
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss','1','-i',str(asset/'geoff-welcome-30s.mp4'),'-frames:v','1',str(asset/'geoff-welcome-poster.jpg')],check=True)
 lines=['WEBVTT','']
 for scene in guide['scenes']:
  a,b=int(scene['start']),int(scene['end']);lines += [f'00:00:{a:02d}.000 --> 00:00:{b:02d}.000',scene['narration'],'']
 (asset/'geoff-welcome.vtt').write_text('\n'.join(lines))
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_type,codec_name,duration','-of','json',str(root/'dist'/guide['video'])],text=True));assert float(info['format']['duration'])==30;assert any(s['codec_type']=='audio' for s in info['streams']);print(info)
