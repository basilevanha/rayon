# Rayon : cahier des charges

Nom de code : **Rayon**. Application de listes de courses partagées.

Version 3.1, octobre 2026. Source de vérité du projet. Chaque exigence porte un identifiant (ex. COU-10) à citer dans les plans, commits et tests.

## 1. Objet et périmètre

### 1.1 Contexte

Application web de listes de courses partagées. Chaque liste est un espace autonome avec ses membres et son catalogue d'articles. Les magasins et l'ordre de leurs rayons forment une base commune, alimentée par la communauté. L'usage principal est sur téléphone en magasin, l'usage secondaire sur ordinateur pour préparer.

### 1.2 Objectifs

- Préparer une liste en quelques secondes grâce à une recherche tolérante.
- Faire les courses dans l'ordre des rayons du magasin choisi.
- Fonctionner sans réseau en magasin.
- Ne jamais laisser un membre ignorer une modification faite par un autre pendant les courses.
- Mutualiser l'ordre des rayons des magasins entre tous les utilisateurs.
- Rester le plus simple possible : chaque fonctionnalité doit justifier sa présence.

### 1.3 Hors périmètre

Multilingue (français uniquement), notifications push, unités de mesure, prix et budget, enseignes et cartes de fidélité, publication sur les stores d'applications, application desktop installée.

## 2. Glossaire

- **Compte** : identité d'un utilisateur, rattachée à une adresse email.
- **Liste** : espace partagé qui contient des membres et un catalogue d'articles.
- **Membre** : compte qui appartient à une liste.
- **Article** : produit nommé appartenant à une liste. Chaque conditionnement est un article distinct (ex. « Œufs ×12 » et « Œufs ×6 »).
- **Catalogue** : articles d'une liste qui ne sont ni à acheter ni dans le caddie.
- **À acheter** : articles à prendre lors des prochaines courses.
- **Caddie** : articles cochés pendant la session de courses en cours.
- **Rayon** : catégorie d'emplacement, choisie dans une liste fixe commune à toute l'application (ex. Produits laitiers). « Autre » est un rayon comme les autres.
- **Magasin** : point de vente précis (ex. Colruyt Wavre).
- **Ordre de référence** : ordre des rayons défini par l'application, utilisé par la vue « Défaut » et par tout magasin dont l'ordre n'a pas été modifié.
- **Ordre du magasin** : ordre des rayons dans un magasin, commun à tous les utilisateurs.
- **Rangement** : rayon d'un article dans un magasin donné, quand il diffère de son rayon. Propre à la liste, partagé par ses membres.
- **Vue** : magasin sélectionné pour afficher une liste, ou « Défaut » (ordre de référence).
- **Session de courses** : période entre « Démarrer les courses » et « Terminer » pour une liste et un magasin.
- **Mode préparation** : affichage par défaut d'une liste, sans cases à cocher.
- **Mode courses** : affichage utilisé en magasin, avec cases à cocher.
- **Mode réorganiser** : affichage temporaire de la liste pour déplacer rayons et articles, en préparation comme en courses.
- **Éditeur** : V2. Utilisateur habilité à valider et à fusionner les données des magasins.

## 3. Comptes et listes

### 3.1 Inscription

V1 : inscription uniquement sur invitation. La croissance est volontairement lente. Le projet reste ainsi sous contrôle : en cas d'engouement soudain, les quotas des plans gratuits ne sont pas dépassés et aucun coût d'hébergement n'est engagé avant d'en avoir pris la décision.

V2 : inscription ouverte, quand l'infrastructure et la modération sont prêtes à suivre.

- **ISC-01.** Le mode d'inscription est un réglage de l'application : « sur invitation » (V1) ou « ouvert » (V2). Il se change depuis l'administration, sans déploiement.
- **ISC-02.** En mode sur invitation, un compte ne se crée qu'avec un code valide : invitation à une liste (INV-01) ou invitation à l'application (ISC-04). Toute autre tentative affiche « L'inscription se fait sur invitation », un lien vers la demande d'accès et un lien « Déjà une invitation ? ». Ce dernier affiche un champ pour saisir le code d'une invitation (à l'application ou à une liste) et renvoie la demande de connexion avec ce code.
- **ISC-03.** Le contrôle est fait côté serveur, au moment de la création du compte, par le hook Supabase « Before User Created ». Le code est transmis avec la demande de connexion. Masquer un bouton dans l'interface ne suffit jamais à bloquer une inscription.
- **ISC-04.** Une invitation à l'application crée un compte sans liste. Elle est générée par un administrateur, ou par un utilisateur dans la limite de son quota (3 par défaut, réglable). Elle prend la forme d'un lien et d'un code, valable 14 jours, à usage unique et révocable.
- **ISC-05.** Un code est réservé à l'adresse email qui l'utilise en premier, puis consommé à la création du compte. Un compte existant qui ouvre une invitation à l'application voit « Vous avez déjà un compte ». Le code est consommé à la demande de connexion. Si l'adresse n'est pas confirmée dans les 24 heures, le compte non confirmé est supprimé et le code redevient utilisable jusqu'à son expiration.
- **ISC-06.** Un plafond global de comptes s'applique (100 par défaut, réglable). Une fois atteint, aucune inscription n'est acceptée, même avec un code valide. Le message indique que les inscriptions sont momentanément complètes.
- **ISC-07.** Une page publique « Demander un accès » recueille une adresse email et un message facultatif, protégée par un captcha. Une adresse ne peut avoir qu'une demande en attente. Le demandeur reçoit un email de confirmation.
- **ISC-08.** Un administrateur accepte ou refuse chaque demande depuis l'administration. Une acceptation génère une invitation à l'application et l'envoie par email. Un refus envoie un email neutre.
- **ISC-09.** V2. En mode ouvert, l'inscription est libre, protégée par un captcha, avec au plus 5 demandes de connexion par heure et par adresse. Le plafond global reste actif.

### 3.2 Administration

- **ADM-01.** Une page réservée aux administrateurs affiche le nombre de comptes et le plafond, le mode d'inscription, le quota d'invitations par utilisateur, les demandes d'accès, les invitations émises (statut, révocation) et la liste des rayons (ADM-03).
- **ADM-02.** Un email d'alerte est envoyé aux administrateurs à 80 % du plafond de comptes.
- **ADM-03.** L'administration permet de gérer la liste des rayons : renommer, ajouter, réordonner l'ordre de référence et supprimer. Un rayon ajouté s'insère dans l'ordre de chaque magasin juste après son prédécesseur dans l'ordre de référence (TEC-02). La suppression demande un rayon de remplacement, vers lequel passent tous les articles et rangements du rayon supprimé. « Autre » ne peut pas être supprimé.

### 3.3 Comptes

- **CPT-01.** Connexion sans mot de passe. L'utilisateur saisit son adresse email et reçoit un email contenant à la fois un lien de connexion et un code de 6 chiffres. Le lien convient au navigateur, le code à l'application installée, dont le stockage peut être séparé de celui du navigateur.
- **CPT-02.** Le lien et le code sont valables 15 minutes, à usage unique. Utiliser l'un invalide l'autre.
- **CPT-03.** Session persistante de longue durée, renouvelée automatiquement.
- **CPT-04.** Le profil contient un nom affiché (obligatoire, 1 à 30 caractères), visible des membres des listes partagées, et le nombre d'invitations à l'application restantes.
- **CPT-05.** L'utilisateur peut exporter ses données en JSON et supprimer son compte. La suppression le retire de toutes ses listes (LST-07 et LST-08), et anonymise ses contributions aux magasins.
- **CPT-06.** L'avatar du compte, sur la page d'accueil, ouvre un tiroir : nom affiché (modifiable), adresse email, nombre d'invitations à l'application restantes et « Se déconnecter ».
- **CPT-07.** La déconnexion efface les données de l'appareil : cache, file d'attente et dernière liste ouverte. Si des modifications attendent le réseau, une confirmation l'indique : « n modifications non envoyées seront perdues ».

### 3.4 Listes

- **LST-01.** Un compte peut créer des listes et appartenir à plusieurs listes. Une liste a un nom (1 à 40 caractères) et un emoji. L'emoji se choisit dans une grille fixe, 🛒 par défaut.
- **LST-02.** La page d'accueil (NAV-06) et le tiroir des listes (NAV-03) affichent chaque liste avec son nombre d'articles à acheter.
- **LST-03.** La dernière liste ouverte est mémorisée sur l'appareil et rouverte au lancement.
- **LST-04.** Une liste peut être créée vide ou à partir d'une liste existante. La copie reprend les articles (au statut catalogue, avec leur rayon et leurs rangements), sans les membres.
- **LST-05.** Les réglages d'une liste permettent de modifier nom et emoji, de gérer les membres, et de quitter ou supprimer la liste.
- **LST-06.** Seul le créateur peut supprimer la liste ou retirer un membre. La suppression demande de saisir le nom de la liste. Un membre retiré peut revenir avec une nouvelle invitation, créée après son retrait.
- **LST-07.** Quand le créateur quitte la liste, le rôle passe au membre le plus ancien.
- **LST-08.** Quand le dernier membre quitte la liste, elle est supprimée après confirmation.

### 3.5 Invitations à une liste

- **INV-01.** Tout membre peut générer une invitation, sous forme de lien et de code à 6 caractères. Elle est valable 7 jours, à usage unique et révocable. Les codes d'invitation à une liste et à l'application sont uniques ensemble. Les codes générés n'utilisent pas de caractères ambigus (0, O, 1, I) ; un code d'invitation à l'application choisi par un administrateur est libre.
- **INV-02.** Le lien ouvre l'écran de connexion, ou l'inscription si la personne n'a pas de compte. Une invitation à une liste vaut autorisation d'inscription (ISC-02), dans la limite du plafond (ISC-06). Le compte est ajouté à la liste après confirmation de son adresse email, à sa première connexion.
- **INV-03.** Une invitation expirée, révoquée ou déjà utilisée affiche un message clair et propose de demander un nouveau lien.
- **INV-04.** Les membres de la liste voient « [membre] a rejoint la liste » à son arrivée.

## 4. Navigation et parcours utilisateur

### 4.1 Navigation

- **NAV-01.** Au lancement, l'application ouvre la dernière liste ouverte, en mode préparation. Sinon, elle affiche la page d'accueil (NAV-06).
- **NAV-02.** L'en-tête d'une liste affiche : à gauche, une flèche de retour vers l'accueil ; au centre, l'emoji et le nom de la liste suivis d'une flèche vers le bas ; à droite, les avatars des membres et l'icône des réglages.
- **NAV-03.** Un tap sur le nom ouvre le tiroir des listes, pour changer de liste : toutes les listes du compte, dans l'ordre de la page d'accueil (NAV-06). Créer ou rejoindre une liste se fait depuis l'accueil (NAV-06). Si le compte n'a qu'une liste, le nom n'est pas suivi d'une flèche et n'ouvre pas de tiroir.
- **NAV-04.** L'icône des réglages donne accès aux réglages de la liste et, pour les rôles concernés, à la modération et à l'administration. Le profil est accessible par l'avatar du compte (CPT-06).
- **NAV-05.** Un retour en arrière depuis un tiroir le ferme. Depuis le mode courses, il demande « Quitter les courses ? » sans terminer la session.
- **NAV-06.** La page d'accueil, titrée du nom de l'application, affiche toutes les listes du compte, de la plus récemment active à la moins récente (à égalité, par ordre alphabétique), avec leur emoji, leur nom et leur nombre d'articles à acheter, ainsi que l'avatar du compte (CPT-06). Un bouton « Ajouter une liste », fixé en bas de l'écran, ouvre un tiroir qui propose « Créer une liste » et « Rejoindre une liste » (avec un code). Sans liste, la page invite à créer une liste ou à en rejoindre une. L'activité d'une liste est sa dernière modification par l'un de ses membres : création, nom ou emoji, arrivée ou départ d'un membre, ajout, modification, changement de statut ou retrait d'un article. Ouvrir ou fermer une liste ne change pas son activité.

### 4.2 Première connexion

- L'utilisateur ouvre un lien d'invitation ou la page de connexion.
- Il saisit son email, puis clique sur le lien ou saisit le code reçu.
- S'il est nouveau, il choisit son nom affiché.
- Il arrive dans la liste à laquelle il a été invité, ou sur la page d'accueil.
- Une bannière discrète propose d'installer l'application sur l'écran d'accueil.

### 4.3 Préparer la liste

- L'utilisateur tape un mot dans la recherche.
- Il touche un résultat pour l'ajouter, ou « Créer [texte] » pour un nouvel article, en choisissant son rayon.
- La barre se vide, il enchaîne l'ajout suivant.
- Pour retirer un article, il le fait glisser vers la gauche.

### 4.4 Faire les courses

- L'utilisateur touche « Démarrer les courses » et confirme ou change le magasin.
- Il coche les articles au fil des rayons. Chaque article coché rejoint le caddie.
- Il retire d'un glissement un article devenu inutile.
- Si l'ordre des rayons ne correspond pas au magasin, il ouvre le mode réorganiser, corrige, puis touche « OK ».
- Il touche « Terminer » et confirme.

### 4.5 Ajouter un magasin manquant

- Dans le sélecteur de magasin, l'utilisateur ne trouve pas son magasin et touche « Ajouter un magasin ».
- Il saisit nom et adresse. L'application signale les magasins proches au nom similaire.
- Il choisit de partir de l'ordre d'un autre magasin ou de l'ordre de référence.
- Le magasin est créé et sélectionné.

## 5. Articles

- **ART-01.** Un article possède un nom (obligatoire, 1 à 80 caractères), un rayon (obligatoire, éventuellement « Autre »), un rangement facultatif par magasin (RNG-01), une quantité (entier facultatif, au moins 1, vide par défaut) et un statut : catalogue, à acheter ou caddie.
- **ART-02.** La quantité ne sert qu'aux besoins ponctuels. Elle revient à vide quand l'article retourne au catalogue.
- **ART-03.** Un article ne se crée que depuis la recherche, par l'action explicite « Créer [texte] ».
- **ART-04.** Le nom normalisé (REC-02) est unique dans la liste. Si une création correspond à un article existant, aucun doublon n'est créé : l'article existant passe à « à acheter » s'il était au catalogue, reste dans le caddie s'il y était, et un message l'indique (même règle que OFF-05).
- **ART-05.** À la création, le rayon est obligatoire. Si un article de même nom normalisé existe dans une autre liste du compte, son rayon est présélectionné et « Créer » s'applique en un geste. Sinon, des pastilles sous « Créer [texte] » proposent les 5 rayons les plus utilisés dans la liste, « Autre » et « Tous les rayons… » (tiroir avec un champ de filtre) : un tap choisit le rayon et crée l'article.
- **ART-06.** Un tap sur un article, en mode préparation, ouvre le tiroir d'édition : nom, quantité, rayon dans la vue sélectionnée, suppression. La quantité ne se saisit que pour un article à acheter ou dans le caddie (ART-02). Renommer en un nom normalisé déjà présent dans la liste échoue avec le message « Un article du même nom existe déjà ».
- **ART-07.** Quand un magasin est sélectionné, changer le rayon d'un article (tiroir ou mode réorganiser) modifie son rangement dans ce magasin. Une case « Dans tous les magasins » modifie son rayon et efface ses rangements. En vue « Défaut », le changement modifie toujours son rayon, sans toucher à ses rangements ; le tiroir les signale par une mention discrète sous le champ « Rayon », par exemple « Rangé ailleurs dans 1 magasin ». Dans tous les cas, il vaut pour tous les membres de la liste.
- **ART-08.** La suppression définitive n'est accessible que depuis le tiroir d'édition. Elle est douce (date de suppression), retire l'article de la liste et de la recherche, et propose « Annuler » pendant 6 secondes. Si un article de même nom normalisé a été créé entre-temps, l'annulation échoue avec le message « Un article du même nom existe déjà ».

## 6. Recherche

- **REC-01.** Une barre de recherche est fixée en haut de l'écran d'une liste. Elle porte sur tous les articles non supprimés de la liste, quel que soit leur statut.
- **REC-02.** La saisie et les noms sont comparés sous forme normalisée : minuscules, accents retirés, « œ » transformé en « oe » et « æ » en « ae », espaces réduits et retirés aux extrémités, « s » ou « x » final retiré pour les mots de 4 lettres ou plus. Seules les lettres comptent pour la longueur d'un mot, mesurée avant ce retrait. Les autres caractères (trait d'union, apostrophe, chiffres, « × ») sont conservés.
- **REC-03.** La recherche tolère une faute de frappe dans les mots de 4 lettres ou plus. Les correspondances exactes passent avant les approximatives.
- **REC-04.** Les résultats s'affichent dès le premier caractère, en moins de 50 ms pour 1 000 articles, y compris hors ligne.
- **REC-05.** Chaque résultat indique son statut par un badge : « À acheter » ou « Dans le caddie ».
- **REC-06.** Un tap sur un résultat du catalogue le passe à « à acheter ». Un tap sur un article déjà à acheter ou dans le caddie le met en évidence dans la liste, sans autre effet.
- **REC-07.** La ligne « Créer [texte] » apparaît en dernière position quand aucun article n'a exactement le même nom normalisé.
- **REC-08.** Touche Entrée : sélectionne le premier résultat, ou, s'il n'y a aucun résultat, crée l'article avec le rayon présélectionné (ART-05). Sans rayon présélectionné, elle place le focus sur les pastilles de rayon.
- **REC-09.** Après un ajout, la barre se vide et garde le focus pour permettre des ajouts en série.

## 7. Mode préparation

- **PRE-01.** L'écran affiche, de haut en bas : l'en-tête (NAV-02), la recherche, la barre d'affichage (PRE-10), les articles dans le caddie s'il n'est pas vide (titrés par le bandeau COL-05 pendant une session d'un autre membre), les articles à acheter, puis une section repliée « Tous les articles (n) » (catalogue).
- **PRE-02.** En affichage par rayon, les rayons suivent l'ordre de la vue sélectionnée : l'ordre du magasin, ou l'ordre de référence pour « Défaut ». Dans un rayon, les articles sont triés par ordre alphabétique.
- **PRE-03.** Les titres de rayon sont discrets : petite taille, majuscules, couleur atténuée. Le titre du rayon en cours reste collé en haut pendant le défilement. Les rayons vides ne s'affichent pas.
- **PRE-04.** « Autre » est un rayon ordinaire : il prend sa place dans l'ordre de la vue, en dernier dans l'ordre de référence.
- **PRE-05.** Aucune case à cocher n'est affichée dans ce mode.
- **PRE-06.** Un glissement vers la gauche sur un article à acheter le renvoie au catalogue (« Plus besoin »). L'annulation se fait sur place (UI-10). Le glissement ne supprime jamais un article.
- **PRE-07.** Liste vide : un message invite à utiliser la recherche.
- **PRE-08.** Un bouton fixe en bas d'écran, « Démarrer les courses », rappelle en petit le magasin sélectionné. Il est visible sur mobile uniquement.
- **PRE-09.** Une carte de proposition d'apprentissage (section 10) peut apparaître en tête de liste. Elle se ferme d'un geste et ne revient pas pour la même proposition.
- **PRE-10.** Sous la recherche, une barre d'affichage contient : le sélecteur de vue (« Défaut » et les magasins), l'affichage « Par rayon » (titres de rayon, PRE-03) ou « A → Z » (liste à plat, ordre alphabétique), et un menu « ⋯ » qui contient « Organiser les rayons ». Cette action ouvre le mode réorganiser (COU-19 à COU-21) sur la vue sélectionnée.
- **PRE-11.** La vue sélectionnée est mémorisée par compte et par liste. Une liste qui n'en a pas encore reprend la vue de la dernière liste modifiée par le compte, sinon « Défaut ».
- **PRE-12.** L'affichage « Par rayon » ou « A → Z » est mémorisé sur l'appareil, pour toutes les listes.

## 8. Mode courses

### 8.1 Démarrage et affichage

- **COU-01.** Au démarrage, le magasin de la vue sélectionnée (PRE-11) est présélectionné. Un sélecteur permet d'en choisir un autre : recherche, magasins récents, magasins proches si la géolocalisation est autorisée.
- **COU-02.** Si le caddie n'est pas vide au démarrage, l'application propose « Reprendre » ou « Vider le caddie précédent » (articles renvoyés au catalogue).
- **COU-03.** Le mode courses est un état local à l'appareil, conservé au rechargement. La session est enregistrée côté serveur (liste, magasin, membre, début, fin).
- **COU-04.** Le mode est identifiable sans ambiguïté par une couleur d'accent dédiée.
- **COU-05.** En haut, un bandeau affiche le nom du magasin (un tap ouvre le sélecteur), « n à prendre » et une fine barre de progression, l'icône de la recherche (COU-06), ainsi qu'un menu « ⋯ » qui ne contient que « Réorganiser ».
- **COU-06.** Au centre, seuls les articles à prendre sont affichés, groupés par rayon selon PRE-02 et PRE-03. La recherche est réduite à une icône dans le bandeau.
- **COU-07.** En bas, une barre fixe affiche l'icône du caddie avec un badge du nombre d'articles cochés, et le bouton « Terminer ». Un tap sur l'icône déplie le contenu du caddie.
- **COU-08.** Quand tout est pris, le bandeau affiche « Tout est pris » et le bouton « Terminer » passe en couleur d'accent.
- **COU-09.** Le mode courses ne donne accès ni à la fiche du magasin, ni au tiroir d'édition. Le mode réorganiser y reste accessible par le menu « ⋯ » (COU-05).

### 8.2 Actions sur les articles

- **COU-10.** Un tap sur toute la ligne d'un article le passe au caddie, avec l'animation UI-09. La requête fixe le statut, elle ne l'inverse jamais.
- **COU-11.** Un rayon dont tous les articles sont cochés se replie et disparaît.
- **COU-12.** Dans le caddie déplié, un tap sur un article le remet à « à acheter » dans son rayon.
- **COU-13.** Un glissement vers la gauche retire l'article sans passer par le caddie (« Plus besoin »), avec annulation sur place (UI-10).
- **COU-14.** Un appui long ouvre un tiroir réduit : quantité et « Plus besoin ».
- **COU-15.** À la première session de courses du compte, une ligne fait une démonstration de glissement, une seule fois.
- **COU-16.** Un article ajouté depuis la recherche passe à « à acheter » dans son rayon.
- **COU-17.** Le magasin se change pendant la session. La liste se retrie immédiatement selon le nouveau magasin.
- **COU-18.** Une modification de l'ordre du magasin, faite par quelqu'un d'autre et reçue pendant la session, ne retrie pas la liste. Elle s'applique à la session suivante.

### 8.3 Mode réorganiser

- **COU-19.** Le mode réorganiser s'ouvre depuis « Organiser les rayons » (PRE-10) ou « Réorganiser » (COU-05). Il masque les cases à cocher, affiche des poignées sur les rayons et les articles, et un bouton « OK » pour revenir à l'affichage précédent. Aucune coche n'est possible dans ce mode. Les articles d'un rayon restent dans l'ordre alphabétique.
- **COU-20.** Deux gestes sont possibles, chacun avec sa portée :
  - déplacer un rayon : modifie l'ordre du magasin, pour tous les utilisateurs (DIS-02). Impossible en vue « Défaut », dont l'ordre est fixe ;
  - déplacer un article vers un autre rayon : selon ART-07, son rangement dans ce magasin, ou son rayon dans tous les magasins.
- **COU-21.** Chaque déplacement est confirmé par un message qui en précise la portée, par exemple « Produits laitiers déplacé chez Delhaize Wavre, pour tous » ou « Bananes rangées dans Pommes de terre et oignons chez Delhaize Wavre ».

### 8.4 Fin de session

- **COU-22.** « Terminer » demande une confirmation qui indique le nombre d'articles non cochés. Le caddie retourne au catalogue, les articles non cochés restent à acheter, l'appareil revient en mode préparation.
- **COU-23.** L'écran reste allumé pendant le mode courses. Le verrou est réacquis au retour au premier plan et relâché à la sortie du mode.
- **COU-24.** Le mode courses n'est pas proposé sur desktop.

## 9. Rayons et magasins

### 9.1 Rayons

- **RAY-01.** Les rayons forment une liste fixe, commune à toute l'application, avec un ordre de référence. « Autre » en fait partie, en dernière position. Seuls les administrateurs la modifient (ADM-03). La liste initiale figure en annexe (§18).
- **RAY-02.** Les utilisateurs ne créent, ne renomment et ne suppriment aucun rayon. Ils ne modifient que l'ordre des rayons d'un magasin (DIS-01).

### 9.2 Magasins

- **MAG-01.** Un magasin possède un nom, une adresse, une ville, des coordonnées, un statut (ouvert ou fermé) et un identifiant OpenStreetMap facultatif.
- **MAG-02.** La base est initialisée à partir d'OpenStreetMap (supermarchés en Belgique) et mise à jour périodiquement. L'attribution OpenStreetMap est affichée.
- **MAG-03.** La recherche de magasin porte sur le nom et la ville, avec la même tolérance que REC-02 et REC-03. Les résultats proches apparaissent en premier si la géolocalisation est autorisée.
- **MAG-04.** Tout utilisateur peut ajouter un magasin, depuis le sélecteur de vue (PRE-10) ou de magasin (COU-01). Avant validation, l'application affiche les magasins à moins de 500 m, ou au nom similaire dans la même ville, et demande s'il s'agit d'un doublon. Un magasin ajouté est visible de tous.
- **MAG-05.** À la création, l'ordre des rayons part de celui d'un autre magasin choisi par l'utilisateur, ou de l'ordre de référence.

### 9.3 Ordre des rayons d'un magasin

- **DIS-01.** Chaque magasin a un ordre des rayons, commun à tous les utilisateurs. Tant qu'il n'a pas été modifié, c'est l'ordre de référence. Tous les rayons y figurent ; un rayon ajouté depuis (ADM-03) se place selon TEC-02 ; un rayon sans article ne s'affiche pas (PRE-03).
- **DIS-02.** Tout utilisateur modifie l'ordre d'un magasin, par glisser-déposer, dans le mode réorganiser (COU-20). L'écran précise que la modification vaut pour tous.
- **DIS-03.** V2. Chaque modification crée une révision horodatée, avec son auteur. L'historique est consultable et une révision peut être restaurée.

### 9.4 Rangements

- **RNG-01.** Dans un magasin, un article est dans son rangement s'il en a un, sinon dans son rayon. Le rangement est propre à la liste et au magasin, et partagé par les membres de la liste.
- **RNG-02.** Un rangement identique au rayon de l'article est supprimé. Changer le rayon d'un article « dans tous les magasins » efface ses rangements (ART-07).

## 10. Apprentissage

Note de priorité : l'apprentissage est une évolution, non prioritaire au lancement. Seule l'exigence APP-01 est nécessaire dès le lancement, pour disposer des données le jour où l'apprentissage sera développé.

- **APP-01.** Dès le lancement. Chaque coche est enregistrée avec son horodatage, la session, le magasin, l'article et son rayon.
- **APP-02.** Une proposition n'apparaît jamais pendant une session de courses. Elle s'affiche après « Terminer » ou à la prochaine ouverture en mode préparation, sous forme de carte (PRE-09).
- **APP-03.** Ordre. Après au moins 3 sessions dans un magasin, si l'ordre de coche des rayons diffère de l'ordre du magasin, une carte propose un nouvel ordre et montre les déplacements (ex. « Produits laitiers : 4 → 1 »). Choix : Accepter, Refuser, Ne plus proposer pour ce magasin.
- **APP-04.** Rayon. Si un article est régulièrement coché au milieu des articles d'un autre rayon, une carte propose de changer son rayon (ex. « Vous prenez souvent le lait d'avoine avec les Céréales et biscottes. Le déplacer ? »). Choix : Oui, Non.
- **APP-05.** Une proposition ne contredit jamais un déplacement manuel fait au cours des 3 dernières sessions.
- **APP-06.** Les ordres de coche de tous les utilisateurs d'un magasin sont agrégés de façon anonyme pour alimenter APP-03.

## 11. Contribution et modération

En V1, les magasins et l'ordre de leurs rayons sont modifiables par tous, sans modération. Seuls CON-01 (sans le rôle d'éditeur) et CON-08 (limite de débit) s'appliquent ; le reste de la section est prévu pour la V2.

- **CON-01.** Trois rôles : utilisateur, éditeur (V2), administrateur. Les administrateurs nomment les éditeurs. Le premier administrateur est désigné par une commande SQL documentée dans le README.
- **CON-02.** V2. Un magasin non verrouillé se modifie directement par tout utilisateur (modèle wiki). Un magasin verrouillé par un éditeur n'accepte que des suggestions.
- **CON-03.** V2. Une suggestion porte sur un nouveau magasin, une modification d'informations, l'ordre des rayons ou une fusion de doublons. Elle a un statut : en attente, acceptée ou refusée, avec un motif.
- **CON-04.** V2. L'auteur d'une suggestion voit son statut dans son profil.
- **CON-05.** V2. Tout utilisateur peut signaler un magasin : doublon, fermé ou informations erronées.
- **CON-06.** V2. Un éditeur peut fusionner deux magasins. L'ordre des rayons, les rangements, les sessions et les vues sélectionnées sont transférés au magasin conservé ; quand un article a un rangement dans les deux magasins, celui du magasin conservé l'emporte. L'ancien magasin redirige vers le nouveau.
- **CON-07.** V2. Un éditeur dispose d'une file de modération : suggestions, signalements, magasins créés récemment et suggestions issues de APP-06.
- **CON-08.** Les modifications directes (magasins et ordre des rayons) sont limitées à 20 par jour et par utilisateur. En V2, un éditeur peut restaurer en masse les révisions d'un auteur.

## 12. Collaboration en temps réel

- **COL-01.** Toute modification d'une liste est propagée aux autres membres en moins de 2 secondes sur un réseau normal.
- **COL-02.** Chaque modification enregistre son auteur et son horodatage serveur. En cas d'écritures concurrentes, la dernière l'emporte ; à horodatage égal, l'identifiant d'auteur départage, pour un résultat déterministe.
- **COL-03.** En mode courses, une modification faite par un autre membre n'est jamais silencieuse :
  - ajout : l'article apparaît dans son rayon avec le badge « Ajouté par [membre] » jusqu'à la fin de la session ;
  - retrait : l'article reste à sa place, barré, avec « Retiré par [membre] » et un bouton pour masquer. S'il était dans le caddie, la mention devient « À reposer » ;
  - changement de quantité : badge « Quantité modifiée » ;
  - chaque alerte déclenche une vibration si l'appareil la prend en charge.
- **COL-04.** Retirer un article qu'un autre membre a mis dans le caddie demande une confirmation : « [membre] l'a déjà mis dans le caddie ». Aucune confirmation si l'on a mis l'article dans le caddie soi-même. L'auteur de la mise au caddie est status_by, qu'une autre modification de l'article ne change pas.
- **COL-05.** Un bandeau « [membre] fait les courses chez [magasin] » s'affiche chez les autres membres pendant une session. En mode préparation, il sert de titre à la section du caddie (PRE-01).
- **COL-06.** Quand un membre termine la session, les autres appareils affichent « [membre] a terminé les courses » et quittent le mode courses s'ils y étaient.
- **COL-07.** Un changement de rayon ou de rangement d'un article, fait par un membre pendant la session d'un autre, ne retrie pas sa liste avant la session suivante.

## 13. Hors ligne

- **OFF-01.** Une liste s'ouvre et reste entièrement utilisable sans réseau, à partir du dernier état synchronisé.
- **OFF-02.** Chaque action s'applique immédiatement à l'écran. Elle est mise en file d'attente, puis rejouée dans l'ordre au retour du réseau, même après fermeture de l'application.
- **OFF-03.** Un indicateur affiche « Hors ligne · n modifications en attente ».
- **OFF-04.** Au rejeu, les règles COL-02 à COL-04 s'appliquent. Un conflit avec la modification d'un autre membre produit l'alerte correspondante.
- **OFF-05.** Un article créé hors ligne reçoit un identifiant généré sur l'appareil. Si un article de même nom normalisé existe au rejeu, les deux sont fusionnés : l'article existant est conservé ; il passe à « à acheter » s'il était au catalogue et reste dans le caddie s'il y était ; la quantité saisie hors ligne remplace la sienne si elle est renseignée ; le rayon et les rangements de l'article créé hors ligne sont abandonnés.
- **OFF-06.** Les rayons, ainsi que l'ordre des rayons et les rangements de la vue sélectionnée et des 5 derniers magasins utilisés, sont disponibles hors ligne. Les coches (APP-01) sont mises en file comme les autres actions.
- **OFF-07.** Les actions communautaires (créer un magasin, modifier l'ordre des rayons d'un magasin) et les invitations nécessitent le réseau. Elles sont désactivées hors ligne, avec une explication.
- **OFF-08.** Une session expirée ne bloque pas l'usage local. La reconnexion est demandée sans perte de la file d'attente.

## 14. Interface

### 14.1 Écrans

Connexion, inscription avec code, demande d'accès, accueil (listes du compte), liste (préparation, courses, réorganiser), tiroir des listes, tiroir d'article, sélecteur de vue et de magasin, réglages de la liste, tiroir du compte (profil), administration (dont les rayons). V2 : fiche magasin (historique, signalement), file de modération.

### 14.2 Mobile

- **UI-01.** Conception mobile d'abord, en une colonne. Recherche fixée en haut, barre d'action fixée en bas, zones de sécurité respectées.
- **UI-02.** Cibles tactiles d'au moins 48 px en mode courses, 44 px ailleurs.
- **UI-03.** Édition, sélecteur de magasin, tiroir des listes et confirmations dans des tiroirs qui montent du bas de l'écran.

### 14.3 Desktop

- **UI-04.** Au-delà de 768 px : conteneur centré de 1 000 px maximum. Une liste s'affiche en deux colonnes : à gauche, recherche et articles à acheter ; à droite, tous les articles, selon l'affichage choisi (PRE-10).
- **UI-05.** Raccourcis : « / » place le focus dans la recherche, Entrée ajoute, Échap vide la recherche ou ferme un tiroir.
- **UI-06.** Le glisser-déposer de l'ordre des rayons fonctionne à la souris.

### 14.4 Animations et retours

- **UI-07.** Les animations ne bloquent jamais une interaction. Un nouveau tap reste possible pendant toute animation. Seule exception : la transition entre l'accueil et une liste (glissement de 300 ms au plus) peut ignorer un tap. Elle n'a jamais lieu en mode courses.
- **UI-08.** Si le système demande moins d'animations, chaque animation est remplacée par un fondu simple.
- **UI-09.** Coche en mode courses : la case se remplit immédiatement, avec une vibration courte si elle est prise en charge. La ligne se réduit ensuite en pastille qui rejoint le caddie en 350 ms environ, avec un léger rebond, pendant que l'espace libéré se referme. Le badge du caddie grossit puis revient à sa taille.
- **UI-10.** Annulation sur place : une ligne retirée devient une fine bande « [article] retiré · Annuler » avec une barre de progression de 6 secondes, puis disparaît.
- **UI-11.** Les actions globales (Terminer, Vider le caddie, suppression définitive) affichent un toast en bas d'écran avec « Annuler » et un minuteur de 6 secondes, placé au-dessus de la barre du caddie.

### 14.5 Accessibilité et thème

- **UI-12.** Contrastes conformes WCAG AA, navigation complète au clavier, focus visible. Chaque geste de glissement a un équivalent accessible (appui long, menu).
- **UI-13.** Thèmes clair et sombre selon le réglage du système.

## 15. Données personnelles

- **RGPD-01.** Politique de confidentialité et conditions d'utilisation accessibles avant l'inscription et depuis le profil.
- **RGPD-02.** Données collectées limitées à l'email, au nom affiché et aux données d'usage nécessaires au service. Aucun outil d'analyse tiers, aucune publicité.
- **RGPD-03.** La géolocalisation n'est demandée qu'à l'ouverture du sélecteur de magasin. Elle n'est ni stockée ni transmise à des tiers.
- **RGPD-04.** Les contributions publiques affichent le nom affiché de l'auteur. Les données agrégées de APP-06 ne permettent pas d'identifier un utilisateur.
- **RGPD-05.** Les historiques de coches sont conservés 12 mois, puis agrégés et supprimés.
- **RGPD-06.** Les demandes d'accès refusées sont supprimées après 90 jours.

## 16. Exigences techniques

### 16.1 Stack

- **Socle** : Vite, React, TypeScript strict, pnpm, TanStack Router.
- **Interface** : Tailwind v4, shadcn/ui, lucide-react, Sonner, Vaul, Motion, dnd-kit. i18next pour les textes d'interface, centralisés par espace de noms, en français seul.
- **Données** : Supabase (Postgres, Auth, Realtime), TanStack Query en mode hors ligne d'abord avec cache persisté dans IndexedDB, Zustand persisté pour l'état local, Zod.
- **Recherche** : Fuse.js côté client pour les articles. Recherche de magasins côté serveur (pg_trgm et distance géographique).
- **PWA** : vite-plugin-pwa (Workbox).
- **Anti-abus** : Captcha Cloudflare Turnstile sur la demande d'accès et, en V2, sur l'inscription.

### 16.2 Modèle de données

- **profiles** : id, nom affiché, rôle, quota d'invitations.
- **app_settings, app_invitations, access_requests** : mode d'inscription, plafond et quotas ; invitations à l'application (code, émetteur, expiration, email réservé, utilisation, révocation) ; demandes d'accès (email, message, statut).
- **lists, list_members, invitations** : listes, appartenances (date d'arrivée, créateur) et invitations à une liste.
- **rayons** : liste fixe (nom, ordre de référence), modifiée par les administrateurs. « Autre » est marqué comme non supprimable.
- **articles** : id (UUID généré par le client), list_id, nom, nom normalisé, rayon (obligatoire), statut, status_by (auteur du dernier changement de statut, pour COL-04), quantité, updated_by, updated_at, deleted_at.
- **stores** : nom, adresse, ville, coordonnées, osm_id, statut, créé par ; en V2, verrouillage et merged_into.
- **article_store_rayons** : rangements : list_id, article_id, store_id, rayon_id, updated_by.
- **store_rayon_orders** : ordre des rayons d'un magasin (store_id, rayon_id, position, updated_by). Absent : ordre de référence.
- **list_views** : vue sélectionnée par compte et par liste (user_id, list_id, store_id, vide pour « Défaut »).
- **shopping_sessions, check_events** : sessions de courses et coches horodatées.
- **learning_prompts** : propositions d'apprentissage affichées, avec leur réponse, pour ne pas les répéter.
- **suggestions, reports** : V2. Suggestions et signalements, avec statut, motif et éditeur responsable.
- **TEC-01.** Index unique sur (list_id, nom normalisé) parmi les articles non supprimés.
- **TEC-02.** Le tri d'une liste par rayon suit l'ordre du magasin sélectionné, à défaut l'ordre de référence. Chaque article va dans son rangement dans ce magasin, à défaut dans son rayon (RNG-01). Dans un rayon, l'ordre est alphabétique. Un rayon absent de l'ordre du magasin (ajouté depuis, ADM-03) se place juste après son prédécesseur dans l'ordre de référence.
- **TEC-03.** Fonctions SQL atomiques : set_status (idempotente), terminer_session, creer_article, ranger_article (ART-07), ordonner_rayons (ordre d'un magasin), accepter_invitation, controle_inscription (hook « Before User Created »), supprimer_rayon (ADM-03) ; en V2, fusionner_magasins et restaurer_revision.
- **TEC-04.** Migrations versionnées dans le dépôt. Types TypeScript générés depuis le schéma.

### 16.3 Sécurité

- **SEC-01.** RLS activée sur toutes les tables. Les données d'une liste ne sont accessibles qu'à ses membres. La vue sélectionnée n'est accessible qu'à son compte. Les magasins et leur ordre des rayons sont lisibles et modifiables par tous les comptes (CON-08). Les rayons sont lisibles par tous les comptes et modifiables par les administrateurs seulement.
- **SEC-02.** Les opérations d'administration et de modération passent par des fonctions SQL qui vérifient le rôle. Aucune clé de service côté client.
- **SEC-03.** Limitation de débit sur les invitations (20 par jour et par liste), les demandes d'accès, les créations de magasins et les suggestions.
- **SEC-04.** Le hook d'inscription vérifie le mode, le plafond et la validité du code dans une même transaction, pour qu'un code ne soit jamais utilisé deux fois.

### 16.4 PWA

- **PWA-01.** Manifest en mode standalone, icônes, couleur de thème. Installation depuis le navigateur, sans store.
- **PWA-02.** Mise en cache complète de l'application. Une nouvelle version déclenche une bannière « Nouvelle version disponible », jamais une mise à jour silencieuse.
- **PWA-03.** Wake Lock, Vibration et géolocalisation sont utilisés uniquement s'ils sont pris en charge et autorisés. Leur absence ne dégrade aucune fonctionnalité essentielle.
- **PWA-04.** Un lien d'invitation ouvert depuis l'application installée y reste, sans basculer vers le navigateur quand la plateforme le permet.

### 16.5 Hébergement et exploitation

- **OPS-01.** Front statique sur Vercel, avec réécriture vers index.html et prévisualisation par branche.
- **OPS-02.** Supabase en plan gratuit au départ. Une tâche GitHub Actions quotidienne interroge la base pour éviter la mise en pause après une semaine d'inactivité. Passage au plan payant si l'usage dépasse les quotas.
- **OPS-03.** Sauvegarde hebdomadaire par pg_dump via GitHub Actions, stockée en privé. Restauration testée avant la mise en service.
- **OPS-04.** Import et mise à jour mensuelle des magasins OpenStreetMap par une tâche planifiée. Les magasins modifiés par la communauté ne sont pas écrasés.
- **OPS-05.** Développement en local avec Supabase CLI. Le projet distant est réservé à la production.
- **OPS-06.** Envoi des emails (connexion, invitations, demandes d'accès, alertes) par un service SMTP externe en offre gratuite, le service intégré de Supabase étant trop limité en volume.

### 16.6 Qualité

- **QUA-01.** Oxlint pour le lint, Oxfmt pour le formatage. Vérification des types, lint et tests en CI à chaque push.
- **QUA-02.** Tests unitaires Vitest sur la normalisation, le tri (TEC-02), les règles de conflit et la fusion des doublons.
- **QUA-03.** Tests de base de données sur les politiques RLS (un non-membre ne lit ni n'écrit aucune donnée d'une liste, un utilisateur ne modifie pas les rayons, un compte ne lit pas la vue d'un autre) et sur le hook d'inscription (code absent, expiré, révoqué, déjà utilisé, plafond atteint).
- **QUA-04.** Tests Playwright en viewport mobile : inviter, ajouter, cocher, retirer et annuler, réorganiser, terminer, utiliser hors ligne puis resynchroniser, recevoir une modification d'un autre membre, changer de magasin.
- **QUA-05.** Une error boundary React affiche un écran de secours avec un bouton « Recharger ».

## 17. Pistes d'évolution

Ces pistes ne sont pas des exigences. Elles orientent les choix techniques pour ne pas les rendre impossibles.

- Retirés de la V1 pour la simplicité (présents dans la version 3.0 du SPEC), à reconsidérer :
  - **Position des articles dans un rayon** (RNG-04 de la version 3.0) : ordre manuel des articles d'un rayon, par magasin.
  - **Rayons propres à un magasin**, toujours rattachés à un rayon commun, et **libellés de rayon par magasin** avec « Rétablir le nom ».
  - **Parcours personnel** (PAR de la version 3.0) : un ordre propre à chaque compte, qui suit l'ordre du magasin tant qu'il n'est pas modifié. Nécessaire à un apprentissage par compte.
  - **Sous-rayons de liste** (RAY-02 et RAY-04 de la version 3.0) et **suggestion de nouveaux rayons** par les utilisateurs (RAY-03 de la version 3.0).
- Suggestion de rayon à la création par un dictionnaire de mots-clés par rayon.
- Suggestions communautaires : collecter de façon anonyme les couples (nom normalisé, magasin, rayon), sans liste ni compte, pour proposer un rayon et compléter un nom à partir des articles de toute la communauté. Les données survivent ainsi à la suppression d'une liste. Un nom n'est proposé qu'au-delà d'un seuil de comptes distincts (ex. 5), pour ne jamais révéler l'article d'une liste privée (RGPD-04).
- Proposer « Appliquer à tous les magasins de même nom » lors d'un déplacement d'article.
- Enseignes et cartes de fidélité.
- Multilingue : les textes d'interface sont déjà centralisés par espace de noms (i18next). Une langue s'ajoute sans toucher aux composants.

## 18. Annexe : rayons initiaux

Ordre de référence de la liste initiale (RAY-01), modifiable ensuite par les administrateurs (ADM-03). Les catégories sont fines et génériques : l'ordre d'un magasin les place côte à côte quand il les regroupe physiquement.

1. Fruits et légumes
2. Pommes de terre et oignons
3. Fruits secs et noix
4. Légumineuses
5. Œufs
6. Boulangerie
7. Boucherie
8. Poissonnerie
9. Charcuterie et traiteur
10. Fromages
11. Produits laitiers
12. Surgelés
13. Pâtes, riz et féculents
14. Conserves et plats préparés
15. Sauces et condiments
16. Épices
17. Asie
18. Monde
19. Pâtes à tartiner et confitures
20. Céréales et biscottes
21. Café, thé et cacao
22. Biscuits et gâteaux
23. Confiserie et chocolat
24. Chips et apéritif
25. Farine et pâtisserie
26. Eaux
27. Jus et sodas
28. Bières
29. Vins et champagnes
30. Alcools forts
31. Hygiène et beauté
32. Entretien et maison
33. Ustensiles de cuisine
34. Bébé
35. Animaux
36. Autre
