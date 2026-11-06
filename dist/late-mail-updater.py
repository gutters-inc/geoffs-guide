"""Fixed-Site updater and bounded race watch. Access enters through hidden stdin."""
import sys,json,urllib.request,urllib.error,termios,time,datetime
from zoneinfo import ZoneInfo
if sys.stdin.isatty():
 attrs=termios.tcgetattr(sys.stdin.fileno());attrs[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin.fileno(),termios.TCSANOW,attrs)
print('Ready for update JSON on stdin (input hidden).',flush=True)
data=json.loads(sys.stdin.readline());base='https://geoffs-guide-stakes-day-2026.aguthridge.chatgpt.site'
headers={'OAI-Sites-Authorization':'Bearer '+data['token'],'Authorization':'Bearer '+data['token'],'Content-Type':'application/json'}
TZ=ZoneInfo('Australia/Melbourne')
def emit(value):print(json.dumps(value),flush=True)
def call(path,body=None):
 request=urllib.request.Request(base+path,headers=headers,data=json.dumps(body).encode() if body is not None else None,method='POST' if body is not None else 'GET')
 try:
  with urllib.request.urlopen(request,timeout=180) as result:return json.load(result)
 except urllib.error.HTTPError as error:
  try:detail=json.loads(error.read())
  except Exception:detail={'error':'Site HTTP '+str(error.code)}
  detail['httpStatus']=error.code
  if error.code==429:
   try:detail['retryAt']=datetime.datetime.fromtimestamp(time.time()+max(120,float(error.headers.get('Retry-After','120'))),datetime.timezone.utc).isoformat()
   except ValueError:detail['retryAt']=error.headers.get('Retry-After')
  return detail
 except (urllib.error.URLError,TimeoutError):return {'error':'Connection failed; no immediate retry','retryAt':datetime.datetime.fromtimestamp(time.time()+300,datetime.timezone.utc).isoformat()}
def stamp(value):
 try:return datetime.datetime.fromisoformat(value.replace('Z','+00:00')).timestamp()
 except (ValueError,TypeError,AttributeError):return None
def report(saved,n):return next((r for r in saved.get('meeting',{}).get('races',[]) if r['number']==n),None)
def jump_at(saved,n):return stamp((report(saved,n) or {}).get('startAt') or saved.get('selections',{}).get(str(n),{}).get('startAt'))
def brief(saved,n):
 r=report(saved,n) or {};s=saved.get('selections',{}).get(str(n),{})
 return {'updated':saved.get('updated'),'runKey':saved.get('runKey'),'race':n,'status':r.get('status'),'going':r.get('condition'),'savedTip':s.get('revisedTip'),'interimPlacings':[{'number':h['number'],'name':h['name'],'placing':h['placing']} for h in r.get('runners',[]) if h.get('placing') and r.get('status')=='provisional'],'winners':[h['name'] for h in r.get('winners',[])],'polling':saved.get('polling')}
def wait_until(target,deadline):
 while time.time()<target and time.time()<deadline:time.sleep(min(30,max(0,target-time.time()),max(0,deadline-time.time())))
 return time.time()<deadline
def write_for(n,phase,notes=None):
 local=datetime.datetime.now(TZ);payload={'runKey':f'2026-11-07-r{n}-{phase}-{local:%H%M}','phase':phase,'race':n,'notes':notes or []}
 result=call('/api/late-mail/refresh',payload);emit({'write':result});return result
mode=data.get('mode','update')
if mode=='status':emit(call('/api/late-mail/status'))
elif mode=='watch':
 saved=call('/api/late-mail');n=int(data.get('race') or 0);jump=jump_at(saved,n);now=time.time();deadline=now+45*60
 if not jump or now<jump-15*60 or now>jump+25*60:emit({'stopped':True,'reason':'Outside the bounded race window or no verified start time'});raise SystemExit(0)
 if (report(saved,n) or {}).get('status') in ['official','abandoned']:emit(brief(saved,n));raise SystemExit(0)
 if now<jump:
  if not wait_until(jump-600,deadline):raise SystemExit(0)
  retry=0
  for attempt in range(3):
   result=write_for(n,'pre',data.get('notes'));saved=call('/api/late-mail');emit({'readback':brief(saved,n)})
   if result.get('httpStatus') in [401,403]:raise SystemExit(1)
   retry=stamp(result.get('retryAt')) or 0;jump=jump_at(saved,n) or jump
   if not result.get('deferred') or not retry or retry>=jump or not wait_until(retry,deadline):break
 else:retry=0
 for minutes in [3,6,10,20]:
  jump=jump_at(saved,n) or jump;target=max(jump+minutes*60,retry)
  if target>=deadline or not wait_until(target,deadline):break
  if (report(saved,n) or {}).get('status') in ['official','abandoned']:break
  result=write_for(n,'post');saved=call('/api/late-mail');emit({'readback':brief(saved,n)})
  if result.get('httpStatus') in [401,403]:raise SystemExit(1)
  retry=max(stamp(result.get('retryAt')) or 0,time.time()+120)
  if result.get('deferred') and not result.get('retryAt'):break
  if (report(saved,n) or {}).get('status') in ['official','abandoned']:break
 emit({'watchComplete':True,'readback':brief(saved,n),'note':'Routine watch stopped; unconfirmed results remain unconfirmed.'})
else:
 if mode=='update':
  result=call('/api/late-mail/refresh',data['payload']);emit({'write':result})
  if result.get('httpStatus') in [401,403]:raise SystemExit(1)
 saved=call('/api/late-mail');emit({'readback':{'updated':saved.get('updated'),'runKey':saved.get('runKey'),'storageReady':saved.get('storageReady'),'complete':saved.get('complete'),'lastAttempt':saved.get('lastAttempt'),'race':saved.get('selections',{}).get(str(data.get('race',1))),'results':[{'race':r['number'],'status':r['status'],'going':r.get('condition'),'winners':[h['name'] for h in r.get('winners',[])]} for r in saved.get('meeting',{}).get('races',[])],'automation':saved.get('automation')}})
