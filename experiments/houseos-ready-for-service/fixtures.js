export const SERVICE = deepFreeze({
  restaurant:"Juniper & Stone",manager:"Maya Chen",staffMember:"Jordan Lee",service:"Friday Dinner",publishedRevision:1,draftRevision:2,
  updates:[
    update("trout","Charred trout — preserved lemon, spring peas","staff-safe","Menu"),
    update("oysters","East Coast oysters are 86’d","staff-safe","86 list"),
    update("anniversary","Table 12 anniversary; confirm allergy details with chef before firing","staff-safe","Guest note"),
    update("preshift","Pre-shift at 4:35 PM by the pass","staff-safe","Timing"),
    update("vendor","PRIVATE — vendor cost follow-up after service; never publish","manager-private","Manager note"),
  ],
});

export const SYNTHETIC_LINKS=deepFreeze({manager:"https://houseos-manager-staff.pages.dev/manager",staff:"https://houseos-manager-staff.pages.dev/staff"});
function update(id,text,classification,category){return {id,text,classification,category};}
function deepFreeze(value){if(!value||typeof value!=="object"||Object.isFrozen(value))return value;Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);return value;}
