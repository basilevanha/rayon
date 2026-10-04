export const articles = {
  sections: {
    cart: "Dans le caddie",
    toBuy: "À acheter",
    all: "Tous les articles ({{count}})",
    empty: "La liste est vide. Utilisez la recherche pour ajouter des articles.",
    nothingToBuy: "Rien à acheter pour le moment.",
  },
  toolbar: {
    view: "Vue : {{name}}",
    defaultView: "Défaut",
    byRayon: "Par rayon",
    alphabetical: "A → Z",
  },
  row: {
    quantity: "×{{count}}",
    edit: "Modifier {{name}}",
  },
  removed: {
    label: "{{name}} retiré",
    undo: "Annuler",
  },
  drawer: {
    title: "Modifier l'article",
    nameLabel: "Nom",
    quantityLabel: "Quantité",
    quantityHelp: "Facultative, pour un besoin ponctuel.",
    rayonLabel: "Rayon",
    save: "Enregistrer",
    addToList: "Ajouter à la liste",
    notNeeded: "Plus besoin",
    delete: "Supprimer l'article",
    deleted: "« {{name}} » supprimé",
    undo: "Annuler",
  },
  validation: {
    nameRequired: "Le nom est obligatoire",
    nameTooLong: "80 caractères au maximum",
    quantity: "Un nombre entier, au moins 1",
  },
  errors: {
    duplicateName: "Un article du même nom existe déjà",
    alreadyInCart: "{{name}} n'a pas été retiré : {{member}} l'a mis dans le caddie",
    anotherMember: "un autre membre",
    thisArticle: "Cet article",
    notFound: "Cet article n'existe plus",
    notMember: "Vous n'êtes plus membre de cette liste",
  },
} as const;
