export function get(url, params){
    return new Promise((succ,err)=>{
        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", e=> {
            try {
                const r=JSON.parse(e.target.responseText);
                succ(r);
            } catch (ex) {
                err(ex);
            }
        });
        oReq.open("GET", url+"?"+encodeParams(params));
        oReq.send();
    });
}
export function encodeParams(params) {
    return Object.keys(params).map(k=>`${k}=${encodeURIComponent(params[k])}`).join("&");
}
export function post(url, params){
    return new Promise((succ,err)=>{
        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", e=> {
            try {
                const r=JSON.parse(e.target.responseText);
                succ(r);
            } catch (ex) {
                console.log(e.target.responseText);
                err(ex);
            }
        });
        oReq.open("POST", url);
        oReq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        oReq.send(encodeParams(params));
    });
}
