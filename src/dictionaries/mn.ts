/**
 * Mongolian UI strings — the site's default and source-of-truth wording.
 * `src/dictionaries/en.ts` mirrors this shape exactly (enforced by
 * `satisfies typeof mn` there), so a key added here without an English
 * counterpart fails the type check rather than silently falling back.
 *
 * Deliberately excluded: the dictionary's own content (Tibetan headwords,
 * Mongolian definitions) — that text is the sourced academic material the
 * site exists to present, not interface chrome, and stays in Mongolian
 * regardless of the toggle. Also excluded: validation/error strings raised
 * deep inside src/app/admin/actions.ts and the lib/ helpers it calls — those
 * are admin-only diagnostic text seen rarely, and threading locale through
 * every one of them was not worth the risk of a mistranslation reaching a
 * database mutation path.
 */
export const mn = {
  site: {
    name: "Төвөд-Монгол толь",
    description:
      " Төвөд-монгол толь бичиг. A Tibetan-Mongolian academic dictionary with sourced definitions.",
  },

  theme: {
    toDark: "Харанхуй",
    toLight: "Гэгээн",
    ariaToDark: "Харанхуй горимд шилжих",
    ariaToLight: "Гэгээн горимд шилжих",
  },

  locale: {
    ariaSwitchToEn: "Англи хэл рүү шилжих",
    ariaSwitchToMn: "Монгол хэл рүү шилжих",
  },

  loading: {
    label: "Ачаалж байна…",
  },

  notFoundPage: {
    metaTitle: "Олдсонгүй",
    heading: "Хуудас олдсонгүй",
    body: "Энэ хаягаар үг ч, хуудас ч байхгүй байна. Устсан эсвэл хаяг нь буруу бичигдсэн байж магадгүй.",
    home: "Нүүр хуудас",
    randomWord: "Санамсаргүй үг",
  },

  errorPage: {
    heading: "Алдаа гарлаа",
    body: "Хуудсыг ачаалах үед гэнэтийн алдаа тохиолдлоо. Дахин оролдоод үзнэ үү.",
    retry: "Дахин оролдох",
    home: "Нүүр хуудас",
    code: (digest: string) => `Алдааны код: ${digest}`,
  },

  home: {
    title: "Төвөд-Монгол толь",
    randomWordCta: "Санамсаргүй үг үзэх →",
    searchPlaceholder: "Төвөд үг хайх...",
    letterHeadingSuffix: "үндсэн үсэгтэй үг",
    allLetters: "← Бүх үсэг",
    noWordsForLetter: "Энэ үсэгт үг алга.",
    prev: "← Өмнөх",
    next: "Дараах →",
    pageOf: (page: number, count: number) => `${page} / ${count}`,
    rangeOfTotal: (from: number, to: number, total: number) => `${from}–${to} / ${total}`,
    stats: (words: string, sources: string, defs: string) =>
      `${words} үг · ${sources} эх сурвалж · ${defs} тодорхойлолт`,
    browseByLetter: "Цагаан толгойгоор үзэх",
    noWordYet: "Одоогоор үг алга",
    mostSearched: "Хамгийн их хайсан",
    recentlyAdded: "Сүүлд нэмэгдсэн",
  },

  word: {
    backToSearch: "← Хайлт руу буцах",
    randomWord: "Санамсаргүй үг →",
    sourceDefCounts: (sources: number, defs: number) =>
      `${sources} эх сурвалж · ${defs} тодорхойлолт`,
    noDefinitions: "Тодорхойлолт алга.",
  },

  recentlyViewed: {
    heading: "Саяхан үзсэн",
    clear: "Цэвэрлэх",
  },

  citation: {
    copyMn: "Эшлэл хуулах",
    copiedMn: "Хуулагдлаа",
    copyEn: "Cite in English",
    copiedEn: "Copied",
    ariaMn: (term: string) => `${term} — эшлэлийг монголоор хуулах`,
    ariaEn: (term: string) => `${term} — copy citation in English`,
  },

  searchResults: {
    startsWith: (q: string) => `"${q}"-ээр эхэлдэг`,
    contains: (q: string) => `"${q}" агуулсан`,
    noneFound: "Ийм үг олдсонгүй.",
    prev: "← Өмнөх",
    next: "Дараах →",
    pageOf: (page: number, count: number) => `${page} / ${count}`,
    rangeOfTotal: (from: number, to: number, total: number) => `${from}–${to} / ${total}`,
  },

  wordForm: {
    tibetanWord: "Төвөд үг",
    definitionsHeading: "Тодорхойлолтууд",
    manualSuffix: " · гараар",
    remove: "Хасах",
    sourceLabel: "Эх сурвалж",
    definitionLabel: "Тодорхойлолт",
    addDefinition: "+ Тодорхойлолт нэмэх",
  },

  admin: {
    metaTitle: "Хяналтын самбар",
    backToDashboard: "← Самбар руу буцах",

    login: {
      metaTitle: "Нэвтрэх",
      title: "Админ нэвтрэх",
      subtitle: "Толь бичиг хянах самбар",
      nameLabel: "Имэйл эсвэл нэр",
      passwordLabel: "Нууц үг",
      submit: "Нэвтрэх",
    },

    dashboard: {
      heading: "Хяналтын самбар",
      loggedInAs: (name: string) => `Нэвтэрсэн: ${name}`,
      logout: "Гарах",
      statWordCount: "Нийт үгсийн тоо",
      statSourceCount: "Эх сурвалжийн тоо",
      statCollaborators: "Хамтран ажиллагч",
      statImports: "Импортын тоо",
      searchSubmit: "Хайх",
      addWord: "+ Үг нэмэх",
      bulkImportHeading: "Excel-ээс олноор нь оруулах",
      sourcesLink: "Эх сурвалжууд",
      importsLink: "Импортын түүх",
      historyLink: "Түүх",
      conflictsLink: (count: number) => `Зөрчил${count > 0 ? ` (${count})` : ""}`,
      templateDownload: "↓ Загвар",
      exportDownload: "↓ Бүгдийг татах",
      importSubmit: "Оруулах",
      collaboratorsHeading: "Хамтран ажиллагчид",
      nameField: "Нэр",
      emailField: "Имэйл",
      inviteSubmit: "Урих",
      loggedIn: "Нэвтэрсэн",
      neverLoggedIn: "Хараахан нэвтрээгүй",
      remove: "Хасах",
      removeConfirm: (email: string) => `${email}-г хасах уу?`,
    },

    sources: {
      metaTitle: "Эх сурвалжууд",
      title: "Эх сурвалжууд",
      description:
        "Импорт болон гараар нэмэхэд бүх тодорхойлолт эндээс жагсаасан эх сурвалж руу холбогддог. Ижил нэрээр импортолсон бол автоматаар нэг сурвалж болж нэгддэг; өөр бичлэгээр орсон бол доор гараар нэрийг нь засаж эсвэл нэгтгэж болно.",
      empty: "Одоогоор эх сурвалж алга.",
      nameLabel: "Нэр",
      defCount: (n: number) => `${n} тодорхойлолт`,
      save: "Хадгалах",
      mergeInto: "Үүн рүү нэгтгэх",
      chooseOption: "— сонгох —",
      merge: "Нэгтгэх",
      mergeConfirm: (from: string) =>
        `"${from}"-г сонгосон сурвалж руу нэгтгэх үү? Энэ сурвалж устана.`,
      delete: "Устгах",
      deleteConfirm: (title: string) => `Ашиглагдаагүй "${title}"-г устгах уу?`,
    },

    sourceDetail: {
      metaTitle: "Эх сурвалжийн үгс",
      defCount: (n: number) => `${n} тодорхойлолт`,
      allSources: "бүх эх сурвалж",
      empty: "Энэ эх сурвалжид тодорхойлолт алга.",
      manualSuffix: " · гараар",
    },

    history: {
      metaTitle: "Өөрчлөлтийн түүх",
      title: "Өөрчлөлтийн түүх",
      description:
        "Excel-ээс оруулсан үгийг засах, устгахын өмнөх хувилбарыг аль файлаас гаралтайг нь хамт хадгалав. Устгасан ч эх Excel файл өөрөө хэвээрээ — зөвхөн мэдээллийн сангийн бичлэг арилна. Гараар нэмсэн үг архивлагдахгүй, шууд устана.",
      seeImportsLink: "Импортын түүх",
      seeImportsSuffix: "хуудсаас тухайн файлыг хэн, хэзээ оруулсныг харна уу.",
      empty: "Одоогоор өөрчлөлт алга.",
      actionUpdate: "засварлахын өмнөх",
      actionDelete: "устгахын өмнөх",
      defCount: (n: number) => `${n} тодорхойлолт`,
      fileLabel: (file: string) => `Файл: ${file}`,
      restore: "Сэргээх",
      restoreConfirm: (term: string) => `"${term}"-г энэ хувилбар руу сэргээх үү?`,
    },

    conflicts: {
      metaTitle: "Зөрчил",
      title: "Зөрчилтэй тодорхойлолт",
      description:
        "Хэрэв эх сурвалж дунд зөрчил гарсан тохиолдолд энэ хуудсанд жагсаагдана. Аль нь зөв болохыг сонгох хүртэл шинэ хувилбарыг толь бичигт нэмээгүй хүлээлгэнд байлгав.",
      empty: "Одоогоор зөрчил алга.",
      existingLabel: "Одоо байгаа",
      existingGone: "(Энэ тодорхойлолт хожим устсан байна.)",
      keepThis: "Үүнийг үлдээх",
      keepExistingConfirm: "Одоо байгаа хувилбарыг үлдээж, шинийг нь хаях уу?",
      incomingLabel: "Шинээр ирсэн",
      keepIncomingConfirm: "Шинэ хувилбараар солих уу?",
    },

    imports: {
      metaTitle: "Импортын түүх",
      title: "Импортын түүх",
      description: "Excel-ээс оруулсан файл бүр, хэн, хэзээ оруулснаар нь жагсаав.",
      empty: "Одоогоор import хийгдээгүй байна.",
      limitNote: (n: number) => `Хамгийн сүүлийн ${n} импортыг харуулав.`,
    },

    wordNew: {
      metaTitle: "Үг нэмэх",
      title: "Шинэ үг нэмэх",
      submit: "Хадгалах",
    },

    wordEdit: {
      metaTitle: "Үг засах",
      title: "Үг засах",
      viewPublic: "Нийтийн хуудсыг үзэх →",
      saved: "Хадгалагдлаа.",
      submit: "Хадгалах",
      delete: "Энэ үгийг устгах",
      deleteConfirm: (term: string) => `"${term}" үгийг устгах уу? Бүх тодорхойлолт устана.`,
    },
  },
} as const;

/**
 * `mn` is `as const` so every string literal is preserved precisely in this
 * file, but the shared type needs to accept ANY string in those positions —
 * otherwise `en.ts`'s English text would fail to typecheck against
 * Mongolian-literal types. Widen recurses into plain objects and widens
 * string leaves to `string`, while leaving function-typed leaves (the
 * pluralized/interpolated entries) untouched, since their signatures were
 * never narrowed to a literal return type in the first place.
 */
type Widen<T> = T extends string
  ? string
  : T extends (...args: never[]) => unknown
    ? T
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

export type Dictionary = Widen<typeof mn>;
