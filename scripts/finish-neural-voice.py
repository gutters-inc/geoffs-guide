"""Fit pre-rendered Kokoro George speech to the six caption slots and publish assets.
Generate scene-{0..5}.wav with kokoro-onnx 0.6.1 (Kokoro v1.0 int8,
voices-v1.0.bin, bm_george, en-gb, speed1.03) in the supplied folder first.
Model files: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1
"""
import pathlib,json,subprocess,sys
root=pathlib.Path(__file__).resolve().parent.parent;assets=root/'dist/assets';tmp=pathlib.Path(sys.argv[1]);g=json.loads((root/'dist/welcome-preview.json').read_text())
def run(args):subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',*args],check=True)
parts=[]
for i in range(6):
 raw=tmp/f'scene-{i}.wav';part=tmp/f'fit-{i}.wav'
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(raw)],text=True));tempo=max(1,duration/4.8)
 run(['-i',str(raw),'-af',f'atempo={tempo:.6f},aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=9,apad=whole_dur=5,atrim=duration=5,afade=t=in:st=0:d=0.02,afade=t=out:st=4.96:d=0.04','-c:a','pcm_s16le',str(part)]);parts.append(part)
listing=tmp/'join.txt';listing.write_text(''.join(f"file '{p}'\n" for p in parts));joined=tmp/'geoff-neural.wav'
run(['-f','concat','-safe','0','-i',str(listing),'-c:a','pcm_s16le',str(joined)])
run(['-i',str(joined),'-c:a','libmp3lame','-b:a','128k',str(assets/'geoff-welcome-neural.mp3')])
run(['-i',str(assets/'geoff-tv-welcome-30s.mp4'),'-i',str(joined),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','128k','-t','30','-movflags','+faststart',str(assets/'geoff-tv-neural-30s.mp4')])
g['video']='assets/geoff-tv-neural-30s.mp4';g['audio']='assets/geoff-welcome-neural.mp3';g['voice'].update(lang='en-GB',engine='Kokoro v1.0 neural TTS',name='George',cloned=False);g['animation']['note']='Animated likeness with synthetic British English narration. Stylised mouth animation. Historical stats are not win probabilities.'
(root/'dist/welcome-preview.json').write_text(json.dumps(g,indent=2)+'\n')
print('Neural audio and video ready')
