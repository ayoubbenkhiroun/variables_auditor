const ACCENT_MAP={'à':'a','â':'a','ä':'a','á':'a','ã':'a','å':'a','è':'e','ê':'e','ë':'e','é':'e','î':'i','ï':'i','í':'i','ì':'i','ô':'o','ö':'o','ó':'o','ò':'o','õ':'o','ø':'o','ù':'u','û':'u','ü':'u','ú':'u','ç':'c','ñ':'n','ý':'y','ÿ':'y','æ':'ae','œ':'oe','À':'A','Â':'A','Ä':'A','Á':'A','Ã':'A','È':'E','Ê':'E','Ë':'E','É':'E','Î':'I','Ï':'I','Í':'I','Ô':'O','Ö':'O','Ó':'O','Ù':'U','Û':'U','Ü':'U','Ú':'U','Ç':'C','Ñ':'N'};
const RESERVED_BASE=new Set(['if','else','for','in','return','true','false','null','and','or','not','between','instance','of','function','every','satisfies','some','context','is','date','time','duration','years','months','days','hours','minutes','seconds']);

const DEFAULT_SENSITIVITY = ['Public', 'Interne', 'Confidentiel', 'Critique'];
const DEFAULT_TEAMS = ['Non assignée', 'RH', 'Finance', 'Relation Client', 'Marketing', 'Technique'];

const RULES_DEF=[
  {id:'camel',label:'camelCase obligatoire',desc:'Première lettre minuscule, maj pour chaque mot suivant',enabled:true,sev:'err'},
  {id:'noSpace',label:'Pas d\'espaces',desc:'Les espaces ne sont pas autorisés',enabled:true,sev:'err'},
  {id:'noSpecial',label:'Pas de caractères spéciaux',desc:'Seuls lettres, chiffres et _ sont autorisés',enabled:true,sev:'err'},
  {id:'noStartDigit',label:'Ne commence pas par un chiffre',desc:'Le nom doit débuter par une lettre',enabled:true,sev:'err'},
  {id:'noAccent',label:'Pas d\'accents',desc:'Caractères non-ASCII interdits',enabled:true,sev:'err'},
  {id:'noReserved',label:'Mots réservés FEEL/BPMN',desc:'Noms conflictuels avec le moteur',enabled:true,sev:'err'},
  {id:'noUnderscoreEdge',label:'Pas d\'underscore en bord',desc:'Pas de _ en début ou fin de nom',enabled:true,sev:'warn'},
  {id:'noDoubleUnderscore',label:'Pas de double underscore',desc:'__ interdit',enabled:true,sev:'warn'},
  {id:'maxLen',label:'Longueur max 255',desc:'Nom trop long pour Camunda 8',enabled:true,sev:'err'},
  {id:'noSnake',label:'Pas de snake_case',desc:'Préférer camelCase à underscore_case',enabled:true,sev:'warn'},
  {id:'noDash',label:'Pas de tiret ou point',desc:'Caractères - et . interdits',enabled:true,sev:'err'},
  {id:'noEmpty',label:'Nom non vide',desc:'Nom vide détecté',enabled:true,sev:'err'},
];

let rules=RULES_DEF.map(r=>({...r}));

function getActiveRules(){return rules.filter(r=>r.enabled)}
function getCustomReserved(){
  const textarea = document.getElementById('customReserved');
  return new Set((textarea ? textarea.value : '').split('\n').map(s=>s.trim().toLowerCase()).filter(Boolean));
}

function getSensitivityLevels() {
  const el = document.getElementById('sensitivityLevels');
  if (!el) return DEFAULT_SENSITIVITY;
  const val = el.value.trim();
  return val ? val.split('\n').map(s => s.trim()).filter(Boolean) : DEFAULT_SENSITIVITY;
}
function getTeamTags() {
  const el = document.getElementById('teamTags');
  if (!el) return DEFAULT_TEAMS;
  const val = el.value.trim();
  return val ? val.split('\n').map(s => s.trim()).filter(Boolean) : DEFAULT_TEAMS;
}

function removeAccents(s){return s.split('').map(c=>ACCENT_MAP[c]||c).join('')}

function toCamelCase(s){
  s=removeAccents(s);
  s=s.replace(/[^a-zA-Z0-9_\s\-]/g,' ');
  const words=s.split(/[\s_\-]+/).filter(Boolean);
  if(!words.length)return '';
  return words.map((w,i)=>{
    w=w.replace(/^[^a-zA-Z]+/,'');
    if(!w)return '';
    return i===0?w.charAt(0).toLowerCase()+w.slice(1):w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();
  }).filter(Boolean).join('');
}

function checkVariable(name){
  const ar=getActiveRules();
  const cr=getCustomReserved();
  const reserved=new Set([...RESERVED_BASE,...cr]);
  const issues=[];
  const t=(name||'').trim();
  if(!t){if(ar.find(r=>r.id==='noEmpty'))issues.push({msg:'Nom vide',sev:'err'});return{issues,status:'invalid'}}
  if(ar.find(r=>r.id==='maxLen')&&t.length>255)issues.push({msg:'Longueur > 255 caractères',sev:'err'});
  if(ar.find(r=>r.id==='noAccent')&&/[^\x00-\x7F]/.test(t))issues.push({msg:'Accents / caractères non-ASCII',sev:'err'});
  if(ar.find(r=>r.id==='noStartDigit')&&/^\d/.test(t))issues.push({msg:'Commence par un chiffre',sev:'err'});
  if(ar.find(r=>r.id==='noSpace')&&/\s/.test(t))issues.push({msg:'Contient des espaces',sev:'err'});
  if(ar.find(r=>r.id==='noDash')&&/[-.]/.test(t))issues.push({msg:'Contient tiret ou point',sev:'err'});
  if(ar.find(r=>r.id==='noSpecial')&&/[^a-zA-Z0-9_]/.test(removeAccents(t)))issues.push({msg:'Caractères spéciaux interdits',sev:'err'});
  if(ar.find(r=>r.id==='noUnderscoreEdge')&&(/^_/.test(t)||/_$/.test(t)))issues.push({msg:'Underscore en début ou fin',sev:'warn'});
  if(ar.find(r=>r.id==='noDoubleUnderscore')&&/__/.test(t))issues.push({msg:'Double underscore interdit',sev:'warn'});
  if(ar.find(r=>r.id==='noSnake')&&/_/.test(t)&&!/[A-Z]/.test(t)&&issues.length===0)issues.push({msg:'snake_case au lieu de camelCase',sev:'warn'});
  if(ar.find(r=>r.id==='camel')&&/^[A-Z]/.test(t)&&/^[a-zA-Z0-9_]+$/.test(removeAccents(t))&&!issues.some(i=>i.msg.includes('spéciaux')))issues.push({msg:'Commence par une majuscule (PascalCase)',sev:'warn'});
  if(ar.find(r=>r.id==='noReserved')&&reserved.has(t.toLowerCase()))issues.push({msg:'Mot réservé FEEL/BPMN',sev:'err'});

  const hasErr=issues.some(i=>i.sev==='err');
  const hasWarn=issues.some(i=>i.sev==='warn');
  const status=hasErr?'invalid':hasWarn?'warn':'valid';
  return{issues,status};
}

function toggleRule(i){
  rules[i].enabled=document.getElementById('rule_'+i).checked;
}
