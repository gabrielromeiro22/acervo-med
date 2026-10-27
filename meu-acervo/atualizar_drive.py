import sys,re,html,json,urllib.request,concurrent.futures as cf
UA={'User-Agent':'Mozilla/5.0'}
def ls(fid):
    import subprocess; t=subprocess.run(["curl","-sL","-A","Mozilla/5.0",f"https://drive.google.com/embeddedfolderview?id={fid}"],capture_output=True,text=True).stdout
    out=[]
    for m in re.finditer(r'<div class="flip-entry" id="entry-([^"]+)".*?<a href="([^"]+)".*?flip-entry-title">([^<]+)<',t,re.S):
        i,href,name=m.group(1),html.unescape(m.group(2)),html.unescape(m.group(3))
        out.append({'id':i,'name':name,'folder':'/folders/' in href})
    return out
def walk(fid,path,acc):
    for e in ls(fid):
        p=path+'/'+e['name']
        if e['folder']: walk(e['id'],p,acc)
        else: acc.append({'id':e['id'],'path':p})
root=sys.argv[1]; acc=[]
top=ls(root)
def job(e):
    a=[]
    if e['folder']: walk(e['id'],e['name'],a)
    else: a.append({'id':e['id'],'path':e['name']})
    return a
with cf.ThreadPoolExecutor(8) as ex:
    for r in ex.map(job,top): acc+=r
json.dump(acc,open(sys.argv[2],'w'),ensure_ascii=False,indent=1)
print(len(acc))
# gera data.js para o app
import os,re
out=[[x['id'],re.sub(r'\s*\(www\.acervo\.top\)','',x['path'])] for x in acc if 'WWW.ACERVO.VIP' not in x['path'].upper()]
open(os.path.join(os.path.dirname(os.path.abspath(sys.argv[2])),'data.js'),'w').write('window.ACERVO='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';')
