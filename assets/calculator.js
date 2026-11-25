(() => {
  const calculator = document.querySelector('[data-calculator]');
  if (!calculator) return;

  const get = (id) => calculator.querySelector('#' + id);
  const unit = get('calc-unit');
  const minutes = get('calc-min');
  const days = get('calc-days');
  const plan = get('calc-plan-select');
  const net = get('calc-net');
  const netNote = get('calc-net-note');
  const status = get('calc-status');
  const operators = get('calc-operators');
  const results = ['calc-mobile', 'calc-fixed', 'calc-saved'].map(get);
  const money = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const format = (value) => money.format(value) + ' lei';
  const awaitingTariffs = 'arest-preventiv-deva';

  function option(value, label) {
    const entry = document.createElement('option');
    entry.value = value;
    entry.textContent = label;
    return entry;
  }

  function show(selection, subscription) {
    get('calc-min-out').textContent = minutes.value + ' min';
    get('calc-days-out').textContent = days.value;
    operators.replaceChildren();
    operators.hidden = !selection;
    if (!selection) {
      results.forEach((result) => { result.textContent = '—'; });
      net.textContent = '—';
      netNote.hidden = true;
      status.textContent = unit.value === awaitingTariffs ? 'Tarif neconfirmat. Estimarea nu este disponibilă.' : 'Alege unitatea pentru a vedea estimarea.';
      return;
    }

    const monthlyMinutes = Number(minutes.value) * Number(days.value) * 4.33;
    const mobile = monthlyMinutes * selection.calcul.mobil;
    const fixed = monthlyMinutes * selection.calcul.fix;
    const saved = mobile - fixed;
    const remaining = saved - (plan.value === 'an' ? subscription.an / 12 : subscription.luna);
    [mobile, fixed, saved].forEach((value, index) => { results[index].textContent = format(value); });
    net.textContent = format(Math.round(remaining * 100) / 100 || 0);
    netNote.hidden = remaining >= 0;
    status.textContent = selection.operatori.length > 1 ? 'Estimarea folosește tariful operatorului cu economia mai mică: ' + selection.calcul.operator + '.' : 'Tarife cu TVA, în lei/minut.';

    for (const operator of selection.operatori) {
      const row = document.createElement('li');
      row.textContent = operator.operator + ': fix ' + format(operator.fix) + '/min, mobil ' + format(operator.mobil) + '/min';
      operators.append(row);
    }
  }

  async function init() {
    try {
      const response = await fetch('/date/penitenciare-tarife.json');
      if (!response.ok) throw new Error('Tarife indisponibile');
      const { penitenciare, abonament } = await response.json();
      const prisons = document.createElement('optgroup');
      prisons.label = 'Penitenciare și centre ANP';
      const sorted = [...penitenciare].sort((a, b) => a.nume.localeCompare(b.nume, 'ro'));
      prisons.append(...sorted.map(({ id, nume }) => option(id, nume)));
      const police = document.createElement('optgroup');
      police.label = 'Centre de reținere și arestare preventivă';
      police.append(option(awaitingTariffs, 'Arest preventiv Deva (IPJ Hunedoara)'));
      unit.append(prisons, police);

      const lookup = new Map(penitenciare.map((entry) => [entry.id, entry]));
      const selected = calculator.dataset.penitenciar;
      if (lookup.has(selected)) unit.value = selected;
      const render = () => show(lookup.get(unit.value), abonament);
      unit.addEventListener('change', render);
      minutes.addEventListener('input', render);
      days.addEventListener('input', render);
      plan.addEventListener('change', render);
      [unit, minutes, days, plan].forEach((input) => { input.disabled = false; });
      render();
    } catch (_) {
      status.textContent = 'Tarifele nu au putut fi încărcate. Reîncarcă pagina pentru a încerca din nou.';
    }
  }

  init();
})();
