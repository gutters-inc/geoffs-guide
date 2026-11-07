"""Fixed-site, hidden-stdin publisher. Never put access tokens in command arguments."""
import sys,json,urllib.request,urllib.error,termios,pathlib,base64
if sys.stdin.isatty():
 attrs=termios.tcgetattr(sys.stdin.fileno());attrs[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin.fileno(),termios.TCSANOW,attrs)
print('Ready for race-video JSON on stdin (hidden).',flush=True)
x=json.loads(sys.stdin.readline());token=x.pop('token');body=x.pop('payload',x)
if body.get('audioPath'):body['audioBase64']=base64.b64encode(pathlib.Path(body.pop('audioPath')).read_bytes()).decode()
if body.get('videoPath'):body['videoBase64']=base64.b64encode(pathlib.Path(body.pop('videoPath')).read_bytes()).decode()
if body.get('captionsPath'):body['captions']=pathlib.Path(body.pop('captionsPath')).read_text()
url='https://geoffs-guide-stakes-day-2026.aguthridge.chatgpt.site/api/race-videos'
request=urllib.request.Request(url,data=json.dumps(body).encode(),headers={'OAI-Sites-Authorization':'Bearer '+token,'Authorization':'Bearer '+token,'content-type':'application/json'})
try:
 with urllib.request.urlopen(request,timeout=180) as r:print(json.dumps(json.load(r)),flush=True)
except urllib.error.HTTPError as e:
 print(json.dumps({'httpStatus':e.code,'error':e.read().decode()[:1000]}),flush=True);raise SystemExit(1)
