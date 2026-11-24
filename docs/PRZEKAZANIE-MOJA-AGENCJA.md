# Strona www w Mojej Agencji: przekazanie

Dokument dla czatu, w którym powstaje Moja Agencja (`lewym90/moja-agencja`).
Opisuje, jak przenieść stronę `lewym90/amnieruchomosci` do programu i zbudować
panel „Strona www”. Stan na 24.11.2026.

---

## 0. Gotowy prompt do wklejenia

> Przeczytaj w całości plik `docs/PRZEKAZANIE-MOJA-AGENCJA.md` z repozytorium
> `lewym90/amnieruchomosci`, gałąź `krakow-przebudowa` (sklonuj je obok `moja-agencja`). Na tej podstawie zbuduj
> w Mojej Agencji aplikację `apps/strona`: publiczną stronę biura w trzech językach,
> panel „Strona www” do edycji każdego elementu, podstrony ofert i formularz zapytań,
> który zakłada leady w programie. Szablony, filtry, CSS i JS bierzesz z repozytorium
> strony bez zmian w wyglądzie. Pracuj według CLAUDE.md Mojej Agencji: zadaniami,
> z testami i commitami. Najpierw pokaż mi plan modelu danych (sekcja 4), bo to decyzja
> o trwałych skutkach. Potem budujesz sam, w kolejności z sekcji 10.

---

## 1. Decyzje autora (24.11.2026)

1. **Biuro działa w Krakowie i okolicach**, nie w Lublinie. Obszar: Kraków oraz powiaty
   krakowski, wielicki, myślenicki i bocheński. Dalej po indywidualnym uzgodnieniu.
2. **Forma: „Państwo”** w treści po polsku. Przyciski w pierwszej osobie klienta
   („Sprzedaję nieruchomość”, „Wysyłam zapytanie”) albo w formie wspólnej („Umówmy rozmowę”).
3. **Trzy wersje językowe:** polska, angielska, ukraińska. Wiążąca jest polska.
4. **Strona nie jest publiczna, dopóki firma nie jest zarejestrowana.** Do tego czasu
   `noindex` wszędzie, a w docelowym panelu przełącznik „Strona publiczna” jest
   zablokowany, dopóki nie są uzupełnione dane firmy (sekcja 8).
5. **Zdjęcia zespołu są na razie z AI.** Są oznaczone podpisem („Zdjęcie poglądowe
   wygenerowane z użyciem AI”), zgodnie z zasadą 5 CLAUDE.md. Przed startem zostaną
   zastąpione prawdziwymi.
6. **Praca w Policji: niedopowiedzenie.** Tekst „O nas” mówi o metodzie pracy, a nie
   o miejscu pracy. Nie dopisywać słów „Policja” ani „emeryt”.
7. **Strona przechodzi do Mojej Agencji** (`apps/strona`), z panelem do edycji każdego
   elementu. Do czasu przeniesienia działa wersja z GitHub Pages budowana przez
   `zbuduj.py` (bez indeksowania).

---

## 2. Co jest w repozytorium strony

```
amnieruchomosci/
├── zbuduj.py                 ← budowanie wersji statycznej; WZORCOWA implementacja kontekstu
├── zrodla/
│   ├── requirements.txt      ← django==5.2.19 (ta sama wersja co w programie)
│   ├── strona_tagi.py        ← filtry szablonów → apps/strona/templatetags/strona.py
│   ├── szablony/strona/      ← szablony Django → apps/strona/templates/strona/
│   │   ├── glowna.html       ← cała strona (head, nawigacja, pętla sekcji, stopka, okna)
│   │   ├── sekcje/*.html     ← po jednym pliku na sekcję + _rzut.html, _pytanie.html
│   │   ├── stopka.html, okna.html
│   │   └── sw.js             ← service worker (szablon)
│   ├── tresc/
│   │   ├── wspolne.json      ← dane firmy, adresy programu, układ sekcji, języki, zdjęcia
│   │   └── pl.json, en.json, uk.json  ← CAŁA treść strony, po jednym pliku na język
│   └── statyczne/strona/     ← css/strona.css, js/strona.js, img/, fonty/ → apps/strona/static/strona/
├── index.html, en/, uk/, static/, manifest.webmanifest, sw.js  ← WYNIK budowania (nie edytować)
└── docs/PRZEKAZANIE-MOJA-AGENCJA.md  ← ten plik
```

Szablony to zwykłe szablony Django (`{% load static strona %}`), więc w programie
działają bez przepisywania. `zbuduj.py` składa kontekst dokładnie tak, jak ma to robić
widok w programie. Funkcje `pola_firmy`, `obrazy`, `dane_strukturalne` i słownik
`dane_js` przenieś do `apps/strona/kontekst.py`. Zmieniasz tylko źródło danych:
baza zamiast plików JSON.

### Lekki zapis w treściach (filtr `tekst`)

Treść w panelu nie zawiera HTML. Filtr najpierw zabezpiecza tekst (escape), potem
zamienia:

| zapis | wynik |
|---|---|
| `==tekst==` | wyróżnienie `<mark>` (używane w ilustracji „Dokumenty”) |
| `**tekst**` | pogrubienie |
| `[tekst](#kotwica)` | link do części strony |
| `[tekst](okno:rodo)` | przycisk otwierający okno: `rodo`, `aml`, `cookies`, `nota` |
| `[tekst](https://…)` | link zewnętrzny |
| `[[pole]]` | wartość z danych firmy; pusta → znacznik „[do uzupełnienia]” |

Przy okazji filtr wstawia twarde spacje po jednoliterowych wyrazach i między liczbą
a jednostką (osobne reguły dla pl, en, uk). Panel powinien pokazywać tę ściągawkę
obok pól tekstowych.

Pola `[[…]]` dostępne w treści: `nazwa_pelna`, `adres`, `nip`, `regon`, `telefon`,
`email`, `stawka`, `cena_raportu`, `okres_przechowywania_zapytan`, `polisy`, `rok`, `formularz_dane`,
`poza_eog`.

---

## 3. Architektura w programie

- **Nowa aplikacja `apps/strona`**: modele, panel (ekrany w stylu `apps/biuro`, menu
  Więcej → Strona www), widoki publiczne, `templatetags/strona.py`, szablony i statyka
  skopiowane z repozytorium strony.
- **Widoki publiczne w osobnym pliku adresów** (`config/urls_strona.py`) i w osobnym
  kontenerze `strona` w `compose.yaml`: ten sam obraz co `web`, ale z publicznym
  `ROOT_URLCONF` (bez panelu, bez logowania, bez `/admin/`). Dzięki temu publiczna
  strona nie wystawia do internetu niczego poza tym, co jest na liście w sekcji 6.
- **Cache**: strona główna i podstrony ofert w pamięci podręcznej na 5 minut (tak jak
  dziś `oferty.json`), czyszczonej przy publikacji treści i zmianie oferty.
- **Domena**: po rejestracji firmy. Do tego czasu adres testowy i `noindex`.
- `DJANGO_ADRES_STRONY_WWW` i CORS zostają na czas przejścia, dopóki wersja
  z GitHub Pages jest w użyciu. Po przeniesieniu formularz i oferty idą z tej samej
  domeny i CORS nie jest potrzebny.

---

## 4. Model danych (do zatwierdzenia przez autora)

Zasada „żadna funkcja w dwóch miejscach”: dane, które program już ma, strona bierze
z programu.

| Co | Skąd | Uwagi |
|---|---|---|
| NIP, nazwa, adres firmy | **`finanse.DaneSprzedawcy`** (już istnieje) | Dodać brakujące pola: `marka` („AM Nieruchomości”), `regon`, `telefon`, `email`. Jedno źródło dla faktur i strony. |
| Polisy OC wspólników | **nowe** `strona.Wspolnik` albo profil użytkownika w `konta` | `imie_nazwisko`, `polisa_oc`, `ubezpieczyciel`, `polisa_wazna_do` (przypomnienie przed końcem polisy). Przy s.c. każdy pośrednik ma własną polisę. |
| Okres przechowywania zapytań | **`zgodnosc.UstawieniaRetencji.lead_miesiace`** (już istnieje) | Pole `[[okres_przechowywania_zapytan]]` w RODO wylicza się z tej wartości („12 miesięcy”). Nie dublować. |
| Oferty na stronie | **`publikacja.strona_www`** (już istnieje) | Rozszerzyć dane (sekcja 6). |
| Treść strony | **nowe** `strona.TrescStrony` | Wersjonowana, opis niżej. |
| Ustawienia strony | **nowe** `strona.UstawieniaStrony` (jeden wiersz) | `publiczna` (bool, domyślnie False), `adres` (domena), `uklad` (JSON: lista `{sekcja, widoczna}` w kolejności), `zapytania_wlaczone`, `stawka` i `cena_raportu` (teksty do FAQ i usług). |
| Zdjęcia strony | **nowe** `strona.ZdjecieStrony` | `klucz` (`raport`, `zespol`, `og`), `plik`, `wygenerowane_ai`, `rodzaj_modyfikacji` (zasada 5). Rozmiary 700/1400 i 450/900 generowane przy zapisie, bez EXIF (jak `biuro/miniatury.py`). |
| Zapytania ze strony | **nowe** `klienci.ZapytanieZeStrony` | Opis w sekcji 7. Widoczne na tej samej liście co leady z poczty (kolumna „Źródło”). |

### `TrescStrony`

```
jezyk          pl | en | uk
dane           JSONField: dokładnie kształt plików tresc/<jezyk>.json
status         szkic | opublikowana | archiwalna
opis_zmiany    krótki tekst do historii
utworzono_przez, utworzono_at, opublikowano_at
```

- Publikacja tworzy nowy wiersz `opublikowana`, a poprzedni dostaje status `archiwalna`.
  Nic nie jest kasowane (zasada 1).
- „Przywróć” kopiuje wersję archiwalną do nowego szkicu.
- Walidacja przed publikacją: wymagane klucze obecne (schemat z `pl.json`), zapis
  `==…==` i `**…**` domknięty, każde `[[pole]]` z listy w sekcji 2, `meta.tytul`
  ≤ 60 znaków, `meta.opis` ≤ 160 znaków.
- Po publikacji zmian po polsku panel pokazuje przy EN i UK listę kluczy zmienionych
  od ostatniej publikacji tych wersji („do przetłumaczenia”).

---

## 5. Panel „Strona www”

Ekrany w stylu `apps/biuro` (grafit, złoto, płaskie karty):

1. **Układ**: lista sekcji z przełącznikiem „widoczna” i zmianą kolejności.
2. **Treść**: dla każdej sekcji formularz wygenerowany z kształtu JSON: pola krótkie,
   pola długie, listy z dodawaniem, usuwaniem i kolejnością (usługi, FAQ, karty
   „Kraków”, kroki, osoby, gminy, okna prawne). Zakładki PL / EN / UK obok siebie.
3. **Zdjęcia**: podmiana zdjęcia, opis alternatywny w trzech językach i przełącznik
   „wygenerowane z AI”. Przy włączonym przełączniku podpis o AI pojawia się sam.
4. **Dane firmy i polisy**: edycja `DaneSprzedawcy` (te same dane co na fakturach)
   oraz wspólników.
5. **Podgląd**: ta sama strona renderowana ze szkicu, pod adresem tylko dla
   zalogowanych.
6. **Publikacja i historia**: opublikuj, porównaj z poprzednią wersją, przywróć.
7. **Strona publiczna**: przełącznik z potwierdzeniem. Jest zablokowany, dopóki
   lista z sekcji 8 nie jest kompletna. Program pokazuje, czego brakuje.

Oferty nie mają osobnego ekranu w panelu strony. Zarządza się nimi tam, gdzie dziś
(karta oferty, przełącznik `pokazuj_na_stronie`).

---

## 6. Adresy publiczne

| Adres | Co |
|---|---|
| `GET /`, `/en/`, `/uk/` | `strona/glowna.html` z kontekstem jak w `zbuduj.py` |
| `GET /oferty/<numer>-<slug>/` (+ `/en/…`, `/uk/…`) | **nowa** podstrona oferty: treść renderowana na serwerze, JSON-LD, OG z pierwszym zdjęciem. Przy tej okazji wydzielić z `glowna.html` szablon `baza.html` z blokami. Okno oferty na stronie głównej zostaje i dostaje link do podstrony. |
| `GET /publiczne/oferty.json` | istnieje; dodać pola: `rynek_kod` (`pierwotny`/`wtorny`), `slug`, `url` (słownik pl/en/uk), opcjonalnie `tytuly` i `opisy` (słowniki pl/en/uk). JS już je obsługuje; bez nich pokazuje polski opis z adnotacją. |
| `POST /publiczne/zapytanie/` | **nowy**, kontrakt w sekcji 7 |
| `GET /manifest.webmanifest` | JSON jak w `zbuduj.py` |
| `GET /sw.js` | szablon `strona/sw.js` (musi być w katalogu głównym, inaczej nie obejmie strony) |
| `GET /robots.txt` | `Disallow: /`, dopóki `UstawieniaStrony.publiczna` jest wyłączone; potem `Allow` i `Sitemap` |
| `GET /sitemap.xml` | trzy wersje strony głównej i podstrony ofert, z `hreflang` |

Dopóki strona nie jest publiczna: znacznik `noindex` w szablonie (już jest, sterowany
przez `w.strona.indeksowanie`) i nagłówek `X-Robots-Tag: noindex` na każdej odpowiedzi.

---

## 7. Formularz zapytań

Strona wysyła dziś (gdy `program.zapytania` jest ustawione) dokładnie to:

```
POST /publiczne/zapytanie/
Content-Type: application/json
{
  "rodzaj": "sprzedaz_najem" | "kupno",
  "jezyk": "pl" | "en" | "uk",
  "imie": "…", "telefon": "…", "email": "…",   ← co najmniej jedno z dwóch
  "zgoda": true, "zgoda_tekst": "Zapoznałem(-am) się z informacją…",
  "strona_www": "",                      ← pułapka na boty (ukryte pole)
  "czas_wypelniania_ms": 41250,
  "zrodlo": "https://…/en/",
  "temat": "Zapytanie ze strony: …",
  // rodzaj = sprzedaz_najem:
  "sprawa": "sprzedaz" | "najem" | "sprawa_trudna",
  "nieruchomosc": "mieszkanie" | "dom" | "dzialka" | "lokal_uzytkowy",
  "lokalizacja": "…", "metraz": "…",
  "sytuacja": "uregulowana" | "wspolwlasnosc" | "spadek" | "lokator" | "hipoteka" | "nie_wiem",
  "wiadomosc": "…",
  // rodzaj = kupno:
  "cel": "szukam" | "raport",
  "nieruchomosc": "…", "lokalizacja": "…", "kryteria": "…",
  "oferta": "AM-12" | "",               ← gdy klient pyta o konkretną ofertę
  // tylko cel = raport (zamówienie Raportu Weryfikacyjnego):
  "link": "link do ogłoszenia albo adres",
  "termin_zadatku": "2026-12-05" | ""
}
```

Odpowiedzi: `201 {"ok": true}` · `400 {"bledy": {"pole": "komunikat"}}` · `429`.
Strona traktuje każdą odpowiedź inną niż 2xx jako błąd i proponuje wysłanie e-mailem.

Wymagania:

- `strona_www` niepuste albo `czas_wypelniania_ms` < 3000 → odpowiedź `201`, ale nic
  nie zapisujemy (bot nie wie, że został odsiany).
- Limit 5 zapytań na godzinę z jednego adresu IP (cache Django).
- Limity długości jak w formularzu (imię 80, telefon 30, e-mail 120, teksty 1200).
  Wymagane: imię, `zgoda` = `true` i co najmniej jedno z pól `telefon` / `email`
  (telefon: co najmniej 9 cyfr, e-mail: poprawny format).
- CORS na czas przejścia: odpowiedź na `OPTIONS` (`Access-Control-Allow-Methods: POST`,
  `Access-Control-Allow-Headers: Content-Type`) i `Access-Control-Allow-Origin`
  z `DJANGO_ADRES_STRONY_WWW`. Widok `csrf_exempt`, przyjmuje wyłącznie JSON.
- Zapis: `ZapytanieZeStrony` z polami jak wyżej, surowym JSON-em (do zgodności),
  `usunac_po` z `UstawieniaRetencji.termin("lead_miesiace", …)`, wpisem w
  `DziennikDostepu` przy każdym odczycie i zmianie oraz zapisaną treścią zgody.
- Skutki w programie:
  - `sprzedaz_najem` → nowy lead właściciela (rodzaj sprawy, nieruchomość, sytuacja prawna),
  - `kupno` + `szukam` → lead i szkic `Poszukiwanie` do potwierdzenia przez biuro
    (wtedy zadziałają istniejące dopasowania i powiadomienia),
  - `kupno` + `raport` → zamówienie Raportu Weryfikacyjnego: lead z linkiem, terminem zadatku
    i terminem oddania raportu (5 dni roboczych od przyjęcia zlecenia, z pominięciem świąt:
    `apps/kalendarz/swieta.py`), widoczne na ekranie Dziś. Wyliczenie terminu ma test (zasada 11).
  - `oferta` ustawione → powiązanie z ofertą o numerze `AM-<pk>`.
- Powiadomienie biura o nowym zapytaniu (istniejący moduł powiadomień).
- Gdy zapytania są włączone, okno RODO samo pokazuje tekst `formularz_program`
  zamiast `formularz_poczta` (`[[formularz_dane]]`).

---

## 7a. Poradniki

W repozytorium strony są gotowe treści pięciu poradników (`zrodla/poradniki/pl/*.md`): Markdown z nagłówkiem
YAML (`tytul`, `opis`, `slug`, `jezyk`, `data`, `stan_prawny`, `powiazane`, `zrodla`).

- Model `strona.Poradnik`: `jezyk`, `slug`, `tytul`, `opis` (≤ 160 znaków), `tresc` (Markdown),
  `stan_prawny`, `zrodla` (lista), `powiazane` (sekcja strony, do której prowadzi wezwanie na końcu),
  `status` (szkic/opublikowany/archiwalny, jak `TrescStrony`), `opublikowano_at`.
- Adresy: `/poradniki/` (lista) i `/poradniki/<slug>/` (+ `/en/…`, `/uk/…`, gdy powstaną tłumaczenia).
  JSON-LD `Article`, `hreflang`, wpisy w `sitemap.xml`.
- Renderowanie Markdown: `markdown-it-py` z wyłączonym surowym HTML (jedna nowa zależność, popularna
  i bezpieczna domyślnie). Nagłówek YAML przy imporcie czyta PyYAML (jeśli nie ma go w programie,
  zamiast niego wystarczy prosty parser trzech kresek i par `klucz: wartość`).
- Import: ta sama komenda `importuj_tresc_strony` wczytuje też `zrodla/poradniki/<jezyk>/*.md`.
- W panelu: lista poradników, edytor Markdown z podglądem, data „stan prawny na”, publikacja i historia.
- Na stronie głównej: blok „Poradniki” (3 najnowsze) przed sekcją FAQ.

Poradniki opisują przepisy (podatki, spadki, zabytki), więc przed publikacją autor da je do przejrzenia
prawnikowi. Panel pokazuje przy każdym poradniku datę „stan prawny na” i przypomina o przeglądzie
po 12 miesiącach.

---

## 8. Zanim strona stanie się publiczna

Program powinien pilnować tej listy (blokada przełącznika „Strona publiczna”):

- [ ] Firma zarejestrowana: NIP, REGON, adres, nazwa s.c. w `DaneSprzedawcy`
- [ ] Telefon i e-mail biura
- [ ] Polisy OC obojga wspólników (numer, towarzystwo, data ważności)
- [ ] Stawka wynagrodzenia w FAQ i cena Raportu Weryfikacyjnego
- [ ] Prawdziwe zdjęcia zamiast AI (albo świadoma decyzja autora, że zostają z podpisem)
- [ ] Domena i certyfikat
- [ ] Teksty prawne potwierdzone przez prawnika: RODO (współadministratorzy w s.c.),
      odstąpienie od umowy zawartej poza lokalem, wzór umowy pośrednictwa
- [ ] Potwierdzenie u ubezpieczyciela, że polisa OC pośrednika obejmuje Raport
      Weryfikacyjny sprzedawany kupującemu spoza biura (to może nie być „czynność
      pośrednictwa”; strona obiecuje numer polisy w każdym raporcie)

---

## 9. Kraków w samym programie

Program i Operat są dziś ustawione na sztywno pod Lublin. Najlepiej nie zamieniać
„Lublin” na „Kraków”, tylko zrobić z obszaru ustawienie programu (miasto główne,
dzielnice, powiaty/gminy). Ta sama lista zasili wtedy stronę (sekcja „Obszar działania”),
poszukiwania i Operat.

Miejsca do zmiany (stan repozytorium z 24.11.2026):

- `src/apps/biuro/static/biuro/js/karta.js` — `M.DZIELNICE_LUBLIN` (lista dzielnic w karcie oferty)
- `src/apps/biuro/formularze.py:480` — podpowiedź „np. Lublin Czechów, Lublin Sławin, Świdnik”
- `src/apps/biuro/views_klienci.py:65` — przykład w opisie
- Operat (`lewym90/operatszacunkowy`, kopia w `apps/operat/aplikacja`):
  `osm_lublin.json`, filtr `lubOK` (oferty spoza Lublina **nie wchodzą do wycen**),
  `geokod.js` (domyślne miasto), `mapa.js` (środek mapy `LUBLIN`), `report.js`,
  `engine.js`, `parseOtodom.js` (`lubelskie`), dane RCN dla Lublina.
  **Bez tych zmian kafelek „Wycena” w Krakowie nie działa.**
- Testy z „Lublin” w danych: `biuro/tests.py`, `nieruchomosci/test_gugik.py`,
  `klienci/test_leady.py`, `oferty/test_karta.py`, `publikacja/test_otodom.py`, `operat/tests.py`.

---

## 10. Kolejność budowy

1. `apps/strona` z modelami z sekcji 4 i komendą
   `manage.py importuj_tresc_strony <ścieżka do repozytorium amnieruchomosci>`, która
   wczytuje `tresc/*.json` jako opublikowane wersje, `wspolne.json` jako ustawienia
   i zdjęcia z `zrodla/statyczne/strona/img` (z oznaczeniem AI).
2. Widoki publiczne `/`, `/en/`, `/uk/` z kontekstem przeniesionym z `zbuduj.py`.
   Test: wynik HTML zgodny z tym, co daje `zbuduj.py` dla tych samych danych.
3. `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `sw.js`, nagłówki `noindex`.
4. `POST /publiczne/zapytanie/` z zapisem, retencją, dziennikiem i powiadomieniem.
5. Panel: układ, treść (PL/EN/UK), zdjęcia, dane firmy, podgląd, publikacja, historia.
6. Podstrony ofert i rozszerzenie `oferty.json`.
7. Kontener `strona` i publiczny `ROOT_URLCONF`.
8. Obszar działania jako ustawienie programu (sekcja 9).

### Testy, które muszą powstać

- render trzech wersji: 200, właściwy `lang`, `hreflang`, `noindex` przy stronie niepublicznej
- filtr `tekst`: `<script>` z treści zostaje zabezpieczony; lekki zapis działa; twarde spacje
- `robots.txt` blokuje wszystko, dopóki strona nie jest publiczna
- zapytanie poprawne → rekord z `usunac_po` = data + `lead_miesiace` (zasada 11: terminy mają testy)
- pułapka `strona_www`, za szybkie wypełnienie, limit na IP, brak zgody → 400
- `OPTIONS` zwraca nagłówki CORS; `GET` na adres zapytań → 405
- publikacja nie usuwa poprzedniej wersji; przywrócenie tworzy szkic
- podstrona oferty: 404 dla oferty bez umowy, wycofanej lub z `pokazuj_na_stronie = False`;
  brak numeru budynku w treści (jak w `bez_numeru`)

---

## 11. Do czasu przeniesienia

- Wersję statyczną buduje się poleceniem `python zbuduj.py` w repozytorium strony
  (wymaga `pip install -r zrodla/requirements.txt`). Treść zmienia się w `zrodla/tresc/*.json`.
- Strona pobiera oferty z `program.oferty` (dziś serwer testowy, `wlaczona: false`).
- Formularz: `program.zapytania` jest pusty, więc strona przygotowuje e-mail (gdy jest
  adres biura) albo pokazuje podgląd zapytania (gdy nie ma). Po wdrożeniu sekcji 7
  wystarczy wpisać adres w `wspolne.json` i przebudować.
- Po przeniesieniu strony do programu repozytorium `amnieruchomosci` można
  zarchiwizować, a GitHub Pages wyłączyć.
