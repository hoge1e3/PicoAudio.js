import {names as instNames} from './instruments.js';
import {get,post} from "./data.js";
import * as exprs from "./expr.js";
export function setup(picoAudio) {
    let insts={};
    let id=localStorage.pico_id;
    if (!id) {
        id=localStorage.pico_id=(Math.random()+"").substring(2);
    }
    const elem=(tag, parent) => {
        if (typeof parent==="string" && typeof tag==="object") {
            [tag,parent]=[parent,tag];
        }
        const r=document.createElement(tag);
        if (parent) parent.appendChild(r);
        return r;
    };
    const add=(p, c)=>{
        p.appendChild(c.dom||c);
        return c;
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
        insts[e.instrument].flash(e);
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
        const keyboard=elem("canvas",dom);
        keyboard.setAttribute("width", 128);
        keyboard.setAttribute("height", 16);
        const ctx=keyboard.getContext("2d");
        const level=elem("span", dom);
        level.innerHTML=instNo+": "+instNames[instNo];
        const _instNode={no:instNo, dom, flash, /*mute, set,*/ reload,  };
        _instNode.editor=exprEditor(_instNode);
        const ui_wavList=elem("div", parent);
        function reload(doSet) {
            ui_wavList.innerHTML="";
            get(url,{no:instNo}).then(r=>{
                console.log(r);
                if (Object.keys(r).length==0) {
                    const rex=randcands[Math.floor(Math.random()*randcands.length)];
                    r[rex]={time:new Date().getTime()/1000, likes:{}};
                }
                const ws=[];
                for (let e of Object.keys(r)) {
                    //console.log(r[e]);
                    r[e].no=instNo;
                    r[e].expr=e;
                    ws.push(waveNode(_instNode, r[e]));
                }
                ws.sort((a,b)=>b.likeCount-a.likeCount);
                for (let we of ws) add(ui_wavList,we);
                if (doSet) {
                    ws[0].load();
                }
            },e=>console.error(e));
        }
        reload(true);
        let levelVal=5;
        function flash(e) {
            levelVal=5;
            ctx.globalAlpha=1;
            ctx.fillStyle="white";
            ctx.fillRect(e.pitch,0,2,16);
        }
        const th=setInterval(()=>{
            ctx.globalAlpha=0.1;
            ctx.fillStyle="black";
            ctx.fillRect(0,8,128,16);
            level.setAttribute("class", `level-${levelVal}`);
            levelVal-=5;
            if (levelVal<0) levelVal=0;
            if (!parent.contains(dom)) {
                console.log("dom cleared");
                clearInterval(th);
            }
        },100);
        return _instNode;
    }
    function exprEditor(instNode) {
        const {no, reload}=instNode;
        const dom=elem(instNode.dom, "div");
        const ui_expr=elem(dom, "input");
        const ui_send=elem(dom, "button");
        const ui_like=elem(dom, "button");
        ui_send.innerHTML="Save";
        ui_like.innerHTML="Like!";
        ui_send.addEventListener("click", r=>{
            post(url, {no, expr: ui_expr.value}).then(r=>{
                console.log(r);
                reload();
            }, e=>{
                console.log(e);
                console.error(e);
            });
        });
        ui_like.addEventListener("click", r=>{
            ui_like.disabled=true;
            post(url, {no, expr: ui_expr.value, like: id}).then(r=>{
                console.log(r);
                reload();
            }, e=>{
                console.log(e);
                console.error(e);
            });
        });
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
        function load(expr) {
            if (ui_expr.value===expr) return;
            ui_expr.value=expr;
            set();
        }
        ui_expr.addEventListener("input", set);
        return {dom, load};
    }
    const url="data.php";
    function muteOther(no) {

    }
    function waveNode(instNode, info) {
        const dom=elem(instNode.dom, "span");
        dom.setAttribute("class","waveNode");
        //const ui_expr=elem("input",dom);
        const {no,expr}=info;
        let likeCount=0;
        if (info.likes) {
            for (let k of Object.keys(info.likes)) {
                likeCount+=info.likes[k];
            }
        }
        dom.innerText=expr+(likeCount>0?` ❤${likeCount}`:"");
        dom.addEventListener("click", load);
        function load() {
            instNode.editor.load(expr);
        }
        return {dom, load, likeCount};
        //const ui_send=elem("button",dom);
        /*const set=r=>{
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
        return {dom};*/
    }
}
