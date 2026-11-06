export function staticAssetResponse(request,file,pathname){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const bytes=Uint8Array.from(atob(file.body),c=>c.charCodeAt(0)),media=file.type.startsWith('video/')||file.type.startsWith('audio/');
 const headers={'content-type':file.type,'cache-control':pathname.startsWith('/assets/')?'public, max-age=86400':'public, max-age=0, must-revalidate','x-content-type-options':'nosniff'};
 if(media){headers['accept-ranges']='bytes';const range=request.headers.get('range');if(range){const match=range.match(/^bytes=(\d*)-(\d*)$/);let start=Number(match?.[1]||0),end=match?.[2]?Number(match[2]):bytes.length-1;if(match&&!match[1]&&match[2]){start=Math.max(0,bytes.length-Number(match[2]));end=bytes.length-1}if(!match||(!match[1]&&!match[2])||start>=bytes.length||end<start)return new Response(null,{status:416,headers:{...headers,'content-range':`bytes */${bytes.length}`}});end=Math.min(end,bytes.length-1);headers['content-range']=`bytes ${start}-${end}/${bytes.length}`;headers['content-length']=String(end-start+1);return new Response(request.method==='HEAD'?null:bytes.slice(start,end+1),{status:206,headers})}headers['content-length']=String(bytes.length)}
 return new Response(request.method==='HEAD'?null:bytes,{headers});
}
