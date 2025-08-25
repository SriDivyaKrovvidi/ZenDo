// ZenDo — simple to-do with tabs, drag-and-drop, subtasks, colors, localStorage

const STORAGE_KEY = "zendo_state_v1";

// ---------- State ----------
let state = loadState() || defaultState();
let draggingTask = null; // {taskId, tabId}

// ---------- Helpers ----------
function defaultState() {
  const tabId = crypto.randomUUID();
  return {
    tabs: [{ id: tabId, name: "Tab 1", tasks: [] }],
    activeTabId: tabId,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    console.warn("Failed to parse saved state:", e);
    return null;
  }
}

function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTabId);
}

function setActiveTab(id) {
  state.activeTabId = id;
  saveState();
  render();
}

function addTab() {
  if (state.tabs.length >= 5) {
    alert("Max 5 tabs reached.");
    return;
  }
  const id = crypto.randomUUID();
  state.tabs.push({ id, name: `Tab ${state.tabs.length + 1}`, tasks: [] });
  state.activeTabId = id;
  saveState();
  render();
}

function removeTab(id) {
  if (state.tabs.length === 1) {
    alert("You need at least one tab.");
    return;
  }
  const idx = state.tabs.findIndex(t => t.id === id);
  if (idx >= 0) {
    state.tabs.splice(idx, 1);
  }
  if (!state.tabs.find(t => t.id === state.activeTabId)) {
    state.activeTabId = state.tabs[0].id;
  }
  saveState();
  render();
}

function createTask(text) {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    done: false,
    color: "#a7f3d0", // default pastel mint
    subtasks: [],
  };
}

function createSubtask(text) {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    done: false,
  };
}

// ---------- Rendering ----------
function render() {
  renderTabs();
  renderTasks();
}

function renderTabs() {
  const tabsBar = document.getElementById("tabsBar");
  // remove all tabs except the add button
  Array.from(tabsBar.querySelectorAll(".tab:not(.add)")).forEach(el => el.remove());

  state.tabs.forEach(tab => {
    const el = document.createElement("div");
    el.className = "tab" + (tab.id === state.activeTabId ? " active" : "");
    el.dataset.tabId = tab.id;

    const input = document.createElement("input");
    input.value = tab.name;
    input.title = "Click to rename";
    input.addEventListener("change", () => {
      tab.name = input.value.trim() || tab.name;
      saveState();
      renderTabs();
    });
    input.addEventListener("blur", () => {
      tab.name = input.value.trim() || tab.name;
      saveState();
    });
    el.appendChild(input);

    if (state.tabs.length > 1) {
      const close = document.createElement("button");
      close.className = "close";
      close.textContent = "✕";
      close.title = "Close tab";
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Delete tab "${tab.name}"?`)) removeTab(tab.id);
      });
      el.appendChild(close);
    }

    el.addEventListener("click", () => setActiveTab(tab.id));
    tabsBar.insertBefore(el, document.getElementById("addTabBtn"));
  });
}

function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";
  const active = getActiveTab();
  if (!active) return;

  const taskTemplate = document.getElementById("taskTemplate");
  const subtaskTemplate = document.getElementById("subtaskTemplate");

  active.tasks.forEach((task, index) => {
    const node = taskTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.taskId = task.id;
    node.querySelector(".task-done").checked = task.done;
    const textInput = node.querySelector(".task-text");
    textInput.value = task.text;
    const colorInput = node.querySelector(".task-color");
    const swatch = node.querySelector(".color-swatch");
    swatch.style.background = task.color;
    colorInput.value = task.color;

    if (task.done) node.classList.add("done");

    // Checkbox toggle
    node.querySelector(".task-done").addEventListener("change", (e) => {
      task.done = e.target.checked;
      saveState();
      renderTasks();
    });

    // Text change
    textInput.addEventListener("change", () => {
      task.text = textInput.value;
      saveState();
    });

    // Color change
    colorInput.addEventListener("input", () => {
      task.color = colorInput.value;
      swatch.style.background = colorInput.value;
      saveState();
    });

    // Delete task
    node.querySelector(".delete").addEventListener("click", () => {
      if (confirm("Delete this task?")) {
        const idx = active.tasks.findIndex(t => t.id === task.id);
        if (idx >= 0) active.tasks.splice(idx, 1);
        saveState();
        renderTasks();
      }
    });

    // Subtasks
    const subtasksUL = node.querySelector(".subtasks");
    const subAddRow = node.querySelector(".subtask-add-row");
    const subInput = subAddRow.querySelector(".subtask-input");
    const subBtn = subAddRow.querySelector(".subtask-add-btn");

    // Toggle add subtask row
    node.querySelector(".btn.subtask").addEventListener("click", () => {
      subAddRow.classList.toggle("hidden");
      if (!subAddRow.classList.contains("hidden")) {
        subInput.focus();
      }
    });

    function addSubtask() {
      const value = subInput.value.trim();
      if (!value) return;
      task.subtasks.push(createSubtask(value));
      subInput.value = "";
      saveState();
      renderTasks();
    }
    subBtn.addEventListener("click", addSubtask);
    subInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addSubtask();
    });

    // Render subtasks
    task.subtasks.forEach(st => {
      const sNode = subtaskTemplate.content.firstElementChild.cloneNode(true);
      sNode.dataset.subtaskId = st.id;
      sNode.querySelector(".subtask-done").checked = st.done;
      const stText = sNode.querySelector(".subtask-text");
      stText.value = st.text;
      if (st.done) sNode.classList.add("done");

      sNode.querySelector(".subtask-done").addEventListener("change", (e) => {
        st.done = e.target.checked;
        saveState();
        renderTasks();
      });
      stText.addEventListener("change", () => {
        st.text = stText.value;
        saveState();
      });

      sNode.querySelector(".subtask-delete").addEventListener("click", () => {
        const i = task.subtasks.findIndex(x => x.id === st.id);
        if (i >= 0) task.subtasks.splice(i, 1);
        saveState();
        renderTasks();
      });

      subtasksUL.appendChild(sNode);
    });

    // Drag & Drop
    node.addEventListener("dragstart", (e) => {
      draggingTask = { taskId: task.id, tabId: state.activeTabId };
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => node.classList.add("dragging"), 0);
    });
    node.addEventListener("dragend", () => {
      node.classList.remove("dragging");
      draggingTask = null;
    });

    node.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    node.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!draggingTask) return;
      if (draggingTask.tabId !== state.activeTabId) return;

      const fromIdx = active.tasks.findIndex(t => t.id === draggingTask.taskId);
      const toIdx = active.tasks.findIndex(t => t.id === task.id);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

      const [moved] = active.tasks.splice(fromIdx, 1);
      active.tasks.splice(toIdx, 0, moved);
      saveState();
      renderTasks();
    });

    list.appendChild(node);
  });
}

// ---------- Event Wiring ----------
document.getElementById("addTabBtn").addEventListener("click", addTab);

document.getElementById("addTaskBtn").addEventListener("click", () => {
  const input = document.getElementById("newTaskInput");
  const text = input.value.trim();
  if (!text) return;
  const active = getActiveTab();
  active.tasks.unshift(createTask(text));
  input.value = "";
  saveState();
  renderTasks();
});

document.getElementById("newTaskInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("addTaskBtn").click();
  }
});

// Export / Import
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "zendo-export.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});
document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.tabs || !data.activeTabId) throw new Error("Invalid file");
      state = data;
      saveState();
      render();
      alert("Import successful.");
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  };
  reader.readAsText(file);
});

// Initial render
render();
