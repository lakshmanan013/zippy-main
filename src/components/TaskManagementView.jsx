import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  MapPin,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  Columns,
  List,
  Trash2,
  Edit3,
  X,
  Stethoscope,
  Briefcase,
  ShieldAlert,
  ArrowUpRight,
  Award,
} from "lucide-react";
import {
  fetchTaskList,
  fetchTaskAnalytics,
  createRecord,
  updateRecord,
  deleteRecord,
  fetchList,
  API_BASE,
} from "../api.js";
import AssignTaskModal from "./AssignTaskModal.jsx";
import "./TaskManagementView.css";

const TASK_CATEGORIES = [
  "General",
  "Doctor Visit",
  "Clinic Onboarding",
  "Chemist Stock Check",
  "Product Detailing",
  "Target Review",
  "Payment Collection",
  "Sample Distribution",
  "Administrative",
];

const PRIORITIES = ["Urgent", "High", "Medium", "Low"];

export default function TaskManagementView({
  role = "executive",
  currentRecord = null,
  execId = null,
  managerId = null,
  regionalId = null,
  onTaskCountChange,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState({
    managers: [],
    executives: [],
    doctors: [],
  });

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'kanban' | 'table'

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Form State for Assign Task
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    task_type: "Doctor Visit",
    priority: "Medium",
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    assigned_to_role: role === "manager" ? "executive" : "executive",
    assigned_to_id: "",
    target_entity_name: "",
    pincode: "",
  });

  // Form State for Update Progress
  const [updateForm, setUpdateForm] = useState({
    status: "Pending",
    progress: 0,
    remarks: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Identify current user ID and role
  const currentUserId = useMemo(() => {
    if (role === "executive") return execId || currentRecord?.id;
    if (role === "manager") return managerId || currentRecord?.id;
    if (role === "regional") return regionalId || currentRecord?.id;
    return currentRecord?.id;
  }, [role, execId, managerId, regionalId, currentRecord]);

  // Load team members for assign dropdowns
  const loadTeamData = useCallback(async () => {
    try {
      const [mgrs, execs, docs, rMgrs, cov] = await Promise.all([
        fetchList("sales_managers").catch(() => []),
        fetchList("sales_executives").catch(() => []),
        fetchList("doctors").catch(() => []),
        fetchList("regional_managers").catch(() => []),
        fetchList("pincode_coverage").catch(() => []),
      ]);
      setTeamMembers({
        managers: Array.isArray(mgrs) ? mgrs : [],
        executives: Array.isArray(execs) ? execs : [],
        doctors: Array.isArray(docs) ? docs : [],
        regionalManagers: Array.isArray(rMgrs) ? rMgrs : [],
        coverage: Array.isArray(cov) ? cov : [],
      });
    } catch (err) {
      console.warn("Could not load team data:", err);
    }
  }, []);

  // Load tasks dynamically according to role & current user
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        role,
        user_id: currentUserId,
      };
      if (role === "manager" && currentRecord?.region) {
        params.region = currentRecord.region;
      }
      const data = await fetchTaskList(params);
      const list = Array.isArray(data) ? data : [];
      setTasks(list);
      onTaskCountChange?.(list.length);
    } catch (err) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [role, currentUserId, currentRecord, onTaskCountChange]);

  useEffect(() => {
    loadTasks();
    loadTeamData();
  }, [loadTasks, loadTeamData]);

  // Synchronize with any task creation or update event
  useEffect(() => {
    const handleTasksUpdated = () => {
      loadTasks();
    };
    window.addEventListener("executive_tasks_updated", handleTasksUpdated);
    return () => window.removeEventListener("executive_tasks_updated", handleTasksUpdated);
  }, [loadTasks]);

  // Calculate task statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let total = tasks.length;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let overdue = 0;

    tasks.forEach((t) => {
      const s = String(t.status || "").toLowerCase();
      const isDone = s === "completed" || s === "done" || s === "closed";
      const isProg = s === "in progress" || s === "in_progress" || s === "active";
      const isOver = Boolean(t.due_date && t.due_date < today && !isDone);

      if (isDone) completed++;
      else if (isOver) overdue++;
      else if (isProg) inProgress++;
      else pending++;
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, overdue, completionRate };
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return tasks.filter((t) => {
      const s = String(t.status || "").toLowerCase();
      const isDone = s === "completed" || s === "done" || s === "closed";
      const isProg = s === "in progress" || s === "in_progress" || s === "active";
      const isOver = Boolean(t.due_date && t.due_date < today && !isDone);

      // Status filter
      if (statusFilter === "completed" && !isDone) return false;
      if (statusFilter === "in progress" && !isProg) return false;
      if (statusFilter === "pending" && (isDone || isProg || isOver)) return false;
      if (statusFilter === "overdue" && !isOver) return false;

      // Priority filter
      if (priorityFilter !== "all" && String(t.priority || "").toLowerCase() !== priorityFilter.toLowerCase()) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && t.task_type !== categoryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = String(t.title || "").toLowerCase().includes(q);
        const matchesAssignee = String(t.assigned_to_name || "").toLowerCase().includes(q);
        const matchesAssigner = String(t.assigned_by_name || "").toLowerCase().includes(q);
        const matchesEntity = String(t.target_entity_name || "").toLowerCase().includes(q);
        const matchesPin = String(t.pincode || "").includes(q);
        if (!matchesTitle && !matchesAssignee && !matchesAssigner && !matchesEntity && !matchesPin) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  // Open Assign Modal with default assignee
  const handleOpenAssignModal = () => {
    const initialAssigneeRole = role === "manager" ? "executive" : "executive";
    let defaultAssigneeId = "";
    if (initialAssigneeRole === "executive" && teamMembers.executives.length > 0) {
      defaultAssigneeId = teamMembers.executives[0].id;
    } else if (initialAssigneeRole === "manager" && teamMembers.managers.length > 0) {
      defaultAssigneeId = teamMembers.managers[0].id;
    }

    setNewTask({
      title: "",
      description: "",
      task_type: "Doctor Visit",
      priority: "Medium",
      due_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      assigned_to_role: initialAssigneeRole,
      assigned_to_id: defaultAssigneeId,
      target_entity_name: "",
      pincode: "",
    });
    setIsAssignModalOpen(true);
  };

  // Submit New Task Assignment
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      alert("Please enter a task title.");
      return;
    }
    if (!newTask.assigned_to_id) {
      alert("Please select an assignee.");
      return;
    }

    setSubmitting(true);
    try {
      const toRole = newTask.assigned_to_role;
      let assigneeName = "";
      let taskRegion = currentRecord?.region || "";

      if (toRole === "manager") {
        const mgr = teamMembers.managers.find((m) => String(m.id) === String(newTask.assigned_to_id));
        assigneeName = mgr?.name || "Sales Manager";
        if (mgr?.region) taskRegion = mgr.region;
      } else {
        const exec = teamMembers.executives.find((x) => String(x.id) === String(newTask.assigned_to_id));
        assigneeName = exec?.name || "Sales Executive";
        if (exec?.region) taskRegion = exec.region;
      }

      const payload = {
        title: newTask.title.trim(),
        description: newTask.description?.trim() || null,
        task_type: newTask.task_type || "General",
        priority: newTask.priority || "Medium",
        status: "Pending",
        due_date: newTask.due_date || null,
        assigned_by_id: currentUserId,
        assigned_by_role: role,
        assigned_by_name: currentRecord?.name || (role === "regional" ? "Regional Manager" : "Sales Manager"),
        assigned_to_role: toRole,
        assigned_to_id: Number(newTask.assigned_to_id),
        assigned_to_name: assigneeName,
        region: taskRegion,
        target_entity_name: newTask.target_entity_name?.trim() || null,
        pincode: newTask.pincode?.trim() || null,
        progress: 0,
      };

      const res = await fetch(`${API_BASE}/executive-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to create task");
      }

      const created = await res.json().catch(() => null);
      window.dispatchEvent(new CustomEvent("executive_tasks_updated", { detail: created }));

      setIsAssignModalOpen(false);
      await loadTasks();
    } catch (err) {
      alert(err.message || "Failed to assign task");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Update Modal
  const handleOpenUpdateModal = (task) => {
    setSelectedTask(task);
    const s = String(task.status || "Pending");
    const normalizedStatus =
      s.toLowerCase() === "completed" || s.toLowerCase() === "done"
        ? "Completed"
        : s.toLowerCase() === "in progress" || s.toLowerCase() === "in_progress"
        ? "In Progress"
        : "Pending";

    setUpdateForm({
      status: normalizedStatus,
      progress: task.progress || (normalizedStatus === "Completed" ? 100 : 0),
      remarks: task.remarks || "",
    });
    setIsUpdateModalOpen(true);
  };

  // Submit Task Progress Update
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      const payload = {
        status: updateForm.status,
        progress: Number(updateForm.progress),
        remarks: updateForm.remarks?.trim() || null,
      };

      if (updateForm.status === "Completed") {
        payload.progress = 100;
      }

      const res = await fetch(`${API_BASE}/executive-tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to update task");
      }

      const updated = await res.json().catch(() => null);
      window.dispatchEvent(new CustomEvent("executive_tasks_updated", { detail: updated }));

      setIsUpdateModalOpen(false);
      setSelectedTask(null);
      await loadTasks();
    } catch (err) {
      alert(err.message || "Failed to update task");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteRecord("executive_tasks", taskId);
      window.dispatchEvent(new CustomEvent("executive_tasks_updated", { detail: { id: taskId, deleted: true } }));
      await loadTasks();
    } catch (err) {
      alert(err.message || "Failed to delete task");
    }
  };

  // Helpers for labels and badges
  const getDueBadge = (dueDate, status) => {
    if (!dueDate) return null;
    const s = String(status || "").toLowerCase();
    if (s === "completed" || s === "done") {
      return <span className="tm-due-badge"><Calendar size={12} /> {dueDate}</span>;
    }
    const today = new Date().toISOString().split("T")[0];
    if (dueDate < today) {
      const diffDays = Math.ceil((new Date(today) - new Date(dueDate)) / 86400000);
      return (
        <span className="tm-due-badge overdue">
          <AlertCircle size={12} /> Overdue by {diffDays}d
        </span>
      );
    }
    if (dueDate === today) {
      return (
        <span className="tm-due-badge today">
          <Clock size={12} /> Due Today!
        </span>
      );
    }
    return (
      <span className="tm-due-badge">
        <Calendar size={12} /> Due: {dueDate}
      </span>
    );
  };

  const getPriorityClass = (priority) => {
    const p = String(priority || "medium").toLowerCase();
    return p === "urgent" ? "urgent" : p === "high" ? "high" : p === "low" ? "low" : "medium";
  };

  const getStatusClass = (status, dueDate) => {
    const s = String(status || "pending").toLowerCase();
    const today = new Date().toISOString().split("T")[0];
    if (s === "completed" || s === "done") return "status-completed";
    if (dueDate && dueDate < today) return "status-overdue";
    if (s === "in progress" || s === "in_progress") return "status-in-progress";
    return "status-pending";
  };

  const getProgressBarColor = (status, dueDate) => {
    const s = String(status || "pending").toLowerCase();
    const today = new Date().toISOString().split("T")[0];
    if (s === "completed" || s === "done") return "#10b981";
    if (dueDate && dueDate < today) return "#ef4444";
    if (s === "in progress" || s === "in_progress") return "#3b82f6";
    return "#f59e0b";
  };

  const canAssign = role === "regional" || role === "manager" || role === "admin";

  return (
    <div className={`tm-container role-${role} theme-${role === "regional" ? "purple" : role === "executive" ? "blue" : "green"}`}>
      {/* ── Top Header Bar ── */}
      <div className="tm-header">
        <div className="tm-title-area">
          <h1>
            <CheckSquare size={26} color={role === "regional" ? "#7c3aed" : role === "executive" ? "#0077e6" : "#059669"} />
            Task Management
            <span className={`tm-role-badge ${role}`}>
              {role === "regional"
                ? "Regional Manager"
                : role === "manager"
                ? "Sales Manager"
                : role === "executive"
                ? "Sales Executive"
                : "Admin"}
            </span>
          </h1>
          <p>
            {role === "regional"
              ? "Assign & track tasks across Sales Managers and Sales Executives with real-time performance analytics."
              : role === "manager"
              ? "Assign tasks to your respective Sales Executives, track upcoming deadlines, and oversee task completion."
              : "Review your assigned tasks, meet upcoming deadlines, and report progress directly to your managers."}
          </p>
        </div>

        <div className="tm-actions-area">
          {canAssign && (
            <button
              type="button"
              className="tm-btn-primary"
              onClick={handleOpenAssignModal}
            >
              <Plus size={16} />
              Assign New Task
            </button>
          )}

          <button
            type="button"
            className="tm-btn-secondary"
            onClick={loadTasks}
            title="Refresh Tasks"
          >
            <Clock size={15} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="tm-kpi-grid">
        <div className="tm-kpi-card">
          <div className="tm-kpi-icon blue">
            <CheckSquare size={22} />
          </div>
          <div className="tm-kpi-meta">
            <h3>Total Assigned</h3>
            <p className="tm-kpi-val">{stats.total}</p>
            <p className="tm-kpi-sub">Across all categories</p>
          </div>
        </div>

        <div className="tm-kpi-card">
          <div className="tm-kpi-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div className="tm-kpi-meta">
            <h3>Completed</h3>
            <p className="tm-kpi-val">{stats.completed}</p>
            <p className="tm-kpi-sub">{stats.completionRate}% completion rate</p>
          </div>
        </div>

        <div className="tm-kpi-card">
          <div className="tm-kpi-icon amber">
            <Clock size={22} />
          </div>
          <div className="tm-kpi-meta">
            <h3>In Progress</h3>
            <p className="tm-kpi-val">{stats.inProgress}</p>
            <p className="tm-kpi-sub">Actively being worked on</p>
          </div>
        </div>

        <div className="tm-kpi-card">
          <div className="tm-kpi-icon purple">
            <Calendar size={22} />
          </div>
          <div className="tm-kpi-meta">
            <h3>Pending</h3>
            <p className="tm-kpi-val">{stats.pending}</p>
            <p className="tm-kpi-sub">Awaiting action</p>
          </div>
        </div>

        <div className="tm-kpi-card">
          <div className="tm-kpi-icon red">
            <AlertCircle size={22} />
          </div>
          <div className="tm-kpi-meta">
            <h3>
              Overdue
              {stats.overdue > 0 && <span className="tm-alert-pulse" />}
            </h3>
            <p className="tm-kpi-val" style={{ color: stats.overdue > 0 ? "#dc2626" : "inherit" }}>
              {stats.overdue}
            </p>
            <p className="tm-kpi-sub">
              {stats.overdue > 0 ? "Past deadline - Needs attention" : "Zero overdue tasks"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="tm-filter-card">
        <div className="tm-filter-row-top">
          <div className="tm-search-input-wrap">
            <Search size={16} className="tm-search-icon" />
            <input
              type="text"
              className="tm-search-input"
              placeholder="Search tasks, assignees, doctors, pin code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tm-view-controls">
            <select
              className="tm-filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              className="tm-filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {TASK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="tm-view-switch">
              <button
                type="button"
                className={`tm-view-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid size={15} />
                <span>Grid</span>
              </button>
              <button
                type="button"
                className={`tm-view-btn ${viewMode === "kanban" ? "active" : ""}`}
                onClick={() => setViewMode("kanban")}
                title="Kanban Board"
              >
                <Columns size={15} />
                <span>Board</span>
              </button>
              <button
                type="button"
                className={`tm-view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <List size={15} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        <div className="tm-pills-row">
          <button
            type="button"
            className={`tm-pill ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All Tasks <span className="tm-pill-count">{stats.total}</span>
          </button>
          <button
            type="button"
            className={`tm-pill ${statusFilter === "pending" ? "active" : ""}`}
            onClick={() => setStatusFilter("pending")}
          >
            Pending <span className="tm-pill-count">{stats.pending}</span>
          </button>
          <button
            type="button"
            className={`tm-pill ${statusFilter === "in progress" ? "active" : ""}`}
            onClick={() => setStatusFilter("in progress")}
          >
            In Progress <span className="tm-pill-count">{stats.inProgress}</span>
          </button>
          <button
            type="button"
            className={`tm-pill ${statusFilter === "completed" ? "active" : ""}`}
            onClick={() => setStatusFilter("completed")}
          >
            Completed <span className="tm-pill-count">{stats.completed}</span>
          </button>
          {stats.overdue > 0 && (
            <button
              type="button"
              className={`tm-pill ${statusFilter === "overdue" ? "active" : ""}`}
              onClick={() => setStatusFilter("overdue")}
              style={{ color: statusFilter === "overdue" ? "#ffffff" : "#dc2626" }}
            >
              Overdue <span className="tm-pill-count" style={{ background: "#fee2e2", color: "#dc2626" }}>{stats.overdue}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="tm-empty-state">
          <Clock size={36} color="#0d9488" style={{ animation: "spin 2s linear infinite" }} />
          <h3 style={{ marginTop: "1rem" }}>Loading Tasks...</h3>
          <p>Connecting to database...</p>
        </div>
      ) : error ? (
        <div className="tm-empty-state">
          <AlertCircle size={36} color="#ef4444" />
          <h3 style={{ color: "#ef4444" }}>Could Not Load Tasks</h3>
          <p>{error}</p>
          <button
            type="button"
            className="tm-btn-primary"
            style={{ marginTop: "1rem" }}
            onClick={loadTasks}
          >
            Retry
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="tm-empty-state">
          <div className="tm-empty-icon">
            <CheckSquare size={28} />
          </div>
          <h3>No tasks found</h3>
          <p>
            {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
              ? "No tasks match your active filters. Try clearing your search."
              : "No tasks have been assigned yet."}
          </p>
          {canAssign && (
            <button
              type="button"
              className="tm-btn-primary"
              style={{ marginTop: "1.2rem" }}
              onClick={handleOpenAssignModal}
            >
              <Plus size={16} /> Assign First Task
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ── GRID CARDS VIEW ── */
        <div className="tm-grid">
          {filteredTasks.map((task) => {
            const priorityClass = getPriorityClass(task.priority);
            const statusClass = getStatusClass(task.status, task.due_date);
            const isCompleted = String(task.status || "").toLowerCase() === "completed";
            const isOverdue = Boolean(task.is_overdue || (task.due_date && task.due_date < new Date().toISOString().split("T")[0] && !isCompleted));

            return (
              <div
                key={task.id}
                className={`tm-card ${isCompleted ? "completed" : isOverdue ? "overdue" : task.status === "In Progress" ? "in-progress" : "pending"}`}
              >
                <div>
                  <div className="tm-card-header">
                    <div className="tm-card-tags">
                      <span className={`tm-badge ${priorityClass}`}>
                        {task.priority || "Medium"}
                      </span>
                      <span className={`tm-badge ${statusClass}`}>
                        {isOverdue && !isCompleted ? "Overdue" : task.status || "Pending"}
                      </span>
                      <span className="tm-badge low">
                        {task.task_type || "General"}
                      </span>
                    </div>

                    {/* Delete button for assigner or admin */}
                    {canAssign && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="tm-card-delete-btn"
                        title="Delete Task"
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    )}
                  </div>

                  <h3 className="tm-card-title">{task.title}</h3>

                  {task.description && (
                    <p className="tm-card-desc">{task.description}</p>
                  )}

                  {task.target_entity_name && (
                    <div className="tm-card-entity">
                      <Stethoscope size={14} />
                      <span>{task.target_entity_name}</span>
                      {task.pincode && <span>({task.pincode})</span>}
                    </div>
                  )}

                  <div className="tm-card-meta">
                    <div className="tm-meta-row">
                      <span className="tm-meta-label">
                        <User size={13} /> Assigned To:
                      </span>
                      <span className="tm-meta-val">
                        {task.assigned_to_name || "Sales Executive"} ({task.assigned_to_role === "manager" ? "Manager" : "Executive"})
                      </span>
                    </div>

                    <div className="tm-meta-row">
                      <span className="tm-meta-label">
                        <Briefcase size={13} /> Assigned By:
                      </span>
                      <span className="tm-meta-val">
                        {task.assigned_by_name || "Manager"} ({task.assigned_by_role || "Role"})
                      </span>
                    </div>

                    {task.region && (
                      <div className="tm-meta-row">
                        <span className="tm-meta-label">
                          <MapPin size={13} /> Region:
                        </span>
                        <span className="tm-meta-val">{task.region}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="tm-progress-bar-wrap">
                    <div className="tm-progress-info">
                      <span>Progress</span>
                      <span>{task.progress || (isCompleted ? 100 : 0)}%</span>
                    </div>
                    <div className="tm-progress-track">
                      <div
                        className="tm-progress-fill"
                        style={{
                          width: `${task.progress || (isCompleted ? 100 : 0)}%`,
                          background: getProgressBarColor(task.status, task.due_date),
                        }}
                      />
                    </div>
                  </div>

                  {task.remarks && (
                    <div style={{ fontSize: "0.75rem", color: "#475569", background: "#f8fafc", padding: "0.4rem 0.6rem", borderRadius: "0.4rem", marginBottom: "0.75rem" }}>
                      <strong>Remarks:</strong> {task.remarks}
                    </div>
                  )}
                </div>

                <div className="tm-card-footer">
                  <div>{getDueBadge(task.due_date, task.status)}</div>

                  <div className="tm-card-actions">
                    <button
                      type="button"
                      className="tm-btn-xs update"
                      onClick={() => handleOpenUpdateModal(task)}
                    >
                      <Edit3 size={12} style={{ marginRight: "4px" }} />
                      Update Status
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "kanban" ? (
        /* ── KANBAN BOARD VIEW ── */
        <div className="tm-kanban-board">
          {["Pending", "In Progress", "Completed"].map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => {
              const s = String(t.status || "Pending").toLowerCase();
              if (colStatus === "Completed") return s === "completed" || s === "done";
              if (colStatus === "In Progress") return s === "in progress" || s === "in_progress";
              return s !== "completed" && s !== "done" && s !== "in progress" && s !== "in_progress";
            });

            return (
              <div
                key={colStatus}
                className={`tm-kanban-col ${colStatus === "Completed" ? "completed" : colStatus === "In Progress" ? "in-progress" : "pending"}`}
              >
                <div className="tm-kanban-col-header">
                  <h4 className="tm-kanban-col-title">
                    {colStatus === "Completed" ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : colStatus === "In Progress" ? (
                      <Clock size={16} color="#3b82f6" />
                    ) : (
                      <AlertCircle size={16} color="#f59e0b" />
                    )}
                    {colStatus}
                  </h4>
                  <span className="tm-pill-count">{colTasks.length}</span>
                </div>

                <div className="tm-kanban-cards">
                  {colTasks.length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", margin: "2rem 0" }}>
                      No tasks in {colStatus}
                    </p>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="tm-card"
                        style={{ padding: "0.9rem" }}
                      >
                        <div className="tm-card-header" style={{ marginBottom: "0.4rem" }}>
                          <span className={`tm-badge ${getPriorityClass(task.priority)}`}>
                            {task.priority || "Medium"}
                          </span>
                          {getDueBadge(task.due_date, task.status)}
                        </div>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 0.4rem 0" }}>
                          {task.title}
                        </h4>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.6rem" }}>
                          Assignee: <strong>{task.assigned_to_name}</strong>
                        </div>
                        <button
                          type="button"
                          className="tm-btn-xs update"
                          style={{ width: "100%", justifyContent: "center", display: "flex" }}
                          onClick={() => handleOpenUpdateModal(task)}
                        >
                          Update Status
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="tm-table-wrap">
          <table className="tm-table">
            <thead>
              <tr>
                <th>Title &amp; Type</th>
                <th>Assignee</th>
                <th>Assigned By</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Progress</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const isCompleted = String(task.status || "").toLowerCase() === "completed";
                const isOverdue = Boolean(task.is_overdue || (task.due_date && task.due_date < new Date().toISOString().split("T")[0] && !isCompleted));

                return (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{task.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {task.task_type || "General"} {task.target_entity_name ? `• ${task.target_entity_name}` : ""}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{task.assigned_to_name || "—"}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        {task.assigned_to_role === "manager" ? "Sales Manager" : "Sales Executive"}
                      </div>
                    </td>
                    <td>
                      <div>{task.assigned_by_name || "—"}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        {task.assigned_by_role || "Role"}
                      </div>
                    </td>
                    <td>
                      <span className={`tm-badge ${getPriorityClass(task.priority)}`}>
                        {task.priority || "Medium"}
                      </span>
                    </td>
                    <td>{getDueBadge(task.due_date, task.status)}</td>
                    <td style={{ minWidth: "100px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ flex: 1, height: "6px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${task.progress || (isCompleted ? 100 : 0)}%`,
                              height: "100%",
                              background: getProgressBarColor(task.status, task.due_date),
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                          {task.progress || (isCompleted ? 100 : 0)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`tm-badge ${getStatusClass(task.status, task.due_date)}`}>
                        {isOverdue && !isCompleted ? "Overdue" : task.status || "Pending"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="tm-btn-xs update"
                          onClick={() => handleOpenUpdateModal(task)}
                        >
                          Update
                        </button>
                        {canAssign && (
                          <button
                            type="button"
                            className="tm-btn-xs tm-btn-delete"
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete"
                          >
                            <Trash2 size={12} color="#ef4444" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODERN ASSIGN TASK MODAL (Regional Manager & Sales Manager) ── */}
      <AssignTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onTaskCreated={() => {
          loadTasks();
        }}
        role={role}
        currentRecord={currentRecord}
        teamMembers={teamMembers}
        initialAssigneeId={newTask.assigned_to_id || null}
        initialAssigneeRole={newTask.assigned_to_role || "executive"}
      />

      {/* ── UPDATE TASK PROGRESS MODAL ── */}
      {isUpdateModalOpen && selectedTask && (
        <div className="tm-modal-backdrop" onClick={() => setIsUpdateModalOpen(false)}>
          <div className={`tm-modal-card role-${role} theme-${role === "regional" ? "purple" : role === "executive" ? "blue" : "green"}`} onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-header">
              <h2>
                <Edit3 size={20} color={role === "regional" ? "#7c3aed" : role === "executive" ? "#0077e6" : "#059669"} />
                Update Task Progress
              </h2>
              <button
                type="button"
                className="tm-modal-close-btn"
                onClick={() => setIsUpdateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateTask}>
              <div className="tm-modal-body">
                <div>
                  <h3 style={{ margin: "0 0 0.3rem 0", fontSize: "1.1rem" }}>{selectedTask.title}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                    Assigned by: <strong>{selectedTask.assigned_by_name}</strong> | Due: {selectedTask.due_date || "N/A"}
                  </p>
                </div>

                <div className="tm-form-group">
                  <label>Completion Status</label>
                  <select
                    className="tm-form-select"
                    value={updateForm.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setUpdateForm({
                        ...updateForm,
                        status: newStatus,
                        progress: newStatus === "Completed" ? 100 : updateForm.progress === 100 ? 50 : updateForm.progress,
                      });
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed (100%)</option>
                  </select>
                </div>

                <div className="tm-form-group">
                  <label>
                    Task Progress: <strong>{updateForm.progress}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={updateForm.progress}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setUpdateForm({
                        ...updateForm,
                        progress: val,
                        status: val === 100 ? "Completed" : val > 0 ? "In Progress" : "Pending",
                      });
                    }}
                    style={{ width: "100%", accentColor: role === "regional" ? "#7c3aed" : role === "executive" ? "#0077e6" : "#059669" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8" }}>
                    <span>0% (Not Started)</span>
                    <span>50% (Halfway)</span>
                    <span>100% (Done)</span>
                  </div>
                </div>

                <div className="tm-form-group">
                  <label>Completion Remarks / Visit Findings</label>
                  <textarea
                    rows={3}
                    className="tm-form-textarea"
                    placeholder="Enter any notes, outcome, doctor feedback, or reason for delay..."
                    value={updateForm.remarks}
                    onChange={(e) => setUpdateForm({ ...updateForm, remarks: e.target.value })}
                  />
                </div>
              </div>

              <div className="tm-modal-footer">
                <button
                  type="button"
                  className="tm-btn-secondary"
                  onClick={() => setIsUpdateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="tm-btn-primary"
                >
                  {submitting ? "Saving..." : "Save Progress"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
