"""Buduje stronę z szablonów i treści (zrodla/) do plików, które serwuje GitHub Pages.

    pip install -r zrodla/requirements.txt
    python zbuduj.py

Szablony to zwykłe szablony Django, a treść to pliki JSON o tym samym kształcie,
jaki dostanie panel „Strona www” w Mojej Agencji. Dzięki temu przeniesienie strony
do programu to skopiowanie szablonów i zaimportowanie JSON-ów do bazy (opis
w docs/PRZEKAZANIE-MOJA-AGENCJA.md). Nie edytuj index.html, en/, uk/ ani static/
ręcznie: każde budowanie zapisuje je od nowa.
"""

import hashlib
import json
import shutil
import sys
from datetime import date
from pathlib import Path

import django
from django.conf import settings
from django.utils.html import format_html

KATALOG = Path(__file__).resolve().parent
ZRODLA = KATALOG / "zrodla"
sys.path.insert(0, str(ZRODLA))


def wczytaj(nazwa):
    return json.loads((ZRODLA / "tresc" / f"{nazwa}.json").read_text(encoding="utf-8"))


def wersja_plikow():
    """Skrót z zawartości źródeł — zmienia się po każdej zmianie, więc
    przeglądarki pobierają nowy CSS i JS zamiast trzymać stary."""
    h = hashlib.sha256()
    for p in sorted(ZRODLA.rglob("*")):
        if p.is_file() and "__pycache__" not in p.parts:
            h.update(p.relative_to(ZRODLA).as_posix().encode())
            h.update(p.read_bytes())
    return h.hexdigest()[:10]


def pola_firmy(w, t):
    """Wartości do wstawienia w treść ([[pole]]). Puste = znacznik do uzupełnienia."""
    firma, napisy = w["firma"], t["wspolne"]

    def ph(opis):
        return format_html('<span class="ph" title="{}">[{}]</span>', napisy["do_uzupelnienia"], opis)

    puste = napisy["puste"]

    def pole(klucz, opis):
        return format_html("{}", firma[klucz]) if firma.get(klucz) else ph(opis)

    def cena_raportu():
        ceny = firma.get("cena_raportu") or {}
        if not (ceny.get("mieszkanie") and ceny.get("dom")):
            return ph(puste["cena_raportu"])
        return format_html("{}", napisy["cena_raportu_wzor"].format(**ceny))

    polisy = [
        format_html(
            "{} – {} {}, {}",
            wsp["imie_nazwisko"],
            napisy["polisa_nr"],
            wsp["polisa_oc"] or ph(puste["numer"]),
            wsp["ubezpieczyciel"] or ph(puste["towarzystwo"]),
        )
        for wsp in firma["wspolnicy"]
    ]
    okna = t["okna"]["rodo"]
    return {
        "_jezyk": t["jezyk"],
        "nazwa_pelna": pole("nazwa_pelna", w["firma"]["marka"]),
        "adres": pole("adres", puste["adres"]),
        "nip": pole("nip", puste["numer"]),
        "regon": pole("regon", puste["numer"]),
        "telefon": pole("telefon", puste["telefon"]),
        "email": pole("email", puste["email"]),
        "stawka": pole("stawka", puste["stawka"]),
        "cena_raportu": cena_raportu(),
        "okres_przechowywania_zapytan": pole("okres_przechowywania_zapytan", puste["okres"]),
        "polisy": format_html("; ".join(["{}"] * len(polisy)), *polisy),
        "rok": str(date.today().year),
        "formularz_dane": okna["formularz_program"] if w["program"]["zapytania"] else okna["formularz_poczta"],
        "poza_eog": ph(okna["poza_eog"]),
    }


def obrazy(w, static):
    wynik = {}
    for klucz, z in w["zdjecia"].items():
        szer = z["szerokosci"]
        najw = szer[-1]
        adresy = {s: static(f"strona/img/{z['plik']}-{s}.webp") for s in szer}
        wynik[klucz] = {
            "src": adresy[szer[0]],
            "srcset": ", ".join(f"{adresy[s]} {s}w" for s in szer),
            "szerokosc": najw,
            "wysokosc": z[f"wysokosc_{najw}"],
            "ai": z["ai"],
        }
    return wynik


def dane_strukturalne(w, t, adres):
    firma = w["firma"]
    dane = {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": firma["marka"],
        "url": adres,
        "description": t["meta"]["opis"],
        "image": w["strona"]["adres"] + "static/strona/img/og.jpg",
        "logo": w["strona"]["adres"] + "static/strona/img/logo.webp",
        "areaServed": [{"@type": "City", "name": "Kraków"}]
        + [{"@type": "AdministrativeArea", "name": g["nazwa"]} for g in t["obszar"]["grupy"][1:]],
        "knowsLanguage": [j["kod"] for j in w["jezyki"]],
    }
    if firma.get("telefon"):
        dane["telephone"] = firma["telefon"]
    if firma.get("email"):
        dane["email"] = firma["email"]
    tekst = json.dumps(dane, ensure_ascii=False)
    return tekst.replace("<", "\\u003c")


def main():
    w = wczytaj("wspolne")
    baza = w["strona"]["sciezka_bazowa"]
    settings.configure(
        DEBUG=False,
        USE_I18N=False,
        STATIC_URL=baza + "static/",
        TEMPLATES=[
            {
                "BACKEND": "django.template.backends.django.DjangoTemplates",
                "DIRS": [str(ZRODLA / "szablony")],
                "OPTIONS": {"libraries": {"strona": "strona_tagi"}, "string_if_invalid": "§BRAK§"},
            }
        ],
    )
    django.setup()
    from django.template.loader import render_to_string
    from django.templatetags.static import static

    wersja = wersja_plikow()

    # pliki statyczne: zrodla/statyczne/strona → static/strona
    cel_static = KATALOG / "static"
    if cel_static.exists():
        shutil.rmtree(cel_static)
    shutil.copytree(ZRODLA / "statyczne", cel_static)

    jezyki = w["jezyki"]
    for j in jezyki:
        j["adres"] = w["strona"]["adres"] + j["sciezka"]
        j["href"] = baza + j["sciezka"]

    bledy = []
    for j in jezyki:
        t = wczytaj(j["kod"])
        pola = pola_firmy(w, t)
        uklad = [dict(s, szablon=f"strona/sekcje/{s['sekcja']}.html") for s in w["uklad"]]
        dane_js = {
            "jezyk": j["kod"],
            "program": w["program"],
            "email": w["firma"]["email"],
            "teksty": t["js"],
            "formularz": {
                "sprawy": {o["wartosc"]: o["tekst"] for o in t["kontakt"]["formularz"]["sprawy"]},
                "rodzaje": {o["wartosc"]: o["tekst"] for o in t["kontakt"]["formularz"]["rodzaje"]},
                "sytuacje": {o["wartosc"]: o["tekst"] for o in t["kontakt"]["formularz"]["sytuacje"]},
                "cele": {o["wartosc"]: o["tekst"] for o in t["kontakt"]["formularz"]["cele"]},
            },
            "raport": {"wiecej": t["raport"]["przycisk_wiecej"], "zwin": t["raport"]["przycisk_zwin"]},
            "uslugi_licznik": t["uslugi"]["licznik"],
        }
        kontekst = {
            "jezyk": j["kod"],
            "t": t,
            "w": w,
            "pola": pola,
            "jezyki": jezyki,
            "uklad": uklad,
            "obrazy": obrazy(w, static),
            "adres_kanoniczny": j["adres"],
            "adres_og_obrazu": w["strona"]["adres"] + "static/strona/img/og.jpg",
            "sciezka_bazowa": baza,
            "dane_strukturalne": dane_strukturalne(w, t, j["adres"]),
            "dane_js": dane_js,
            "wersja": wersja,
        }
        html = render_to_string("strona/glowna.html", kontekst)
        if "§BRAK§" in html:
            bledy.append(f"{j['kod']}: brakująca treść w szablonie (szukaj §BRAK§ w wyniku)")
        cel = KATALOG / j["sciezka"] / "index.html"
        cel.parent.mkdir(parents=True, exist_ok=True)
        cel.write_text(html, encoding="utf-8")
        print(f"{cel.relative_to(KATALOG)}: {len(html.encode()) // 1024} KB")

    t_pl = wczytaj("pl")
    manifest = {
        "name": w["firma"]["marka"],
        "short_name": w["firma"]["marka"],
        "description": t_pl["meta"]["og_opis"],
        "lang": "pl",
        "start_url": baza,
        "scope": baza,
        "display": "standalone",
        "background_color": "#0B0B0D",
        "theme_color": "#0B0B0D",
        "icons": [
            {"src": static("strona/img/icon-192.png"), "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": static("strona/img/icon-512.png"), "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": static("strona/img/icon-maskable-512.png"), "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    (KATALOG / "manifest.webmanifest").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (KATALOG / "sw.js").write_text(
        render_to_string("strona/sw.js", {"wersja": wersja, "sciezka_bazowa": baza}), encoding="utf-8"
    )
    if bledy:
        print("\n".join(bledy))
        sys.exit(1)
    print(f"gotowe, wersja {wersja}")


if __name__ == "__main__":
    main()
