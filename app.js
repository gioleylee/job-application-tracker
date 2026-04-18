const STORAGE_KEY = "job-application-tracker-v1";
const STATUS_COLUMNS = ["Applied", "Screening", "Interviewing", "Offer"];

const demoApplications = [
  {
    id: crypto.randomUUID(),
    company: "OpenAI",
    role: "Operations Analyst",
    location: "Remote",
    status: "Interviewing",
    appliedDate: "2026-04-15",
    salary: "$95k - $120k",
    jobLink: "https://example.com/openai-operations-analyst",
    followUpDate: "2026-04-22",
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
    salary: "$70k - $88k",
    jobLink: "https://example.com/figma-support",
    followUpDate: "2026-04-24",
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
    salary: "$85k - $100k",
    jobLink: "https://example.com/notion-community",
    followUpDate: "",
    notes: "Offer received. Compare compensation, growth scope, and time zone expectations.",
    createdAt: new Date().toISOString()
  }
];

const form = document.querySelector("#applicationForm");
const applicationList = document.querySelector("#applicationList");
const template = document.querySelector("#applicationCardTemplate");
const statusBoard = document.querySelector("#statusBoard");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const cancelEditBtn = document.querySelector("#cancelEditBtn");
const seedDemoBtn = document.querySelector("#seedDemoBtn");
const exportBtn = document.querySelector("#exportBtn");
const formTitle = document.querySelector("#formTitle");
const fields = {
  applicationId: document.querySelector("#applicationId"),
  company: document.querySelector("#company"),
  role: document.querySelector("#role"),
  location: document.querySelector("#location"),
  status: document.querySelector("#status"),
  appliedDate: document.querySelector("#appliedDate"),
  salary: document.querySelector("#salary"),
  jobLink: document.querySelector("#jobLink"),
  followUpDate: document.querySelector("#followUpDate"),
  notes: document.querySelector("#notes")
};

const state = {
  applications: loadApplications(),
  editingId: null,
  search: "",
  filter: "All"
};

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
    salary: data.get("salary").trim(),
    jobLink: data.get("jobLink").trim(),
    followUpDate: data.get("followUpDate"),
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
  const blob = new Blob([JSON.stringify(state.applications, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "job-applications.json";
  link.click();

  URL.revokeObjectURL(url);
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
    fields.salary.value = application.salary;
    fields.jobLink.value = application.jobLink;
    fields.followUpDate.value = application.followUpDate;
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

function persistApplications() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.applications));
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
  renderList(filteredApplications);
}

function getFilteredApplications() {
  return [...state.applications]
    .sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
    .filter((application) => {
      const matchesStatus = state.filter === "All" || application.status === state.filter;
      const haystack = [application.company, application.role, application.location, application.notes]
        .join(" ")
        .toLowerCase();
      const matchesSearch = haystack.includes(state.search);

      return matchesStatus && matchesSearch;
    });
}

function renderStats(applications) {
  const activeStatuses = new Set(["Applied", "Screening", "Interviewing", "Offer"]);
  const total = applications.length;
  const active = applications.filter((application) => activeStatuses.has(application.status)).length;
  const interviewing = applications.filter((application) => application.status === "Interviewing").length;
  const offers = applications.filter((application) => application.status === "Offer").length;
  const thisWeek = applications.filter((application) => isWithinDays(application.appliedDate, 7)).length;
  const followUps = applications.filter((application) => isFollowUpDue(application.followUpDate)).length;

  document.querySelector("#totalCount").textContent = total;
  document.querySelector("#activeCount").textContent = active;
  document.querySelector("#interviewCount").textContent = interviewing;
  document.querySelector("#offerCount").textContent = offers;
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
    if (application.appliedDate) meta.push(`Applied ${formatDate(application.appliedDate)}`);
    if (application.followUpDate) meta.push(`Follow up ${formatDate(application.followUpDate)}`);
    if (application.salary) meta.push(application.salary);

    const metaRow = card.querySelector(".meta-row");
    meta.forEach((value) => {
      const pill = document.createElement("span");
      pill.className = "meta-pill";
      pill.textContent = value;
      metaRow.append(pill);
    });

    const notesCopy = card.querySelector(".notes-copy");
    notesCopy.textContent = application.notes || "No notes yet.";

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
