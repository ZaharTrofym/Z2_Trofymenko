const DAY_NAMES = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function parseHtml(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

function parsePrice(text) {
  if (!text) {
    return null;
  }
  const match = text.match(/\d+(?:[.,]\d+)?/);
  if (!match) {
    return null;
  }
  return parseFloat(match[0].replace(",", "."));
}

function makeItem(kind, name, price, allergens) {
  return { kind, name: cleanText(name), price, allergens };
}

function parseKlubovna(doc) {
  const days = [];
  const container = doc.querySelector(".restaurant-weekmenu .row");
  if (!container) {
    return days;
  }
  let current = null;
  for (const cell of container.children) {
    const title = cell.querySelector(".day-title");
    if (title) {
      const match = cleanText(title.textContent).match(/^(\S+)\s*\((\d+)\.(\d+)\.\d+\)/);
      current = match ? { day: match[1], date: `${Number(match[2])}. ${Number(match[3])}.`, note: "", items: [] } : null;
      if (current) {
        days.push(current);
      }
      continue;
    }
    if (!current || !cell.classList.contains("col-xs-10")) {
      continue;
    }
    const text = cleanText(cell.textContent);
    const price = parsePrice(cell.nextElementSibling?.textContent);
    if (price === null) {
      current.note = cleanText(`${current.note} ${text}`);
      continue;
    }
    const allergens = (text.match(/\(([\d,\s]+)\)/)?.[1] ?? "").replace(/\s+/g, "");
    const name = text
      .replace(/\s*\([\d,\s]+\)/, "")
      .replace(/\s*–\s*$/, "")
      .replace(/^Polievka:\s*/, "");
    const kind = text.startsWith("Polievka:") ? "soup" : "main";
    current.items.push(makeItem(kind, name, price, allergens));
  }
  return days;
}

function parseIdyla(doc) {
  const days = [];
  for (const section of doc.querySelectorAll(".dnesne_menu, .ostatne_menu")) {
    const heading = cleanText(section.querySelector("h2")?.textContent ?? "");
    const match = heading.match(/(\S+)\s*\((\d+)\.(\d+)\.\d+\)/);
    if (!match) {
      continue;
    }
    const day = { day: match[1], date: `${Number(match[2])}. ${Number(match[3])}.`, note: "", items: [] };
    let buffer = "";
    let soupFound = false;
    for (const element of section.querySelectorAll(".jedlo_polozka .left")) {
      const line = cleanText(element.textContent);
      if (!line || /^\d+\.\d+\.\d{4}$/.test(line)) {
        continue;
      }
      if (line.startsWith("TÝŽDENNÁ PONUKA")) {
        break;
      }
      if (line.startsWith("Zatvorené")) {
        day.note = "Zatvorené";
        continue;
      }
      const startsNewItem = /^(\d+\.|PONUKA DŇA)/.test(line);
      if (!buffer && !startsNewItem && !soupFound) {
        const allergens = (line.match(/\/([\d,\s]+)\//)?.[1] ?? "").replace(/\s+/g, "");
        day.items.push(makeItem("soup", line.replace(/\s*\/[\d,\s]+\/\s*$/, ""), null, allergens));
        soupFound = true;
        continue;
      }
      buffer = buffer ? `${buffer} ${line}` : line;
      const priceMatch = buffer.match(/(\d+[.,]\d+)\s*€/);
      if (!priceMatch) {
        continue;
      }
      const name = buffer
        .slice(0, priceMatch.index)
        .replace(/^\d+\.\s*/, "")
        .replace(/^PONUKA DŇA:\s*/, "");
      const allergens = (buffer.slice(priceMatch.index + priceMatch[0].length).match(/\d+/g) ?? []).join(",");
      day.items.push(makeItem("main", name, parsePrice(priceMatch[1]), allergens));
      buffer = "";
    }
    days.push(day);
  }
  return days;
}

function parseHospoda(doc) {
  const days = [];
  for (const article of doc.querySelectorAll("#menu article")) {
    const header = article.firstElementChild;
    const info = header?.firstElementChild?.children;
    if (!info || info.length < 2) {
      continue;
    }
    const dayName = cleanText(info[0].textContent).toLowerCase();
    const dayIndex = DAY_NAMES.findIndex((name) => name.toLowerCase() === dayName);
    const dateMatch = cleanText(info[1].textContent).match(/^(\d+)\.(\d+)\.\d{4}$/);
    if (dayIndex === -1 || !dateMatch) {
      continue;
    }
    const day = { day: DAY_NAMES[dayIndex], date: `${Number(dateMatch[1])}. ${Number(dateMatch[2])}.`, note: "", items: [] };
    if (cleanText(header.textContent).includes("ZATVORENÉ")) {
      day.note = "Zatvorené";
    }
    for (const row of article.querySelectorAll(".divide-y > div")) {
      const nameBox = row.querySelector(".min-w-0 > div:first-child");
      const metaBox = row.querySelector(".min-w-0 > div:nth-child(2)");
      if (!nameBox || !metaBox) {
        continue;
      }
      const ownText = [...nameBox.childNodes]
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent)
        .join(" ");
      const weight = cleanText(nameBox.querySelector(".text-zinc-500")?.textContent ?? "");
      const name = weight ? `${cleanText(ownText)}, ${weight}` : cleanText(ownText);
      const metaTexts = [...metaBox.querySelectorAll("span")].map((span) => cleanText(span.textContent));
      const kind = metaTexts.includes("Polievka") ? "soup" : "main";
      const allergensText = metaTexts.find((text) => text.startsWith("Alergény:")) ?? "";
      const allergens = allergensText.replace("Alergény:", "").replace(/\s+/g, "");
      const price = parsePrice(row.querySelector(".shrink-0")?.textContent);
      day.items.push(makeItem(kind, name, price, allergens));
    }
    days.push(day);
  }
  return days;
}
