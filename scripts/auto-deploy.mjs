import {spawnSync,execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,statSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';
export const branch='claude/compassionate-mayer-oigii3';
const sha=x=>createHash('sha256').update(x).digest('hex');
export function ciCommit(env=process.env,head=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()){
 if(env.WORKERS_CI!=='1'||env.WORKERS_CI_BRANCH!==branch||!/^[a-f0-9]{40}$/.test(env.WORKERS_CI_COMMIT_SHA||''))throw Error('Expected Workers Builds on the dedicated site branch');
 const commit=head();if(commit!==env.WORKERS_CI_COMMIT_SHA)throw Error('Checkout source mismatch');return commit;
}
export function manifest(directory='site'){
 const files=[];function walk(path,prefix=''){for(const name of readdirSync(path).sort()){
  const file=join(path,name),relative=prefix+name;if(statSync(file).isDirectory()){walk(file,relative+'/');continue;}
  if(relative==='release-assets.json')continue;
  if(/(?:^|\/)\.|\.(?:map|pem|key|p12|pfx|zip)$/i.test(relative)||statSync(file).size>25*1024*1024)throw Error('Unsafe release asset');
  files.push({file:relative,sha256:sha(readFileSync(file))});
 }}walk(directory);if(!files.some(f=>f.file==='index.html')||!files.some(f=>f.file==='lil-guy.js'))throw Error('Incomplete site artifact');return files;
}
export function verifyArtifact(commit,directory='site'){
 if(JSON.parse(readFileSync(join(directory,'version.json'))).sourceCommit!==commit)throw Error('Artifact source mismatch');
 const saved=JSON.parse(readFileSync(join(directory,'release-assets.json')));if(saved.sourceCommit!==commit||JSON.stringify(saved.files)!==JSON.stringify(manifest(directory)))throw Error('Artifact integrity mismatch');
}
export function latestSource(commit,read=()=>execFileSync('git',['ls-remote','origin','refs/heads/'+branch],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim().split(/\s/)[0]){
 if(read()!==commit)throw Error('Site branch advanced; keep the current release active');
}
export async function release(commit,{verify=()=>verifyArtifact(commit),current=()=>latestSource(commit),run=(args,extra={})=>spawnSync('npx',args,{stdio:'inherit',env:{...process.env,...extra}}),wait=pause,inspect=args=>spawnSync('npx',args,{encoding:'utf8'}),readOutput=p=>readFileSync(p,'utf8')}={}){
 verify();current();const dir=mkdtempSync(join(tmpdir(),'lilguys-upload-'));const config=['--config','wrangler.jsonc'];
 try{const output=join(dir,'upload.jsonl');const base=['--yes','wrangler@4.151.0','versions'];
  if(run([...base,'upload',...config,'--keep-vars','--tag',commit],{WRANGLER_OUTPUT_FILE_PATH:output}).status!==0)throw Error('Worker upload failed');
  const records=readOutput(output).split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(x=>x.type==='version-upload');
  if(records.length!==1||records[0].worker_name!=='lilguys'||records[0].version!==1||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(records[0].version_id||''))throw Error('Unexpected uploaded version');
  const id=records[0].version_id;let visible=false;
  for(let attempt=0;attempt<10;attempt++){
   const result=inspect([...base,'view',id,...config,'--json']);
   if(result.status===0){const v=JSON.parse(result.stdout);if(v.id!==id||v.annotations?.['workers/tag']!==commit)throw Error('Uploaded source mismatch');visible=true;break;}
   if(!/100146/.test((result.stderr||'')+(result.stdout||'')))throw Error('Unable to inspect uploaded version');
   if(attempt<9)await wait(20000);
  }
  if(!visible)throw Error('Uploaded version not yet visible');verify();current();
  if(run([...base,'deploy','--version-id',id,'--percentage','100','--yes',...config]).status!==0)throw Error('Worker activation failed');
 }finally{rmSync(dir,{recursive:true,force:true});}
}
async function main(){const commit=ciCommit();if(process.argv.includes('--deploy'))return release(commit);
 for(const [cmd,args] of [['bun',['run','showcase']],['bash',['scripts/build-site.sh']]])if(spawnSync(cmd,args,{stdio:'inherit'}).status!==0)throw Error('Site build failed');
 writeFileSync('site/version.json',JSON.stringify({sourceCommit:commit,hosting:'cloudflare-lilguys'}));
 writeFileSync('site/release-assets.json',JSON.stringify({sourceCommit:commit,files:manifest()}));verifyArtifact(commit);
 console.log(JSON.stringify({sourceCommit:commit,files:manifest().length,apiConfigurationChanged:false}));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
