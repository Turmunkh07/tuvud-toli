import type { Dictionary } from "@/dictionaries/mn";

/**
 * English UI strings, mirroring `src/dictionaries/mn.ts` key for key.
 * `satisfies Dictionary` means a key missing here — or typed differently —
 * fails the build instead of silently falling back to Mongolian at runtime.
 */
export const en = {
  site: {
    name: "Tibetan–Mongolian Dictionary",
    description:
      "A Tibetan-Mongolian academic dictionary with sourced definitions.",
  },

  theme: {
    toDark: "Dark",
    toLight: "Light",
    ariaToDark: "Switch to dark mode",
    ariaToLight: "Switch to light mode",
  },

  locale: {
    ariaSwitchToEn: "Switch to English",
    ariaSwitchToMn: "Switch to Mongolian",
  },

  loading: {
    label: "Loading…",
  },

  notFoundPage: {
    metaTitle: "Not found",
    heading: "Page not found",
    body: "There's no word or page at this address. It may have been removed, or the link may be mistyped.",
    home: "Home",
    randomWord: "Random word",
  },

  errorPage: {
    heading: "Something went wrong",
    body: "An unexpected error occurred while loading the page. Please try again.",
    retry: "Try again",
    home: "Home",
    code: (digest: string) => `Error code: ${digest}`,
  },

  home: {
    title: "Tibetan–Mongolian Dictionary",
    randomWordCta: "See a random word →",
    searchPlaceholder: "Search a Tibetan word...",
    letterHeadingSuffix: "words with this root letter",
    allLetters: "← All letters",
    noWordsForLetter: "No words under this letter yet.",
    prev: "← Previous",
    next: "Next →",
    pageOf: (page: number, count: number) => `${page} / ${count}`,
    rangeOfTotal: (from: number, to: number, total: number) => `${from}–${to} of ${total}`,
    stats: (words: string, sources: string, defs: string) =>
      `${words} words · ${sources} sources · ${defs} definitions`,
    browseByLetter: "Browse by letter",
    noWordYet: "No words yet",
    mostSearched: "Most searched",
    recentlyAdded: "Recently added",
  },

  word: {
    backToSearch: "← Back to search",
    randomWord: "Random word →",
    sourceDefCounts: (sources: number, defs: number) =>
      `${sources} sources · ${defs} definitions`,
    noDefinitions: "No definitions yet.",
  },

  recentlyViewed: {
    heading: "Recently viewed",
    clear: "Clear",
  },

  citation: {
    copyMn: "Эшлэл хуулах",
    copiedMn: "Хуулагдлаа",
    copyEn: "Cite in English",
    copiedEn: "Copied",
    ariaMn: (term: string) => `${term} — copy citation in Mongolian`,
    ariaEn: (term: string) => `${term} — copy citation in English`,
  },

  searchResults: {
    startsWith: (q: string) => `starts with "${q}"`,
    contains: (q: string) => `contains "${q}"`,
    noneFound: "No matching words found.",
    prev: "← Previous",
    next: "Next →",
    pageOf: (page: number, count: number) => `${page} / ${count}`,
    rangeOfTotal: (from: number, to: number, total: number) => `${from}–${to} of ${total}`,
  },

  wordForm: {
    tibetanWord: "Tibetan word",
    definitionsHeading: "Definitions",
    manualSuffix: " · typed in manually",
    remove: "Remove",
    sourceLabel: "Source",
    definitionLabel: "Definition",
    addDefinition: "+ Add definition",
  },

  admin: {
    metaTitle: "Admin dashboard",
    backToDashboard: "← Back to dashboard",

    login: {
      metaTitle: "Log in",
      title: "Admin log in",
      subtitle: "Dictionary control panel",
      nameLabel: "Email or name",
      passwordLabel: "Password",
      submit: "Log in",
    },

    dashboard: {
      heading: "Dashboard",
      loggedInAs: (name: string) => `Logged in as: ${name}`,
      logout: "Log out",
      statWordCount: "Total words",
      statSourceCount: "Total sources",
      statCollaborators: "Collaborators",
      statImports: "Imports",
      searchSubmit: "Search",
      addWord: "+ Add word",
      bulkImportHeading: "Bulk import from Excel",
      sourcesLink: "Sources",
      importsLink: "Import history",
      historyLink: "History",
      conflictsLink: (count: number) => `Conflicts${count > 0 ? ` (${count})` : ""}`,
      templateDownload: "↓ Template",
      exportDownload: "↓ Download all",
      importSubmit: "Import",
      collaboratorsHeading: "Collaborators",
      nameField: "Name",
      emailField: "Email",
      inviteSubmit: "Invite",
      loggedIn: "Logged in",
      neverLoggedIn: "Never logged in",
      remove: "Remove",
      removeConfirm: (email: string) => `Remove ${email}?`,
    },

    sources: {
      metaTitle: "Sources",
      title: "Sources",
      description:
        "Every definition, whether imported or typed in by hand, links to a source listed here. Files imported under the same name merge into one source automatically; if a book was entered under two different spellings, rename or merge it below.",
      empty: "No sources yet.",
      nameLabel: "Name",
      defCount: (n: number) => `${n} definitions`,
      save: "Save",
      mergeInto: "Merge into",
      chooseOption: "— choose —",
      merge: "Merge",
      mergeConfirm: (from: string) =>
        `Merge "${from}" into the selected source? This source will be deleted.`,
      delete: "Delete",
      deleteConfirm: (title: string) => `Delete unused source "${title}"?`,
    },

    sourceDetail: {
      metaTitle: "Source entries",
      defCount: (n: number) => `${n} definitions`,
      allSources: "all sources",
      empty: "No definitions from this source yet.",
      manualSuffix: " · typed in manually",
    },

    history: {
      metaTitle: "Change history",
      title: "Change history",
      description:
        "Editing or deleting a word imported from Excel keeps its previous version here, along with which file it came from. Deleting a database record does not touch the original Excel file. A word added by hand is not archived — deleting it removes it outright.",
      seeImportsLink: "Import history",
      seeImportsSuffix: "shows who imported a given file, and when.",
      empty: "No changes yet.",
      actionUpdate: "before this edit",
      actionDelete: "before deletion",
      defCount: (n: number) => `${n} definitions`,
      fileLabel: (file: string) => `File: ${file}`,
      restore: "Restore",
      restoreConfirm: (term: string) => `Restore "${term}" to this version?`,
    },

    conflicts: {
      metaTitle: "Conflicts",
      title: "Conflicting definitions",
      description:
        "When a source's incoming definition disagrees with one already on file, it's held here rather than merged in automatically, until someone picks which version is right.",
      empty: "No conflicts right now.",
      existingLabel: "Current",
      existingGone: "(This definition has since been deleted.)",
      keepThis: "Keep this one",
      keepExistingConfirm: "Keep the current version and discard the new one?",
      incomingLabel: "Incoming",
      keepIncomingConfirm: "Replace with the new version?",
    },

    imports: {
      metaTitle: "Import history",
      title: "Import history",
      description: "Every Excel file imported, listed by who imported it and when.",
      empty: "No imports yet.",
      limitNote: (n: number) => `Showing the most recent ${n} imports.`,
    },

    wordNew: {
      metaTitle: "Add word",
      title: "Add a new word",
      submit: "Save",
    },

    wordEdit: {
      metaTitle: "Edit word",
      title: "Edit word",
      viewPublic: "View public page →",
      saved: "Saved.",
      submit: "Save",
      delete: "Delete this word",
      deleteConfirm: (term: string) => `Delete "${term}"? All of its definitions will be removed.`,
    },
  },
} as const satisfies Dictionary;
