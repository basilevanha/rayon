import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "@/lib/i18n/resources";

// Ressources incluses dans le bundle : initialisation synchrone, disponible hors ligne.
void i18n.use(initReactI18next).init({
  lng: "fr",
  fallbackLng: "fr",
  resources,
  defaultNS: "common",
  interpolation: { escapeValue: false },
  initAsync: false,
});

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});

export { i18n };
