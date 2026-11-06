"""Authenticated, fixed-Site updater client. Credentials enter only through stdin."""
import sys,json,urllib.request,urllib.error,termios
if sys.stdin.isatty():
 attrs=termios.tcgetattr(sys.stdin.fileno());attrs[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin.fileno(),termios.TCSANOW,attrs)
print('Ready for update JSON on stdin (input hidden).',flush=True)
data=json.loads(sys.stdin.readline());base='https://geoffs-guide-stakes-day-2026.aguthridge.chatgpt.site'
headers={'OAI-Sites-Authorization':'Bearer '+data['token'],'Authorization':'Bearer '+data['token'],'Content-Type':'application/json'}
def call(path,body=None):
 request=urllib.request.Request(base+path,headers=headers,data=json.dumps(body).encode() if body is not None else None,method='POST' if body is not None else 'GET')
 try:
  with urllib.request.urlopen(request,timeout=90) as result:return json.load(result)
 except urllib.error.HTTPError as error:
  try:body=json.loads(error.read())
  except Exception:body={'error':'Site HTTP '+str(error.code)}
  print(json.dumps({'ok':False,'status':error.code,'details':body}),flush=True);raise SystemExit(1)
if data.get('mode')=='status':print(json.dumps(call('/api/late-mail/status')),flush=True)
else:
 if data.get('mode','update')=='update':print(json.dumps({'write':call('/api/late-mail/refresh',data['payload'])}),flush=True)
 saved=call('/api/late-mail');selected=saved.get('selections',{}).get(str(data.get('race',1)))
 print(json.dumps({'readback':{'updated':saved.get('updated'),'runKey':saved.get('runKey'),'storageReady':saved.get('storageReady'),'complete':saved.get('complete'),'lastAttempt':saved.get('lastAttempt'),'race':selected,'changes':saved.get('changes',{}).get(str(data.get('race',1))),'results':[{'race':r['number'],'status':r['status'],'going':r.get('condition'),'winners':[h['name'] for h in r.get('winners',[])]} for r in saved.get('meeting',{}).get('races',[])],'automation':saved.get('automation')}}),flush=True)
