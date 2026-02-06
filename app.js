const MONTHS_IN_YEAR = 12;
const MONTHLY_STD_DEDUCTION = 5000;
const SOCIAL_RATES = {
  pension: 0.08,
  medical: 0.02,
  unemployment: 0.005,
};

const fmt = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "-";

const state = {
  bonusMode: "months",
  baseMode: "monthly",
  taxMode: "separate",
  pfMode: "equal",
  deductions: [{ name: "租房", value: 1000 }],
};

const annualBrackets = [
  { cap: 36000, rate: 0.03, quick: 0 },
  { cap: 144000, rate: 0.1, quick: 2520 },
  { cap: 300000, rate: 0.2, quick: 16920 },
  { cap: 420000, rate: 0.25, quick: 31920 },
  { cap: 660000, rate: 0.3, quick: 52920 },
  { cap: 960000, rate: 0.35, quick: 85920 },
  { cap: Infinity, rate: 0.45, quick: 181920 },
];

const bonusBrackets = [
  { cap: 3000, rate: 0.03, quick: 0 },
  { cap: 12000, rate: 0.1, quick: 210 },
  { cap: 25000, rate: 0.2, quick: 1410 },
  { cap: 35000, rate: 0.25, quick: 2660 },
  { cap: 55000, rate: 0.3, quick: 4410 },
  { cap: 80000, rate: 0.35, quick: 7160 },
  { cap: Infinity, rate: 0.45, quick: 15160 },
];

const provinceBases = [
  { name: "北京", avg: 11937, min: 7162, max: 35811 },
  { name: "天津", avg: 8540, min: 5124, max: 25620 },
  { name: "河北", avg: 6678, min: 4007, max: 20034 },
  { name: "山西", avg: 6997, min: 4198, max: 20991 },
  { name: "内蒙古", avg: 8179, min: 4907, max: 24537 },
  { name: "辽宁", avg: 7264, min: 4359, max: 21792 },
  { name: "吉林", avg: 7322, min: 4393.2, max: 21966 },
  { name: "黑龙江", avg: 7570, min: 4542, max: 22710 },
  { name: "上海", avg: 12434, min: 7460, max: 37302 },
  { name: "江苏", avg: 8254, min: 4952, max: 24762 },
  { name: "浙江", avg: 8433, min: 4986, max: 25299 },
  { name: "安徽", avg: 7185, min: 4311, max: 21556 },
  { name: "福建", avg: 7535, min: 4043, max: 22607 },
  { name: "江西", avg: 6525, min: 3915, max: 19575 },
  { name: "山东", avg: 7506, min: 4504, max: 22518 },
  { name: "河南", avg: 6385, min: 3831, max: 19155 },
  { name: "湖北", avg: 7496, min: 4498, max: 22488 },
  { name: "湖南", avg: 6787, min: 4072, max: 20361 },
  { name: "广东", avg: 9183, min: 4775, max: 27549 },
  { name: "广西", avg: 6905, min: 4143, max: 20715 },
  { name: "海南", avg: 8188, min: 4912.8, max: 24564 },
  { name: "重庆", avg: 7339, min: 4404, max: 22017 },
  { name: "四川", avg: 7646, min: 4588, max: 22938 },
  { name: "贵州", avg: 7324.5, min: 4394.7, max: 21973.5 },
  { name: "云南", avg: 7263, min: 4357, max: 21789 },
  { name: "西藏", avg: 11777, min: 7066.2, max: 35331 },
  { name: "陕西", avg: 7750, min: 4650, max: 23250 },
  { name: "甘肃", avg: 7338, min: 4403, max: 22014 },
  { name: "青海", avg: 8816, min: 5289.6, max: 26448 },
  { name: "宁夏", avg: 8258, min: 4955, max: 24774 },
  { name: "新疆", avg: 8448, min: 5069, max: 25344 },
];

const el = (id) => document.getElementById(id);
const getNumber = (id) => Number(el(id).value) || 0;
const pickBracket = (amount, brackets) =>
  brackets.find((item) => amount <= item.cap) || brackets[brackets.length - 1];

const applySeg = (selector, value, key) => {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.classList.toggle("active", btn.dataset[key] === value);
  });
};

const clampBase = (base, min, max) => {
  const low = Number(min) || 0;
  const high = Number(max) || 0;
  let value = base;
  if (low && value < low) value = low;
  if (high && value > high) value = high;
  return value;
};

const calcTax = (amount, brackets) => {
  if (amount <= 0) return 0;
  const bracket = pickBracket(amount, brackets);
  return amount * bracket.rate - bracket.quick;
};

const calcBonusTaxSeparate = (bonus) => {
  if (bonus <= 0) return 0;
  const avg = bonus / MONTHS_IN_YEAR;
  const bracket = pickBracket(avg, bonusBrackets);
  return bonus * bracket.rate - bracket.quick;
};

const getBonus = (monthlySalary) => {
  const value = getNumber("bonusValue");
  return state.bonusMode === "months" ? monthlySalary * value : value;
};

const getBaseValue = (monthlySalary, bonus) => {
  if (state.baseMode === "manual") {
    const manualBase = getNumber("ssBase");
    return { ss: manualBase, pf: manualBase };
  }
  const monthlyAvg = (monthlySalary * MONTHS_IN_YEAR + bonus) / MONTHS_IN_YEAR;
  const base = state.baseMode === "annualavg" ? monthlyAvg : monthlySalary;
  return { ss: base, pf: base };
};

const getDeductionsMonthly = () =>
  state.deductions.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

const computeFinance = () => {
  const monthlySalary = getNumber("monthlySalary");
  const bonus = getBonus(monthlySalary);
  const ssMin = getNumber("ssMin");
  const ssCap = getNumber("ssCap");
  const clampEnabled = state.baseMode !== "manual";
  const base = getBaseValue(monthlySalary, bonus);
  const ssBase = clampEnabled ? clampBase(base.ss, ssMin, ssCap) : base.ss;
  const pfBase = clampEnabled ? clampBase(base.pf, ssMin, ssCap) : base.pf;

  const pfPersonalRate = getNumber("pfPersonalRate") / 100;
  const pfEmployerRate =
    state.pfMode === "equal" ? pfPersonalRate : getNumber("pfEmployerRate") / 100;

  const pensionPersonal = ssBase * SOCIAL_RATES.pension;
  const medicalPersonal = ssBase * SOCIAL_RATES.medical;
  const unemploymentPersonal = ssBase * SOCIAL_RATES.unemployment;
  const ssPersonal = pensionPersonal + medicalPersonal + unemploymentPersonal;
  const pfPersonal = pfBase * pfPersonalRate;
  const pfEmployer = pfBase * pfEmployerRate;

  const deductionsMonthly = getDeductionsMonthly();
  const annualGross = monthlySalary * MONTHS_IN_YEAR + bonus;
  const annualPersonal = (ssPersonal + pfPersonal) * MONTHS_IN_YEAR;
  const annualDeduct = (MONTHLY_STD_DEDUCTION + deductionsMonthly) * MONTHS_IN_YEAR;
  const salaryAnnualTaxable =
    monthlySalary * MONTHS_IN_YEAR - annualPersonal - annualDeduct;
  const annualTaxable = annualGross - annualPersonal - annualDeduct;
  const salaryAnnualTax = calcTax(salaryAnnualTaxable, annualBrackets);
  const salaryMonthlyTax = salaryAnnualTax / MONTHS_IN_YEAR;

  let annualTax = 0;
  let bonusTax = 0;
  let bonusAvg = 0;
  let bonusBracket = null;

  if (state.taxMode === "separate") {
    annualTax = salaryAnnualTax;
    bonusTax = calcBonusTaxSeparate(bonus);
    annualTax += bonusTax;
    bonusAvg = bonus / MONTHS_IN_YEAR;
    bonusBracket = pickBracket(bonusAvg, bonusBrackets);
  } else {
    annualTax = calcTax(annualTaxable, annualBrackets);
    bonusTax = annualTax - salaryAnnualTax;
  }

  const monthlyNet = monthlySalary - ssPersonal - pfPersonal - salaryMonthlyTax;
  const bonusNet = bonus - bonusTax;
  const annualNet =
    monthlyNet * MONTHS_IN_YEAR + bonusNet + (pfPersonal + pfEmployer) * MONTHS_IN_YEAR;

  return {
    annualDeduct,
    annualGross,
    annualNet,
    annualPersonal,
    annualTax,
    annualTaxable,
    base,
    bonus,
    bonusAvg,
    bonusBracket,
    bonusNet,
    bonusTax,
    clampEnabled,
    deductionsMonthly,
    medicalPersonal,
    monthlyNet,
    monthlySalary,
    pensionPersonal,
    pfBase,
    pfEmployer,
    pfEmployerRate,
    pfPersonal,
    pfPersonalRate,
    salaryAnnualTax,
    salaryAnnualTaxable,
    salaryMonthlyTax,
    ssBase,
    ssCap,
    ssMin,
    ssPersonal,
    unemploymentPersonal,
  };
};

const renderSummary = (data) => {
  el("monthlyNet").textContent = `${fmt(data.monthlyNet)} 元`;
  el("annualSalaryNet").textContent = `${fmt(data.monthlyNet * MONTHS_IN_YEAR)} 元`;
  el("annualPfNet").textContent = `${fmt((data.pfPersonal + data.pfEmployer) * MONTHS_IN_YEAR)} 元`;
  el("annualBonusNet").textContent = `${fmt(data.bonusNet)} 元`;
  el("annualMedicalAccount").textContent = `${fmt(data.medicalPersonal * MONTHS_IN_YEAR)} 元`;
  el("annualNet").textContent = `${fmt(data.annualNet)} 元`;
};

const renderSsWarn = (data) => {
  const ssWarn = el("ssWarn");
  ssWarn.textContent = "";
  if (!data.clampEnabled) {
    ssWarn.textContent = "手动设置基数：不应用上下限";
    return;
  }
  if (data.base.ss < data.ssMin && data.ssMin) {
    ssWarn.textContent = `基数低于下限，已按 ${fmt(data.ssMin)} 元计算`;
    return;
  }
  if (data.base.ss > data.ssCap && data.ssCap) {
    ssWarn.textContent = `基数高于上限，已按 ${fmt(data.ssCap)} 元计算`;
  }
};

const renderDetailTable = (data) => {
  const salaryMonthlyTaxLabel =
    state.taxMode === "separate" ? "工资月度个税" : "工资月度个税(均摆)";
  const detail = [
    ["养老保险个人（月）", data.pensionPersonal],
    ["医疗保险个人（月）", data.medicalPersonal],
    ["失业保险个人（月）", data.unemploymentPersonal],
    ["社保个人合计（月）", data.ssPersonal],
    ["公积金个人（月）", data.pfPersonal],
    ["公积金单位（月）", data.pfEmployer],
    ["专项扣除合计（月）", data.deductionsMonthly],
    [salaryMonthlyTaxLabel, data.salaryMonthlyTax],
    ["年终奖税", data.bonusTax],
    ["年度个税", data.annualTax],
  ];

  el("detailTable").innerHTML = detail
    .map(
      ([label, value]) =>
        `<div class="detail-row"><span>${label}</span><strong>${fmt(value)} 元</strong></div>`
    )
    .join("");
};

const buildExplain = (data) => {
  const bonusModeText = state.bonusMode === "months" ? "按月数" : "固定金额";
  const taxModeText = state.taxMode === "separate" ? "分别计税" : "合并计税";
  const annualPersonalTotal = data.annualPersonal;
  const annualPfTotal = (data.pfPersonal + data.pfEmployer) * MONTHS_IN_YEAR;
  const annualSalaryNet = data.monthlyNet * MONTHS_IN_YEAR;

  return [
    `=============== 输入信息 ===============`,
    `月薪：${fmt(data.monthlySalary)} 元`,
    `年终奖：${fmt(data.bonus)} 元（${bonusModeText}）`,
    `社保/公积金基数：${fmt(data.ssBase)} 元（下限 ${fmt(data.ssMin)} - 上限 ${fmt(data.ssCap)}）`,
    `年终奖计税方式：${taxModeText}`,
    ``,
    `=============== 社保与公积金 ===============`,
    `【社保个人部分】`,
    `  • 养老保险（8%）`,
    `    每月：${fmt(data.ssBase)} × 8% = ${fmt(data.pensionPersonal)} 元`,
    `    全年：${fmt(data.pensionPersonal)} × 12 = ${fmt(data.pensionPersonal * MONTHS_IN_YEAR)} 元`,
    `  • 医疗保险（2%）`,
    `    每月：${fmt(data.ssBase)} × 2% = ${fmt(data.medicalPersonal)} 元`,
    `    全年：${fmt(data.medicalPersonal)} × 12 = ${fmt(data.medicalPersonal * MONTHS_IN_YEAR)} 元`,
    `  • 失业保险（0.5%）`,
    `    每月：${fmt(data.ssBase)} × 0.5% = ${fmt(data.unemploymentPersonal)} 元`,
    `    全年：${fmt(data.unemploymentPersonal)} × 12 = ${fmt(
      data.unemploymentPersonal * MONTHS_IN_YEAR
    )} 元`,
    `  • 社保个人合计`,
    `    每月：${fmt(data.ssPersonal)} 元`,
    `    全年：${fmt(data.ssPersonal * MONTHS_IN_YEAR)} 元`,
    ``,
    `【公积金部分】`,
    `  • 公积金个人（${fmt(data.pfPersonalRate * 100)}%）`,
    `    每月：${fmt(data.pfBase)} × ${fmt(data.pfPersonalRate * 100)}% = ${fmt(data.pfPersonal)} 元`,
    `    全年：${fmt(data.pfPersonal * MONTHS_IN_YEAR)} 元`,
    `  • 公积金单位（${fmt(data.pfEmployerRate * 100)}%）`,
    `    每月：${fmt(data.pfBase)} × ${fmt(data.pfEmployerRate * 100)}% = ${fmt(data.pfEmployer)} 元`,
    `    全年：${fmt(data.pfEmployer * MONTHS_IN_YEAR)} 元`,
    `  • 公积金合计（个人+单位）`,
    `    全年：${fmt(annualPfTotal)} 元`,
    ``,
    `=============== 工资部分 ===============`,
    `工资总额：${fmt(data.monthlySalary * MONTHS_IN_YEAR)} 元/年`,
    `减：社保个人：${fmt(data.ssPersonal * MONTHS_IN_YEAR)} 元/年`,
    `减：公积金个人：${fmt(data.pfPersonal * MONTHS_IN_YEAR)} 元/年`,
    `减：专项扣除合计：${fmt(data.deductionsMonthly * MONTHS_IN_YEAR)} 元/年`,
    `减：起征点：60,000 元/年`,
    state.taxMode === "separate"
      ? `工资年度应纳税所得额：\n  ${fmt(data.monthlySalary * MONTHS_IN_YEAR)} - ${fmt(
          annualPersonalTotal
        )} - ${fmt(data.deductionsMonthly * MONTHS_IN_YEAR)} - 60,000  = ${fmt(
          data.salaryAnnualTaxable
        )} 元`
      : `年度应纳税所得额（工资+年终奖）：\n  ${fmt(data.annualGross)} - ${fmt(
          annualPersonalTotal
        )} - ${fmt(data.deductionsMonthly * MONTHS_IN_YEAR)} - 60,000  = ${fmt(
          data.annualTaxable
        )} 元`,
    state.taxMode === "separate"
      ? `工资年度个税：${fmt(data.salaryAnnualTax)} 元`
      : `年度总个税：${fmt(data.annualTax)} 元\n  （其中工资部分 ${fmt(
          data.salaryAnnualTax
        )} 元，年终奖部分 ${fmt(data.bonusTax)} 元）`,
    `工资月度个税：${fmt(data.salaryMonthlyTax)} 元/月`,
    `每月税后工资：${fmt(data.monthlyNet)} 元`,
    `年度税后工资：${fmt(annualSalaryNet)} 元`,
    ``,
    `=============== 年终奖部分 ===============`,
    `年终奖总额：${fmt(data.bonus)} 元`,
    state.taxMode === "separate" && data.bonus > 0
      ? `年终奖税（分别计税）：\n  ① 年终奖 ÷ 12：${fmt(data.bonus)} ÷ 12 = ${fmt(
          data.bonusAvg
        )} 元\n  ② 查询税率表，${fmt(data.bonusAvg)} 元落在税率 ${fmt(
          data.bonusBracket.rate * 100
        )}% 档\n     速算扣除数：${fmt(data.bonusBracket.quick)} 元\n  ③ 计算个税：${fmt(
          data.bonus
        )} × ${fmt(data.bonusBracket.rate * 100)}% - ${fmt(data.bonusBracket.quick)} = ${fmt(
          data.bonusTax
        )} 元`
      : state.taxMode === "separate"
      ? `年终奖税（分别计税）：0 元`
      : `年终奖税（合并计税中已分摊）：${fmt(data.bonusTax)} 元`,
    `年终奖到手：${fmt(data.bonusNet)} 元`,
    ``,
    `=============== 总计 ===============`,
    `税后年收入 - 工资部分：${fmt(annualSalaryNet)} 元`,
    `税后年收入 - 公积金部分：${fmt(annualPfTotal)} 元`,
    `税后年收入 - 年终奖部分：${fmt(data.bonusNet)} 元`,
    `医保个人账户（不计入税后年收入）：${fmt(data.medicalPersonal * MONTHS_IN_YEAR)} 元`,
    `税后年收入总计：${fmt(data.annualNet)} 元`,
  ].join("\n");
};

const calc = () => {
  const data = computeFinance();
  renderSummary(data);
  renderSsWarn(data);
  renderDetailTable(data);
  el("calcExplain").value = buildExplain(data);

  if (data.clampEnabled) {
    el("ssBase").value = Math.round(data.ssBase);
  }
};

const fillProvince = (provinceName) => {
  const found = provinceBases.find((item) => item.name === provinceName);
  if (!found) return;
  el("ssMin").value = found.min;
  el("ssCap").value = found.max;
  el("ssMinText").textContent = fmt(found.min);
  el("ssCapText").textContent = fmt(found.max);
};

const renderDeductions = () => {
  const container = el("deductionList");
  container.innerHTML = "";

  state.deductions.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "deduction-item";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = item.name;
    nameInput.dataset.idx = String(idx);
    nameInput.dataset.field = "name";

    const valueInput = document.createElement("input");
    valueInput.type = "number";
    valueInput.value = item.value;
    valueInput.min = "0";
    valueInput.dataset.idx = String(idx);
    valueInput.dataset.field = "value";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost";
    removeButton.dataset.remove = String(idx);
    removeButton.textContent = "移除";

    row.appendChild(nameInput);
    row.appendChild(valueInput);
    row.appendChild(removeButton);
    container.appendChild(row);
  });
};

const updateBaseHint = () => {
  el("baseHint").style.display = state.baseMode === "annualavg" ? "block" : "none";
};

const updatePfMode = () => {
  applySeg("[data-pf-mode]", state.pfMode, "pfMode");
  const employerInput = el("pfEmployerRate");
  if (state.pfMode === "equal") {
    employerInput.value = el("pfPersonalRate").value;
    employerInput.disabled = true;
    return;
  }
  employerInput.disabled = false;
};

const updateBonusUi = () => {
  const isMonths = state.bonusMode === "months";
  el("bonusUnit").textContent = isMonths ? "个月" : "元";
  el("bonusHint").textContent = isMonths
    ? "按月数计算：年终奖 = 月薪 × 月数"
    : "固定金额：直接输入年终奖金额";
};

const setMode = (key, value, selector, options = {}) => {
  const { afterChange, syncButton = true } = options;
  state[key] = value;
  if (syncButton) {
    applySeg(selector, value, key);
  }
  if (afterChange) {
    afterChange();
  }
  calc();
};

const bind = () => {
  document.addEventListener("click", (event) => {
    const target = event.target;

    if (target.matches("[data-bonus-mode]")) {
      setMode("bonusMode", target.dataset.bonusMode, "[data-bonus-mode]", {
        afterChange: updateBonusUi,
      });
      return;
    }

    if (target.matches("[data-base-mode]")) {
      setMode("baseMode", target.dataset.baseMode, "[data-base-mode]", {
        afterChange: updateBaseHint,
      });
      return;
    }

    if (target.matches("[data-tax-mode]")) {
      setMode("taxMode", target.dataset.taxMode, "[data-tax-mode]");
      return;
    }

    if (target.matches("[data-pf-mode]")) {
      setMode("pfMode", target.dataset.pfMode, "[data-pf-mode]", {
        afterChange: updatePfMode,
        syncButton: false,
      });
      return;
    }

    if (target.id === "addDeduction") {
      state.deductions.push({ name: "自定义扣除", value: 0 });
      renderDeductions();
      calc();
      return;
    }

    if (target.id === "saveAsImage") {
      saveCalcExplainAsImage();
      return;
    }

    if (target.dataset.remove) {
      state.deductions.splice(Number(target.dataset.remove), 1);
      renderDeductions();
      calc();
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.dataset.field) {
      const idx = Number(target.dataset.idx);
      if (state.deductions[idx]) {
        state.deductions[idx][target.dataset.field] = target.value;
      }
      calc();
      return;
    }
    if (target.id === "pfPersonalRate" && state.pfMode === "equal") {
      el("pfEmployerRate").value = target.value;
    }
    if (target.matches("input, textarea")) {
      calc();
    }
  });

  el("province").addEventListener("change", (event) => {
    fillProvince(event.target.value);
    calc();
  });
};

const saveCalcExplainAsImage = () => {
  const text = el("calcExplain").value;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpi = 260;
  const scale = dpi / 96;
  const fontSize = 16;
  const lineHeight = 24;
  const padding = 40;
  const lines = text.split("\n");
  const logicalWidth = 800;
  const logicalHeight = lines.length * lineHeight + padding * 2;

  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);
  ctx.fillStyle = "#1d1a16";
  ctx.font = `${fontSize}px 'Noto Serif SC', 'Source Han Serif SC', monospace`;
  ctx.textBaseline = "top";

  lines.forEach((line, index) => {
    ctx.fillText(line, padding, padding + index * lineHeight);
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `工资计算-${new Date().toISOString().split("T")[0]}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
};

const init = () => {
  const provinceSelect = el("province");
  provinceBases.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name;
    option.textContent = item.name;
    provinceSelect.appendChild(option);
  });

  provinceSelect.value = "北京";
  fillProvince("北京");
  renderDeductions();
  bind();

  applySeg("[data-bonus-mode]", state.bonusMode, "bonusMode");
  applySeg("[data-base-mode]", state.baseMode, "baseMode");
  applySeg("[data-tax-mode]", state.taxMode, "taxMode");
  updateBonusUi();
  updateBaseHint();
  updatePfMode();
  calc();
};

init();
