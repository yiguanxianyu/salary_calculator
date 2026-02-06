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

const PENSION_RATE = 0.08;
const MEDICAL_RATE = 0.02;
const UNEMPLOYMENT_RATE = 0.005;

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

const applySeg = (selector, value, key) => {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.classList.toggle("active", btn.dataset[key] === value);
  });
};


const getBonus = (monthlySalary) => {
  const val = Number(el("bonusValue").value) || 0;
  return state.bonusMode === "months" ? monthlySalary * val : val;
};

const getBaseValue = (monthlySalary, bonus) => {
  if (state.baseMode === "manual") {
    const ssBase = Number(el("ssBase").value) || 0;
    return { ss: ssBase, pf: ssBase };
  }
  const monthlyAvg = (monthlySalary * 12 + bonus) / 12;
  const base = state.baseMode === "annualavg" ? monthlyAvg : monthlySalary;
  return { ss: base, pf: base };
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
  const b = brackets.find((item) => amount <= item.cap) || brackets[brackets.length - 1];
  return amount * b.rate - b.quick;
};

const calcBonusTaxSeparate = (bonus) => {
  if (bonus <= 0) return 0;
  const avg = bonus / 12;
  const b = bonusBrackets.find((item) => avg <= item.cap) || bonusBrackets[bonusBrackets.length - 1];
  return bonus * b.rate - b.quick;
};

const calc = () => {
  const monthlySalary = Number(el("monthlySalary").value) || 0;
  const bonus = getBonus(monthlySalary);

  const stdDeduction = 5000;
  const ssMin = Number(el("ssMin").value) || 0;
  const ssCap = Number(el("ssCap").value) || 0;
  const pfMin = ssMin;
  const pfCap = ssCap;

  const base = getBaseValue(monthlySalary, bonus);
  const clampEnabled = state.baseMode !== "manual";
  const ssBase = clampEnabled ? clampBase(base.ss, ssMin, ssCap) : base.ss;
  const pfBase = clampEnabled ? clampBase(base.pf, pfMin, pfCap) : base.pf;

  const pfPersonalRate = (Number(el("pfPersonalRate").value) || 0) / 100;
  const pfEmployerRate =
    state.pfMode === "equal"
      ? pfPersonalRate
      : (Number(el("pfEmployerRate").value) || 0) / 100;

  const pensionPersonal = ssBase * PENSION_RATE;
  const medicalPersonal = ssBase * MEDICAL_RATE;
  const unemploymentPersonal = ssBase * UNEMPLOYMENT_RATE;
  const ssPersonal = pensionPersonal + medicalPersonal + unemploymentPersonal;
  const pfPersonal = pfBase * pfPersonalRate;
  const pfEmployer = pfBase * pfEmployerRate;

  const deductionsMonthly = state.deductions.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );

  let bonusTax = 0;
  let annualTax = 0;
  let salaryTax = 0;
  let monthlyTax = 0;
  let monthlyNet = 0;
  let bonusNet = 0;
  let annualNet = 0;

  const annualGross = monthlySalary * 12 + bonus;
  const annualPersonal = (ssPersonal + pfPersonal) * 12;
  const annualDeduct = stdDeduction * 12 + deductionsMonthly * 12;
  const salaryAnnualTaxable = monthlySalary * 12 - annualPersonal - annualDeduct;
  const salaryAnnualTax = calcTax(salaryAnnualTaxable, annualBrackets);

  if (state.taxMode === "separate") {
    bonusTax = calcBonusTaxSeparate(bonus);
    salaryTax = salaryAnnualTax;
    annualTax = salaryAnnualTax + bonusTax;
    monthlyTax = salaryAnnualTax / 12;
    monthlyNet = monthlySalary - ssPersonal - pfPersonal - monthlyTax;
    bonusNet = bonus - bonusTax;
    annualNet = monthlyNet * 12 + bonusNet + (pfPersonal + pfEmployer) * 12;
  } else {
    const annualTaxable = annualGross - annualPersonal - annualDeduct;
    annualTax = calcTax(annualTaxable, annualBrackets);
    salaryTax = salaryAnnualTax;
    bonusTax = annualTax - salaryAnnualTax;
    monthlyTax = annualTax / 12;
    const salaryMonthlyTax = salaryAnnualTax / 12;
    monthlyNet = monthlySalary - ssPersonal - pfPersonal - salaryMonthlyTax;
    bonusNet = bonus - bonusTax;
    annualNet = monthlyNet * 12 + bonusNet + (pfPersonal + pfEmployer) * 12;
  }

  el("monthlyNet").textContent = `${fmt(monthlyNet)} 元`;
  el("annualSalaryNet").textContent = `${fmt(monthlyNet * 12)} 元`;
  el("annualPfNet").textContent = `${fmt((pfPersonal + pfEmployer) * 12)} 元`;
  el("annualBonusNet").textContent = `${fmt(bonusNet)} 元`;
  el("annualMedicalAccount").textContent = `${fmt(medicalPersonal * 12)} 元`;
  el("annualNet").textContent = `${fmt(annualNet)} 元`;

  const ssWarn = el("ssWarn");
  ssWarn.textContent = "";
  if (!clampEnabled) {
    ssWarn.textContent = "手动设置基数：不应用上下限";
  } else if (base.ss < ssMin && ssMin) {
    ssWarn.textContent = `基数低于下限，已按 ${fmt(ssMin)} 元计算`;
  } else if (base.ss > ssCap && ssCap) {
    ssWarn.textContent = `基数高于上限，已按 ${fmt(ssCap)} 元计算`;
  }

  const salaryMonthlyTaxLabel =
    state.taxMode === "separate" ? "工资月度个税" : "工资月度个税(均摆)";
  const detail = [
    ["养老保险个人（月）", pensionPersonal],
    ["医疗保险个人（月）", medicalPersonal],
    ["失业保险个人（月）", unemploymentPersonal],
    ["社保个人合计（月）", ssPersonal],
    ["公积金个人（月）", pfPersonal],
    ["公积金单位（月）", pfEmployer],
    ["专项扣除合计（月）", deductionsMonthly],
    [salaryMonthlyTaxLabel, state.taxMode === "separate" ? monthlyTax : salaryAnnualTax / 12],
    ["年终奖税", bonusTax],
    ["年度个税", annualTax],
  ];

  el("detailTable").innerHTML = detail
    .map(
      ([label, value]) =>
        `<div class="detail-row"><span>${label}</span><strong>${fmt(value)} 元</strong></div>`
    )
    .join("");

  if (clampEnabled) {
    el("ssBase").value = Math.round(ssBase);
  }

  const annualTaxable = annualGross - annualPersonal - annualDeduct;
  
  el("calcExplain").value = [
    `=============== 输入信息 ===============`,
    `月薪：${fmt(monthlySalary)} 元`,
    `年终奖：${fmt(bonus)} 元（${state.bonusMode === "months" ? "按月数" : "固定金额"}）`,
    `社保/公积金基数：${fmt(ssBase)} 元（下限 ${fmt(ssMin)} - 上限 ${fmt(ssCap)}）`,
    `年终奖计税方式：${state.taxMode === "separate" ? "分别计税" : "合并计税"}`,
    ``,
    `=============== 社保与公积金 ===============`,
    `【社保个人部分】`,
    `  • 养老保险（8%）`,
    `    每月：${fmt(ssBase)} × 8% = ${fmt(pensionPersonal)} 元`,
    `    全年：${fmt(pensionPersonal)} × 12 = ${fmt(pensionPersonal * 12)} 元`,
    `  • 医疗保险（2%）`,
    `    每月：${fmt(ssBase)} × 2% = ${fmt(medicalPersonal)} 元`,
    `    全年：${fmt(medicalPersonal)} × 12 = ${fmt(medicalPersonal * 12)} 元`,
    `  • 失业保险（0.5%）`,
    `    每月：${fmt(ssBase)} × 0.5% = ${fmt(unemploymentPersonal)} 元`,
    `    全年：${fmt(unemploymentPersonal)} × 12 = ${fmt(unemploymentPersonal * 12)} 元`,
    `  • 社保个人合计`,
    `    每月：${fmt(ssPersonal)} 元`,
    `    全年：${fmt(ssPersonal * 12)} 元`,
    ``,
    `【公积金部分】`,
    `  • 公积金个人（${fmt(pfPersonalRate * 100)}%）`,
    `    每月：${fmt(pfBase)} × ${fmt(pfPersonalRate * 100)}% = ${fmt(pfPersonal)} 元`,
    `    全年：${fmt(pfPersonal * 12)} 元`,
    `  • 公积金单位（${fmt(pfEmployerRate * 100)}%）`,
    `    每月：${fmt(pfBase)} × ${fmt(pfEmployerRate * 100)}% = ${fmt(pfEmployer)} 元`,
    `    全年：${fmt(pfEmployer * 12)} 元`,
    `  • 公积金合计（个人+单位）`,
    `    全年：${fmt((pfPersonal + pfEmployer) * 12)} 元`,
    ``,
    `=============== 工资部分 ===============`,
    `工资总额：${fmt(monthlySalary * 12)} 元/年`,
    `减：社保个人：${fmt(ssPersonal * 12)} 元/年`,
    `减：公积金个人：${fmt(pfPersonal * 12)} 元/年`,
    `减：专项扣除合计：${fmt(deductionsMonthly * 12)} 元/年`,
    `减：起征点：60,000 元/年`,
    state.taxMode === "separate"
      ? `工资年度应纳税所得额：\n  ${fmt(monthlySalary * 12)} - ${fmt((ssPersonal + pfPersonal) * 12)} - ${fmt(deductionsMonthly * 12)} - 60,000\n  = ${fmt(salaryAnnualTaxable)} 元`
      : `年度应纳税所得额（工资+年终奖）：\n  ${fmt(annualGross)} - ${fmt((ssPersonal + pfPersonal) * 12)} - ${fmt(deductionsMonthly * 12)} - 60,000\n  = ${fmt(annualTaxable)} 元`,
    state.taxMode === "separate"
      ? `工资年度个税：${fmt(salaryAnnualTax)} 元`
      : `年度总个税：${fmt(annualTax)} 元\n  （其中工资部分 ${fmt(salaryAnnualTax)} 元，年终奖部分 ${fmt(bonusTax)} 元）`,
    `工资月度个税：${fmt(salaryAnnualTax / 12)} 元/月`,
    `每月税后工资：${fmt(monthlyNet)} 元`,
    `年度税后工资：${fmt(monthlyNet * 12)} 元`,
    ``,
    `=============== 年终奖部分 ===============`,
    `年终奖总额：${fmt(bonus)} 元`,
    state.taxMode === "separate" 
      ? `年终奖税（分别计税）：\n  年终奖 ÷ 12 分档后，按总额计算 = ${fmt(bonusTax)} 元`
      : `年终奖税（合并计税中已分摊）：${fmt(bonusTax)} 元`,
    `年终奖到手：${fmt(bonusNet)} 元`,
    ``,
    `=============== 总计 ===============`,
    `税后年收入 - 工资部分：${fmt(monthlyNet * 12)} 元`,
    `税后年收入 - 公积金部分：${fmt((pfPersonal + pfEmployer) * 12)} 元`,
    `税后年收入 - 年终奖部分：${fmt(bonusNet)} 元`,
    `医保个人账户（不计入税后年收入）：${fmt(medicalPersonal * 12)} 元`,
    `税后年收入总计：${fmt(annualNet)} 元`,
    ``,
    `验算：${fmt(monthlyNet * 12)} + ${fmt((pfPersonal + pfEmployer) * 12)} + ${fmt(bonusNet)} = ${fmt(annualNet)} 元`,
  ].join("\n");
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
    row.innerHTML = `
      <input type="text" value="${item.name}" data-idx="${idx}" data-field="name" />
      <input type="number" value="${item.value}" min="0" data-idx="${idx}" data-field="value" />
      <button type="button" class="ghost" data-remove="${idx}">移除</button>
    `;
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
  } else {
    employerInput.disabled = false;
  }
};

const bind = () => {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target.matches("[data-bonus-mode]")) {
      state.bonusMode = target.dataset.bonusMode;
      applySeg("[data-bonus-mode]", state.bonusMode, "bonusMode");
      const unit = state.bonusMode === "months" ? "个月" : "元";
      el("bonusUnit").textContent = unit;
      el("bonusHint").textContent =
        state.bonusMode === "months"
          ? "按月数计算：年终奖 = 月薪 × 月数"
          : "固定金额：直接输入年终奖金额";
      calc();
      return;
    }

    if (target.matches("[data-base-mode]")) {
      state.baseMode = target.dataset.baseMode;
      applySeg("[data-base-mode]", state.baseMode, "baseMode");
      updateBaseHint();
      calc();
      return;
    }

    if (target.matches("[data-tax-mode]")) {
      state.taxMode = target.dataset.taxMode;
      applySeg("[data-tax-mode]", state.taxMode, "taxMode");
      calc();
      return;
    }

    if (target.matches("[data-pf-mode]")) {
      state.pfMode = target.dataset.pfMode;
      updatePfMode();
      calc();
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
      state.deductions[idx][target.dataset.field] = target.value;
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

const saveCalcExplainAsImage = async () => {
  const textarea = el("calcExplain");
  const text = textarea.value;
  
  // 创建一个画布
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  // 设置 DPI 为 260
  const dpi = 260;
  const scale = dpi / 96; // 96 是默认 DPI
  
  // 设置画布尺寸（逻辑像素）
  const fontSize = 16;
  const lineHeight = 24;
  const padding = 40;
  const lines = text.split("\n");
  
  const logicalWidth = 800;
  const logicalHeight = lines.length * lineHeight + padding * 2;
  
  // 设置物理像素尺寸
  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;
  
  // 缩放画布以匹配 DPI
  canvas.style.width = logicalWidth + "px";
  canvas.style.height = logicalHeight + "px";
  ctx.scale(scale, scale);
  
  // 背景和样式
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);
  
  ctx.fillStyle = "#1d1a16";
  ctx.font = `${fontSize}px 'Noto Serif SC', 'Source Han Serif SC', monospace`;
  ctx.textBaseline = "top";
  
  // 绘制文本
  lines.forEach((line, index) => {
    ctx.fillText(line, padding, padding + index * lineHeight);
  });
  
  // 转换为 PNG
  canvas.toBlob((blob) => {
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
  updateBaseHint();
  updatePfMode();
  calc();
};

init();
