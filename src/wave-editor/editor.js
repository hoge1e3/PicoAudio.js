import {names as instNames} from './instruments.js';
import {get,post} from "./data.js";
import * as exprs from "./expr.js";
export function setup(picoAudio) {
    let insts={};
    const elem=(tag, parent) => {
        if (typeof parent==="string" && typeof tag==="object") {
            [tag,parent]=[parent,tag];
        }
        const r=document.createElement(tag);
        if (parent) parent.appendChild(r);
        return r;
    };
    const instsDOM=document.querySelector("#instruments");
    document.querySelector("#clear").addEventListener("click", ()=>{
        instsDOM.innerHTML="";
        insts={};
    });
    const vol=document.querySelector("#volume");
    vol.addEventListener("input", ()=>{
        picoAudio.setMasterVolume(vol.value);
    });
    picoAudio.addEventListener('noteOn',e => {
        //console.log(e);
        if (!insts[e.instrument]) {
            insts[e.instrument]=instNode(instsDOM, e.instrument);//document.createElement("div");
            //instNode.innerHTML=e.instrument+": "+instNames[e.instrument];
            //document.body.appendChild(n);
        }
        insts[e.instrument].flash();
    });
    const randcands=[
    "s(t+s(t*5)*0.16)*0.9",
    "s(t+s(t*1/2)*1.48)*0.9",
    "s(t+s(t*1)*1.1)*0.9",
    "s(t+s(t*3)*0.75)*0.9",
    "s(t+s(t*8)*0.1)*0.9",
    "s(t+s(t*1/2)*0.6)*0.9",
    "s(t+s(t*1/4)*1.4)*0.9",
    "s(t+s(t*1)*1)*0.9",
    "s(t+s(t*2/1)*0.18)*0.9",
    "s(t+s(t*1/1)*0.5)*0.9",
    ];
    function instNode(parent, instNo) {
        const dom=elem("div", parent);
        const level=elem("span", dom);
        level.innerHTML=instNo+": "+instNames[instNo];
        const res={dom, flash};//, mute, set};
        exprEditor(res);
        get(url,{no:instNo}).then(r=>{
            console.log(r);
            if (Object.keys(r).length==0) {
                const rex=randcands[Math.floor(Math.random()*randcands.length)];
                r[rex]={time:new Date().getTime()/1000, likes:0};
            }
            let doSet=true;
            for (let e of Object.keys(r)) {
                //console.log(r[e]);
                r[e].no=instNo;
                waveNode(res, e, r[e], doSet);
                doSet=false;
            }
        },e=>console.error(e));
        let levelVal=5;
        function flash() {
            levelVal=5;
        }
        const th=setInterval(()=>{
            level.setAttribute("class", `level-${levelVal}`);
            levelVal-=5;
            if (levelVal<0) levelVal=0;
            if (!parent.contains(dom)) {
                console.log("dom cleared");
                clearInterval(th);
            }
        },100);
        return res;
    }
    function exprEditor() {
        
    }
    const url="data.php";
    function muteOther(no) {

    }
    function waveNode(parent, expr, info, doSet) {
        const res=elem(parent.dom, "span");
        const ui_expr=elem("input",res);
        const no=info.no;
        const ui_send=elem("button",res);
        const set=r=>{
            //s(t+s(t*1)*0.5)*0.8
            //s(t+s(t*2)*0.1)
            try {
                const f=exprs.parse(ui_expr.value);
                const mult=4;
                const lambda=picoAudio.context.sampleRate/picoAudio.baseFreq;
                const aryLen=lambda*mult;
                const a=[];
                for (let i=0;i<aryLen;i++) {
                    a.push(f(i/lambda));
                }
                picoAudio.setWaveData(no,a);
                ui_expr.setAttribute("class","");
                ui_send.disabled=false;
            } catch(e) {
                //console.error(e);
                ui_expr.setAttribute("class","error");
                ui_send.disabled=true;
            }
        };
        ui_expr.value=expr;
        ui_expr.addEventListener("input", set);
        if (doSet) set();
        ui_expr.addEventListener("focus", set);
        ui_send.innerHTML="Save";
        ui_send.addEventListener("click", r=>{
            post(url, {no, expr: ui_expr.value}).then(r=>{
                console.log(r);
            }, e=>{
                console.log(e);
                console.error(e);
            });
        });
        return res;
    }
}
