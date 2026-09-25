/* SafetyAssure v2 — E2B(R3)-oriented ICSR entry + MIS */
const C=window.SAFETYASSURE_CONFIG||{};
const SAAS=!!(C.supabaseUrl&&C.supabasePublishableKey&&window.supabase);
const sb=SAAS?window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey):null;
const KEY="safetyassure_demo_v2";
const today=()=>new Date().toISOString().slice(0,10);
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const statusLabel=s=>({NEW:"New",DATA_ENTRY:"Data Entry",MEDICAL_REVIEW:"Medical Review",QC_REVIEW:"QC Review",READY_FOR_DISTRIBUTION:"Ready for Distribution",DISTRIBUTED:"Distributed",FOLLOW_UP:"Follow-up",CLOSED:"Closed"}[s]||s);
const statusClass=s=>({NEW:"new",DATA_ENTRY:"data",MEDICAL_REVIEW:"medical",QC_REVIEW:"qc",READY_FOR_DISTRIBUTION:"ready",DISTRIBUTED:"distributed",FOLLOW_UP:"follow",CLOSED:"closed"}[s]||"new");
const nextStates={NEW:["DATA_ENTRY"],DATA_ENTRY:["MEDICAL_REVIEW"],MEDICAL_REVIEW:["QC_REVIEW"],QC_REVIEW:["READY_FOR_DISTRIBUTION"],READY_FOR_DISTRIBUTION:["DISTRIBUTED","FOLLOW_UP"],DISTRIBUTED:["FOLLOW_UP","CLOSED"],FOLLOW_UP:["MEDICAL_REVIEW","CLOSED"],CLOSED:[]};

const seed=[
 {case_id:"CA-2026-00001",receipt_date:"2026-09-18",country:"Canada",source:"Patient",patient_age:54,patient_sex:"F",product:"Product A",event:"Headache",meddra_pt:"Headache",seriousness:"Non-serious",outcome:"Recovering",status:"DATA_ENTRY",due_date:"2026-09-25",assignee:"Case Processor",narrative:"Patient reported headache two days after treatment."},
 {case_id:"CA-2026-00002",receipt_date:"2026-09-19",country:"USA",source:"HCP",patient_age:66,patient_sex:"M",product:"Product B",event:"Rash",meddra_pt:"Rash",seriousness:"Serious",outcome:"Recovering",status:"MEDICAL_REVIEW",due_date:"2026-09-26",assignee:"Medical Reviewer",narrative:"Serious rash requiring medical assessment."},
 {case_id:"CA-2026-00003",receipt_date:"2026-09-20",country:"UK",source:"Patient Support Program",patient_age:43,patient_sex:"F",product:"Product C",event:"Nausea",meddra_pt:"Nausea",seriousness:"Non-serious",outcome:"Recovered",status:"READY_FOR_DISTRIBUTION",due_date:"2026-09-27",assignee:"PV Manager",narrative:"PSP-originated case."},
 {case_id:"CA-2026-00004",receipt_date:"2026-09-21",country:"Germany",source:"Regulatory Authority",patient_age:71,patient_sex:"M",product:"Product A",event:"Anaphylaxis",meddra_pt:"Anaphylactic reaction",seriousness:"Serious",outcome:"Recovered",status:"QC_REVIEW",due_date:"2026-09-28",assignee:"QC Reviewer",narrative:"Serious allergic reaction; medical review completed."},
 {case_id:"CA-2026-00005",receipt_date:"2026-09-22",country:"France",source:"HCP",patient_age:38,patient_sex:"F",product:"Product D",event:"Fatigue",meddra_pt:"Fatigue",seriousness:"Non-serious",outcome:"Unknown",status:"NEW",due_date:"2026-09-29",assignee:"Unassigned",narrative:"Initial report received."},
 {case_id:"CA-2026-00006",receipt_date:"2026-09-23",country:"Canada",source:"Patient",patient_age:59,patient_sex:"M",product:"Product B",event:"Dizziness",meddra_pt:"Dizziness",seriousness:"Non-serious",outcome:"Recovering",status:"DISTRIBUTED",due_date:"2026-09-30",assignee:"Regulatory",narrative:"Distributed to applicable authority."}
];

const blankE2B=()=>({
  identifiers:{worldwide_case_id:"",sender_case_id:"",local_case_id:"",duplicate_case_number:"",reporter_case_version:"",case_creation_date:"",most_recent_receipt_date:"",first_receipt_date:"",additional_documents:""},
  report:{type:"Spontaneous",reporter_country:"Canada",initial_or_followup:"Initial",nullification:"",nullification_reason:"",report_source:"",case_narrative:"",case_comments:""},
  primarySource:{qualification:"Healthcare Professional",literature_reference:"",reporter_organization:"",reporter_given_name:"",reporter_family_name:"",reporter_address:"",reporter_city:"",reporter_state:"",reporter_postal:"",reporter_country:"Canada",reporter_phone:"",reporter_email:"",privacy:""},
  patient:{initials:"",age:"",age_unit:"Years",dob:"",sex:"Unknown",weight:"",weight_unit:"kg",height:"",height_unit:"cm",last_menstrual_period:"",gestation:"",gestation_unit:"Weeks",pregnancy:"Unknown",death_date:"",autopsy:"Unknown",medical_history:"",medical_history_start:"",medical_history_end:"",medical_history_continuing:"",past_drug_history:"",past_drug_history_start:"",past_drug_history_end:"",parent_report:"No",parent_age:"",parent_sex:"",parent_lmp:"",parent_medical_history:""}),
  reactions:[{verbatim:"",pt:"",llt:"",soc:"",start:"",end:"",continuing:"Unknown",outcome:"Unknown",seriousness_death:false,seriousness_life:false,seriousness_hospitalization:false,seriousness_disability:false,seriousness_congenital:false,seriousness_other:false,seriousness_other_text:"",medical_confirmation:"",primary_source:""}],
  drugs:[{role:"Suspect",product_name:"",medicinal_product_id:"",active_substance:"",authorization_holder:"",country:"",dose:"",dose_unit:"",dose_interval:"",dose_interval_unit:"",route:"",form:"",strength:"",frequency:"",start:"",last_admin:"",duration:"",duration_unit:"",indication:"",action_taken:"",dechallenge:"Unknown",rechallenge:"Unknown",additional_info:"",characterization:""}],
  tests:[{test_name:"",test_date:"",result:"",unit:"",low:"",high:"",comment:""}],
  history:[{condition:"",meddra_pt:"",start:"",end:"",continuing:"Unknown",comment:""}],
  assessments:[{drug:"",reaction:"",method:"Global Introspection",result:"Not Applicable",assessor:"",comment:""}],
  narratives:[{type:"Case Narrative",text:"",language:"en"}],
  documents:[{type:"Source document",description:"",filename:""}],
  study:{study_name:"",study_number:"",sponsor:"",study_type:"",protocol_number:""},
  transmission:{sender_identifier:"",receiver_identifier:"",message_identifier:"",message_date:"",acknowledgement:""},
  metadata:{e2b_version:"R3 / ICH E2B(R3)",regional_profile:"International core",meddra_version:"",whodrug_version:"",idmp_version:""}
});

function load(){
  try{
    const d=JSON.parse(localStorage.getItem(KEY));
    if(d) return d;
  }catch{}
  return {
    cases:seed.map(c=>({...c,e2b:blankE2B()})),
    events:seed.map(c=>({id:uid(),case_id:c.case_id,action:"CASE_CREATED",detail:"Initial demo case",actor:"Demo User",at:new Date().toISOString()})),
    actions:[],settings:{org:"SafetyAssure Demo Organization"}
  }
}
let db=load(); let page="home"; let selected=null; let search=""; let filterStatus="ALL"; let filterSerious="ALL"; let misFrom=""; let misTo="";
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function toast(x){let e=document.createElement("div");e.className="toast";e.textContent=x;document.body.appendChild(e);setTimeout(()=>e.remove(),2400)}
function nextId(){return `CA-${new Date().getFullYear()}-${String(db.cases.length+1).padStart(5,"0")}`}
function addEvent(case_id,action,detail){db.events.unshift({id:uid(),case_id,action,detail,actor:"Current User",at:new Date().toISOString()})}
function nav(p){page=p;selected=null;render()}
function openCase(id){selected=db.cases.find(c=>c.case_id===id);page="case";render()}
function transition(c,to){if(!nextStates[c.status].includes(to))return toast("That workflow transition is not permitted.");let from=c.status;c.status=to;c.updated_at=new Date().toISOString();addEvent(c.case_id,"STATUS_CHANGED",`${statusLabel(from)} → ${statusLabel(to)}`);save();toast(`Case ${c.case_id} moved to ${statusLabel(to)}`);render()}
function pill(s,ser=false){return `<span class="pill ${ser?(s==="Serious"?"serious":"nserious"):statusClass(s)}">${esc(ser?s:statusLabel(s))}</span>`}
function kpi(label,val,note){return `<div class="card"><div class="kpi-label">${label}</div><div class="kpi-value">${val}</div><div class="kpi-note">${note||""}</div></div>`}

function modal(html){let m=document.createElement("div");m.className="modal";m.innerHTML=html;document.body.appendChild(m);m.addEventListener("click",e=>{if(e.target===m)m.remove()});return m}

function newCase(){
 const m=modal(`<div class="modal-card"><div class="modal-head"><b>Book In — New ICSR</b><button class="close">×</button></div>
 <form id="caseForm"><div class="modal-body"><div class="banner">Minimum ICSR validity gate: identifiable patient + identifiable reporter/source + suspect product + adverse event/reaction. Demo only — do not enter real patient data.</div>
 <div class="form-grid">
 <div class="field"><label>Receipt date</label><input name="receipt_date" type="date" value="${today()}" required></div>
 <div class="field"><label>Country</label><input name="country" value="Canada"></div>
 <div class="field"><label>Source</label><select name="source"><option>HCP</option><option>Patient</option><option>Patient Support Program</option><option>Regulatory Authority</option><option>Literature</option><option>Other</option></select></div>
 <div class="field"><label>Reporter qualification</label><select name="qualification"><option>Healthcare Professional</option><option>Consumer/Non-Healthcare Professional</option><option>Lawyer</option><option>Other</option><option>Unknown</option></select></div>
 <div class="field"><label>Patient age</label><input name="patient_age" type="number" min="0" max="130"></div>
 <div class="field"><label>Patient sex</label><select name="patient_sex"><option>Unknown</option><option>F</option><option>M</option><option>Other</option></select></div>
 <div class="field"><label>Suspect product</label><input name="product" required></div>
 <div class="field"><label>Event verbatim</label><input name="event" required></div>
 <div class="field"><label>Seriousness</label><select name="seriousness"><option>Non-serious</option><option>Serious</option></select></div>
 <div class="field"><label>Due date</label><input name="due_date" type="date"></div>
 </div></div><div class="modal-foot"><button type="button" class="btn close">Cancel</button><button class="btn primary">Create Case & Open E2B Data Entry</button></div></form></div>`);
 m.querySelectorAll(".close").forEach(x=>x.onclick=()=>m.remove());
 m.querySelector("#caseForm").onsubmit=e=>{e.preventDefault();let f=new FormData(e.target);let eb=blankE2B();
 eb.identifiers.first_receipt_date=f.get("receipt_date");eb.identifiers.most_recent_receipt_date=f.get("receipt_date");eb.report.reporter_country=f.get("country");eb.report.report_source=f.get("source");eb.primarySource.qualification=f.get("qualification");eb.primarySource.reporter_country=f.get("country");eb.patient.age=f.get("patient_age");eb.patient.sex=f.get("patient_sex");eb.reactions[0].verbatim=f.get("event");eb.drugs[0].product_name=f.get("product");
 let c={case_id:nextId(),receipt_date:f.get("receipt_date"),country:f.get("country"),source:f.get("source"),patient_age:f.get("patient_age"),patient_sex:f.get("patient_sex"),product:f.get("product"),event:f.get("event"),meddra_pt:"Not yet coded",seriousness:f.get("seriousness"),outcome:"Unknown",status:"NEW",due_date:f.get("due_date")||f.get("receipt_date"),assignee:"Unassigned",narrative:"",e2b:eb};
 db.cases.unshift(c);addEvent(c.case_id,"CASE_CREATED","Case booked in; E2B(R3) data-entry record created");save();m.remove();selected=c;page="case";render();toast(`${c.case_id} created`)}
}

const sections=[
 ["C","Case Identification & Report Information"],
 ["D","Patient Characteristics"],
 ["E","Reaction / Event"],
 ["F","Results of Tests and Procedures"],
 ["G","Drug Information"],
 ["H","Narrative & Case Summary"],
 ["Reporter","Primary Source / Reporter"],
 ["History","Medical & Past Drug History"],
 ["Assessment","Medical Assessment / Causality"],
 ["Study","Study Identification"],
 ["Transmission","Transmission / Message Metadata"],
 ["Documents","Source Documents & Attachments"]
];
let e2bSection="C";

function field(label,key,val,type="text",help=""){return `<div class="field"><label>${label}<span class="e2bcode">${help}</span></label><input data-key="${key}" value="${esc(val)}" type="${type}"></div>`}
function selectField(label,key,val,opts,help=""){return `<div class="field"><label>${label}<span class="e2bcode">${help}</span></label><select data-key="${key}">${opts.map(o=>`<option ${o===val?"selected":""}>${esc(o)}</option>`).join("")}</select></div>`}
function area(label,key,val,help=""){return `<div class="field full"><label>${label}<span class="e2bcode">${help}</span></label><textarea data-key="${key}">${esc(val)}</textarea></div>`}

function sectionForm(c){
 const e=c.e2b||blankE2B();
 if(e2bSection==="C") return `<div class="form-grid">
 ${field("Worldwide Unique Case Identification","identifiers.worldwide_case_id",e.identifiers.worldwide_case_id,"text","C.1.8.1")}
 ${field("Sender's Case Safety Report Unique Identifier","identifiers.sender_case_id",e.identifiers.sender_case_id,"text","C.1.1")}
 ${field("Local Report Number","identifiers.local_case_id",e.identifiers.local_case_id,"text","C.1.2")}
 ${selectField("Type of Report","report.type",e.report.type,["Spontaneous","Report from Study","Other","Not available"],"C.1.3")}
 ${selectField("Initial / Follow-up","report.initial_or_followup",e.report.initial_or_followup,["Initial","Follow-up"],"C.1.4")}
 ${field("Date of First Receipt","identifiers.first_receipt_date",e.identifiers.first_receipt_date,"date","C.1.5")}
 ${field("Date of Most Recent Information","identifiers.most_recent_receipt_date",e.identifiers.most_recent_receipt_date,"date","C.1.6")}
 ${field("Date Case Was Created","identifiers.case_creation_date",e.identifiers.case_creation_date,"date","C.1.7")}
 ${field("Duplicate / Related Case Number","identifiers.duplicate_case_number",e.identifiers.duplicate_case_number,"text","C.1.10.1")}
 ${selectField("Nullification Report","report.nullification",e.report.nullification,["","Yes","No"],"C.1.11")}
 ${field("Reason for Nullification","report.nullification_reason",e.report.nullification_reason,"text","C.1.11.1")}
 ${selectField("Report Source","report.report_source",e.report.report_source,["HCP","Patient","Patient Support Program","Regulatory Authority","Literature","Other"],"C.2 / source")}
 ${field("Reporter Country","report.reporter_country",e.report.reporter_country,"text","C.2.r.3")}
 ${area("Case Comments","report.case_comments",e.report.case_comments,"C / local")}
 </div>`;
 if(e2bSection==="D") return `<div class="form-grid">
 ${field("Patient Initials","patient.initials",e.patient.initials,"text","D.1")}
 ${field("Patient Age","patient.age",e.patient.age,"number","D.2")}
 ${selectField("Age Unit","patient.age_unit",e.patient.age_unit,["Years","Months","Weeks","Days","Hours"],"D.2.1")}
 ${field("Date of Birth","patient.dob",e.patient.dob,"date","D.2.2")}
 ${selectField("Patient Sex","patient.sex",e.patient.sex,["Unknown","Male","Female","Other"],"D.5")}
 ${field("Weight","patient.weight",e.patient.weight,"number","D.3")}
 ${field("Weight Unit","patient.weight_unit",e.patient.weight_unit,"text","UCUM")}
 ${field("Height","patient.height",e.patient.height,"number","D.4")}
 ${field("Height Unit","patient.height_unit",e.patient.height_unit,"text","UCUM")}
 ${field("Last Menstrual Period Date","patient.last_menstrual_period",e.patient.last_menstrual_period,"date","D.6")}
 ${field("Gestation","patient.gestation",e.patient.gestation,"number","D.7")}
 ${field("Gestation Unit","patient.gestation_unit",e.patient.gestation_unit,"text","D.7.1")}
 ${selectField("Pregnancy","patient.pregnancy",e.patient.pregnancy,["Unknown","Yes","No"],"D.7")}
 ${field("Date of Death","patient.death_date",e.patient.death_date,"date","D.9.1")}
 ${selectField("Autopsy","patient.autopsy",e.patient.autopsy,["Unknown","Yes","No"],"D.9.2")}
 ${selectField("Parent Report","patient.parent_report",e.patient.parent_report,["No","Yes"],"D.10")}
 ${field("Parent Age","patient.parent_age",e.patient.parent_age,"number","D.10.1")}
 ${selectField("Parent Sex","patient.parent_sex",e.patient.parent_sex,["Unknown","Male","Female","Other"],"D.10.6")}
 ${field("Parent LMP","patient.parent_lmp",e.patient.parent_lmp,"date","D.10.3")}
 ${area("Relevant Medical History / Concurrent Conditions","patient.medical_history",e.patient.medical_history,"D.7.2")}
 ${field("Medical History Start Date","patient.medical_history_start",e.patient.medical_history_start,"date","D.7.1.r.2")}
 ${field("Medical History End Date","patient.medical_history_end",e.patient.medical_history_end,"date","D.7.1.r.4")}
 ${selectField("Medical History Continuing","patient.medical_history_continuing",e.patient.medical_history_continuing,["Unknown","Yes","No"],"D.7.1.r.3")}
 ${area("Relevant Past Drug History","patient.past_drug_history",e.patient.past_drug_history,"D.8")}
 ${field("Past Drug History Start Date","patient.past_drug_history_start",e.patient.past_drug_history_start,"date","D.8.r.4")}
 ${field("Past Drug History End Date","patient.past_drug_history_end",e.patient.past_drug_history_end,"date","D.8.r.5")}
 ${area("Parent Medical History / Concurrent Conditions","patient.parent_medical_history",e.patient.parent_medical_history,"D.10.7")}
 </div>`;
 if(e2bSection==="E") return `<div class="repeat-head"><b>Reaction / Event records</b><button class="btn small" onclick="addReaction()">＋ Add reaction</button></div>${e.reactions.map((r,i)=>`<div class="repeat-card"><div class="repeat-title">Reaction ${i+1}<button class="btn danger small" onclick="removeItem('reactions',${i})">Remove</button></div><div class="form-grid">
 ${field("Verbatim Reaction / Event","reactions.${i}.verbatim",r.verbatim,"text","E.i.1.1a")}
 ${field("MedDRA LLT","reactions.${i}.llt",r.llt,"text","E.i.2.1b")}
 ${field("MedDRA PT","reactions.${i}.pt",r.pt,"text","E.i.2.1a")}
 ${field("MedDRA SOC","reactions.${i}.soc",r.soc,"text","E.i.2.1c")}
 ${field("Reaction Start Date","reactions.${i}.start",r.start,"date","E.i.4")}
 ${field("Reaction End Date","reactions.${i}.end",r.end,"date","E.i.5")}
 ${selectField("Continuing","reactions.${i}.continuing",r.continuing,["Unknown","Yes","No"],"E.i.6")}
 ${selectField("Outcome","reactions.${i}.outcome",r.outcome,["Unknown","Recovered","Recovering","Not recovered","Fatal","Recovered with sequelae"],"E.i.7")}
 ${selectField("Medical Confirmation","reactions.${i}.medical_confirmation",r.medical_confirmation,["","Yes","No","Unknown"],"E.i.8")}
 ${area("Other / Reaction Comments","reactions.${i}.primary_source",r.primary_source,"E / local")}
 <div class="field full"><label>Seriousness Criteria <span class="e2bcode">E.i.3.2–E.i.3.2.6</span></label><div class="checks">${[["seriousness_death","Death"],["seriousness_life","Life-threatening"],["seriousness_hospitalization","Hospitalization"],["seriousness_disability","Disability"],["seriousness_congenital","Congenital anomaly"],["seriousness_other","Other medically important"]].map(([k,l])=>`<label><input type="checkbox" data-key="reactions.${i}.${k}" ${r[k]?"checked":""}> ${l}</label>`).join("")}</div></div>
 ${field("Other Seriousness Criteria Text","reactions.${i}.seriousness_other_text",r.seriousness_other_text,"text","E.i.3.2.6")}
 </div></div>`).join("")}`;
 if(e2bSection==="F") return `<div class="repeat-head"><b>Results of Tests and Procedures</b><button class="btn small" onclick="addTest()">＋ Add test</button></div>${e.tests.map((t,i)=>`<div class="repeat-card"><div class="repeat-title">Test ${i+1}<button class="btn danger small" onclick="removeItem('tests',${i})">Remove</button></div><div class="form-grid">
 ${field("Test / Procedure Name","tests.${i}.test_name",t.test_name,"text","F.r.2.2")}
 ${field("Test Date","tests.${i}.test_date",t.test_date,"date","F.r.2.1")}
 ${field("Result","tests.${i}.result",t.result,"text","F.r.3.1")}
 ${field("Unit","tests.${i}.unit",t.unit,"text","UCUM")}
 ${field("Low Range","tests.${i}.low",t.low,"text","F.r.3.2")}
 ${field("High Range","tests.${i}.high",t.high,"text","F.r.3.2")}
 ${area("Test Comment","tests.${i}.comment",t.comment,"F.r.6")}
 </div></div>`).join("")}`;
 if(e2bSection==="G") return `<div class="repeat-head"><b>Drug Information</b><button class="btn small" onclick="addDrug()">＋ Add drug</button></div>${e.drugs.map((d,i)=>`<div class="repeat-card"><div class="repeat-title">Drug ${i+1}<button class="btn danger small" onclick="removeItem('drugs',${i})">Remove</button></div><div class="form-grid">
 ${selectField("Drug Characterization","drugs.${i}.role",d.role,["Suspect","Concomitant","Interacting"],"G.k.1")}
 ${field("Medicinal Product Name","drugs.${i}.product_name",d.product_name,"text","G.k.2.2")}
 ${field("Medicinal Product Identifier","drugs.${i}.medicinal_product_id",d.medicinal_product_id,"text","G.k.2.3.r")}
 ${field("Active Substance","drugs.${i}.active_substance",d.active_substance,"text","G.k.2.3 / IDMP")}
 ${field("Authorization Holder","drugs.${i}.authorization_holder",d.authorization_holder,"text","G.k.2.4")}
 ${field("Country Where Drug Obtained","drugs.${i}.country",d.country,"text","G.k.3")}
 ${field("Dose","drugs.${i}.dose",d.dose,"text","G.k.4.r.1")}
 ${field("Dose Unit","drugs.${i}.dose_unit",d.dose_unit,"text","UCUM")}
 ${field("Dose Interval","drugs.${i}.dose_interval",d.dose_interval,"text","G.k.4.r.2")}
 ${field("Dose Interval Unit","drugs.${i}.dose_interval_unit",d.dose_interval_unit,"text","G.k.4.r.3")}
 ${field("Route of Administration","drugs.${i}.route",d.route,"text","G.k.4.r.10.2")}
 ${field("Pharmaceutical Form","drugs.${i}.form",d.form,"text","G.k.4.r.9")}
 ${field("Strength","drugs.${i}.strength",d.strength,"text","G.k.2.3 / product")}
 ${field("Frequency","drugs.${i}.frequency",d.frequency,"text","G.k.4.r")}
 ${field("Therapy Start Date/Time","drugs.${i}.start",d.start,"datetime-local","G.k.4.r.4")}
 ${field("Last Administration Date/Time","drugs.${i}.last_admin",d.last_admin,"datetime-local","G.k.4.r.5")}
 ${field("Duration","drugs.${i}.duration",d.duration,"text","G.k.4.r.6")}
 ${field("Duration Unit","drugs.${i}.duration_unit",d.duration_unit,"text","G.k.4.r.7")}
 ${field("Indication","drugs.${i}.indication",d.indication,"text","G.k.5")}
 ${field("Action Taken with Drug","drugs.${i}.action_taken",d.action_taken,"text","G.k.8")}
 ${selectField("Dechallenge","drugs.${i}.dechallenge",d.dechallenge,["Unknown","Positive","Negative","Not Applicable"],"G.k.8")}
 ${selectField("Rechallenge","drugs.${i}.rechallenge",d.rechallenge,["Unknown","Positive","Negative","Not Applicable"],"G.k.9")}
 ${field("Additional Drug Information","drugs.${i}.additional_info",d.additional_info,"text","G.k.11")}
 </div></div>`).join("")}`;
 if(e2bSection==="H") return `<div class="form-grid">${area("Case Narrative","report.case_narrative",e.report.case_narrative,"H.1")} ${area("Summary / Comments","report.case_comments",e.report.case_comments,"H.4")} ${area("Reporter Comments","primarySource.privacy",e.primarySource.privacy,"H / source comments")}${area("Local Narrative","narratives.0.text",e.narratives[0]?.text||"","H.1 / local")}</div>`;
 if(e2bSection==="Reporter") return `<div class="form-grid">
 ${selectField("Reporter Qualification","primarySource.qualification",e.primarySource.qualification,["Healthcare Professional","Consumer/Non-Healthcare Professional","Lawyer","Other","Unknown"],"C.2.r.4")}
 ${field("Reporter Given Name","primarySource.reporter_given_name",e.primarySource.reporter_given_name,"text","C.2.r.2.1")}
 ${field("Reporter Family Name","primarySource.reporter_family_name",e.primarySource.reporter_family_name,"text","C.2.r.2.2")}
 ${field("Reporter Organization","primarySource.reporter_organization",e.primarySource.reporter_organization,"text","C.2.r.2.3")}
 ${field("Reporter Address","primarySource.reporter_address",e.primarySource.reporter_address,"text","C.2.r.2.4")}
 ${field("City","primarySource.reporter_city",e.primarySource.reporter_city,"text","C.2.r.2.5")}
 ${field("State / Province","primarySource.reporter_state",e.primarySource.reporter_state,"text","C.2.r.2.6")}
 ${field("Postal Code","primarySource.reporter_postal",e.primarySource.reporter_postal,"text","C.2.r.2.7")}
 ${field("Country","primarySource.reporter_country",e.primarySource.reporter_country,"text","C.2.r.3")}
 ${field("Phone","primarySource.reporter_phone",e.primarySource.reporter_phone,"text","C.2.r.2.8")}
 ${field("Email","primarySource.reporter_email",e.primarySource.reporter_email,"email","C.2.r.2.9")}
 ${selectField("Reporter Privacy","primarySource.privacy",e.primarySource.privacy,["","Name withheld","Contact withheld","All identifiers withheld"],"C.2")}
 ${area("Literature Reference","primarySource.literature_reference",e.primarySource.literature_reference,"C.4.r.1")}
 </div>`;
 if(e2bSection==="History") return `<div class="repeat-head"><b>Medical History & Concurrent Conditions</b><button class="btn small" onclick="addHistory()">＋ Add history</button></div>${e.history.map((h,i)=>`<div class="repeat-card"><div class="repeat-title">Medical History ${i+1}<button class="btn danger small" onclick="removeItem('history',${i})">Remove</button></div><div class="form-grid">${field("Condition","history.${i}.condition",h.condition,"text","D.7.2")}${field("MedDRA PT","history.${i}.meddra_pt",h.meddra_pt,"text","D.7.2 / coding")}${field("Start Date","history.${i}.start",h.start,"date","D.7.1.r.2")}${field("End Date","history.${i}.end",h.end,"date","D.7.1.r.4")}${selectField("Continuing","history.${i}.continuing",h.continuing,["Unknown","Yes","No"],"D.7.1.r.3")}${area("Comment","history.${i}.comment",h.comment,"D.7")}</div></div>`).join("")}
 <div class="repeat-head" style="margin-top:16px"><b>Past Drug History</b><button class="btn small" onclick="addDrugHistory()">＋ Add past drug</button></div>${e.patient.past_drug_history||""}<div class="banner">Past drug history can be expanded into individual records in the production data model. The demo also retains the D.8 text field.</div>`;
 if(e2bSection==="Assessment") return `<div class="repeat-head"><b>Medical Assessment / Causality</b><button class="btn small" onclick="addAssessment()">＋ Add assessment</button></div>${e.assessments.map((a,i)=>`<div class="repeat-card"><div class="repeat-title">Assessment ${i+1}<button class="btn danger small" onclick="removeItem('assessments',${i})">Remove</button></div><div class="form-grid">${field("Drug","assessments.${i}.drug",a.drug,"text","G.k / assessment")}${field("Reaction","assessments.${i}.reaction",a.reaction,"text","E.i / assessment")}${field("Assessor","assessments.${i}.assessor",a.assessor,"text","Reviewer")}${selectField("Method","assessments.${i}.method",a.method,["Global Introspection","WHO-UMC","Naranjo","Other"],"Causality method")}${selectField("Result","assessments.${i}.result",a.result,["Related","Possibly Related","Not Related","Not Assessable","Not Applicable"],"Causality result")}${area("Assessment Comment","assessments.${i}.comment",a.comment,"Medical review")}</div></div>`).join("")}`;
 if(e2bSection==="Study") return `<div class="form-grid">${field("Study Name","study.study_name",e.study.study_name,"text","C.5.1")}${field("Study Number","study.study_number",e.study.study_number,"text","C.5.3")}${field("Sponsor","study.sponsor",e.study.sponsor,"text","C.5.2")}${selectField("Study Type","study.study_type",e.study.study_type,["","Clinical Trial","Individual Patient Use","Other","Unknown"],"C.5.4")}${field("Protocol Number","study.protocol_number",e.study.protocol_number,"text","Study identifier")}</div>`;
 if(e2bSection==="Transmission") return `<div class="form-grid">${field("Sender Identifier","transmission.sender_identifier",e.transmission.sender_identifier,"text","N.1.2")}${field("Receiver Identifier","transmission.receiver_identifier",e.transmission.receiver_identifier,"text","N.1.4")}${field("Message Identifier","transmission.message_identifier",e.transmission.message_identifier,"text","N.1.1")}${field("Message Date","transmission.message_date",e.transmission.message_date,"datetime-local","N.1.5")}${field("Acknowledgement","transmission.acknowledgement",e.transmission.acknowledgement,"text","ACK status")}</div>`;
 if(e2bSection==="Documents") return `<div class="repeat-head"><b>Source Documents</b><button class="btn small" onclick="addDocument()">＋ Add document</button></div>${e.documents.map((d,i)=>`<div class="repeat-card"><div class="repeat-title">Document ${i+1}<button class="btn danger small" onclick="removeItem('documents',${i})">Remove</button></div><div class="form-grid">${field("Document Type","documents.${i}.type",d.type,"text","Attachment category")}${field("Description","documents.${i}.description",d.description,"text","Document description")}${field("Filename / Reference","documents.${i}.filename",d.filename,"text","Local reference")}</div></div>`).join("")}<div class="banner">Actual file storage should use secure object storage with access controls, malware scanning, retention rules and audit logging in production.</div>`;
}

function setPath(obj,path,val){let p=path.split(".");let o=obj;for(let i=0;i<p.length-1;i++){if(!(p[i] in o))o[p[i]]={};o=o[p[i]]}o[p[p.length-1]]=val}
function getPath(obj,path){return path.split(".").reduce((o,k)=>o?.[k],obj)}
function bindE2B(c){
 document.querySelectorAll("[data-key]").forEach(el=>el.onchange=()=>{let key=el.dataset.key;let v=el.type==="checkbox"?el.checked:el.value;setPath(c.e2b,key,v);syncCaseSummary(c);save()})
}
function syncCaseSummary(c){let e=c.e2b;c.receipt_date=e.identifiers.first_receipt_date||c.receipt_date;c.country=e.report.reporter_country||c.country;c.source=e.report.report_source||c.source;c.patient_age=e.patient.age||c.patient_age;c.patient_sex=e.patient.sex||c.patient_sex;c.event=e.reactions?.[0]?.verbatim||c.event;c.meddra_pt=e.reactions?.[0]?.pt||c.meddra_pt;c.product=e.drugs?.[0]?.product_name||c.product;c.narrative=e.report.case_narrative||c.narrative}
function addReaction(){selected.e2b.reactions.push(blankE2B().reactions[0]);save();render()}
function addTest(){selected.e2b.tests.push(blankE2B().tests[0]);save();render()}
function addDrug(){selected.e2b.drugs.push(blankE2B().drugs[0]);save();render()}
function addHistory(){selected.e2b.history.push(blankE2B().history[0]);save();render()}
function addDrugHistory(){toast("Past drug history is retained in D.8 and can be expanded in the production model.")}
function addAssessment(){selected.e2b.assessments.push(blankE2B().assessments[0]);save();render()}
function addDocument(){selected.e2b.documents.push(blankE2B().documents[0]);save();render()}
function removeItem(k,i){if(selected.e2b[k].length<=1)return toast("At least one row is retained.");selected.e2b[k].splice(i,1);save();render()}

function casePage(){
 let c=selected;if(!c)return nav("queue");c.e2b=c.e2b||blankE2B();
 let ev=db.events.filter(e=>e.case_id===c.case_id).sort((a,b)=>b.at.localeCompare(a.at));let ns=nextStates[c.status]||[];
 return `<div class="page-head"><div><h2>${esc(c.case_id)}</h2><p>${esc(c.product)} · ${esc(c.event)} · ${pill(c.status)}</p></div><div><button class="btn" onclick="nav('queue')">← Case Queue</button></div></div>
 <div class="banner warning">E2B(R3) data-entry workspace. Field codes shown are an implementation aid; regional business rules, terminology versions and validation must be applied before production use.</div>
 <div class="card"><div class="tabs">${sections.map(s=>`<button class="tab ${e2bSection===s[0]?"active":""}" onclick="setE2BSection('${s[0]}')">${s[0]} — ${s[1]}</button>`).join("")}</div>
 <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:14px"><div class="muted">Case data is saved as you edit.</div><div><button class="btn small" onclick="saveCase('${c.case_id}')">Save</button> <button class="btn small" onclick="exportCaseJSON('${c.case_id}')">Export JSON</button></div></div>
 ${sectionForm(c)}
 <div style="margin-top:18px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div>${ns.map(n=>`<button class="btn" onclick="doTransition('${c.case_id}','${n}')">Move to ${statusLabel(n)}</button>`).join(" ")}</div><button class="btn primary" onclick="exportE2BDraft('${c.case_id}')">Generate E2B(R3) Draft XML</button></div></div>
 <div class="grid two" style="margin-top:16px"><div class="card"><h3 class="section-title">Workflow & Assignment</h3><div class="form-grid"><div class="field"><label>Assignee</label><input id="assignee" value="${esc(c.assignee)}"></div><div class="field"><label>Due Date</label><input id="due" type="date" value="${esc(c.due_date)}"></div></div><button class="btn" style="margin-top:10px" onclick="saveAssignment()">Save assignment</button></div>
 <div class="card"><h3 class="section-title">Audit / Workflow History</h3><div class="timeline">${ev.map(e=>`<div class="timeline-item"><strong>${esc(e.action)}</strong><div>${esc(e.detail)}</div><div>${new Date(e.at).toLocaleString()} · ${esc(e.actor)}</div></div>`).join("")}</div></div></div>`;
}
function setE2BSection(s){e2bSection=s;render()}
function saveCase(id){let c=db.cases.find(x=>x.case_id===id);syncCaseSummary(c);addEvent(id,"CASE_UPDATED","E2B(R3) data-entry record updated");save();toast("Case saved");render()}
function saveAssignment(){selected.assignee=document.getElementById("assignee").value;selected.due_date=document.getElementById("due").value;addEvent(selected.case_id,"ASSIGNMENT_UPDATED",`Assigned to ${selected.assignee}; due ${selected.due_date}`);save();toast("Assignment saved");render()}
function doTransition(id,to){let c=db.cases.find(x=>x.case_id===id);if(c)transition(c,to)}

function e2bXml(c){
 const e=c.e2b||blankE2B(), x=v=>escXml(v);
 return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- SafetyAssure E2B(R3) draft only; validate against the applicable ICSR XML schema and regional business rules before transmission. -->\n<SAFETYASSURE_ICSR_DRAFT>\n  <CASE_ID>${x(c.case_id)}</CASE_ID>\n  <C_CASE_IDENTIFICATION>\n    <C_1_8_1_WORLDWIDE_CASE_ID>${x(e.identifiers.worldwide_case_id)}</C_1_8_1_WORLDWIDE_CASE_ID>\n    <C_1_1_SENDER_CASE_ID>${x(e.identifiers.sender_case_id)}</C_1_1_SENDER_CASE_ID>\n    <C_1_3_TYPE_OF_REPORT>${x(e.report.type)}</C_1_3_TYPE_OF_REPORT>\n    <C_1_4_INITIAL_FOLLOWUP>${x(e.report.initial_or_followup)}</C_1_4_INITIAL_FOLLOWUP>\n    <C_1_5_FIRST_RECEIPT_DATE>${x(e.identifiers.first_receipt_date)}</C_1_5_FIRST_RECEIPT_DATE>\n    <C_1_6_MOST_RECENT_INFORMATION>${x(e.identifiers.most_recent_receipt_date)}</C_1_6_MOST_RECENT_INFORMATION>\n  </C_CASE_IDENTIFICATION>\n  <D_PATIENT>${x(JSON.stringify(e.patient))}</D_PATIENT>\n  <E_REACTIONS>${e.reactions.map(r=>`<REACTION>${x(JSON.stringify(r))}</REACTION>`).join("")}</E_REACTIONS>\n  <F_TESTS>${e.tests.map(t=>`<TEST>${x(JSON.stringify(t))}</TEST>`).join("")}</F_TESTS>\n  <G_DRUGS>${e.drugs.map(d=>`<DRUG>${x(JSON.stringify(d))}</DRUG>`).join("")}</G_DRUGS>\n  <H_NARRATIVE>${x(e.report.case_narrative)}</H_NARRATIVE>\n  <PRIMARY_SOURCE>${x(JSON.stringify(e.primarySource))}</PRIMARY_SOURCE>\n  <ASSESSMENTS>${x(JSON.stringify(e.assessments))}</ASSESSMENTS>\n</SAFETYASSURE_ICSR_DRAFT>`;
}
function escXml(s){return String(s??"").replace(/[<>&'"]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[m]))}
function downloadText(name,text,type){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportE2BDraft(id){let c=db.cases.find(x=>x.case_id===id);downloadText(`${id}_E2BR3_DRAFT.xml`,e2bXml(c),"application/xml");toast("Draft XML generated")}
function exportCaseJSON(id){let c=db.cases.find(x=>x.case_id===id);downloadText(`${id}_SafetyAssure.json`,JSON.stringify(c,null,2),"application/json");toast("Case JSON exported")}

function dashboard(){const cs=db.cases,count=s=>cs.filter(c=>c.status===s).length,overdue=cs.filter(c=>c.due_date<today()&&!["CLOSED","DISTRIBUTED"].includes(c.status)).length;return `<div class="page-head"><div><h2>SafetyAssure</h2><p>Patient Safety • Governance • Compliance • Intelligence</p></div><button class="btn primary" onclick="newCase()">＋ Book In Case</button></div><div class="grid kpis">${kpi("New Cases",count("NEW"),"Awaiting intake")}${kpi("In Data Entry",count("DATA_ENTRY"),"E2B data completion")}${kpi("Medical Review",count("MEDICAL_REVIEW"),"Clinical assessment")}${kpi("Ready for Distribution",count("READY_FOR_DISTRIBUTION"),"Submission queue")}${kpi("Overdue",overdue,"Workflow due dates")}${kpi("Total Cases",cs.length,"Current organization")}</div><div class="grid two" style="margin-top:16px"><div class="card"><h3 class="section-title">Case Intake Trend</h3><div class="bars">${[3,5,4,7,6,9,8].map((v,i)=>`<div class="bar" style="height:${v*12}px"><span>${i+18}</span></div>`).join("")}</div></div><div class="card"><h3 class="section-title">Case Status Overview</h3><div class="donut"></div><div class="stat-line"><span>Open workflow</span><b>${cs.filter(c=>c.status!=="CLOSED").length}</b></div><div class="stat-line"><span>Serious</span><b>${cs.filter(c=>c.seriousness==="Serious").length}</b></div></div></div><div class="grid three" style="margin-top:16px"><div class="card"><h3 class="section-title">Top Products</h3>${["Product A","Product B","Product C","Product D"].map(x=>`<div class="stat-line"><span>${x}</span><b>${cs.filter(c=>c.product===x).length}</b></div>`).join("")}</div><div class="card"><h3 class="section-title">Top Countries</h3>${["Canada","USA","UK","Germany","France"].map(x=>`<div class="stat-line"><span>${x}</span><b>${cs.filter(c=>c.country===x).length}</b></div>`).join("")}</div><div class="card"><h3 class="section-title">Sources</h3>${["HCP","Patient","Patient Support Program","Regulatory Authority"].map(x=>`<div class="stat-line"><span>${x}</span><b>${cs.filter(c=>c.source===x).length}</b></div>`).join("")}</div></div>`}

function queuePage(title,statuses){let cs=db.cases.filter(c=>(!statuses||statuses.includes(c.status))&&(!search||JSON.stringify(c).toLowerCase().includes(search.toLowerCase()))&&(filterStatus==="ALL"||c.status===filterStatus)&&(filterSerious==="ALL"||c.seriousness===filterSerious));return `<div class="page-head"><div><h2>${title}</h2><p>${cs.length} case(s) in the current view.</p></div><button class="btn primary" onclick="newCase()">＋ Book In</button></div><div class="card"><div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap"><input id="q" placeholder="Search case, product, event, country..." value="${esc(search)}" style="flex:1;min-width:220px;padding:9px;border:1px solid #cfd9de;border-radius:8px"><select id="fs" style="padding:9px;border:1px solid #cfd9de;border-radius:8px"><option value="ALL">All statuses</option>${Object.keys(nextStates).map(s=>`<option value="${s}" ${filterStatus===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select><select id="fser" style="padding:9px;border:1px solid #cfd9de;border-radius:8px"><option value="ALL">All seriousness</option><option ${filterSerious==="Serious"?"selected":""}>Serious</option><option ${filterSerious==="Non-serious"?"selected":""}>Non-serious</option></select><button class="btn" onclick="exportMIS()">Export MIS CSV</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Case</th><th>Receipt</th><th>Country</th><th>Source</th><th>Patient</th><th>Reporter</th><th>Product / IDMP</th><th>Event / MedDRA</th><th>Seriousness</th><th>Outcome</th><th>Status</th><th>Due</th><th>Assignee</th><th>Action</th></tr></thead><tbody>${cs.length?cs.map(c=>`<tr><td><b>${esc(c.case_id)}</b></td><td>${esc(c.receipt_date)}</td><td>${esc(c.country)}</td><td>${esc(c.source)}</td><td>${esc(c.patient_age)} / ${esc(c.patient_sex)}</td><td>${esc(c.e2b?.primarySource?.qualification||"")}</td><td>${esc(c.product)}<br><span class="muted">${esc(c.e2b?.drugs?.[0]?.medicinal_product_id||"")}</span></td><td>${esc(c.event)}<br><span class="muted">PT: ${esc(c.e2b?.reactions?.[0]?.pt||c.meddra_pt)}<br>LLT: ${esc(c.e2b?.reactions?.[0]?.llt||"")}<br>SOC: ${esc(c.e2b?.reactions?.[0]?.soc||"")}</span></td><td>${pill(c.seriousness,true)}</td><td>${esc(c.outcome)}</td><td>${pill(c.status)}</td><td>${esc(c.due_date)}</td><td>${esc(c.assignee)}</td><td><button class="btn small" onclick="openCase('${c.case_id}')">Open</button></td></tr>`).join(""):`<tr><td colspan="14" class="empty">No cases match the current filters.</td></tr>`}</tbody></table></div></div>`}

function misPage(){let cs=db.cases.filter(c=>(!search||JSON.stringify(c).toLowerCase().includes(search.toLowerCase()))&&(filterStatus==="ALL"||c.status===filterStatus)&&(filterSerious==="ALL"||c.seriousness===filterSerious)&&(!misFrom||c.receipt_date>=misFrom)&&(!misTo||c.receipt_date<=misTo));return `<div class="page-head"><div><h2>MIS & Line Listings</h2><p>Operational PV line listing with E2B-oriented fields and export.</p></div><button class="btn primary" onclick="exportMIS()">Export Full MIS CSV</button></div><div class="card"><div class="grid four"><div class="field"><label>Receipt From</label><input id="misFrom" type="date" value="${misFrom}"></div><div class="field"><label>Receipt To</label><input id="misTo" type="date" value="${misTo}"></div><div class="field"><label>Search</label><input id="misSearch" value="${esc(search)}" placeholder="Case / product / event / PT"></div><div class="field"><label>Status</label><select id="misStatus"><option value="ALL">All</option>${Object.keys(nextStates).map(s=>`<option ${filterStatus===s?"selected":""} value="${s}">${statusLabel(s)}</option>`).join("")}</select></div></div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><select id="misSerious"><option value="ALL">All seriousness</option><option ${filterSerious==="Serious"?"selected":""}>Serious</option><option ${filterSerious==="Non-serious"?"selected":""}>Non-serious</option></select><button class="btn" onclick="applyMIS()">Apply Filters</button><button class="btn" onclick="clearMIS()">Clear</button></div><p class="muted" style="margin-top:12px">${cs.length} case(s) shown. Columns are intentionally broader than the dashboard and include core E2B-oriented operational fields.</p></div>${queuePage("MIS Line Listing",null)}`}

function exportMIS(){let cs=db.cases.filter(c=>(!search||JSON.stringify(c).toLowerCase().includes(search.toLowerCase()))&&(filterStatus==="ALL"||c.status===filterStatus)&&(filterSerious==="ALL"||c.seriousness===filterSerious)&&(!misFrom||c.receipt_date>=misFrom)&&(!misTo||c.receipt_date<=misTo));let headers=["Case ID","Receipt Date","First Receipt Date","Most Recent Info Date","Worldwide Case ID","Sender Case ID","Country","Source","Reporter Qualification","Reporter Country","Patient Age","Age Unit","Patient Sex","Patient DOB","Weight","Height","Product","Medicinal Product ID","Active Substance","Authorization Holder","Drug Role","Dose","Dose Unit","Route","Form","Therapy Start","Last Administration","Indication","Action Taken","Dechallenge","Rechallenge","Event Verbatim","MedDRA LLT","MedDRA PT","MedDRA SOC","Reaction Start","Reaction End","Reaction Outcome","Seriousness","Seriousness Criteria","Outcome","Status","Due Date","Assignee","Causality Method","Causality Result","Study Number","Study Type","Narrative","E2B Version","MedDRA Version","WHODrug Version","IDMP Version"];let rows=cs.map(c=>{let e=c.e2b||blankE2B(),r=e.reactions?.[0]||{},d=e.drugs?.[0]||{},a=e.assessments?.[0]||{};let crit=["seriousness_death","seriousness_life","seriousness_hospitalization","seriousness_disability","seriousness_congenital","seriousness_other"].filter(k=>r[k]).join("; ");return [c.case_id,c.receipt_date,e.identifiers.first_receipt_date,e.identifiers.most_recent_receipt_date,e.identifiers.worldwide_case_id,e.identifiers.sender_case_id,c.country,c.source,e.primarySource.qualification,e.primarySource.reporter_country,e.patient.age,e.patient.age_unit,e.patient.sex,e.patient.dob,e.patient.weight,e.patient.height,c.product,d.medicinal_product_id,d.active_substance,d.authorization_holder,d.role,d.dose,d.dose_unit,d.route,d.form,d.start,d.last_admin,d.indication,d.action_taken,d.dechallenge,d.rechallenge,r.verbatim,r.llt,r.pt,r.soc,r.start,r.end,r.outcome,c.seriousness,crit,c.outcome,c.status,c.due_date,c.assignee,a.method,a.result,e.study.study_number,e.study.study_type,e.report.case_narrative,e.metadata.e2b_version,e.metadata.meddra_version,e.metadata.whodrug_version,e.metadata.idmp_version]});let csv=[headers,...rows].map(r=>r.map(x=>`"${String(x??"").replaceAll('"','""')}"`).join(",")).join("\\n");downloadText("SafetyAssure_MIS_Line_Listing.csv",csv,"text/csv");toast("MIS CSV exported")}
function applyMIS(){misFrom=document.getElementById("misFrom").value;misTo=document.getElementById("misTo").value;search=document.getElementById("misSearch").value;filterStatus=document.getElementById("misStatus").value;filterSerious=document.getElementById("misSerious").value;render()}
function clearMIS(){misFrom="";misTo="";search="";filterStatus="ALL";filterSerious="ALL";render()}

function governance(){return `<div class="page-head"><div><h2>Governance & Compliance</h2><p>Inspection-readiness controls and operational compliance workspace.</p></div><button class="btn primary" onclick="addAction()">＋ New Action</button></div><div class="grid four">${kpi("Open CAPA",db.actions.filter(x=>x.type==="CAPA"&&x.status!=="Closed").length,"Tracked actions")}${kpi("Deviations",db.actions.filter(x=>x.type==="Deviation").length,"Current register")}${kpi("Change Controls",db.actions.filter(x=>x.type==="Change Control").length,"Controlled changes")}${kpi("Audit Events",db.events.length,"System activity")}</div><div class="grid two" style="margin-top:16px"><div class="card"><h3 class="section-title">Governance Controls</h3>${["PV SOP currency","Training completion","Case timeliness","Reconciliation","Controlled terminology","Inspection evidence"].map((x,i)=>`<div class="stat-line"><span>${x}</span><b>${[96,92,96,100,100,88][i]}%</b></div><div class="progress"><i style="width:${[96,92,96,100,100,88][i]}%"></i></div>`).join("")}</div><div class="card"><h3 class="section-title">Compliance Action Register</h3><div class="table-wrap"><table class="table"><thead><tr><th>Type</th><th>Title</th><th>Owner</th><th>Status</th></tr></thead><tbody>${db.actions.length?db.actions.map(a=>`<tr><td>${esc(a.type)}</td><td>${esc(a.title)}</td><td>${esc(a.owner)}</td><td>${esc(a.status)}</td></tr>`).join(""):`<tr><td colspan="4" class="empty">No actions recorded.</td></tr>`}</tbody></table></div></div></div>`}
function addAction(){let m=modal(`<div class="modal-card"><div class="modal-head"><b>New Governance Action</b><button class="close">×</button></div><form id="af"><div class="modal-body"><div class="form-grid"><div class="field"><label>Type</label><select name="type"><option>CAPA</option><option>Deviation</option><option>Change Control</option><option>Audit Finding</option></select></div><div class="field"><label>Owner</label><input name="owner" value="PV Manager"></div><div class="field full"><label>Title</label><input name="title" required></div><div class="field full"><label>Description</label><textarea name="description"></textarea></div></div></div><div class="modal-foot"><button type="button" class="btn close">Cancel</button><button class="btn primary">Create</button></div></form></div>`);m.querySelectorAll(".close").forEach(x=>x.onclick=()=>m.remove());m.querySelector("#af").onsubmit=e=>{e.preventDefault();let f=new FormData(e.target);db.actions.unshift({id:uid(),type:f.get("type"),owner:f.get("owner"),title:f.get("title"),description:f.get("description"),status:"Open"});save();m.remove();toast("Governance action created");render()}}

function intelligence(){let serious=db.cases.filter(c=>c.seriousness==="Serious");return `<div class="page-head"><div><h2>Safety Intelligence</h2><p>Operational safety review support using current demo data.</p></div></div><div class="grid three">${kpi("Serious Cases",serious.length,"Current case set")}${kpi("Unique Products",new Set(db.cases.map(c=>c.product)).size,"Case distribution")}${kpi("Open Follow-up",db.cases.filter(c=>c.status==="FOLLOW_UP").length,"Cases requiring follow-up")}</div><div class="grid two" style="margin-top:16px"><div class="card"><h3 class="section-title">Serious Cases by Product</h3>${[...new Set(db.cases.map(c=>c.product))].map(p=>`<div class="stat-line"><span>${p}</span><b>${serious.filter(c=>c.product===p).length}</b></div>`).join("")}</div><div class="card"><h3 class="section-title">Signal Review Queue</h3><div class="banner warning">Decision-support only; the prototype does not make automated signal conclusions.</div>${serious.map(c=>`<div class="list-row"><span><b>${c.case_id}</b> · ${esc(c.event)}</span><button class="btn small" onclick="openCase('${c.case_id}')">Review</button></div>`).join("")||'<div class="empty">No serious cases.</div>'}</div></div>`}
function admin(){return `<div class="page-head"><div><h2>Administration</h2><p>Reference data, security, terminology and integration readiness.</p></div></div><div class="grid two"><div class="card"><h3 class="section-title">Reference Data</h3>${["Products / IDMP","MedDRA","WHODrug","UCUM Units","Country / Source Codes","Outcome / Seriousness Codes"].map(x=>`<div class="stat-line"><span>${x}</span><b>Version-controlled</b></div>`).join("")}</div><div class="card"><h3 class="section-title">Security Architecture</h3>${["Authentication","RBAC","Row-level security","Audit trail","API / Edge Functions","Backup & recovery"].map(x=>`<div class="stat-line"><span>${x}</span><b>Backend-ready</b></div>`).join("")}</div></div><div class="grid three" style="margin-top:16px">${["E2B(R3)","SPOR / IDMP","Regional Rules"].map(x=>`<div class="card"><h3 class="section-title">${x}</h3><p class="muted">Pluggable implementation layer. The current form is an E2B-oriented data-entry workspace and is not itself a validated transmission engine.</p></div>`).join("")}</div>`}

function appPage(){let navs=[["home","⌂","Home"],["book","＋","Book In"],["queue","▤","Case Management"],["medical","◉","Medical Review"],["qc","✓","QC Review"],["dist","⇧","Distribution"],["mis","▥","MIS & Line Listings"],["gov","⚑","Governance & Compliance"],["intel","◈","Safety Intelligence"],["admin","⚙","Administration"]];return `<div class="shell"><aside class="sidebar"><div class="brand"><h1>SafetyAssure</h1><p>Patient Safety • Governance • Compliance • Intelligence</p></div><nav class="nav">${navs.map(n=>`<button class="${page===n[0]?"active":""}" onclick="nav('${n[0]}')"><span>${n[1]}</span>${n[2]}</button>`).join("")}</nav><div class="sidebar-footer">SafetyAssure development environment<br>Not validated for production PV use</div></aside><main class="main"><header class="topbar"><div class="crumb">${navs.find(n=>n[0]===page)?.[2]||"SafetyAssure"}</div><div class="top-actions"><span class="mode">${SAAS?"SAAS CONNECTED":"DEMO MODE"}</span><span class="muted">${esc(db.settings.org)}</span></div></header><section class="content">${content()}</section></main></div>`}
function content(){switch(page){case"home":return dashboard();case"book":return `<div class="page-head"><div><h2>Book In</h2><p>Establish ICSR validity before opening full E2B(R3) data entry.</p></div><button class="btn primary" onclick="newCase()">＋ New ICSR</button></div><div class="card"><div class="banner">The full case record contains structured C/D/E/F/G/H and supporting reporter, history, assessment, study, transmission and document sections.</div><h3 class="section-title">ICSR Validity Gate</h3><div class="grid four">${["Identifiable patient","Identifiable reporter/source","Suspect product","Adverse event/reaction"].map(x=>`<div class="card"><b>✓</b><div style="margin-top:7px;font-size:12px">${x}</div></div>`).join("")}</div></div>`;case"queue":return queuePage("Case Management");case"medical":return queuePage("Medical Review",["MEDICAL_REVIEW"]);case"qc":return queuePage("QC Review",["QC_REVIEW"]);case"dist":return queuePage("Distribution",["READY_FOR_DISTRIBUTION"]);case"mis":return misPage();case"gov":return governance();case"intel":return intelligence();case"admin":return admin();case"case":return casePage();default:return dashboard()}}
function render(){document.getElementById("app").innerHTML=appPage();if(["queue","medical","qc","dist"].includes(page)){let q=document.getElementById("q");if(q)q.oninput=e=>{search=e.target.value;render()};let fs=document.getElementById("fs");if(fs)fs.onchange=e=>{filterStatus=e.target.value;render()};let fser=document.getElementById("fser");if(fser)fser.onchange=e=>{filterSerious=e.target.value;render()}}if(page==="case"&&selected){bindE2B(selected);}}
render();
window.nav=nav;window.newCase=newCase;window.openCase=openCase;window.saveCase=saveCase;window.doTransition=doTransition;window.setE2BSection=setE2BSection;window.addReaction=addReaction;window.addTest=addTest;window.addDrug=addDrug;window.addHistory=addHistory;window.addDrugHistory=addDrugHistory;window.addAssessment=addAssessment;window.addDocument=addDocument;window.removeItem=removeItem;window.exportMIS=exportMIS;window.applyMIS=applyMIS;window.clearMIS=clearMIS;window.saveAssignment=saveAssignment;window.exportE2BDraft=exportE2BDraft;window.exportCaseJSON=exportCaseJSON;window.addAction=addAction;
