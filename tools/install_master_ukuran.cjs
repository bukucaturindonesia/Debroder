#!/usr/bin/env node
'use strict';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs=require('node:fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path=require('node:path');
const args=process.argv.slice(2);
const apply=args.includes('--apply');
const repoArg=args.find(x=>x!=='--apply');
if(!repoArg){console.error('Usage: node tools/install_master_ukuran.cjs "C:\\path\\to\\Debroder" --apply');process.exit(2)}
const repo=path.resolve(repoArg.trim().replace(/^"|"$/g,''));
const pkg=path.resolve(__dirname,'..');
const sourceFile='components/TieredProductPurchasePanel.tsx';
const srcFiles=['components/product/MasterKaosSizeGuide.tsx','lib/master-kaos-size-guide.ts','test/master-kaos-size-guide.test.ts','public/images/size-guide/kaos-lengan-pendek.webp','public/images/size-guide/kaos-lengan-panjang.webp'];
const importAnchor='import type { ProductVariant } from "@/lib/types";';
const newImports='import { MasterKaosSizeGuide } from "@/components/product/MasterKaosSizeGuide";\nimport { isKaosSizeGuideApplicable } from "@/lib/master-kaos-size-guide";';
const selectorAnchor='        </fieldset>\n\n        <section aria-labelledby="pdp-quantity-title">';
const selectorReplacement=`          {isKaosSizeGuideApplicable(product.name, product.category, subcategory) ? (
            <div className="mt-3">
              <MasterKaosSizeGuide
                productName={product.name}
                category={product.category}
                subcategory={subcategory}
              />
            </div>
          ) : null}
        </fieldset>

        <section aria-labelledby="pdp-quantity-title">`;
const marker='## DEBRODER MASTER PANDUAN UKURAN V1 — UI ONLY';
function fail(message){console.error('BLOCKED: '+message);process.exit(2)}
if(!fs.existsSync(path.join(repo,'AGENTS.md'))||!fs.existsSync(path.join(repo,'app','produk','[slug]','page.tsx'))) fail('Pilih folder root repository DEBRODER, bukan folder ZIP.');
const panel=path.join(repo,sourceFile);
if(!fs.existsSync(panel))fail(sourceFile+' not found');
const old=fs.readFileSync(panel,'utf8').replace(/\r\n/g,'\n');
let modified=old;
if(old.includes(newImports)&&old.includes(selectorReplacement)){
 console.log('Panel size-guide already integrated; no duplicate edits.');
}else if(old.includes(newImports)||old.includes(selectorReplacement)){
 fail('Partial integration found, inspect the existing file manually.');
}else{
 if(old.split(importAnchor).length!==2||old.split(selectorAnchor).length!==2)fail('Purchase panel drift; no files changed.');
 modified=old.replace(importAnchor,importAnchor+'\n'+newImports).replace(selectorAnchor,selectorReplacement);
}
const changes=[];
for(const rel of srcFiles){
 const src=path.join(pkg,rel),dest=path.join(repo,rel);
 if(!fs.existsSync(src))fail('Missing package file: '+rel);
 const content=fs.readFileSync(src);
 if(fs.existsSync(dest)&&!fs.readFileSync(dest).equals(content))fail('Would overwrite a different file: '+rel);
 if(!fs.existsSync(dest))changes.push({rel,dest,content});
}
if(modified!==old)changes.push({rel:sourceFile,dest:panel,content:Buffer.from(modified,'utf8')});
console.log('DEBRODER folder: '+repo+'\nChanges: '+changes.length);
for(const x of changes)console.log((apply?'APPLY ':'CHECK ')+x.rel);
if(!apply){console.log('DRY RUN ONLY. Add --apply to install.');process.exit(0)}
for(const x of changes){fs.mkdirSync(path.dirname(x.dest),{recursive:true});fs.writeFileSync(x.dest,x.content)}
const handoff=path.join(repo,'CURRENT_PHASE_HANDOFF.md');
if(fs.existsSync(handoff)&&!fs.readFileSync(handoff,'utf8').includes(marker)){
 fs.appendFileSync(handoff,`\n\n${marker}\n- Owner-approved references: short/long-sleeve master screenshots (21 October 2026).\n- Scope: PDP size selector UI, dialog/table and original cropped WebP diagrams only.\n- Status: local installer applied; repository tests, typecheck, lint and build NOT RUN by this script.\n- Remote/staging/production/SQL/deploy/data changes: NONE from this installer.\n- Next: run focused test, pnpm typecheck, targeted lint, pnpm build, browser QA, then review and release separately.\n`, 'utf8');
}
console.log('SUCCESS: Local size guide installed. Website deployment NOT triggered.');
