const $ = (id) => document.getElementById(id),
  M = FormModel;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (n) => Number(n).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
const shortDate = (d) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
let data, originalData, graph, race, ranked, selected;
let defaultRacePending=false,landingViewPending=false;
const display = (n) => graph.nodes.get(n)?.display || M.title(n),
  active = () => baseline.filter((h) => h.eligible);
function openMethod() {
  $("method").open = true;
  $("method").scrollIntoView?.({ behavior: "smooth", block: "start" });
}
$("methodButton").onclick = openMethod;
function renderRaceFacts() {
  if (!race) return;
  const original = originalData.races.find((r) => r.number === race.number),
    report = lateMail?.meeting?.races.find((r) => r.number === race.number),
    isForm = experience === "form",
    going = isForm ? original.going : report?.condition || "Not confirmed";
  $("raceFacts").innerHTML =
    `<div class="fact"><b>${race.distance.toLocaleString()}m</b><span>DISTANCE</span></div><div class="fact"><b>${isForm ? baseline.filter((h) => h.eligible).length : race.horses.filter((h) => !h.scratched && !h.emergency).length}</b><span>${isForm ? "ORIGINAL FIELD" : "LATEST FIELD"}</span></div><div class="fact"><b>${esc(going)}</b><span>${isForm ? "ORIGINAL GOING" : "SAVED GOING"}</span></div>`;
}
function chooseRace(n,{automatic=false}={}) {
  if(typeof stopBriefing==='function')stopBriefing();
  if(!automatic)defaultRacePending=false;
  race = data.races.find((r) => r.number === Number(n)) || data.races[0];
  baseline = M.rate(
    graph,
    originalData.races.find((r) => r.number === race.number),
  );
  ranked = baseline;
  selected = baseline.find((h) => h.eligible)?.name || baseline[0]?.name;
  ladderExpanded = false;
  $("raceTabs").innerHTML = data.races
    .map(
      (r) =>
        `<button class="race-tab" data-race="${r.number}" aria-pressed="${r.number === race.number}">R${r.number} · ${esc(r.name)}</button>`,
    )
    .join("");
  document
    .querySelectorAll("[data-race]")
    .forEach((b) => (b.onclick = () => chooseRace(Number(b.dataset.race))));
  $("raceMeta").textContent = `RACE ${race.number} · ${race.time} AEDT`;
  $("raceName").textContent = race.name;
  renderRaceFacts();
  renderSimple();
  renderRankings();
  renderDetail();
  renderTips();
  renderLadder();
  renderLateMail();
  syncMobileRace();
  if(!automatic)syncRoute();
}
function renderRankings() {
  $("fieldCount").textContent = `${baseline.length} listed`;
  $("rankings").innerHTML = baseline
    .map((h, i) => {
      const current = currentRunner(h),
        status =
          current?.scratched && !h.scratched
            ? "Late scratching"
            : h.scratched
              ? "Scratched in original form"
              : h.emergency
                ? "Emergency"
                : "",
        position = h.rankable
          ? baseline
              .filter((x) => x.rankable)
              .findIndex((x) => x.name === h.name) + 1
          : "—";
      return `<button class="field-runner ${status ? "field-flagged" : ""}" data-horse="${esc(h.name)}"><span class="field-position">${position}</span>${silk(h)}<span><b>${h.number}. ${esc(h.display)}</b><small>${status || (!h.history.length?'Unassessed · no race history':!h.rankable?'Unranked · no shared-race links':esc(h.jockey))}</small></span><i>↗</i></button>`;
    })
    .join("");
  document
    .querySelectorAll("[data-horse]")
    .forEach((b) => (b.onclick = () => inspectRunner(b.dataset.horse)));
  $("rankingNote").textContent =
    "Original order. Late changes are flagged; the saved revision is in Late mail.";
}
function renderDetail() {
  if (!race || !selected) return;
  const h =
    baseline.find((h) => h.name === selected) ||
    graph.nodes.get(selected)?.horse;
  if (!h) {
    $("horseDetail").innerHTML =
      "<p>Only shared-race evidence is available for this runner.</p>";
    return;
  }
  const current = currentRunner(h),
    status = current?.scratched
      ? "Scratched in the latest saved report"
      : h.emergency
        ? "Emergency · field not confirmed"
        : "";
  $("horseDetail").innerHTML =
    `${horsePhoto(h, "detail")}<div class="detail-name">${silk(h, "large")}<h3>${esc(h.display)}</h3></div>${status ? `<p class="runner-status">${esc(status)}</p>` : ""}<div class="horse-detail-grid"><div><span>JOCKEY</span><b>${esc(current?.jockey ? M.title(current.jockey) : h.jockey)}</b></div><div><span>TRAINER</span><b>${esc(h.trainer)}</b></div><div><span>BARRIER / WEIGHT</span><b>${h.barrier} / ${h.weight}kg</b></div><div><span>RECENT FORM</span><b>${esc(h.form || "—")}</b></div></div>${runnerInputs(h)}${sentimentHTML(h)}<h4 class="history-title">Recent races</h4>${
      h.history.length
        ? h.history
            .slice(0, 5)
            .map(
              (r) =>
                `<div class="history-item"><span class="history-pos">${r.pos}<small>/${r.total}</small></span><div><strong>${esc(r.track)} · ${r.distance}m</strong><small>${shortDate(r.date)} · ${esc(r.going)}</small><span class="deficit">${r.pos === 1 ? "Won" : `${fmt(r.margin)}L behind ${esc(M.title(r.winner))}`}</span></div></div>`,
            )
            .join("")
        : '<p class="simple-note">No usable recent starts in the published sample.</p>'
    }`;
}
Promise.all([
  fetch("data.json").then((r) => {
    if (!r.ok) throw Error("Form unavailable");
    return r.json();
  }),
  fetch("media.json")
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({})),
  fetch("editorial.json")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null),
])
  .then(([d, photos, research]) => {
    data = d;
    for (const r of d.races)
      for (const h of r.horses) h.display = M.title(h.name);
    originalData = JSON.parse(JSON.stringify(d));
    media = photos;
    editorial = research;
    graph = M.build(originalData);
    $("dataTimestamp").textContent =
      `Original form saved ${new Date(d.retrieved).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "medium", timeStyle: "short" })} AEDT. Late mail has its own saved update time.`;
    const linkedRace=Number(location.hash.match(/race-(\d+)(?:\/|$)/)?.[1]),validLink=d.races.some(r=>r.number===linkedRace);
    defaultRacePending=!validLink;landingViewPending=!/\/(?:results|scorecard|connections|race-day|late-mail|value|tips|form)(?:$|\/)/.test(location.hash);
    const landing=nextRaceLanding(originalData,null);
    setExperience(
      location.hash.includes("/results")
        ? "results"
        : location.hash.includes("/connections")
        ? "connections"
        : location.hash.includes("/race-day") ||
            location.hash.includes("/late-mail")
          ? "race-day"
          : location.hash.includes("/value") || location.hash.includes("/tips")
            ? "value"
            : "form",
      false,
    );
    if(defaultRacePending&&landingViewPending)setExperience(landing.view,false);
    chooseRace(validLink?linkedRace:landing.race,{automatic:true});
    $("loading").hidden = true;
    initBriefings();
    initSavedMail();
  })
  .catch((e) => {
    console.error("Guide initialisation failed",e);
    $("loading").innerHTML =
      '<div>Form could not be loaded.<br><button onclick="location.reload()">Try again</button></div>';
  });
