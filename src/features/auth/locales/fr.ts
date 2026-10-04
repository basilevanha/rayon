export const auth = {
  login: {
    title: "Connexion à Rayon",
    emailLabel: "Adresse email",
    invitation: "Invitation {{code}}",
    sendLink: "Recevoir le lien de connexion",
    emailSent:
      "Un email a été envoyé à {{email}}. Touchez le lien qu'il contient, ou saisissez le code reçu.",
    codeLabel: "Code reçu par email",
    submitCode: "Se connecter",
    changeEmail: "Changer d'adresse email",
    requestAccess: "Demander un accès",
    haveInvitation: "Déjà une invitation ?",
    invitationCodeLabel: "Code d'invitation",
  },
  welcome: {
    title: "Bienvenue",
    displayNameLabel: "Choisissez votre nom affiché",
    displayNameHelp: "Visible des membres de vos listes partagées.",
  },
  invitation: {
    alreadyRegistered: "Vous avez déjà un compte",
  },
  account: {
    open: "Mon compte",
    title: "Mon compte",
    displayNameLabel: "Nom affiché",
    saveName: "Enregistrer le nom",
    saved: "Nom enregistré",
    emailLabel: "Adresse email",
    signOut: "Se déconnecter",
    signOutTitle: "Se déconnecter ?",
    signOutPending_one: "{{count}} modification non envoyée sera perdue.",
    signOutPending_other: "{{count}} modifications non envoyées seront perdues.",
  },
  validation: {
    invalidEmail: "Adresse email invalide",
    otpFormat: "Le code contient 6 chiffres",
    displayNameRequired: "Le nom affiché est obligatoire",
    displayNameTooLong: "30 caractères au maximum",
  },
  errors: {
    signupByInvitation: "L'inscription se fait sur invitation",
    invalidInvitation:
      "Ce code d'invitation n'est pas valable. L'inscription se fait sur invitation",
    signupsFull: "Les inscriptions sont momentanément complètes",
    invalidOtp: "Code invalide ou expiré",
  },
} as const;
