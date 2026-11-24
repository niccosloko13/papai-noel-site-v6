const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const source=fs.readFileSync(path.join(root,"admin.js"),"utf8");
const html=fs.readFileSync(path.join(root,"admin.html"),"utf8");
const navIds=[...html.matchAll(/data-tab="([^"]+)"/g)].map(match=>match[1]);
const panelIds=[...html.matchAll(/<section class="admin-panel[^"]*" id="([^"]+)"/g)].map(match=>match[1]);

function classList(initial=[]){
 const values=new Set(initial);
 return {
  toggle(name,force){if(force===undefined){if(values.has(name))values.delete(name);else values.add(name)}else if(force)values.add(name);else values.delete(name)},
  contains(name){return values.has(name)}
 };
}
function createHarness(){
 const nav=navIds.map(id=>({dataset:{tab:id},classList:classList(["nav-item"]),attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]}}));
 const panels=panelIds.map(id=>({id,hidden:id!=="dashboard",classList:classList(["admin-panel",...(id==="dashboard"?["active"]:[])])}));
 const labels={"#sectionEyebrow":{textContent:""},"#sectionTitle":{textContent:""}};
 let clickHandler=null;
 const document={
  getElementById(id){return panels.find(panel=>panel.id===id)||null},
  querySelector(selector){return labels[selector]||null},
  querySelectorAll(selector){if(selector===".nav-item")return nav;if(selector===".admin-panel")return panels;return []},
  addEventListener(type,handler){if(type==="click")clickHandler=handler}
 };
 const calls=[];
 const context={
  document,window:{scrollTo(){}},
  $:selector=>labels[selector]||null,
  $$:selector=>document.querySelectorAll(selector),
  titles:{
   dashboard:["LOJA","Visão geral"],orders:["LOJA","Pedidos"],products:["LOJA","Produto"],
   logistics:["OPERAÇÃO","Logística"],inventory:["OPERAÇÃO","Estoque"],
   finance:["GESTÃO","Financeiro"],checkout:["LOJA","Checkout próprio"]
  },
  renderOrders(){calls.push("orders")},renderLogistics(){calls.push("logistics")},
  loadInventory(){calls.push("inventory")},renderFinance(){calls.push("finance")}
 };
 const start=source.indexOf("function selectTab(id){");
 const end=source.indexOf("\n\nlet serverOrders=[];",start);
 assert.ok(start>=0&&end>start,"navigation handler exists in admin.js");
 vm.runInNewContext(source.slice(start,end),context);
 assert.equal(typeof clickHandler,"function","delegated click listener is registered");
 return {nav,panels,labels,clickHandler,calls};
}

test("every visible sidebar option switches to its matching panel",()=>{
 const h=createHarness();
 assert.ok(navIds.length>=6);
 for(const id of navIds){
  const button=h.nav.find(item=>item.dataset.tab===id);
  let prevented=false;
  h.clickHandler({target:{closest:()=>button},preventDefault(){prevented=true}});
  assert.equal(prevented,true,"click default prevented for "+id);
  assert.equal(h.panels.find(panel=>panel.id===id).hidden,false,"panel shown for "+id);
  assert.equal(h.panels.filter(panel=>!panel.hidden).length,1,"only one panel visible after "+id);
  assert.equal(button.classList.contains("active"),true,"nav item active for "+id);
  assert.equal(h.nav.filter(item=>item.classList.contains("active")).length,1,"only one nav item active");
 }
});

test("dashboard shortcut opens the orders panel",()=>{
 const h=createHarness();
 let prevented=false;
 const button={dataset:{openTab:"orders"}};
 h.clickHandler({target:{closest:()=>button},preventDefault(){prevented=true}});
 assert.equal(prevented,true);
 assert.equal(h.panels.find(panel=>panel.id==="orders").hidden,false);
 assert.equal(h.panels.filter(panel=>!panel.hidden).length,1);
});
