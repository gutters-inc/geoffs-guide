// A small atomic conditional-write fake for shared R2 lease tests.
export function memoryBucket(){
 const values=new Map(),etags=new Map();let version=0;
 return {values,async get(key){if(!values.has(key))return null;const value=values.get(key);return {etag:etags.get(key),json:async()=>JSON.parse(value)}},async put(key,value,options={}){const c=options.onlyIf;if(c instanceof Headers){if(c.get('if-none-match')==='*'&&values.has(key))return null}else if(c?.etagMatches!==undefined&&etags.get(key)!==c.etagMatches)return null;values.set(key,value);const etag=String(++version);etags.set(key,etag);return {etag}}};
}
