from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from copy import deepcopy
from hashlib import sha256
import json
from lxml import etree as E
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.shared import Inches

ROOT = Path(__file__).resolve().parent
REF = Path(r'C:\Users\ayoub.benkhiroun_ama\Downloads\Template_EB_RPA.docx')
OUT = ROOT.parent.parent / 'EB_Paprika.docx'
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS={'w':W,'r':R}
def el(tag, **attrs):
    return E.Element('{'+W+'}'+tag, {'{'+W+'}'+k:str(v) for k,v in attrs.items()})
def sub(parent, tag, **attrs):
    x=el(tag,**attrs); parent.append(x); return x
with ZipFile(REF) as z:
    parts={i.filename:z.read(i.filename) for i in z.infolist()}
doc=E.fromstring(parts['word/document.xml']); body=doc.find('w:body',NS)
old=list(body); section=deepcopy(old[-1]); cover=deepcopy(old[1])
inventory={k:{'size':len(v),'sha256':sha256(v).hexdigest()} for k,v in parts.items()}
(ROOT/'package-baseline.json').write_text(json.dumps(inventory,indent=2),encoding='utf-8')

def para(text='', style=None, bold=False, size=22, color=None, page=False):
    p=el('p'); pp=sub(p,'pPr')
    if style: sub(pp,'pStyle',val=style)
    if style=='Titre2':
        np=sub(pp,'numPr'); sub(np,'numId',val=0)
    if page: sub(pp,'pageBreakBefore')
    if style: sub(pp,'keepNext')
    sub(pp,'spacing',before=100 if not style else 180,after=100,line=264,lineRule='auto')
    sub(pp,'jc',val='left')
    rp=el('rPr'); sub(rp,'rFonts',ascii='Arial',hAnsi='Arial',cs='Arial'); sub(rp,'sz',val=size)
    if bold: sub(rp,'b')
    if color: sub(rp,'color',val=color)
    r=sub(p,'r'); r.append(rp); t=sub(r,'t'); t.text=text; t.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
    return p
def add(text='',**kw): body.append(para(text,**kw))
def h1(text,page=True): add(text,style='Titre1',bold=True,size=24,page=page)
def h2(text): add(text,style='Titre2',bold=True,size=22)
def table(headers,rows,widths=None):
    n=len(headers); widths=widths or [9072//n]*n
    t=el('tbl'); pr=sub(t,'tblPr'); sub(pr,'tblStyle',val='Grilledutableau'); sub(pr,'tblW',w=sum(widths),type='dxa'); sub(pr,'tblLayout',type='fixed')
    borders=sub(pr,'tblBorders')
    for s in ['top','left','bottom','right','insideH','insideV']: sub(borders,s,val='single',sz=4,color='A6A6A6')
    m=sub(pr,'tblCellMar')
    for s in ['top','left','bottom','right']: sub(m,s,w=85,type='dxa')
    grid=sub(t,'tblGrid')
    for w in widths: sub(grid,'gridCol',w=w)
    for i,row in enumerate([headers]+rows):
        tr=sub(t,'tr'); trp=sub(tr,'trPr'); sub(trp,'cantSplit')
        if i==0: sub(trp,'tblHeader')
        for j,txt in enumerate(row):
            tc=sub(tr,'tc'); cp=sub(tc,'tcPr'); sub(cp,'tcW',w=widths[j],type='dxa'); sub(cp,'vAlign',val='center')
            if i==0: sub(cp,'shd',val='clear',fill='B4C6E7')
            for line in txt.split('\n'):
                p=para(line,bold=i==0,size=20)
                pp=p.find('w:pPr',NS); pp.find('w:spacing',NS).set('{'+W+'}before','40'); pp.find('w:spacing',NS).set('{'+W+'}after','40')
                tc.append(p)
    body.append(t); add('',size=4)

# The cover table and its three plain text controls are preserved from the example.
cc=cover.find('w:sdtContent',NS)
for node in list(cc)[3:]: cc.remove(node)
for t in cc.xpath('.//w:t',namespaces=NS):
    if t.text=='VEGA': t.text='PAPRIKA'
    elif t.text=='Entité': t.text='Bouygues Telecom'
    elif t.text=='Expression du besoin': t.text='Expression du besoin — AuditFlow Pro'
for node in list(body): body.remove(node)
body.append(cover)

h1('TABLE DES MATIERES',page=False)
for s in ['Détails du processus ................................................ 2',
          'Prérequis et données du processus .............................. 3',
          'Diagramme du processus ........................................... 4',
          'Règles de gestion des audits ...................................... 5',
          'Règles des modules complémentaires .......................... 6',
          'Correction et critères de recette ................................ 7',
          'Gestion des exceptions ............................................. 8',
          'ROI et exploitation .................................................... 9']:
    add(s,size=22)
h1('HISTORIQUE DES VERSIONS DU DOCUMENT',page=False)
table(['Date','Version','Auteur','Commentaire'],[['22/10/2026','0.1','À confirmer','Première rédaction pour validation métier et technique']],[1400,1000,1700,4972])
add('Statut du document : projet d’EB à valider.',bold=True)
add('Cette expression du besoin décrit l’audit et la gouvernance des modèles BPMN avec Paprika AuditFlow Pro. Elle reprend les rubriques de l’exemple fourni et les adapte au fonctionnement de l’application. Les mentions « à confirmer » identifient les décisions et données non disponibles.')

h1('DETAILS DU PROCESSUS')
h2('Objectifs du processus')
add('Le besoin est de réduire les contrôles manuels et d’améliorer la qualité des processus Camunda 7 et Camunda 8 Zeebe avant leur mise en service. Paprika doit permettre aux équipes de charger leurs modèles, d’identifier les anomalies et dépendances, puis de produire les éléments utiles à la correction et à la documentation.')
add('La priorité proposée est l’audit des variables et de la santé des BPMN, complété par la cartographie des sous-processus. La matrice PMG, le comparateur de versions et le simulateur de ROI soutiennent les revues et la gouvernance. Cet ordre de priorité reste à valider par le responsable métier.')
h2('Périmètre fonctionnel')
add('Le périmètre comprend l’import de fichiers, l’application de règles configurables, l’analyse des variables et des appels, les contrôles de structure et de nommage, la documentation PMG, la comparaison de deux versions et les exports. Les corrections sont proposées à l’utilisateur et appliquées sur des copies.')
add('L’analyse est statique et déclenchée par l’utilisateur. L’exécution des processus, le déploiement sur Camunda, la modification automatique de la production et l’envoi automatique de courriels ne font pas partie du parcours décrit.')
h2('Contacts clés')
table(['Rôle','Nom et coordonnées','Responsabilité attendue'],[
 ['Sponsor ou responsable métier','À confirmer','Valider les objectifs, priorités et gains'],
 ['Product Owner Paprika','À confirmer','Valider le périmètre et la recette'],
 ['Référent Camunda et BPMN','À confirmer','Définir les règles et valider les diagnostics'],
 ['Responsable technique et support','À confirmer','Maintenir l’outil et traiter les anomalies'],
 ['Référent sécurité et hébergement','À confirmer','Valider les accès, données et déploiement']
],[2400,2300,4372])

h1('PREREQUIS ET DONNEES DU PROCESSUS')
h2('Prérequis minimaux pour l’automatisation')
add('Habilitations : disposer d’un accès autorisé à Paprika, du droit de lire les modèles BPMN et du droit de conserver les exports. Aucun accès d’administration à Camunda n’est requis pour l’analyse de fichiers. La politique d’accès et les habilitations de production sont à confirmer.')
add('Environnement : navigateur de bureau avec JavaScript et téléchargement de fichiers autorisés. IndexedDB et LocalStorage sont utilisés pour la persistance locale. L’URL cible, les navigateurs homologués, les postes compatibles et les environnements de recette et de production sont à confirmer.')
add('Le code comporte une connexion locale avec comptes de démonstration. Le dispositif d’authentification cible doit être validé. Certaines bibliothèques et polices sont chargées depuis des CDN ; le fonctionnement hors ligne et les flux réseau autorisés doivent être vérifiés pour l’environnement retenu.')
h2('Input du processus')
table(['Élément','Description'],[
 ['Nature','Un ou plusieurs modèles .bpmn ou .xml ; référentiels .xlsx, .xls ou .csv selon le module ; deux versions BPMN pour la comparaison.'],
 ['Exemple disponible','test_process.bpmn dans le dépôt. Constituer un lot représentatif avec parent, sous-processus et anomalies connues pour la recette.'],
 ['Lieu et fréquence','Sélection locale par l’utilisateur, à la demande, notamment avant une revue ou un déploiement. Répertoire partagé éventuel à confirmer.'],
 ['Volumétrie','Nombre de fichiers, taille des lots, nombre de variables et fréquence d’usage à mesurer. Limites à valider par module.']
],[2000,7072])
h2('Output du processus')
add('Les résultats présentent les anomalies, scores, variables, dépendances et pistes de remédiation. Les exports disponibles selon le module comprennent Excel, CSV, JSON, HTML, Markdown, impression/PDF et copies BPMN corrigées, avec archive ZIP pour les lots concernés. Les fichiers sont téléchargés localement à la demande ; le lieu d’archivage et les destinataires sont à confirmer.')
h2('Criticité du processus')
add('Criticité métier à confirmer. Une mauvaise interprétation du diagnostic ou une correction inadaptée peut affecter les modèles utilisés ensuite. Une validation humaine et des tests sur l’environnement Camunda cible sont nécessaires avant déploiement.')

h1('DIAGRAMME DU PROCESSUS')
add('Diagramme d’activité du parcours cible. Les modules complémentaires sont sélectionnés selon le besoin de l’utilisateur. Les cas d’exception sont détaillés dans la rubrique dédiée.')

# Native flowchart asset, drawn locally to keep labels precise.
im=Image.new('RGB',(1500,1650),'white'); d=ImageDraw.Draw(im)
font=ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf',29)
small=ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf',25)
def box(rect,txt,fill='#eaf0fa'):
    d.rounded_rectangle(rect,radius=15,fill=fill,outline='#0050A0',width=3)
    lines=txt.split('\n'); cx=(rect[0]+rect[2])/2; cy=(rect[1]+rect[3])/2
    for i,line in enumerate(lines): d.text((cx,cy+(i-(len(lines)-1)/2)*36),line,font=font,anchor='mm',fill='#17365d')
def arrow(a,b):
    d.line([a,b],fill='#0050A0',width=4)
    import math
    angle=math.atan2(b[1]-a[1],b[0]-a[0]); tip=18
    d.polygon([b,(b[0]-tip*math.cos(angle-.5),b[1]-tip*math.sin(angle-.5)),(b[0]-tip*math.cos(angle+.5),b[1]-tip*math.sin(angle+.5))],fill='#0050A0')
d.ellipse((724,10,776,62),fill='#17365d'); arrow((750,62),(750,100))
box((400,100,1100,195),'Accéder à Paprika et choisir le module')
arrow((750,195),(750,235)); box((400,235,1100,330),'Importer les fichiers et configurer les règles')
arrow((750,330),(750,365))
d.polygon([(750,365),(1050,445),(750,525),(450,445)],fill='#fff0df',outline='#E16400',width=3)
d.text((750,445),'Fichiers exploitables ?',font=font,anchor='mm',fill='#17365d')
arrow((1050,445),(1160,445)); d.text((1090,420),'Non',font=small,fill='#17365d')
box((1160,375,1480,525),'Signaler l’erreur\net corriger l’entrée',fill='#fff0df')
arrow((1320,375),(1320,282)); arrow((1320,282),(1100,282))
arrow((750,525),(750,580)); d.text((780,545),'Oui',font=small,fill='#17365d')
box((400,580,1100,700),'Auditer variables, santé BPMN\net dépendances des sous-processus')
arrow((750,700),(750,750)); box((400,750,1100,870),'Consulter les constats, traces et rapports\nCompléter PMG, comparaison ou ROI si utile')
arrow((750,870),(750,915))
d.polygon([(750,915),(1050,995),(750,1075),(450,995)],fill='#fff0df',outline='#E16400',width=3)
d.text((750,995),'Correction retenue ?',font=font,anchor='mm',fill='#17365d')
arrow((450,995),(180,995)); d.text((320,965),'Oui',font=small,fill='#17365d')
box((20,1080,380,1225),'Corriger une copie\npuis relancer l’audit'); arrow((180,995),(180,1080)); arrow((20,1150),(0,1150)); d.line([(0,1150),(0,640),(400,640)],fill='#0050A0',width=4); arrow((300,640),(400,640))
arrow((750,1075),(750,1160)); d.text((785,1100),'Non',font=small,fill='#17365d')
box((400,1160,1100,1270),'Exporter les livrables et conserver\nles règles utilisées avec le rapport')
arrow((750,1270),(750,1320)); box((400,1320,1100,1460),'Effectuer la recette sur Camunda cible\nObtenir la validation avant déploiement')
arrow((750,1460),(750,1510)); d.ellipse((720,1510,780,1570),outline='#17365d',width=4); d.ellipse((731,1521,769,1559),fill='#17365d')
im.save(ROOT/'processus.png')
tmp=Document(); tmp.add_picture(str(ROOT/'processus.png'),width=Inches(6.1)); tmp.save(ROOT/'diagram.docx')
with ZipFile(ROOT/'diagram.docx') as z:
    dd=E.fromstring(z.read('word/document.xml')); drawing=deepcopy(dd.xpath('//w:drawing',namespaces=NS)[0])
for n in drawing.xpath('.//*[@r:embed]',namespaces=NS): n.set('{'+R+'}embed','rIdPaprikaDiagram')
p=para(); p.find('w:r',NS).append(drawing); body.append(p)

h1('REGLES DE GESTION DES AUDITS')
add('Ces règles décrivent le besoin fonctionnel à valider lors de la recette. Les constats doivent rester rattachés au fichier et à l’élément concernés. Un score seul ne vaut pas validation de mise en production.')
h2('Règle de gestion 1 Importer et préparer les données')
add('1.1 L’utilisateur sélectionne le module et charge les fichiers de son lot. Pour une analyse de dépendances, il fournit le processus parent et les sous-processus disponibles.')
add('1.2 L’outil contrôle la lisibilité et le format. Un XML invalide ou une entrée non exploitable doit être signalé explicitement. Un fichier rejeté ne doit pas être présenté comme audité avec succès.')
add('1.3 Pour un référentiel Excel ou CSV, l’utilisateur vérifie le mappage des colonnes. Il choisit les règles et sévérités adaptées au référentiel de son équipe avant de lancer l’analyse.')
h2('Règle de gestion 2 Auditer les variables')
add('2.1 Extraire les variables identifiables dans les paramètres, formulaires, expressions et mappages Camunda 7 ou Zeebe. Conserver le processus et les éléments sources associés pour permettre la traçabilité.')
add('2.2 Vérifier les conventions configurées, notamment camelCase, caractères autorisés, espaces, accents et mots réservés. Afficher le constat et une suggestion lorsque la règle le permet.')
add('2.3 Présenter les rôles de production, consommation et transmission. Signaler les variables potentiellement non initialisées ou inutilisées dans le périmètre chargé. L’utilisateur confirme ces constats, notamment en présence de scripts, d’expressions dynamiques ou d’entrées externes.')
h2('Règle de gestion 3 Cartographier les sous-processus')
add('3.1 Identifier les appels via Call Activities et leurs cibles, puis représenter les relations entre processus et les mappages d’entrée et de sortie disponibles.')
add('3.2 Distinguer une cible résolue d’un sous-processus absent du lot ; signaler les cycles et la profondeur d’appels. Un sous-processus non fourni constitue une limite du périmètre analysé, à examiner avec le référent Camunda.')
add('3.3 Permettre la consultation de la hiérarchie et des dépendances afin de préparer l’analyse d’impact et d’identifier les modèles à compléter ou à revoir.')

h1('REGLES DES MODULES COMPLEMENTAIRES')
h2('Règle de gestion 4 Contrôler la santé et le nommage BPMN')
add('4.1 Vérifier les identifiants, références, événements, flux, passerelles et éléments d’exécution couverts par les règles actives. Signaler les éléments inatteignables, les impasses et les incohérences détectables statiquement.')
add('4.2 Appliquer les conventions de nommage retenues : tâches formulées avec un verbe d’action, passerelles conditionnelles explicites et événements décrivant un état métier. La conformité dépend du référentiel d’équipe validé.')
add('4.3 Afficher les constats avec leur sévérité et une action de remédiation. Permettre le filtrage et la localisation de l’élément concerné dans le modèle, selon le module. Les contrôles statiques complètent la recette métier et les tests moteur.')
h2('Règle de gestion 5 Produire la matrice PMG')
add('5.1 Extraire les métadonnées, activités, pools, lanes, acteurs et variables du lot BPMN. Préremplir la matrice de gouvernance avec les informations disponibles.')
add('5.2 Permettre à l’utilisateur de compléter les conditions d’applicabilité, commentaires et descriptions des variables. Distinguer les données extraites des informations renseignées manuellement.')
add('5.3 Produire la matrice, le glossaire et la documentation technique dans les formats proposés. Vérifier la complétude avec les responsables des processus avant diffusion.')
h2('Règle de gestion 6 Comparer deux versions')
add('6.1 L’utilisateur désigne une version de référence A et une version B du modèle. Le comparateur présente les ajouts, suppressions et modifications détectés pour faciliter la revue de changement.')
add('6.2 Le résultat sert de support à l’analyse d’impact. Les effets sur les applications, les données externes et l’exécution doivent être évalués séparément par l’équipe projet.')
h2('Règle de gestion 7 Simuler les gains')
add('7.1 Renseigner des hypothèses validées de volumétrie, temps manuel, temps assisté et coût horaire. Documenter le périmètre, la période et les coûts inclus.')
add('7.2 Présenter les résultats comme une simulation. Une estimation ne devient un gain réalisé qu’après mesure et validation ; aucun montant ni délai de retour sur investissement n’est engagé dans cette EB.')

h1('CORRECTION ET CRITERES DE RECETTE')
h2('Règle de gestion 8 Corriger et exporter')
add('8.1 L’utilisateur examine les anomalies et les suggestions avant d’appliquer une correction. Les fichiers originaux sont conservés. Le module d’audit des variables peut produire des copies corrigées et un ZIP coordonné du lot.')
add('8.2 Dans le module santé BPMN, les corrections automatiques doivent rester limitées aux opérations proposées par l’outil, notamment le nettoyage de libellés. Les corrections métier ou sémantiques sont validées manuellement.')
add('8.3 Après correction, relancer l’audit, vérifier les appels et les échanges de variables, puis tester les modèles sur la version cible de Camunda. Exporter le rapport et les copies retenues. Le circuit de validation et d’archivage est à confirmer.')
h2('Critères de recette proposés')
table(['Cas de recette','Résultat attendu'],[
 ['Importer un lot valide Camunda 7 et un lot Zeebe','Les fichiers sont reconnus ; le périmètre analysé est identifiable.'],
 ['Importer un XML mal formé','Une erreur compréhensible est affichée ; le fichier n’est pas déclaré conforme.'],
 ['Utiliser des noms non conformes connus','Les règles actives produisent les constats attendus et localisables.'],
 ['Charger un parent avec une cible absente puis un cycle','Les cibles manquantes et cycles attendus sont signalés.'],
 ['Appliquer une correction puis réauditer','L’original est inchangé ; la copie reste lisible et les références sont vérifiées.'],
 ['Compléter PMG et exporter un rapport','Les données saisies et les constats attendus apparaissent dans l’export.'],
 ['Comparer deux modèles avec écarts connus','Les ajouts, suppressions et modifications attendus sont identifiés.'],
 ['Tester un lot de référence représentatif','Temps, mémoire et limites sont mesurés ; les seuils acceptables sont validés.']
],[3300,5772])
add('Jeux d’essai à constituer : lot nominal, cas d’erreur par règle prioritaire, expressions dynamiques et scénario de correction inter-processus. Le jeu test_process.bpmn fournit un point de départ, sans constituer à lui seul une recette complète.',size=20)

h1('GESTION DES EXCEPTIONS')
add('Les comportements ci-dessous constituent les attentes proposées pour la recette. Ils doivent être confirmés sur les modules concernés. Un constat métier détecté par l’audit est distingué d’un échec technique de traitement.')
table(['Exception','Traitement et reprise attendus'],[
 ['1 Aucun fichier sélectionné','Inviter l’utilisateur à fournir une entrée avant analyse. Reprendre après sélection.'],
 ['2 Format ou XML invalide','Identifier le fichier rejeté et la cause disponible. Corriger ou remplacer l’entrée puis relancer.'],
 ['3 Lot incomplet ou cible dynamique','Signaler les limites de résolution. Ajouter le sous-processus ou faire confirmer la dépendance par le référent.'],
 ['4 Identifiants dupliqués ou cycle','Afficher les éléments concernés. Revoir le modèle avant de poursuivre la validation.'],
 ['5 Volume excessif ou navigateur saturé','Informer l’utilisateur de l’échec ; réduire le lot ou ajuster la limite validée. Ne pas interpréter un rapport partiel comme complet.'],
 ['6 Échec d’export ou bibliothèque indisponible','Conserver les résultats accessibles ; vérifier téléchargement, dépendances et politique réseau puis réessayer.'],
 ['7 Stockage local indisponible ou saturé','Signaler l’échec de sauvegarde. Exporter les éléments utiles avant fermeture ; les règles de conservation sont à confirmer.'],
 ['8 Accès ou environnement indisponible','Vérifier l’accès à l’outil et les droits ; solliciter le support identifié. Aucun accès à la production n’est contourné.'],
 ['9 Copie corrigée incohérente','Revenir au modèle original, examiner la suggestion et effectuer la correction manuellement. Réauditer et tester.']
],[3200,5872])
add('Pour le support, joindre si nécessaire le module, la version de l’outil, les étapes de reproduction et un exemple anonymisé. Le canal, les responsables et les délais de prise en charge restent à confirmer.',size=20)

h1('ELEMENTS DE ROI')
add('Les gains recherchés sont la réduction du temps d’audit, de cartographie et de rédaction documentaire, ainsi qu’une détection plus précoce des anomalies. La volumétrie de lancement, le temps de référence et l’économie annuelle restent à mesurer. Les chiffres de l’exemple VEGA et les promesses commerciales de la présentation ne sont pas repris comme résultats acquis.')
add('Méthode proposée : mesurer sur un même lot le temps manuel et le temps avec Paprika, en incluant la revue, la correction et la vérification des exports. Heures gagnées par an = nombre de lots annuels × différence de temps par lot. Gain net annuel = heures gagnées × coût horaire − coûts annuels d’exploitation. Inclure le coût initial pour calculer le retour sur investissement.')
h1('EXPLOITATION DU PROCESSUS',page=False)
h2('Plage horaire et modalités de mise en service')
add('Usage interactif à la demande. Aucun horaire de robot planifié n’est défini. L’hébergement, la disponibilité cible, le support et les modalités de mise à jour sont à confirmer. Le fonctionnement hors ligne dépend de la disponibilité locale des ressources nécessaires.')
h2('Retraitement des cas en échec')
add('Reprendre à partir des fichiers originaux après correction de la cause. Recharger les mêmes règles, relancer l’analyse et comparer les résultats. Conserver les rapports validés selon la politique documentaire de l’équipe ; le stockage local ne constitue pas une sauvegarde partagée.')
h1('INFORMATIONS COMPLEMENTAIRES',page=False)
add('Sources locales utilisées : README.md, GUIDE_UTILISATEUR.md et PRESENTATION_PAPRIKA.md. Vérifications ponctuelles dans index.html, js/app.js et main.js pour les dépendances réseau, la connexion locale et le mode de distribution. Ces éléments décrivent l’existant ; ils ne constituent pas un procès-verbal de recette.',size=20)
add('Décisions à confirmer : responsable et contacts ; priorité et périmètre de la première version ; URL et environnements ; dispositif d’accès ; règles de référence ; volumétrie et seuils de performance ; criticité ; archivage ; support ; données de ROI et validation finale.',bold=True,size=20)
body.append(section)

rels=E.fromstring(parts['word/_rels/document.xml.rels'])
E.SubElement(rels,'{http://schemas.openxmlformats.org/package/2006/relationships}Relationship',Id='rIdPaprikaDiagram',Type=R+'/image',Target='media/paprika_processus.png')
parts['word/_rels/document.xml.rels']=E.tostring(rels,xml_declaration=True,encoding='UTF-8',standalone=True)
parts['word/media/paprika_processus.png']=(ROOT/'processus.png').read_bytes()
parts['word/document.xml']=E.tostring(doc,xml_declaration=True,encoding='UTF-8',standalone=True)

# Synchronize plain text cover bindings with the new subject, preserving controls.
for name in list(parts):
    if name.startswith('customXml/item') and name.endswith('.xml') and 'Props' not in name:
        root=E.fromstring(parts[name]); changed=False
        for x in root.iter():
            local=E.QName(x).localname
            if local=='title' and x.text=='VEGA': x.text='PAPRIKA'; changed=True
            if local=='Company' and x.text=='Entité': x.text='Bouygues Telecom'; changed=True
            if local=='subject' and x.text=='Expression du besoin': x.text='Expression du besoin — AuditFlow Pro'; changed=True
        if changed: parts[name]=E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
for name in ['docProps/core.xml','docProps/app.xml']:
    root=E.fromstring(parts[name])
    for x in root.iter():
        if E.QName(x).localname=='title': x.text='PAPRIKA'
        if E.QName(x).localname=='subject': x.text='Expression du besoin — AuditFlow Pro'
        if E.QName(x).localname=='Company': x.text='Bouygues Telecom'
    parts[name]=E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)

settings=E.fromstring(parts['word/settings.xml'])
update=settings.find('w:updateFields',NS)
if update is None: update=sub(settings,'updateFields')
update.set('{'+W+'}val','true')
parts['word/settings.xml']=E.tostring(settings,xml_declaration=True,encoding='UTF-8',standalone=True)
with ZipFile(OUT,'w',ZIP_DEFLATED) as z:
    for k,v in parts.items(): z.writestr(k,v)
changed=[k for k,v in parts.items() if k not in inventory or sha256(v).hexdigest()!=inventory[k]['sha256']]
(ROOT/'package-changes.json').write_text(json.dumps(changed,indent=2),encoding='utf-8')
print(OUT)
print('Changed parts:',changed)
print('Reference SHA256:',sha256(REF.read_bytes()).hexdigest())
