# Obedové menu v okolí fakulty

**Autor:** Zakhar Trofymenko, krúžok: cvičenie WEBTE1, pondelok 9:00, miestnosť C137
**Stránka na školskom serveri:** https://webte1.fei.stuba.sk/~xtrofymenko/Z2_Trofymenko/

## O stránke

Stránka zbiera denné menu reštaurácií v okolí FEI STU a zobrazuje ich na jednom mieste. Beží len v prehliadači (HTML, CSS, JavaScript), bez vlastného servera. Dá sa prepínať medzi dňami Pondelok až Piatok, zobraziť celý týždeň a filtrovať podľa reštaurácie. Údaje sa ukladajú do localStorage, takže sa v ten istý deň nesťahujú znova. Podrobnejší popis je na podstránke O projekte.

## Reštaurácie

- Idyla cafe&restaurant, Mlynská dolina (zdroj: restauracie.sme.sk)
- Karloveská Klubovňa, Jurigovo nám. 1 (zdroj: menucka.sk)
- Naše Hospoda Karloveská, Segnerova 3 (zdroj: vlastný web nasehospoda-karloveska.sk)

Podľa e-mailu vyučujúceho som si mohol vybrať ľubovoľné stránky v okolí fakulty a pri problémoch s CORS použiť stiahnuté kópie HTML. Lokálne kópie stránok sú v priečinku `source/` a sú uložené 29. 10. 2026. Prepínač na stránke určuje, či sa použijú tieto kópie, alebo sa stránky načítajú živé. Živý režim skúša načítať stránku priamo, a ak ju prehliadač zablokuje (CORS), zobrazí pri reštaurácii chybové hlásenie. Adresu proxy servera je možné doplniť do konštanty `PROXY_URL` v `js/script.js`, zatiaľ je prázdna, preto je predvolene zapnutý režim lokálnych kópií.

## Zdroje

- CSS knižnica: Bootstrap 5.3.8 (https://getbootstrap.com/), licencia MIT, len CSS, súbor je uložený lokálne v `css/vendor/`
- JS knižnica: jQuery 4.0.0 (https://jquery.com/), licencia MIT, súbor je uložený lokálne v `js/vendor/`
- Písmo: Nunito (https://fonts.google.com/specimen/Nunito), licencia SIL Open Font License 1.1, súbory `.woff2` sú uložené lokálne v `fonts/`, text licencie je v `fonts/LICENSE-Nunito-OFL.txt`
- Ikona stránky (`favicon.svg`) je vlastná jednoduchá kresba
- Menu reštaurácií: stránky restauracie.sme.sk, menucka.sk a nasehospoda-karloveska.sk

## Validátory

Výstupy kontroly HTML a CSS sú v priečinku `docs/`.

## Použitie AI

Pri práci som používal AI asistenta Claude (Anthropic). Podľa zadania a ukážok z cvičení 6 a 7 mi AI pripravil základ kódu: načítanie viacerých stránok naraz, parsery pre jednotlivé reštaurácie, vykresľovanie kariet a dní, ukladanie do localStorage, štýly a texty na podstránke O projekte. Reštaurácie som vybral ja, stránky som uložil ako lokálne kópie, kód som prešiel a vyskúšal v prehliadači a za odovzdanú verziu zodpovedám ja.
