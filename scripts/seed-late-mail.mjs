import fs from 'node:fs';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url),M=require('../dist/model.js');
import LM from './test-live-model.mjs';import {parseRace} from '../worker/live.mjs';import {buildLateMail} from '../worker/late-mail.mjs';
const original=JSON.parse(fs.readFileSync('dist/data.json')),editorial=JSON.parse(fs.readFileSync('dist/editorial.json')),gearBase=JSON.parse(fs.readFileSync('dist/gear-baseline.json')),notes=JSON.parse(fs.readFileSync('dist/late-mail-notes.json'));
const now=new Date().toISOString(),races=Array.from({length:9},(_,i)=>parseRace(fs.readFileSync(`/tmp/oaks-mail-raw/race${i+1}.html`,'utf8'),i+1,new Date(fs.statSync(`/tmp/oaks-mail-raw/race${i+1}.html`).mtime).toISOString()));
const snapshot=buildLateMail({original,editorial,gearBase,feed:{date:original.date,checked:now,races,errors:[]},previous:null,notes,runKey:'2026-11-05-initial',now},M,LM);
fs.writeFileSync('dist/late-mail.json',JSON.stringify(snapshot)+'\n');console.log(JSON.stringify({updated:snapshot.updated,races:snapshot.meeting.races.length,revision:Object.values(snapshot.selections).map(s=>({race:s.number,baseline:s.baselineTip?.display,revised:s.revisedTip?.display,going:s.reportedGoing}))}));
