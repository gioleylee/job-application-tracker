const STORAGE_KEY = "job-application-tracker-v1";
const THEME_KEY = "job-application-theme";
const STATUS_COLUMNS = ["Applied", "Screening", "Interviewing", "Offer"];

const demoApplications = [
  {
    id: crypto.randomUUID(),
    company: "OpenAI",
    role: "Operations Analyst",
    location: "Remote",
    status: "Interviewing",
    appliedDate: "2026-04-15",
    interviewDate: "2026-04-30",
    priority: "High",
    source: "Referral",
    salary: "$95k - $120k",
    jobLink: "https://example.com/openai-operations-analyst",
    followUpDate: "2026-04-22",
    contactName: "Jamie Chen",
    contactEmail: "jamie@example.com",
    nextStep: "Prep metrics story for panel",
    notes: "Reached recruiter screen. Prepare metrics and cross-functional examples.",
    createdAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    company: "Figma",
    role: "Product Support Specialist",
    location: "Singapore",
    status: "Applied",
    appliedDate: "2026-04-17",
    interviewDate: "",
    priority: "Medium",
    source: "LinkedIn",
    salary: "$70k - $88k",
    jobLink: "https://example.com/figma-support",
    followUpDate: "2026-04-24",
    contactName: "",
    contactEmail: "",
    nextStep: "Send follow-up if no reply",
    notes: "Strong fit with writing samples and async collaboration background.",
    createdAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    company: "Notion",
    role: "Community Manager",
    location: "Remote",
    status: "Offer",
    appliedDate: "2026-04-10",
    interviewDate: "",
    priority: "High",
    source: "Company site",
    salary: "$85k - $100k",
    jobLink: "https://example.com/notion-community",
    followUpDate: "",
    contactName: "Morgan",
    contactEmail: "morgan@example.com",
    nextStep: "Review offer details and respond",
    notes: "Offer received. Compare compensation, growth scope, and time zone expectations.",
    createdAt: new Date().toISOString()
  }
];

const form = document.querySelector("#applicationForm");
const applicationList = document.querySelector("#applicationList");
const template = document.querySelector("#applicationCardTemplate");
const statusBoard = document.querySelector("#statusBoard");
const attentionList = document.querySelector("#attentionList");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const sortSelect = document.querySelector("#sortSelect");
const cancelEditBtn = document.querySelector("#cancelEditBtn");
const seedDemoBtn = document.querySelector("#seedDemoBtn");
const exportBtn = document.querySelector("#exportBtn");
const importBtn = document.querySelector("#importBtn");
const importFileInput = document.querySelector("#importFileInput");
const clearAllBtn = document.querySelector("#clearAllBtn");
const formTitle = document.querySelector("#formTitle");
const themeToggleBtn = document.querySelector("#themeToggleBtn");
const themeToggleText = document.querySelector("#themeToggleText");
const fields = {
  applicationId: document.querySelector("#applicationId"),
  company: document.querySelector("#company"),
  role: document.querySelector("#role"),
  location: document.querySelector("#location"),
  status: document.querySelector("#status"),
  appliedDate: document.querySelector("#appliedDate"),
  interviewDate: document.querySelector("#interviewDate"),
  priority: document.querySelector("#priority"),
  source: document.querySelector("#source"),
  jobLink: document.querySelector("#jobLink"),
  followUpDate: document.querySelector("#followUpDate"),
  contactName: document.querySelector("#contactName"),
  contactEmail: document.querySelector("#contactEmail"),
  salary: document.querySelector("#salary"),
  nextStep: document.querySelector("#nextStep"),
  notes: document.querySelector("#notes")
};

const state = {
  applications: loadApplications(),
  editingId: null,
  search: "",
  filter: "All",
  sort: "applied-desc",
  theme: loadTheme()
};

applyTheme(state.theme);
fields.appliedDate.value = new Date().toISOString().split("T")[0];

render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const nextApplication = {
    id: data.get("applicationId") || crypto.randomUUID(),
    company: data.get("company").trim(),
    role: data.get("role").trim(),
    location: data.get("location").trim(),
    status: data.get("status"),
    appliedDate: data.get("appliedDate"),
    interviewDate: data.get("interviewDate"),
    priority: data.get("priority"),
    source: data.get("source").trim(),
    jobLink: data.get("jobLink").trim(),
    followUpDate: data.get("followUpDate"),
    contactName: data.get("contactName").trim(),
    contactEmail: data.get("contactEmail").trim(),
    salary: data.get("salary").trim(),
    nextStep: data.get("nextStep").trim(),
    notes: data.get("notes").trim(),
    createdAt: new Date().toISOString()
  };

  if (state.editingId) {
    state.applications = state.applications.map((application) =>
      application.id === state.editingId
        ? { ...application, ...nextApplication, createdAt: application.createdAt }
        : application
    );
  } else {
    state.applications = [nextApplication, ...state.applications];
  }

  persistApplications();
  resetForm();
  render();
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.toLowerCase().trim();
  render();
});

statusFilter.addEventListener("change", (event) => {
  state.filter = event.target.value;
  render();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

seedDemoBtn.addEventListener("click", () => {
  if (state.applications.length === 0) {
    state.applications = [...demoApplications];
  } else {
    state.applications = [...demoApplications, ...state.applications];
  }

  persistApplications();
  resetForm();
  render();
});

exportBtn.addEventListener("click", () => {
  saveApplicationsToFile();
});

themeToggleBtn.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme(state.theme);
  persistTheme();
});

importBtn.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const normalized = normalizeImportedApplications(parsed);

    state.applications = normalized;
    persistApplications();
    resetForm();
    render();
  } catch (error) {
    window.alert("Could not load that JSON file. Please use a tracker export from this app.");
  } finally {
    importFileInput.value = "";
  }
});

clearAllBtn.addEventListener("click", () => {
  if (!window.confirm("Clear all saved job applications from this browser? This cannot be undone.")) {
    return;
  }

  state.applications = [];
  persistApplications();
  resetForm();
  render();
});

applicationList.addEventListener("click", (event) => {
  const target = event.target;
  const card = target.closest("[data-id]");

  if (!card) {
    return;
  }

  const { id } = card.dataset;

  if (target.classList.contains("delete-btn")) {
    state.applications = state.applications.filter((application) => application.id !== id);
    persistApplications();

    if (state.editingId === id) {
      resetForm();
    }

    render();
  }

  if (target.classList.contains("edit-btn")) {
    const application = state.applications.find((entry) => entry.id === id);

    if (!application) {
      return;
    }

    state.editingId = id;
    formTitle.textContent = `Editing ${application.company}`;
    cancelEditBtn.classList.remove("hidden");

    fields.applicationId.value = application.id;
    fields.company.value = application.company;
    fields.role.value = application.role;
    fields.location.value = application.location;
    fields.status.value = application.status;
    fields.appliedDate.value = application.appliedDate;
    fields.interviewDate.value = application.interviewDate || "";
    fields.priority.value = application.priority || "Medium";
    fields.source.value = application.source || "";
    fields.jobLink.value = application.jobLink;
    fields.followUpDate.value = application.followUpDate;
    fields.contactName.value = application.contactName || "";
    fields.contactEmail.value = application.contactEmail || "";
    fields.salary.value = application.salary;
    fields.nextStep.value = application.nextStep || "";
    fields.notes.value = application.notes;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

function loadApplications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function persistApplications() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.applications));
}

function persistTheme() {
  localStorage.setItem(THEME_KEY, state.theme);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggleBtn.setAttribute("aria-pressed", String(theme === "dark"));
  themeToggleText.textContent = theme === "dark" ? "On" : "Off";
}

function saveApplicationsToFile() {
  const blob = new Blob([JSON.stringify(state.applications, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "job-applications.json";
  link.click();

  URL.revokeObjectURL(url);
}

function normalizeImportedApplications(data) {
  if (!Array.isArray(data)) {
    throw new Error("Imported data must be an array.");
  }

  return data.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid application entry.");
    }

    return {
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      company: String(item.company || "").trim(),
      role: String(item.role || "").trim(),
      location: String(item.location || "").trim(),
      status: isValidStatus(item.status) ? item.status : "Applied",
      appliedDate: String(item.appliedDate || "").trim(),
      interviewDate: String(item.interviewDate || "").trim(),
      priority: isValidPriority(item.priority) ? item.priority : "Medium",
      source: String(item.source || "").trim(),
      salary: String(item.salary || "").trim(),
      jobLink: String(item.jobLink || "").trim(),
      followUpDate: String(item.followUpDate || "").trim(),
      contactName: String(item.contactName || "").trim(),
      contactEmail: String(item.contactEmail || "").trim(),
      nextStep: String(item.nextStep || "").trim(),
      notes: String(item.notes || "").trim(),
      createdAt: typeof item.createdAt === "string" && item.createdAt ? item.createdAt : new Date().toISOString()
    };
  }).filter((item) => item.company && item.role && item.appliedDate);
}

function isValidStatus(status) {
  return ["Applied", "Screening", "Interviewing", "Offer", "Rejected", "Withdrawn"].includes(status);
}

function isValidPriority(priority) {
  return ["High", "Medium", "Low"].includes(priority);
}

function resetForm() {
  state.editingId = null;
  form.reset();
  fields.applicationId.value = "";
  fields.appliedDate.value = new Date().toISOString().split("T")[0];
  formTitle.textContent = "New application";
  cancelEditBtn.classList.add("hidden");
}

function render() {
  const filteredApplications = getFilteredApplications();

  renderStats(filteredApplications);
  renderBoard(filteredApplications);
  renderAttention(filteredApplications);
  renderList(filteredApplications);
}

function getFilteredApplications() {
  return [...state.applications]
    .filter((application) => {
      const matchesStatus = state.filter === "All" || application.status === state.filter;
      const haystack = [
        application.company,
        application.role,
        application.location,
        application.notes,
        application.source,
        application.contactName,
        application.nextStep
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = haystack.includes(state.search);

      return matchesStatus && matchesSearch;
    })
    .sort(sortApplications);
}

function renderStats(applications) {
  const activeStatuses = new Set(["Applied", "Screening", "Interviewing", "Offer"]);
  const total = applications.length;
  const active = applications.filter((application) => activeStatuses.has(application.status)).length;
  const interviewing = applications.filter((application) => application.status === "Interviewing").length;
  const offers = applications.filter((application) => application.status === "Offer").length;
  const thisWeek = applications.filter((application) => isWithinDays(application.appliedDate, 7)).length;
  const followUps = applications.filter((application) => isFollowUpDue(application.followUpDate)).length;
  const overdue = applications.filter((application) => isFollowUpOverdue(application.followUpDate)).length;
  const highPriority = applications.filter((application) => application.priority === "High").length;

  document.querySelector("#totalCount").textContent = total;
  document.querySelector("#activeCount").textContent = active;
  document.querySelector("#interviewCount").textContent = interviewing;
  document.querySelector("#offerCount").textContent = offers;
  document.querySelector("#overdueCount").textContent = overdue;
  document.querySelector("#highPriorityCount").textContent = highPriority;
  document.querySelector("#weekApplied").textContent = thisWeek;
  document.querySelector("#weekFollowUps").textContent = followUps;
}

function renderBoard(applications) {
  statusBoard.innerHTML = "";

  STATUS_COLUMNS.forEach((status) => {
    const column = document.createElement("section");
    const title = document.createElement("h3");
    const list = document.createElement("ul");
    const items = applications.filter((application) => application.status === status);

    column.className = "board-column";
    title.innerHTML = `${status} <small>(${items.length})</small>`;

    if (items.length) {
      items.forEach((item) => {
        const entry = document.createElement("li");
        const company = document.createElement("div");
        const role = document.createElement("strong");

        company.textContent = item.company;
        role.textContent = item.role;

        entry.append(company, role);
        list.append(entry);
      });
    } else {
      const emptyItem = document.createElement("li");
      emptyItem.textContent = "No roles yet";
      list.append(emptyItem);
    }

    column.append(title, list);

    statusBoard.append(column);
  });
}

function renderAttention(applications) {
  attentionList.innerHTML = "";

  const items = [...applications]
    .filter((application) => application.followUpDate || application.interviewDate || application.nextStep)
    .sort((a, b) => getAttentionRank(a) - getAttentionRank(b))
    .slice(0, 5);

  if (items.length === 0) {
    attentionList.innerHTML = `
      <div class="empty-state compact-empty">
        <h3>No urgent actions yet.</h3>
        <p>Add interview dates, follow-up dates, or next steps to surface reminders here.</p>
      </div>
    `;
    return;
  }

  items.forEach((application) => {
    const row = document.createElement("article");
    const title = document.createElement("div");
    const meta = document.createElement("div");

    row.className = "attention-item";
    title.className = "attention-title";
    meta.className = "attention-meta";

    title.textContent = `${application.company} - ${application.role}`;
    meta.textContent = buildAttentionCopy(application);

    row.append(title, meta);
    attentionList.append(row);
  });
}

function renderList(applications) {
  applicationList.innerHTML = "";

  if (applications.length === 0) {
    applicationList.innerHTML = `
      <div class="empty-state">
        <h3>No applications match this view.</h3>
        <p>Add your first role or change the filters to see saved applications.</p>
      </div>
    `;
    return;
  }

  applications.forEach((application) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const statusClass = `status-${application.status.toLowerCase()}`;

    card.dataset.id = application.id;
    card.querySelector(".company-name").textContent = application.company;
    card.querySelector(".role-name").textContent = application.role;

    const badge = card.querySelector(".status-badge");
    badge.textContent = application.status;
    badge.classList.add(statusClass);

    const meta = [];

    if (application.location) meta.push(application.location);
    if (application.priority) meta.push(`${application.priority} priority`);
    if (application.source) meta.push(`Source: ${application.source}`);
    if (application.appliedDate) meta.push(`Applied ${formatDate(application.appliedDate)}`);
    if (application.interviewDate) meta.push(`Interview ${formatDate(application.interviewDate)}`);
    if (application.followUpDate) meta.push(`Follow up ${formatDate(application.followUpDate)}`);
    if (application.contactName) meta.push(`Contact: ${application.contactName}`);
    if (application.salary) meta.push(application.salary);
    if (application.contactEmail) meta.push(application.contactEmail);

    const metaRow = card.querySelector(".meta-row");
    meta.forEach((value) => {
      const pill = document.createElement("span");
      pill.className = "meta-pill";
      pill.textContent = value;
      metaRow.append(pill);
    });

    const notesCopy = card.querySelector(".notes-copy");
    notesCopy.textContent = buildNotesSummary(application);

    const link = card.querySelector(".link-btn");
    if (application.jobLink) {
      link.href = application.jobLink;
    } else {
      link.removeAttribute("href");
      link.textContent = "No listing URL";
      link.setAttribute("aria-disabled", "true");
    }

    applicationList.append(card);
  });
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function sortApplications(a, b) {
  switch (state.sort) {
    case "applied-asc":
      return compareDate(a.appliedDate, b.appliedDate);
    case "followup-asc":
      return compareDate(a.followUpDate, b.followUpDate) || compareDate(a.appliedDate, b.appliedDate);
    case "priority-desc":
      return getPriorityRank(a.priority) - getPriorityRank(b.priority) || compareDate(b.appliedDate, a.appliedDate);
    case "company-asc":
      return a.company.localeCompare(b.company) || compareDate(b.appliedDate, a.appliedDate);
    case "applied-desc":
    default:
      return compareDate(b.appliedDate, a.appliedDate);
  }
}

function compareDate(a, b) {
  if (!a && !b) {
    return 0;
  }

  if (!a) {
    return 1;
  }

  if (!b) {
    return -1;
  }

  return new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`);
}

function getPriorityRank(priority) {
  return { High: 0, Medium: 1, Low: 2 }[priority] ?? 1;
}

function buildNotesSummary(application) {
  const lines = [];

  if (application.nextStep) {
    lines.push(`Next step: ${application.nextStep}`);
  }

  if (application.notes) {
    lines.push(application.notes);
  }

  return lines.join(" ") || "No notes yet.";
}

function buildAttentionCopy(application) {
  if (application.interviewDate && isOnOrBeforeSoon(application.interviewDate, 3)) {
    return `Interview coming up ${formatDate(application.interviewDate)}${application.nextStep ? ` - ${application.nextStep}` : ""}`;
  }

  if (application.followUpDate && isFollowUpOverdue(application.followUpDate)) {
    return `Follow-up overdue since ${formatDate(application.followUpDate)}${application.nextStep ? ` - ${application.nextStep}` : ""}`;
  }

  if (application.followUpDate && isOnOrBeforeSoon(application.followUpDate, 3)) {
    return `Follow-up due ${formatDate(application.followUpDate)}${application.nextStep ? ` - ${application.nextStep}` : ""}`;
  }

  return application.nextStep || "Review this application";
}

function getAttentionRank(application) {
  if (application.interviewDate && isOnOrBeforeSoon(application.interviewDate, 3)) {
    return 0;
  }

  if (application.followUpDate && isFollowUpOverdue(application.followUpDate)) {
    return 1;
  }

  if (application.followUpDate && isOnOrBeforeSoon(application.followUpDate, 3)) {
    return 2;
  }

  if (application.priority === "High") {
    return 3;
  }

  return 4;
}

function isWithinDays(value, days) {
  if (!value) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  const diff = today - date;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function isFollowUpDue(value) {
  if (!value) {
    return false;
  }

  const today = new Date();
  const followUp = new Date(`${value}T00:00:00`);
  today.setHours(0, 0, 0, 0);

  return followUp <= today;
}

function isFollowUpOverdue(value) {
  if (!value) {
    return false;
  }

  const today = new Date();
  const followUp = new Date(`${value}T00:00:00`);
  today.setHours(0, 0, 0, 0);

  return followUp < today;
}

function isOnOrBeforeSoon(value, daysAhead) {
  if (!value) {
    return false;
  }

  const target = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target - today;

  return diff >= 0 && diff <= daysAhead * 24 * 60 * 60 * 1000;
}
