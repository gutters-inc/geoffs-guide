import os
os.environ['OMP_NUM_THREADS']='2'
import json,pathlib,soundfile as sf,onnxruntime as ort
from kokoro_onnx import Kokoro
root=pathlib.Path(__file__).resolve().parent.parent;g=json.loads((root/'dist/welcome-preview.json').read_text())
k=Kokoro('/tmp/geoff-voice-model/kokoro-v1.0.onnx','/tmp/geoff-voice-model/voices-v1.0.bin')
print('British voices:',[v for v in k.get_voices() if v.startswith('bm_')],flush=True)
for i,s in enumerate(g['scenes']):
 a,sr=k.create(s['narration'],voice='bm_george',speed=1.03,lang='en-gb');sf.write(f'/tmp/geoff-voice-model/scene-{i}.wav',a,sr);print(i,len(a)/sr,flush=True)
