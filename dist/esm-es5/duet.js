import{p as plt,w as win,d as doc,N as NAMESPACE,a as promiseResolve,b as bootstrapLazy}from"./index-2345c279.js";var getDynamicImportFunction=function(e){return"__sc_import_"+e.replace(/\s|-/g,"_")};var patchBrowser=function(){{plt.$cssShim$=win.__cssshim}var e=Array.from(doc.querySelectorAll("script")).find((function(e){return new RegExp("/"+NAMESPACE+"(\\.esm)?\\.js($|\\?|#)").test(e.src)||e.getAttribute("data-stencil-namespace")===NAMESPACE}));var r="";var t={};if(r!==""){t.resourcesUrl=new URL(".",r).href}else{t.resourcesUrl=new URL(".",new URL(e.getAttribute("data-resources-url")||e.src,win.location.href)).href;{patchDynamicImport(t.resourcesUrl,e)}if(!win.customElements){return import("./dom-424264d0.js").then((function(){return t}))}}return promiseResolve(t)};var patchDynamicImport=function(e,r){var t=getDynamicImportFunction(NAMESPACE);try{win[t]=new Function("w","return import(w);//"+Math.random())}catch(i){var n=new Map;win[t]=function(i){var o=new URL(i,e).href;var a=n.get(o);if(!a){var c=doc.createElement("script");c.type="module";c.crossOrigin=r.crossOrigin;c.src=URL.createObjectURL(new Blob(["import * as m from '"+o+"'; window."+t+".m = m;"],{type:"application/javascript"}));a=new Promise((function(e){c.onload=function(){e(win[t].m);c.remove()}}));n.set(o,a);doc.head.appendChild(c)}return a}}};patchBrowser().then((function(e){return bootstrapLazy([["duet-date-picker",[[0,"duet-date-picker",{name:[1],identifier:[1],disabled:[516],role:[1],direction:[1],required:[4],value:[513],min:[1],max:[1],firstDayOfWeek:[2,"first-day-of-week"],localization:[16],dateAdapter:[16],activeFocus:[32],focusedDay:[32],open:[32],setFocus:[64],show:[64],hide:[64]},[[6,"click","handleDocumentClick"]]]]]],e)}));